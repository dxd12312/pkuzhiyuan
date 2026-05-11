import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/cloudbase";
import { COOKIE_NAME } from "@/lib/constants";
import { buildMessages, type DiagnosticAnswer, type ReportInput } from "@/lib/report-prompt";
import { buildFallbackReport } from "@/lib/report-fallback";
import type { Respondent, BlockResponse } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const AI_TIMEOUT_MS = 10_000;

async function fetchRespondentData(respondentId: string): Promise<{
  respondent: Respondent;
  diagnosticAnswers: DiagnosticAnswer[];
  blockResponses: BlockResponse[];
} | null> {
  const db = getDb();

  const [respondentResult, diagResult, blockResult] = await Promise.all([
    db.collection("respondents").where({ respondent_id: respondentId }).get(),
    db
      .collection("diagnostic_answers")
      .where({ respondent_id: respondentId })
      .get()
      .catch(() => ({ data: [] })),
    db.collection("responses").where({ respondent_id: respondentId }).get(),
  ]);

  const respondents = respondentResult.data as Respondent[] | undefined;
  if (!respondents || respondents.length === 0) return null;

  return {
    respondent: respondents[0],
    diagnosticAnswers: (diagResult.data ?? []) as DiagnosticAnswer[],
    blockResponses: (blockResult.data ?? []) as BlockResponse[],
  };
}

async function callOpenRouter(input: ReportInput): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.AI_API_KEY;
  const modelId = process.env.AI_MODEL_ID ?? "google/gemini-2.0-flash";

  if (!apiKey) throw new Error("AI_API_KEY not configured");

  const { system, user } = buildMessages(input);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        stream: true,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => String(upstream.status));
    throw new Error(`OpenRouter error ${upstream.status}: ${errText}`);
  }

  if (!upstream.body) throw new Error("No response body from OpenRouter");

  return upstream.body;
}

function parseSseChunk(line: string): string {
  if (!line.startsWith("data: ")) return "";
  const json = line.slice(6).trim();
  if (json === "[DONE]") return "";
  try {
    const parsed = JSON.parse(json) as {
      choices?: { delta?: { content?: string } }[];
    };
    return parsed.choices?.[0]?.delta?.content ?? "";
  } catch {
    return "";
  }
}

export async function POST() {
  const startMs = Date.now();

  const cookieStore = await cookies();
  const respondentId = cookieStore.get(COOKIE_NAME)?.value;

  if (!respondentId) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  let respondentData: Awaited<ReturnType<typeof fetchRespondentData>>;
  try {
    respondentData = await fetchRespondentData(respondentId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  if (!respondentData) {
    return NextResponse.json({ error: "respondent_not_found" }, { status: 404 });
  }

  const input: ReportInput = {
    respondent: respondentData.respondent,
    diagnosticAnswers: respondentData.diagnosticAnswers,
    blockResponses: respondentData.blockResponses,
  };

  const reportId = uuidv4();
  const db = getDb();
  const encoder = new TextEncoder();
  const modelId = process.env.AI_MODEL_ID ?? "google/gemini-2.0-flash";

  // Try AI streaming — fall through to fallback on error/timeout
  let useAi = !!process.env.AI_API_KEY;

  if (useAi) {
    try {
      const upstreamBody = await callOpenRouter(input);
      const reader = upstreamBody.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                const token = parseSseChunk(line);
                if (token) {
                  fullText += token;
                  controller.enqueue(encoder.encode(token));
                }
              }
            }

            // Flush remaining buffer
            if (buffer) {
              const token = parseSseChunk(buffer);
              if (token) {
                fullText += token;
                controller.enqueue(encoder.encode(token));
              }
            }

            controller.close();

            // Save to CloudBase (fire-and-forget)
            db
              .collection("ai_reports")
              .add({
                report_id: reportId,
                respondent_id: respondentId,
                output_text: fullText,
                model_id: modelId,
                generation_ms: Date.now() - startMs,
                is_success: true,
                is_fallback: false,
                created_at: new Date().toISOString(),
              })
              .catch(() => {});
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(stream, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    } catch {
      // Fall through to rule-based fallback
      useAi = false;
    }
  }

  // Fallback: rule-based report
  const fallbackText = buildFallbackReport(input);

  db
    .collection("ai_reports")
    .add({
      report_id: reportId,
      respondent_id: respondentId,
      output_text: fallbackText,
      model_id: "fallback",
      generation_ms: Date.now() - startMs,
      is_success: true,
      is_fallback: true,
      created_at: new Date().toISOString(),
    })
    .catch(() => {});

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Stream fallback in 40-char chunks to simulate streaming UX
      let offset = 0;
      const CHUNK = 40;
      function push() {
        if (offset >= fallbackText.length) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(fallbackText.slice(offset, offset + CHUNK)));
        offset += CHUNK;
        setTimeout(push, 30);
      }
      push();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
