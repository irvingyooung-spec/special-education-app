// Conners 儿童行为问卷 — 项目目录、因子定义、常模数据
// 包含：父母问卷48项 + 教师问卷28项 + 简明问卷10项

export type QuestionnaireType = "parent" | "teacher" | "brief";

export type ConnersItem = {
  questionnaire_type: QuestionnaireType;
  item_number: number;
  name: string;
  factor_code: string | null;
  is_hyperactivity_index: boolean;
  order_in_questionnaire: number;
};

export type ConnersFactor = {
  code: string;
  label: string;
  item_numbers: number[];
  item_count: number;
};

export type ConnersNorm = {
  age_group: string;
  gender: "male" | "female";
  factor_code: string;
  mean: number;
  sd: number;
};

export const CONNERS_SCORE_LEVELS = [
  { value: 0, label: "没有", desc: "没有/无" },
  { value: 1, label: "偶尔有一点", desc: "偶尔有一点/稍有" },
  { value: 2, label: "相当多", desc: "相当多" },
  { value: 3, label: "非常多", desc: "非常多/很多" },
] as const;

export const CONNERS_QUESTIONNAIRES = [
  { type: "parent" as QuestionnaireType, label: "父母问卷", item_count: 48, age_range: "3-18岁", respondent: "父亲或母亲" },
  { type: "teacher" as QuestionnaireType, label: "教师问卷", item_count: 28, age_range: "6-17岁", respondent: "教师" },
  { type: "brief" as QuestionnaireType, label: "简明问卷", item_count: 10, age_range: "3-17岁", respondent: "教师" },
];

export const PARENT_FACTORS: ConnersFactor[] = [
  { code: "I", label: "品行问题", item_numbers: [2, 8, 14, 19, 20, 21], item_count: 6 },
  { code: "II", label: "学习问题", item_numbers: [10, 25, 31, 37], item_count: 4 },
  { code: "III", label: "心身障碍", item_numbers: [32, 41, 43, 44], item_count: 4 },
  { code: "IV", label: "冲动-多动", item_numbers: [4, 5, 11, 13], item_count: 4 },
  { code: "V", label: "焦虑", item_numbers: [12, 16, 24, 47], item_count: 4 },
  { code: "HI", label: "多动指数", item_numbers: [4, 7, 11, 13, 14, 25, 31, 33, 37, 38], item_count: 10 },
];

export const TEACHER_FACTORS: ConnersFactor[] = [
  { code: "I", label: "品行问题", item_numbers: [4, 5, 6, 10, 11, 12, 23, 27], item_count: 8 },
  { code: "II", label: "多动", item_numbers: [1, 2, 3, 8, 14, 15, 16], item_count: 7 },
  { code: "III", label: "注意力不集中-被动", item_numbers: [7, 9, 18, 20, 21, 22, 26, 28], item_count: 8 },
  { code: "HI", label: "多动指数", item_numbers: [1, 5, 7, 8, 10, 11, 14, 15, 21, 26], item_count: 10 },
];

export const BRIEF_FACTORS: ConnersFactor[] = [];

export function getFactorsForQuestionnaire(type: QuestionnaireType): ConnersFactor[] {
  switch (type) {
    case "parent": return PARENT_FACTORS;
    case "teacher": return TEACHER_FACTORS;
    case "brief": return BRIEF_FACTORS;
  }
}

