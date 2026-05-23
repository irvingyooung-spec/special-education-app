import db from "./db";
import { generate, type ChatMessage } from "./ai";
import {
  getScoresForSession,
  summarizeByDomain,
  type CarsScoreRow,
} from "./cars";
import { ageLabel } from "./age";

export type CarsAssessmentReport = {
  session_id: number;
  summary: string | null;
  pathology_analysis: string | null;
  training_goals: string | null;
  family_advice: string | null;
  updated_at: string;
};

export const CARS_REPORT_FIELDS: Array<{
  key: keyof Omit<CarsAssessmentReport, "session_id" | "updated_at">;
  label: string;
  placeholder: string;
}> = [
  {
    key: "summary",
    label: "评估总结与分析",
    placeholder: "优势领域、薄弱领域、关键问题分析、病理学特征分析",
  },
  {
    key: "pathology_analysis",
    label: "病理学特征分析",
    placeholder: "感觉、感情、人际关系、游戏兴趣等病理学特征的综合分析",
  },
  {
    key: "training_goals",
    label: "干预目标建议",
    placeholder: "短期目标（1-3个月）、中期目标（3-6个月）",
  },
  {
    key: "family_advice",
    label: "家庭训练建议",
    placeholder: "每日训练建议、重点训练领域、建议就医/进一步评估",
  },
];

export function getCarsReportForSession(
  sessionId: number
): CarsAssessmentReport | null {
  const row = db
    .prepare("SELECT * FROM cars_reports WHERE session_id = ?")
    .get(sessionId) as CarsAssessmentReport | undefined;
  return row ?? null;
}

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

function buildCarsUserPrompt(
  child: ChildBasics,
  q: Questionnaire | null,
  scores: CarsScoreRow[],
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
  if (child.parent_expectations)
    lines.push(`家长期望:${child.parent_expectations}`);

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
  lines.push("# 本次 CARS 评估结果");
  if (sessionNotes) lines.push(`评估师备注:${sessionNotes}`);
  lines.push("");

  // 功能领域汇总
  lines.push("## 发展能力领域汇总 (P=通过, M=中间反应, F=通不过)");
  for (const s of summary) {
    if (s.is_pathology) continue;
    const scored = s.p_count + s.m_count + s.f_count;
    if (scored === 0) {
      lines.push(`- ${s.label}:未评`);
    } else {
      lines.push(
        `- ${s.label}:通过${s.p_count}项 / 中间${s.m_count}项 / 通不过${s.f_count}项 (通过率:${s.pass_rate ?? "-"}%)`
      );
    }
  }

  // 病理学领域汇总
  lines.push("");
  lines.push("## 病理学特征领域汇总 (N=没有, L=轻度, S=重度)");
  for (const s of summary) {
    if (!s.is_pathology) continue;
    const scored = s.n_count + s.l_count + s.s_count;
    if (scored === 0) {
      lines.push(`- ${s.label}:未评`);
    } else {
      lines.push(
        `- ${s.label}:没有${s.n_count}项 / 轻度${s.l_count}项 / 重度${s.s_count}项 (异常率:${s.pass_rate ?? "-"}%)`
      );
    }
  }

  // 中间反应项和轻度项 = 训练目标
  const mItems = scores.filter((s) => s.score === "M");
  const lItems = scores.filter((s) => s.score === "L");
  if (mItems.length > 0) {
    lines.push("");
    lines.push(`## 中间反应项(M)共${mItems.length}项 — 可直接转化为训练目标`);
    for (const item of mItems) {
      lines.push(`- ${item.name} (${item.goal})`);
    }
  }
  if (lItems.length > 0) {
    lines.push("");
    lines.push(
      `## 轻度异常项(L)共${lItems.length}项 — 需要关注和干预`
    );
    for (const item of lItems) {
      lines.push(`- ${item.name} (${item.goal})`);
    }
  }

  return lines.join("\n");
}

