import db from "./db";
import { generate, type ChatMessage } from "./ai";
import {
  getScoresForSession,
  summarizeByDomain,
  type ScoreRow,
} from "./assessment";
import { ageLabel } from "./age";
import { ABLLS_DOMAINS, ABLLS_SCORE_LEVELS } from "./ablls-catalog";

export type AssessmentReport = {
  session_id: number;
  strengths: string | null;
  weaknesses: string | null;
  analysis: string | null;
  short_term_goals: string | null;
  mid_term_goals: string | null;
  long_term_goals: string | null;
  family_advice: string | null;
  updated_at: string;
};

export const REPORT_FIELDS: Array<{
  key: keyof Omit<AssessmentReport, "session_id" | "updated_at">;
  label: string;
  placeholder: string;
}> = [
  { key: "strengths", label: "优势能力", placeholder: "孩子目前已经掌握或表现较好的方面" },
  { key: "weaknesses", label: "待提升能力", placeholder: "本次评估中得分较低、需要重点训练的项目" },
  { key: "analysis", label: "综合分析", placeholder: "整体行为模式、配合度、学习风格等" },
  { key: "short_term_goals", label: "短期目标 (1-3 个月)", placeholder: "近期可实现的小目标" },
  { key: "mid_term_goals", label: "中期目标 (3-6 个月)", placeholder: "" },
  { key: "long_term_goals", label: "长期目标 (6-12 个月)", placeholder: "" },
  { key: "family_advice", label: "家长配合建议", placeholder: "结合家长问卷里的强化物、关注问题给出居家建议" },
];

export function getReportForSession(sessionId: number): AssessmentReport | null {
  const row = db
    .prepare("SELECT * FROM assessment_reports WHERE session_id = ?")
    .get(sessionId) as AssessmentReport | undefined;
  return row ?? null;
}

/**
 * 评估场景的家长问卷字段(用于喂给芽宝)。所有字段可空。
 */
type Questionnaire = {
  parent_name: string | null;
  parent_expectations: string | null;
  diagnosis: string | null;
  current_training: string | null;
  medication: string | null;
  allergies: string | null;
  main_reinforcers: string | null;
  top_concerns: string | null;
  daily_behavior: string | null;
  prior_assessment: string | null;
};

type ChildBasics = {
  name: string;
  child_gender: string | null;
  child_birth_date: string | null;
  diagnosis_notes: string | null;
  parent_expectations: string | null;
};

/**
 * 拼接喂给芽宝的"用户提示词":孩子基本信息 + 家长问卷 + 本次评估各项得分。
 */
