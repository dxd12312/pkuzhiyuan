import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getDb } from "@/lib/cloudbase";
import {
  generateRespondentId,
  generateRandSeed,
  assignTreatmentGroup,
  assignBlockOrder,
} from "@/lib/randomize";
import { COOKIE_NAME, COOKIE_MAX_AGE } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { session_id, province, total_score, subject_track, version } = body as {
      session_id: string;
      province: string;
      total_score?: number;
      subject_track: string;
      version?: string;
    };

    if (!session_id || !province || !subject_track) {
      return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
    }

    const respondent_id = generateRespondentId();
    const rand_seed = generateRandSeed();
    const treatment_group = assignTreatmentGroup(rand_seed);
    const r1_block_order = assignBlockOrder(rand_seed);

    const ua = req.headers.get("user-agent") ?? "";
    const device_type: "mobile" | "desktop" =
      /Mobile|Android/i.test(ua) ? "mobile" : "desktop";

    const ip_address =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "";

    const doc = {
      respondent_id,
      session_id,
      version: (version ?? "gaokao_senior") as "gaokao_senior" | "rising_senior",
      treatment_group,
      r1_block_order,
      province,
      ...(total_score !== undefined && { total_score }),
      subject_track,
      device_type,
      user_agent: ua,
      ip_address,
      started_at: new Date().toISOString(),
      current_page: 0,
      is_completed: false,
      is_filtered: false,
      rand_seed,
    };

    await getDb().collection("respondents").add(doc);

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, respondent_id, {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({ respondent_id, treatment_group, r1_block_order });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
