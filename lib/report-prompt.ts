import type { Respondent, BlockResponse } from "@/lib/types";

export interface DiagnosticAnswer {
  question_id: string;
  question_text?: string;
  answer: string | number;
}

export interface ReportInput {
  respondent: Respondent;
  diagnosticAnswers: DiagnosticAnswer[];
  blockResponses: BlockResponse[];
}

export function buildMessages(input: ReportInput): {
  system: string;
  user: string;
} {
  const { respondent, diagnosticAnswers, blockResponses } = input;

  const track: Record<string, string> = {
    science: "理科",
    arts: "文科",
    combined: "综合改革",
    other: "其他",
  };

  const sp = blockResponses
    .map(
      (r) =>
        `  - ${r.cell_id}：切换点 ${r.switching_point}，是否单调 ${r.is_monotone ? "是" : "否"}`
    )
    .join("\n");

  const da = diagnosticAnswers.length
    ? diagnosticAnswers
        .map((a) => `  - ${a.question_text ?? a.question_id}：${a.answer}`)
        .join("\n")
    : "  （暂无诊断问卷数据）";

  const system = `你是一位专业的高考志愿填报顾问，擅长行为经济学分析。你需要根据学生的基本信息和实验数据，生成一份简洁、个性化的"填报准备画像"报告。报告要求：
- 使用中文，约300字
- 语气专业、客观，适度鼓励
- 结构分三个部分：决策风格分析、信息获取评估、志愿填报建议
- 每部分2-4句话，内容紧密结合学生数据
- 不要使用markdown标题符号（#），用纯文字分段
- 末尾不要添加免责声明`;

  const user = `请根据以下信息生成该学生的填报准备画像报告：

【基本信息】
- 省份：${respondent.province}
- 科目类型：${track[respondent.subject_track] ?? respondent.subject_track}
- 高考分数：${respondent.total_score != null ? `${respondent.total_score}分` : "未填写"}
- 参与版本：${respondent.version === "gaokao_senior" ? "高三（高考生）" : "高二（准高三）"}
- 实验组：${respondent.treatment_group === "treatment" ? "信息干预组" : "对照组"}

【风险偏好数据（MPL实验切换点）】
${sp || "  （暂无MPL数据）"}

【志愿填报诊断回答】
${da}

请生成约300字的填报准备画像报告。`;

  return { system, user };
}