function buildUserPrompt(
  child: ChildBasics,
  q: Questionnaire | null,
  scores: ScoreRow[],
  sessionNotes: string | null
): string {
  const summary = summarizeByDomain(scores);

  const lines: string[] = [];
  lines.push("# 孩子基本信息");
  lines.push(`姓名:${child.name}`);
  if (child.child_gender) lines.push(`性别:${child.child_gender}`);
  if (child.child_birth_date) {
    const a = ageLabel(child.child_birth_date);
    lines.push(`出生日期:${child.child_birth_date}${a ? ` (实足 ${a})` : ""}`);
  }
  if (child.diagnosis_notes) lines.push(`诊断备注:${child.diagnosis_notes}`);
  if (child.parent_expectations) lines.push(`家长期望:${child.parent_expectations}`);

  if (q) {
    lines.push("");
    lines.push("# 家长问卷信息(填写过的)");
    if (q.diagnosis) lines.push(`正式诊断:${q.diagnosis}`);
    if (q.current_training) lines.push(`当前康复训练:${q.current_training}`);
    if (q.medication) lines.push(`服药情况:${q.medication}`);
    if (q.allergies) lines.push(`过敏 / 禁忌:${q.allergies}`);
    if (q.main_reinforcers) lines.push(`主要强化物:${q.main_reinforcers}`);
    if (q.top_concerns) lines.push(`家长最关注的问题:${q.top_concerns}`);
    if (q.daily_behavior) lines.push(`日常表现:${q.daily_behavior}`);
    if (q.prior_assessment) lines.push(`上一次评估:${q.prior_assessment}`);
  }

  lines.push("");
  lines.push("# 本次 ABLLS-R 评估结果");
  if (sessionNotes) lines.push(`评估师备注:${sessionNotes}`);
  lines.push("");
  lines.push("## 各领域得分均值 (0-4 分,4 分为完全掌握)");
  for (const d of summary) {
    if (d.scored_count === 0) {
      lines.push(`- ${d.code} ${d.label}:未评`);
    } else {
      lines.push(
        `- ${d.code} ${d.label}:均分 ${d.average} (${d.level?.label}),已评 ${d.scored_count}/${d.total_items} 项`
      );
    }
  }

  // 按领域列出每项的得分明细,让芽宝能给针对性建议
  const scoresByDomain = new Map<string, ScoreRow[]>();
  for (const s of scores) {
    const list = scoresByDomain.get(s.domain_code) ?? [];
    list.push(s);
    scoresByDomain.set(s.domain_code, list);
  }
  lines.push("");
  lines.push("## 各项明细 (按领域)");
  for (const d of ABLLS_DOMAINS) {
    const items = scoresByDomain.get(d.code);
    if (!items || items.length === 0) continue;
    lines.push("");
    lines.push(`### ${d.code} ${d.label}`);
    for (const s of items) {
      const lv = ABLLS_SCORE_LEVELS.find((l) => l.value === s.score);
      lines.push(
        `- ${s.item_code} ${s.name}:${s.score} 分 (${lv?.label})${s.notes ? ` — 备注:${s.notes}` : ""}`
      );
    }
  }

  return lines.join("\n");
}

const SYSTEM_PROMPT = `你是一位有 10 年经验的特殊教育评估师,熟悉 ABLLS-R(基本语言和学习技能评估,修订版)和 ABA(应用行为分析)干预方法。

接下来用户会发给你一名学生的:
- 基本信息(姓名、性别、年龄、诊断)
- 家长问卷里关于强化物、关注问题、过敏、日常表现等的信息
- 本次 ABLLS-R 评估各领域均分 + 每项明细得分

你需要根据这些信息,输出一份完整的评估报告草稿,**严格按下面的 JSON 格式输出,不要带 markdown 代码块,不要解释:**

{
  "strengths": "优势能力(指出 2-4 个孩子目前掌握较好的领域 / 具体项目)",
  "weaknesses": "待提升能力(指出 2-4 个低分领域 / 关键弱项,要写得具体)",
  "analysis": "综合分析(整体行为模式、学习风格、本次评估中的关键观察)",
  "short_term_goals": "短期目标(1-3 个月内可达成的 2-3 个具体小目标,每个目标都要可观测、可量化)",
  "mid_term_goals": "中期目标(3-6 个月)",
  "long_term_goals": "长期目标(6-12 个月)",
  "family_advice": "家长配合建议(2-4 条,要结合家长提供的强化物和关注问题,写居家可操作的方法)"
}

重要原则:
- 全部用中文,温和、专业、可操作。
- 各字段内不要再嵌套 markdown 标题或 JSON,直接用换行 + 短横线写要点即可。
- 不要做医学诊断或用药建议,任何医疗相关问题都建议家长咨询专业医生。
- 强化物 / 过敏 / 关注问题,如果家长问卷里提了,你的建议要明确呼应这些信息。
- 没评的领域不要瞎编,直接在分析里说"领域 X 未评估,建议下次补充"即可。`;

