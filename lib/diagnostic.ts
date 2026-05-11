export interface DiagnosticQuestion {
  id: string;
  text: string;
  type: "single_choice" | "likert";
  options?: string[];
  likertLabels?: { min: string; max: string };
}

export interface DiagnosticAnswer {
  [key: string]: string;
}

export const DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: "d1",
    text: "您在填报志愿时，最看重以下哪个因素？",
    type: "single_choice",
    options: ["学校排名", "专业兴趣", "就业前景", "地理位置", "家庭建议"],
  },
  {
    id: "d2",
    text: "您对自己高考成绩的满意程度？",
    type: "likert",
    options: ["1", "2", "3", "4", "5"],
    likertLabels: { min: "非常不满意", max: "非常满意" },
  },
  {
    id: "d3",
    text: "您了解多少所大学的录取分数线？",
    type: "single_choice",
    options: ["不了解", "1-3所", "4-6所", "7-10所", "10所以上"],
  },
  {
    id: "d4",
    text: "您的志愿填报主要由谁决定？",
    type: "single_choice",
    options: ["完全自己决定", "主要自己，参考家长", "家长和自己各半", "主要家长决定"],
  },
  {
    id: "d5",
    text: "您目前对大学专业的了解程度？",
    type: "likert",
    options: ["1", "2", "3", "4", "5"],
    likertLabels: { min: "完全不了解", max: "非常了解" },
  },
  {
    id: "d6",
    text: "您是否参加过志愿填报辅导？",
    type: "single_choice",
    options: ["是", "否"],
  },
  {
    id: "d7",
    text: "您计划报考的大学层次？",
    type: "single_choice",
    options: ["985", "211", "一本", "二本", "不确定"],
  },
  {
    id: "d8",
    text: "您对未来就业方向是否有明确规划？",
    type: "likert",
    options: ["1", "2", "3", "4", "5"],
    likertLabels: { min: "完全没有规划", max: "规划非常明确" },
  },
];

export function getQuestionsForVersion(
  version: "gaokao_senior" | "rising_senior"
): DiagnosticQuestion[] {
  if (version === "gaokao_senior") {
    return DIAGNOSTIC_QUESTIONS.slice(0, 4); // D1-D4
  }
  return DIAGNOSTIC_QUESTIONS; // D1-D8
}
