export interface Respondent {
  respondent_id: string;
  session_id: string;
  version: "gaokao_senior" | "rising_senior";
  treatment_group: "control" | "treatment";
  r1_block_order: "low_first" | "high_first";
  province: string;
  platform_id?: string;
  total_score?: number;
  province_rank?: number;
  subject_track: "science" | "arts" | "combined" | "other";
  target_batch?: string;
  school_id?: string;
  class_id?: string;
  student_seq?: string;
  device_type: "mobile" | "desktop" | "tablet";
  user_agent: string;
  ip_address: string;
  started_at: string;
  submitted_at?: string;
  current_page: number;
  is_completed: boolean;
  is_filtered: boolean;
  rand_seed: string;
}

export type CellId = "r1_low" | "r1_high" | "r4_low";

export interface BlockResponse {
  response_id: string;
  respondent_id: string;
  record_type: "block";
  cell_id: CellId;
  presentation_order: number;
  choices: ("A" | "B")[];
  switching_point: number;
  is_monotone: boolean;
  invalid_attempt_count: number;
  first_invalid_pattern?: string;
  comp_answer?: string;
  comp_correct?: boolean;
  page_entered_at: string;
  page_submitted_at?: string;
}

export interface Session {
  session_id: string;
  province: string;
  school_name?: string;
  version: "gaokao_senior" | "rising_senior";
  college_preset?: string[];
  score_threshold?: number;
  created_by: string;
  created_at: string;
  is_active: boolean;
  entry_url: string;
}

export interface MplRow {
  row: number;
  optionA: { amount: number; probability: number };
  optionB: { amount: number; probability: number };
}
