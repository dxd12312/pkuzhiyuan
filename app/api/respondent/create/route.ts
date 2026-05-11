import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSql } from "@/lib/db";
import { assignCollegeLabels } from "@/lib/colleges";
import { isAboveThreshold } from "@/lib/threshold";
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
    const {
      session_id,
      province,
      total_score,
      subject_track,
      version,
      colleges,
      school_id,
      class_id,
      student_seq,
    } = body as {
      session_id: string;
      province: string;
      total_score?: number;
      subject_track: string;
      version?: string;
      colleges?: string[];
      school_id?: string;
      class_id?: string;
      student_seq?: string;
    };

    const resolvedVersion = (version ?? "gaokao_senior") as "gaokao_senior" | "rising_senior";

    if (!session_id || !province || !subject_track) {
      return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
    }

    // gaokao_senior requires a score
    if (resolvedVersion === "gaokao_senior" && total_score === undefined) {
      return NextResponse.json({ error: "missing_required_fields" }, { status: 400 });
    }

    const respondent_id = generateRespondentId();
    const rand_seed = generateRandSeed();
    const treatment_group = await assignTreatmentGroup(rand_seed);
    const r1_block_order = await assignBlockOrder(rand_seed);

    const ua = req.headers.get("user-agent") ?? "";
    const device_type: "mobile" | "desktop" =
      /Mobile|Android/i.test(ua) ? "mobile" : "desktop";

    const ip_address =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "";

    // Threshold check for gaokao_senior
    let is_filtered = false;
    if (resolvedVersion === "gaokao_senior" && total_score !== undefined) {
      const above = await isAboveThreshold(province, subject_track, total_score);
      if (!above) is_filtered = true;
    }

    const sql = getSql();

    await sql`
      INSERT INTO respondents (
        respondent_id, session_id, version, treatment_group, r1_block_order,
        province, total_score, subject_track, school_id, class_id, student_seq,
        device_type, user_agent, ip_address, started_at, current_page,
        is_completed, is_filtered, rand_seed
      ) VALUES (
        ${respondent_id}, ${session_id}, ${resolvedVersion}, ${treatment_group}, ${r1_block_order},
        ${province}, ${total_score ?? null}, ${subject_track}, ${school_id ?? null},
        ${class_id ?? null}, ${student_seq ?? null}, ${device_type}, ${ua}, ${ip_address},
        ${new Date().toISOString()}, ${0}, ${false}, ${is_filtered}, ${rand_seed}
      )
    `;

    // Persist college labels (best-effort — non-fatal if it fails)
    if (colleges && colleges.length > 0) {
      const labels = assignCollegeLabels(colleges, "student_input");
      try {
        await sql`
          INSERT INTO college_labels (
            respondent_id, label_source, college_x_display, college_y_display,
            downstream_2, downstream_3, downstream_4, fallback_display
          ) VALUES (
            ${respondent_id}, ${labels.label_source ?? null},
            ${labels.college_x_display ?? null}, ${labels.college_y_display ?? null},
            ${labels.downstream_2 ?? null}, ${labels.downstream_3 ?? null},
            ${labels.downstream_4 ?? null}, ${labels.fallback_display ?? null}
          )
        `;
      } catch {
        // non-fatal
      }
    }

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, respondent_id, {
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });

    return NextResponse.json({ respondent_id, treatment_group, r1_block_order, filtered: is_filtered });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