export const CONNERS_ITEMS: ConnersItem[] = [
  { questionnaire_type: "parent", item_number: 1, name: "某种小动作（如咬指甲、吸手指、拉头发、拉衣服上的布毛）", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 1 },
  { questionnaire_type: "parent", item_number: 2, name: "对大人粗鲁无礼", factor_code: "I", is_hyperactivity_index: false, order_in_questionnaire: 2 },
  { questionnaire_type: "parent", item_number: 3, name: "在交朋友或保持友谊上存在问题", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 3 },
  { questionnaire_type: "parent", item_number: 4, name: "易兴奋，易冲动", factor_code: "IV", is_hyperactivity_index: true, order_in_questionnaire: 4 },
  { questionnaire_type: "parent", item_number: 5, name: "爱指手划脚", factor_code: "IV", is_hyperactivity_index: false, order_in_questionnaire: 5 },
  { questionnaire_type: "parent", item_number: 6, name: "吸吮或咬嚼（拇指、衣服、毯子）", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 6 },
  { questionnaire_type: "parent", item_number: 7, name: "容易或经常哭叫", factor_code: null, is_hyperactivity_index: true, order_in_questionnaire: 7 },
  { questionnaire_type: "parent", item_number: 8, name: "脾气很大", factor_code: "I", is_hyperactivity_index: false, order_in_questionnaire: 8 },
  { questionnaire_type: "parent", item_number: 9, name: "白日梦", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 9 },
  { questionnaire_type: "parent", item_number: 10, name: "学习困难", factor_code: "II", is_hyperactivity_index: true, order_in_questionnaire: 10 },
  { questionnaire_type: "parent", item_number: 11, name: "扭动不停", factor_code: "IV", is_hyperactivity_index: true, order_in_questionnaire: 11 },
  { questionnaire_type: "parent", item_number: 12, name: "惧怕（新环境、陌生人、陌生地方、上学）", factor_code: "V", is_hyperactivity_index: false, order_in_questionnaire: 12 },
  { questionnaire_type: "parent", item_number: 13, name: "坐立不定，经常'忙碌'", factor_code: "IV", is_hyperactivity_index: true, order_in_questionnaire: 13 },
  { questionnaire_type: "parent", item_number: 14, name: "破坏性", factor_code: "I", is_hyperactivity_index: true, order_in_questionnaire: 14 },
  { questionnaire_type: "parent", item_number: 15, name: "撒谎或捏造情节", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 15 },
  { questionnaire_type: "parent", item_number: 16, name: "怕羞", factor_code: "V", is_hyperactivity_index: false, order_in_questionnaire: 16 },
  { questionnaire_type: "parent", item_number: 17, name: "造成的麻烦比同龄孩子多", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 17 },
  { questionnaire_type: "parent", item_number: 18, name: "说话与同龄儿童不同（像幼儿说话、口吃、别人不易听懂）", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 18 },
  { questionnaire_type: "parent", item_number: 19, name: "抵赖错误或归罪他人", factor_code: "I", is_hyperactivity_index: false, order_in_questionnaire: 19 },
  { questionnaire_type: "parent", item_number: 20, name: "好争吵", factor_code: "I", is_hyperactivity_index: false, order_in_questionnaire: 20 },
  { questionnaire_type: "parent", item_number: 21, name: "撅嘴和生气", factor_code: "I", is_hyperactivity_index: false, order_in_questionnaire: 21 },
  { questionnaire_type: "parent", item_number: 22, name: "偷窃", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 22 },
  { questionnaire_type: "parent", item_number: 23, name: "不服从或勉强服从", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 23 },
  { questionnaire_type: "parent", item_number: 24, name: "忧虑比别人多（忧虑、孤独、疾病、死亡）", factor_code: "V", is_hyperactivity_index: false, order_in_questionnaire: 24 },
  { questionnaire_type: "parent", item_number: 25, name: "做事有始无终", factor_code: "II", is_hyperactivity_index: true, order_in_questionnaire: 25 },
  { questionnaire_type: "parent", item_number: 26, name: "感情易受损害", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 26 },
  { questionnaire_type: "parent", item_number: 27, name: "欺凌别人", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 27 },
  { questionnaire_type: "parent", item_number: 28, name: "不能停止重复性活动", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 28 },
  { questionnaire_type: "parent", item_number: 29, name: "残忍", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 29 },
  { questionnaire_type: "parent", item_number: 30, name: "稚气或不成熟（自己会的事要人帮忙，依缠别人，常需别人鼓励、支持）", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 30 },
  { questionnaire_type: "parent", item_number: 31, name: "容易分心或注意不集中成为一个问题", factor_code: "II", is_hyperactivity_index: true, order_in_questionnaire: 31 },
  { questionnaire_type: "parent", item_number: 32, name: "头痛", factor_code: "III", is_hyperactivity_index: false, order_in_questionnaire: 32 },
  { questionnaire_type: "parent", item_number: 33, name: "情绪变化迅速剧烈", factor_code: null, is_hyperactivity_index: true, order_in_questionnaire: 33 },
  { questionnaire_type: "parent", item_number: 34, name: "不喜欢或不遵从纪律或约束", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 34 },
  { questionnaire_type: "parent", item_number: 35, name: "经常打架", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 35 },
  { questionnaire_type: "parent", item_number: 36, name: "与兄弟姐妹不能很好相处", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 36 },
  { questionnaire_type: "parent", item_number: 37, name: "在努力中容易泄气", factor_code: "II", is_hyperactivity_index: true, order_in_questionnaire: 37 },
  { questionnaire_type: "parent", item_number: 38, name: "妨害其他儿童", factor_code: null, is_hyperactivity_index: true, order_in_questionnaire: 38 },
  { questionnaire_type: "parent", item_number: 39, name: "基本上是一个不愉快的小孩", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 39 },
  { questionnaire_type: "parent", item_number: 40, name: "有饮食问题（食欲不佳、进食中常跑开）", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 40 },
  { questionnaire_type: "parent", item_number: 41, name: "胃痛", factor_code: "III", is_hyperactivity_index: false, order_in_questionnaire: 41 },
  { questionnaire_type: "parent", item_number: 42, name: "有睡眠问题（不能入睡、早醒、夜间起床）", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 42 },
  { questionnaire_type: "parent", item_number: 43, name: "其他疼痛", factor_code: "III", is_hyperactivity_index: false, order_in_questionnaire: 43 },
  { questionnaire_type: "parent", item_number: 44, name: "呕吐或恶心", factor_code: "III", is_hyperactivity_index: false, order_in_questionnaire: 44 },
  { questionnaire_type: "parent", item_number: 45, name: "感到在家庭圈子中被欺骗", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 45 },
  { questionnaire_type: "parent", item_number: 46, name: "自夸和吹牛", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 46 },
  { questionnaire_type: "parent", item_number: 47, name: "让自己受别人欺负", factor_code: "V", is_hyperactivity_index: false, order_in_questionnaire: 47 },
  { questionnaire_type: "parent", item_number: 48, name: "有大便问题（腹泻、排便不规则、便秘）", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 48 },
  { questionnaire_type: "teacher", item_number: 1, name: "扭动不停", factor_code: "II", is_hyperactivity_index: true, order_in_questionnaire: 1 },
  { questionnaire_type: "teacher", item_number: 2, name: "在不应出声的场合制造噪音", factor_code: "II", is_hyperactivity_index: false, order_in_questionnaire: 2 },
  { questionnaire_type: "teacher", item_number: 3, name: "提出要求必须立即得到满足", factor_code: "II", is_hyperactivity_index: false, order_in_questionnaire: 3 },
  { questionnaire_type: "teacher", item_number: 4, name: "动作粗鲁（唐突无礼）", factor_code: "I", is_hyperactivity_index: true, order_in_questionnaire: 4 },
  { questionnaire_type: "teacher", item_number: 5, name: "暴怒及不能预料的行为", factor_code: "I", is_hyperactivity_index: true, order_in_questionnaire: 5 },
  { questionnaire_type: "teacher", item_number: 6, name: "对批评过分敏感", factor_code: "I", is_hyperactivity_index: false, order_in_questionnaire: 6 },
  { questionnaire_type: "teacher", item_number: 7, name: "容易分心或注意不集中成为问题", factor_code: "III", is_hyperactivity_index: true, order_in_questionnaire: 7 },
  { questionnaire_type: "teacher", item_number: 8, name: "妨害其他儿童", factor_code: "II", is_hyperactivity_index: true, order_in_questionnaire: 8 },
  { questionnaire_type: "teacher", item_number: 9, name: "白日梦", factor_code: "III", is_hyperactivity_index: false, order_in_questionnaire: 9 },
  { questionnaire_type: "teacher", item_number: 10, name: "撅嘴和生气", factor_code: "I", is_hyperactivity_index: true, order_in_questionnaire: 10 },
  { questionnaire_type: "teacher", item_number: 11, name: "情绪变化迅速和激烈", factor_code: "I", is_hyperactivity_index: true, order_in_questionnaire: 11 },
  { questionnaire_type: "teacher", item_number: 12, name: "好争吵", factor_code: "I", is_hyperactivity_index: false, order_in_questionnaire: 12 },
  { questionnaire_type: "teacher", item_number: 13, name: "能顺从权威", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 13 },
  { questionnaire_type: "teacher", item_number: 14, name: "坐立不定，经常'忙碌'", factor_code: "II", is_hyperactivity_index: true, order_in_questionnaire: 14 },
  { questionnaire_type: "teacher", item_number: 15, name: "易兴奋，易冲动", factor_code: "II", is_hyperactivity_index: true, order_in_questionnaire: 15 },
  { questionnaire_type: "teacher", item_number: 16, name: "过分要求教师的注意", factor_code: "II", is_hyperactivity_index: false, order_in_questionnaire: 16 },
  { questionnaire_type: "teacher", item_number: 17, name: "好像不为集体所接受", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 17 },
  { questionnaire_type: "teacher", item_number: 18, name: "好像容易被其他小孩领导", factor_code: "III", is_hyperactivity_index: false, order_in_questionnaire: 18 },
  { questionnaire_type: "teacher", item_number: 19, name: "缺少公平合理竞赛的意识", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 19 },
  { questionnaire_type: "teacher", item_number: 20, name: "好像缺乏领导力", factor_code: "III", is_hyperactivity_index: false, order_in_questionnaire: 20 },
  { questionnaire_type: "teacher", item_number: 21, name: "做事有始无终", factor_code: "III", is_hyperactivity_index: true, order_in_questionnaire: 21 },
  { questionnaire_type: "teacher", item_number: 22, name: "稚气和不成熟", factor_code: "III", is_hyperactivity_index: false, order_in_questionnaire: 22 },
  { questionnaire_type: "teacher", item_number: 23, name: "抵赖错误或归罪他人", factor_code: "I", is_hyperactivity_index: false, order_in_questionnaire: 23 },
  { questionnaire_type: "teacher", item_number: 24, name: "不能与其他儿童相处", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 24 },
  { questionnaire_type: "teacher", item_number: 25, name: "与同学不合作", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 25 },
  { questionnaire_type: "teacher", item_number: 26, name: "在努力中容易泄气（灰心丧气）", factor_code: "III", is_hyperactivity_index: true, order_in_questionnaire: 26 },
  { questionnaire_type: "teacher", item_number: 27, name: "与教师不合作", factor_code: "I", is_hyperactivity_index: false, order_in_questionnaire: 27 },
  { questionnaire_type: "teacher", item_number: 28, name: "学习困难", factor_code: "III", is_hyperactivity_index: false, order_in_questionnaire: 28 },
  { questionnaire_type: "brief", item_number: 1, name: "活动过多，一刻不停", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 1 },
  { questionnaire_type: "brief", item_number: 2, name: "兴奋激动，容易冲动", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 2 },
  { questionnaire_type: "brief", item_number: 3, name: "惹恼其他儿童", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 3 },
  { questionnaire_type: "brief", item_number: 4, name: "做任何事情都不能善始善终", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 4 },
  { questionnaire_type: "brief", item_number: 5, name: "坐立不安，经常扭动", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 5 },
  { questionnaire_type: "brief", item_number: 6, name: "注意力不集中，易分心", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 6 },
  { questionnaire_type: "brief", item_number: 7, name: "常常为了小事大发脾气", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 7 },
  { questionnaire_type: "brief", item_number: 8, name: "脾气暴躁，易激动", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 8 },
  { questionnaire_type: "brief", item_number: 9, name: "妨碍别的儿童", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 9 },
  { questionnaire_type: "brief", item_number: 10, name: "不听从老师的要求", factor_code: null, is_hyperactivity_index: false, order_in_questionnaire: 10 },
];