function tryParseReport(text: string): Record<string, string> {
  // 模型偶尔会在 JSON 外面加 ```json 包裹,先剥掉
  let clean = text.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  // 找第一个 { 到最后一个 }
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("芽宝返回的内容不是 JSON 格式");
  }
  const json = clean.slice(start, end + 1);
  const parsed = JSON.parse(json);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("芽宝返回的 JSON 不是对象");
  }
  return parsed as Record<string, string>;
}

/**
 * 喂数据 → 调 DeepSeek → 解析 JSON → 写入 assessment_reports 表。
 * 调用者:Server Action,本函数会抛异常时由调用方捕获并显示给用户。
 */
export async function generateReportForSession(
  sessionId: number,
  childId: number
): Promise<AssessmentReport> {
  const child = db
    .prepare(
      "SELECT name, child_gender, child_birth_date, diagnosis_notes, parent_expectations FROM children WHERE id = ?"
    )
    .get(childId) as ChildBasics | undefined;
  if (!child) throw new Error("找不到学生记录");

  const session = db
    .prepare("SELECT session_notes FROM assessment_sessions WHERE id = ?")
    .get(sessionId) as { session_notes: string | null } | undefined;
  if (!session) throw new Error("找不到评估记录");

  const q =
    (db
      .prepare(
        `SELECT parent_name, parent_expectations, diagnosis, current_training,
                medication, allergies, main_reinforcers, top_concerns,
                daily_behavior, prior_assessment
         FROM parent_questionnaires WHERE child_id = ?`
      )
      .get(childId) as Questionnaire | undefined) ?? null;

  const scores = getScoresForSession(sessionId);
  if (scores.length === 0) {
    throw new Error("本次评估还没有打分项,无法生成报告");
  }

  const userPrompt = buildUserPrompt(child, q, scores, session.session_notes);

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const text = await generate(messages, { temperature: 0.6, maxTokens: 3000 });
  const parsed = tryParseReport(text);

  // 写入(UPSERT)
  db.prepare(
    `INSERT INTO assessment_reports
       (session_id, strengths, weaknesses, analysis,
        short_term_goals, mid_term_goals, long_term_goals, family_advice, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(session_id) DO UPDATE SET
       strengths = excluded.strengths,
       weaknesses = excluded.weaknesses,
       analysis = excluded.analysis,
       short_term_goals = excluded.short_term_goals,
       mid_term_goals = excluded.mid_term_goals,
       long_term_goals = excluded.long_term_goals,
       family_advice = excluded.family_advice,
       updated_at = CURRENT_TIMESTAMP`
  ).run(
    sessionId,
    parsed.strengths ?? null,
    parsed.weaknesses ?? null,
    parsed.analysis ?? null,
    parsed.short_term_goals ?? null,
    parsed.mid_term_goals ?? null,
    parsed.long_term_goals ?? null,
    parsed.family_advice ?? null
  );

  return getReportForSession(sessionId)!;
}

/**
 * 老师手动编辑后保存(覆盖 7 个字段)。
 */
export function saveReportEdits(
  sessionId: number,
  fields: Partial<Omit<AssessmentReport, "session_id" | "updated_at">>
) {
  db.prepare(
    `INSERT INTO assessment_reports
       (session_id, strengths, weaknesses, analysis,
        short_term_goals, mid_term_goals, long_term_goals, family_advice, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(session_id) DO UPDATE SET
       strengths = excluded.strengths,
       weaknesses = excluded.weaknesses,
       analysis = excluded.analysis,
       short_term_goals = excluded.short_term_goals,
       mid_term_goals = excluded.mid_term_goals,
       long_term_goals = excluded.long_term_goals,
       family_advice = excluded.family_advice,
       updated_at = CURRENT_TIMESTAMP`
  ).run(
    sessionId,
    fields.strengths ?? null,
    fields.weaknesses ?? null,
    fields.analysis ?? null,
    fields.short_term_goals ?? null,
    fields.mid_term_goals ?? null,
    fields.long_term_goals ?? null,
    fields.family_advice ?? null
  );
}
