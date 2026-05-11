import type { ReportInput } from "@/lib/report-prompt";

function classifyRiskPreference(switchingPoints: number[]): string {
  if (!switchingPoints.length) return "风险偏好数据不足，无法判断。";
  const avg = switchingPoints.reduce((a, b) => a + b, 0) / switchingPoints.length;
  if (avg <= 2) return "您的切换点较低，整体呈现出明显的风险规避倾向，倾向于选择稳健确定的选项。";
  if (avg <= 4) return "您的切换点居中，显示出温和的风险规避偏好，在确定性与期望值之间能较好地权衡。";
  return "您的切换点较高，显示出相对较高的风险承受意愿，对期望收益有较强的追求。";
}

function classifyMonotonicity(blockResponses: ReportInput["blockResponses"]): string {
  const nonMono = blockResponses.filter((r) => !r.is_monotone).length;
  if (nonMono === 0) return "您在所有决策任务中均保持了单调一致的选择，决策一致性良好。";
  return `您在${nonMono}个决策任务中出现了非单调选择，提示在高压决策情境下可能存在前后不一致的情况，建议在填报时多做对比和确认。`;
}

export function buildFallbackReport(input: ReportInput): string {
  const { respondent, diagnosticAnswers, blockResponses } = input;

  const track: Record<string, string> = {
    science: "理科",
    arts: "文科",
    combined: "综合改革",
    other: "其他",
  };

  const trackLabel = track[respondent.subject_track] ?? respondent.subject_track;
  const scoreText =
    respondent.total_score != null
      ? `您的高考分数为${respondent.total_score}分，`
      : "";

  const switchingPoints = blockResponses.map((r) => r.switching_point);
  const riskText = classifyRiskPreference(switchingPoints);
  const monoText = classifyMonotonicity(blockResponses);

  const diagSummary =
    diagnosticAnswers.length > 0
      ? `在诊断问卷中，您共回答了${diagnosticAnswers.length}道关于志愿填报准备情况的题目。`
      : "本次暂未收集到诊断问卷数据。";

  const province = respondent.province;

  return `决策风格分析

${scoreText}来自${province}，科目类型为${trackLabel}。通过MPL风险偏好实验，${riskText}${monoText}

信息获取评估

${diagSummary}建议您在填报前广泛收集${province}近三年各目标院校的录取分数线数据，重点关注所在科目类型的位次变化趋势，避免仅凭单一年度数据做出判断。结合实验数据来看，您在获取信息时应注意系统性，避免过度依赖口碑或单一信息来源。

志愿填报建议

建议您根据自身风险偏好，合理分配"冲、稳、保"梯度志愿：冲刺志愿1-2个，稳健志愿2-3个，保底志愿2-3个。填报前请务必核对目标院校在${province}的招生计划和专业要求，尤其关注综合改革省份的选科要求。保持决策的一致性，遇到犹豫时建议回归核实位次数据，而非凭直觉调整顺序。`;
}