export function getItemsByQuestionnaire(type: QuestionnaireType): ConnersItem[] {
  return CONNERS_ITEMS.filter(i => i.questionnaire_type === type);
}

export const CONNERS_NORMS: ConnersNorm[] = [
  { age_group: "3-5", gender: "male" as "male" | "female", factor_code: "I", mean: 0.56, sd: 0.55 },
  { age_group: "3-5", gender: "male" as "male" | "female", factor_code: "II", mean: 0.39, sd: 0.39 },
  { age_group: "3-5", gender: "male" as "male" | "female", factor_code: "III", mean: 0.36, sd: 0.45 },
  { age_group: "3-5", gender: "male" as "male" | "female", factor_code: "IV", mean: 1.11, sd: 0.73 },
  { age_group: "3-5", gender: "male" as "male" | "female", factor_code: "V", mean: 0.53, sd: 0.55 },
  { age_group: "3-5", gender: "male" as "male" | "female", factor_code: "HI", mean: 1.25, sd: 0.75 },
  { age_group: "3-5", gender: "female" as "male" | "female", factor_code: "I", mean: 0.52, sd: 0.52 },
  { age_group: "3-5", gender: "female" as "male" | "female", factor_code: "II", mean: 0.29, sd: 0.33 },
  { age_group: "3-5", gender: "female" as "male" | "female", factor_code: "III", mean: 0.3, sd: 0.42 },
  { age_group: "3-5", gender: "female" as "male" | "female", factor_code: "IV", mean: 0.97, sd: 0.71 },
  { age_group: "3-5", gender: "female" as "male" | "female", factor_code: "V", mean: 0.48, sd: 0.52 },
  { age_group: "3-5", gender: "female" as "male" | "female", factor_code: "HI", mean: 1.11, sd: 0.72 },
  { age_group: "6-8", gender: "male" as "male" | "female", factor_code: "I", mean: 0.5, sd: 0.51 },
  { age_group: "6-8", gender: "male" as "male" | "female", factor_code: "II", mean: 0.38, sd: 0.38 },
  { age_group: "6-8", gender: "male" as "male" | "female", factor_code: "III", mean: 0.32, sd: 0.42 },
  { age_group: "6-8", gender: "male" as "male" | "female", factor_code: "IV", mean: 1.02, sd: 0.72 },
  { age_group: "6-8", gender: "male" as "male" | "female", factor_code: "V", mean: 0.44, sd: 0.51 },
  { age_group: "6-8", gender: "male" as "male" | "female", factor_code: "HI", mean: 1.17, sd: 0.73 },
  { age_group: "6-8", gender: "female" as "male" | "female", factor_code: "I", mean: 0.48, sd: 0.49 },
  { age_group: "6-8", gender: "female" as "male" | "female", factor_code: "II", mean: 0.28, sd: 0.32 },
  { age_group: "6-8", gender: "female" as "male" | "female", factor_code: "III", mean: 0.27, sd: 0.39 },
  { age_group: "6-8", gender: "female" as "male" | "female", factor_code: "IV", mean: 0.91, sd: 0.7 },
  { age_group: "6-8", gender: "female" as "male" | "female", factor_code: "V", mean: 0.4, sd: 0.49 },
  { age_group: "6-8", gender: "female" as "male" | "female", factor_code: "HI", mean: 1.06, sd: 0.71 },
  { age_group: "9-11", gender: "male" as "male" | "female", factor_code: "I", mean: 0.44, sd: 0.49 },
  { age_group: "9-11", gender: "male" as "male" | "female", factor_code: "II", mean: 0.35, sd: 0.37 },
  { age_group: "9-11", gender: "male" as "male" | "female", factor_code: "III", mean: 0.28, sd: 0.4 },
  { age_group: "9-11", gender: "male" as "male" | "female", factor_code: "IV", mean: 0.95, sd: 0.7 },
  { age_group: "9-11", gender: "male" as "male" | "female", factor_code: "V", mean: 0.38, sd: 0.48 },
  { age_group: "9-11", gender: "male" as "male" | "female", factor_code: "HI", mean: 1.1, sd: 0.71 },
  { age_group: "9-11", gender: "female" as "male" | "female", factor_code: "I", mean: 0.42, sd: 0.47 },
  { age_group: "9-11", gender: "female" as "male" | "female", factor_code: "II", mean: 0.26, sd: 0.31 },
  { age_group: "9-11", gender: "female" as "male" | "female", factor_code: "III", mean: 0.24, sd: 0.37 },
  { age_group: "9-11", gender: "female" as "male" | "female", factor_code: "IV", mean: 0.85, sd: 0.68 },
  { age_group: "9-11", gender: "female" as "male" | "female", factor_code: "V", mean: 0.35, sd: 0.46 },
  { age_group: "9-11", gender: "female" as "male" | "female", factor_code: "HI", mean: 1.0, sd: 0.69 },
  { age_group: "12-14", gender: "male" as "male" | "female", factor_code: "I", mean: 0.4, sd: 0.47 },
  { age_group: "12-14", gender: "male" as "male" | "female", factor_code: "II", mean: 0.33, sd: 0.36 },
  { age_group: "12-14", gender: "male" as "male" | "female", factor_code: "III", mean: 0.25, sd: 0.38 },
  { age_group: "12-14", gender: "male" as "male" | "female", factor_code: "IV", mean: 0.88, sd: 0.68 },
  { age_group: "12-14", gender: "male" as "male" | "female", factor_code: "V", mean: 0.34, sd: 0.47 },
  { age_group: "12-14", gender: "male" as "male" | "female", factor_code: "HI", mean: 1.03, sd: 0.7 },
  { age_group: "12-14", gender: "female" as "male" | "female", factor_code: "I", mean: 0.38, sd: 0.45 },
  { age_group: "12-14", gender: "female" as "male" | "female", factor_code: "II", mean: 0.24, sd: 0.3 },
  { age_group: "12-14", gender: "female" as "male" | "female", factor_code: "III", mean: 0.22, sd: 0.35 },
  { age_group: "12-14", gender: "female" as "male" | "female", factor_code: "IV", mean: 0.79, sd: 0.66 },
  { age_group: "12-14", gender: "female" as "male" | "female", factor_code: "V", mean: 0.31, sd: 0.44 },
  { age_group: "12-14", gender: "female" as "male" | "female", factor_code: "HI", mean: 0.94, sd: 0.67 },
  { age_group: "15-17", gender: "male" as "male" | "female", factor_code: "I", mean: 0.36, sd: 0.45 },
  { age_group: "15-17", gender: "male" as "male" | "female", factor_code: "II", mean: 0.31, sd: 0.35 },
  { age_group: "15-17", gender: "male" as "male" | "female", factor_code: "III", mean: 0.23, sd: 0.37 },
  { age_group: "15-17", gender: "male" as "male" | "female", factor_code: "IV", mean: 0.82, sd: 0.66 },
  { age_group: "15-17", gender: "male" as "male" | "female", factor_code: "V", mean: 0.31, sd: 0.46 },
  { age_group: "15-17", gender: "male" as "male" | "female", factor_code: "HI", mean: 0.97, sd: 0.69 },
  { age_group: "15-17", gender: "female" as "male" | "female", factor_code: "I", mean: 0.34, sd: 0.43 },
  { age_group: "15-17", gender: "female" as "male" | "female", factor_code: "II", mean: 0.22, sd: 0.29 },
  { age_group: "15-17", gender: "female" as "male" | "female", factor_code: "III", mean: 0.2, sd: 0.33 },
  { age_group: "15-17", gender: "female" as "male" | "female", factor_code: "IV", mean: 0.74, sd: 0.64 },
  { age_group: "15-17", gender: "female" as "male" | "female", factor_code: "V", mean: 0.28, sd: 0.42 },
  { age_group: "15-17", gender: "female" as "male" | "female", factor_code: "HI", mean: 0.89, sd: 0.65 },
];

