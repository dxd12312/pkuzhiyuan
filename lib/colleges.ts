export interface CollegeLabels {
  college_x_display: string;
  college_y_display: string;
  downstream_2: string;
  downstream_3: string;
  downstream_4: string;
  fallback_display: string;
  label_source: "student_input" | "session_preset" | "platform_preset" | "neutral";
}

export const NEUTRAL_FALLBACKS: CollegeLabels = {
  college_x_display: "某985高校",
  college_y_display: "某211高校",
  downstream_2: "某本科院校",
  downstream_3: "某本科院校",
  downstream_4: "某本科院校",
  fallback_display: "本省保底学校",
  label_source: "neutral",
};

/**
 * Assign college labels from an ordered array of college names.
 * Slot order: [X (reach), Y (match), 2nd, 3rd, 4th choice].
 * Any missing slot uses the corresponding neutral fallback.
 */
export function assignCollegeLabels(
  colleges: string[],
  source: CollegeLabels["label_source"] = "student_input"
): CollegeLabels {
  const clean = colleges.map((c) => c.trim()).filter(Boolean);

  if (clean.length === 0) return { ...NEUTRAL_FALLBACKS };

  return {
    college_x_display: clean[0] ?? NEUTRAL_FALLBACKS.college_x_display,
    college_y_display: clean[1] ?? NEUTRAL_FALLBACKS.college_y_display,
    downstream_2: clean[2] ?? NEUTRAL_FALLBACKS.downstream_2,
    downstream_3: clean[3] ?? NEUTRAL_FALLBACKS.downstream_3,
    downstream_4: clean[4] ?? NEUTRAL_FALLBACKS.downstream_4,
    fallback_display: NEUTRAL_FALLBACKS.fallback_display,
    label_source: source,
  };
}
