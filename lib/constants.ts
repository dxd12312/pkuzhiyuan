export const PROVINCES = [
  "北京", "天津", "河北", "山西", "内蒙古",
  "辽宁", "吉林", "黑龙江", "上海", "江苏",
  "浙江", "安徽", "福建", "江西", "山东",
  "河南", "湖北", "湖南", "广东", "广西",
  "海南", "重庆", "四川", "贵州", "云南",
  "西藏", "陕西", "甘肃", "青海", "宁夏", "新疆",
] as const;

export const SUBJECT_TRACKS = [
  { value: "science", label: "理科" },
  { value: "arts", label: "文科" },
  { value: "combined", label: "综合改革" },
  { value: "other", label: "其他" },
] as const;

export const COOKIE_NAME = "respondent_id";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