const CARS_SYSTEM_PROMPT = `你是一位有10年经验的特殊教育评估师，熟悉CARS（Childhood Autism Rating Scale，孤独症评定量表）和ABA（应用行为分析）干预方法。

接下来用户会发给你一名学生的:
- 基本信息(姓名、性别、年龄、诊断)
- 家长问卷里关于强化物、关注问题、过敏、日常表现等的信息
- 本次CARS评估结果：9个发展能力领域汇总(P/M/F数量) + 4个病理学特征领域汇总(N/L/S数量) + 中间反应项清单 + 轻度异常项清单

你需要根据这些信息，输出一份完整的CARS评估报告草稿，**严格按下面的JSON格式输出，不要带markdown代码块，不要解释:**

{
  "summary": "评估总结与分析(对发展能力和病理学特征的双轨综合分析：指出2-3个优势领域、2-3个薄弱领域、关键问题分析。引用具体评估项目，写得具体、专业、可操作)",
  "pathology_analysis": "病理学特征分析(分析感觉、感情、人际关系、游戏兴趣等4个病理领域的异常程度：哪些领域正常、哪些轻度异常、哪些重度异常。给出对应的干预策略建议)",
  "training_goals": "干预目标建议(将中间反应项M和轻度异常项L转化为具体可执行的训练目标，按领域分组。每个目标都要可观测、可量化。同时给出短期目标1-3个月和中期目标3-6个月)",
  "family_advice": "家庭训练建议(2-4条居家可操作的方法，要结合家长提供的强化物和关注问题，给出具体的居家训练建议。包括每日训练时间、环境、强化策略、泛化训练等)"
}

重要原则:
- 全部用中文，温和、专业、可操作。
- 各字段内不要再嵌套markdown标题或JSON，直接用换行 + 短横线写要点即可。
- 不要做医学诊断或用药建议，任何医疗相关问题都建议家长咨询专业医生。
- 强化物 / 过敏 / 关注问题，如果家长问卷里提了，你的建议要明确呼应这些信息。
- 没评的领域不要瞎编，直接在分析里说\"领域X未评估，建议下次补充\"即可。
- 训练目标要具体：写明\"在什么情境下、用什么材料、期望儿童做出什么行为、达到什么标准\"。`;

function tryParseReport(text: string): Record<string, string> {
  let clean = text.trim();
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
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

export async function generateCarsReportForSession(
  sessionId: number,
  childId: number
): Promise<CarsAssessmentReport> {
  const child = db
    .prepare(
      "SELECT name, child_gender, child_birth_date, diagnosis_notes, parent_expectations FROM children WHERE id = ?"
    )
    .get(childId) as ChildBasics | undefined;
  if (!child) throw new Error("找不到学生记录");

  const session = db
    .prepare("SELECT session_notes FROM cars_sessions WHERE id = ?")
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
    throw new Error("本次评估还没有打分项，无法生成报告");
  }

  const userPrompt = buildCarsUserPrompt(child, q, scores, session.session_notes);

  const messages: ChatMessage[] = [
    { role: "system", content: CARS_SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ];

  const text = await generate(messages, { temperature: 0.6, maxTokens: 4000 });
  const parsed = tryParseReport(text);

  db.prepare(
    `INSERT INTO cars_reports
       (session_id, summary, pathology_analysis, training_goals, family_advice, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(session_id) DO UPDATE SET
       summary = excluded.summary,
       pathology_analysis = excluded.pathology_analysis,
       training_goals = excluded.training_goals,
       family_advice = excluded.family_advice,
       updated_at = CURRENT_TIMESTAMP`
  ).run(
    sessionId,
    parsed.summary ?? null,
    parsed.pathology_analysis ?? null,
    parsed.training_goals ?? null,
    parsed.family_advice ?? null
  );

  return getCarsReportForSession(sessionId)!;
}

export function saveCarsReportEdits(
  sessionId: number,
  fields: Partial<Omit<CarsAssessmentReport, "session_id" | "updated_at">>
) {
  db.prepare(
    `INSERT INTO cars_reports
       (session_id, summary, pathology_analysis, training_goals, family_advice, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(session_id) DO UPDATE SET
       summary = excluded.summary,
       pathology_analysis = excluded.pathology_analysis,
       training_goals = excluded.training_goals,
       family_advice = excluded.family_advice,
       updated_at = CURRENT_TIMESTAMP`
  ).run(
    sessionId,
    fields.summary ?? null,
    fields.pathology_analysis ?? null,
    fields.training_goals ?? null,
    fields.family_advice ?? null
  );
}