export function getNorm(ageGroup: string, gender: "male" | "female", factorCode: string): ConnersNorm | undefined {
  return CONNERS_NORMS.find(n => n.age_group === ageGroup && n.gender === gender && n.factor_code === factorCode);
}

export function getAgeGroup(years: number): string | null {
  if (years >= 3 && years <= 5) return "3-5";
  if (years >= 6 && years <= 8) return "6-8";
  if (years >= 9 && years <= 11) return "9-11";
  if (years >= 12 && years <= 14) return "12-14";
  if (years >= 15 && years <= 17) return "15-17";
  return null;
}

export function calculateAgeYears(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    years--;
  }
  return years;
}

export function isAbnormal(factorAvg: number, norm: ConnersNorm | undefined): boolean {
  if (!norm) return factorAvg >= 1.5;
  return factorAvg > (norm.mean + 2 * norm.sd);
}

export function getSeverityLevel(
  abnormalFactors: number,
  hiAbnormal: boolean,
  hiScore: number
): "normal" | "mild" | "moderate" | "severe" {
  if (!hiAbnormal && abnormalFactors === 0) return "normal";
  if (abnormalFactors <= 1 && hiScore < 1.8) return "mild";
  if (abnormalFactors <= 2 && hiScore < 2.0) return "moderate";
  return "severe";
}

export const SEVERITY_LABELS = {
  normal: { label: "正常范围", desc: "因子得分在常模范围内，行为表现与同龄儿童相当。" },
  mild: { label: "轻度异常", desc: "个别因子得分略高于正常上限，存在轻微行为问题倾向，建议加强家庭教育和行为引导。" },
  moderate: { label: "中度异常", desc: "多个因子得分明显升高，存在较为显著的行为问题，建议进行专业评估和针对性干预。" },
  severe: { label: "重度异常", desc: "多因子得分显著升高，特别是多动指数偏高，强烈建议尽快到发育行为科/儿保科/儿童精神科就诊。" },
};
