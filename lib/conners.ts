import { randomUUID } from "node:crypto";
import db from "./db";
import {
  type QuestionnaireType,
  type ConnersFactor,
  type ConnersNorm,
  getFactorsForQuestionnaire,
  getItemsByQuestionnaire,
  getNorm,
  getAgeGroup,
  calculateAgeYears,
  isAbnormal,
  getSeverityLevel,
  SEVERITY_LABELS,
} from "./conners-catalog";

// ─── Types ──────────────────────────────────────────────────────────

export type ConnersSessionRow = {
  id: number;
  child_id: number;
  evaluator_user_id: number | null;
  evaluator_name: string | null;
  questionnaire_type: QuestionnaireType;
  respondent_role: string | null;
  respondent_name: string | null;
  session_notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type ConnersScoreRow = {
  item_id: number;
  score: number;
  notes: string | null;
  questionnaire_type: QuestionnaireType;
  item_number: number;
  name: string;
  factor_code: string | null;
  is_hyperactivity_index: number;
  order_in_questionnaire: number;
};

export type FactorScore = {
  code: string;
  label: string;
  total_score: number;
  item_count: number;
  average: number;
  is_abnormal: boolean;
  norm_mean: number | null;
  norm_sd: number | null;
};

export type ConnersResultSummary = {
  questionnaire_type: QuestionnaireType;
  total_items: number;
  scored_count: number;
  total_score: number;
  average: number;
  factors: FactorScore[];
  hyperactivity_index: FactorScore | null;
  severity: "normal" | "mild" | "moderate" | "severe";
  severity_label: string;
  severity_desc: string;
};

// ─── Session CRUD ───────────────────────────────────────────────────

export function getSessionsForChild(childId: number): ConnersSessionRow[] {
  return db
    .prepare(
      `SELECT * FROM conners_sessions
       WHERE child_id = ?
       ORDER BY created_at DESC`
    )
    .all(childId) as ConnersSessionRow[];
}

export function getSessionById(
  sessionId: number,
  childId: number
): ConnersSessionRow | undefined {
  return db
    .prepare(
      `SELECT * FROM conners_sessions WHERE id = ? AND child_id = ?`
    )
    .get(sessionId, childId) as ConnersSessionRow | undefined;
}

export function createSession(
  childId: number,
  evaluatorUserId: number | null,
  evaluatorName: string | null,
  questionnaireType: QuestionnaireType,
  respondentRole: string | null,
  respondentName: string | null,
  sessionNotes: string | null
): number {
  const result = db
    .prepare(
      `INSERT INTO conners_sessions
       (child_id, evaluator_user_id, evaluator_name, questionnaire_type,
        respondent_role, respondent_name, session_notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'completed')`
    )
    .run(
      childId,
      evaluatorUserId,
      evaluatorName,
      questionnaireType,
      respondentRole,
      respondentName,
      sessionNotes
    );
  return Number(result.lastInsertRowid);
}

// ─── Score CRUD ─────────────────────────────────────────────────────

export function saveScores(
  sessionId: number,
  scores: Array<{ itemId: number; score: number; notes: string | null }>
) {
  const insert = db.prepare(
    `INSERT INTO conners_scores (session_id, item_id, score, notes)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(session_id, item_id) DO UPDATE SET
       score = excluded.score,
       notes = excluded.notes`
  );
  const txn = db.transaction(() => {
    for (const s of scores) {
      insert.run(sessionId, s.itemId, s.score, s.notes || null);
    }
  });
  txn();
}

export function getScoresForSession(sessionId: number): ConnersScoreRow[] {
  return db
    .prepare(
      `SELECT
         s.item_id, s.score, s.notes,
         i.questionnaire_type, i.item_number, i.name,
         i.factor_code, i.is_hyperactivity_index, i.order_in_questionnaire
       FROM conners_scores s
       JOIN conners_items i ON i.id = s.item_id
       WHERE s.session_id = ?
       ORDER BY i.order_in_questionnaire`
    )
    .all(sessionId) as ConnersScoreRow[];
}

// ─── Factor & Norm calculations ─────────────────────────────────────

export function calculateResults(
  sessionId: number,
  childBirthDate: string | null,
  childGender: string | null
): ConnersResultSummary | null {
  const session = db
    .prepare("SELECT * FROM conners_sessions WHERE id = ?")
    .get(sessionId) as ConnersSessionRow | undefined;
  if (!session) return null;

  const scores = getScoresForSession(sessionId);
  if (scores.length === 0) return null;

  const factors = getFactorsForQuestionnaire(session.questionnaire_type);
  const ageYears = calculateAgeYears(childBirthDate);
  const gender: "male" | "female" | null =
    childGender === "男"
      ? "male"
      : childGender === "女"
        ? "female"
        : null;
  const ageGroup = ageYears !== null ? getAgeGroup(ageYears) : null;

  // Build score map: item_number -> score
  const scoreMap = new Map<number, number>();
  for (const s of scores) {
    scoreMap.set(s.item_number, s.score);
  }

  let abnormalFactorCount = 0;
  let hiFactor: FactorScore | null = null;
  const factorScores: FactorScore[] = [];

  for (const factor of factors) {
    let total = 0;
    let scored = 0;
    for (const num of factor.item_numbers) {
      const sc = scoreMap.get(num);
      if (sc !== undefined) {
        total += sc;
        scored++;
      }
    }
    const avg = scored > 0 ? Math.round((total / scored) * 100) / 100 : 0;
    const norm =
      ageGroup && gender ? getNorm(ageGroup, gender, factor.code) : undefined;
    const abnormal = isAbnormal(avg, norm);

    const fs: FactorScore = {
      code: factor.code,
      label: factor.label,
      total_score: total,
      item_count: factor.item_numbers.length,
      average: avg,
      is_abnormal: abnormal,
      norm_mean: norm?.mean ?? null,
      norm_sd: norm?.sd ?? null,
    };

    if (factor.code === "HI") {
      hiFactor = fs;
    } else {
      factorScores.push(fs);
      if (abnormal) abnormalFactorCount++;
    }
  }

  const totalItems =
    session.questionnaire_type === "parent"
      ? 48
      : session.questionnaire_type === "teacher"
        ? 28
        : 10;

  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
  const avg =
    scores.length > 0
      ? Math.round((totalScore / scores.length) * 100) / 100
      : 0;

  const severity = getSeverityLevel(
    abnormalFactorCount,
    hiFactor?.is_abnormal ?? false,
    hiFactor?.average ?? 0
  );

  const sev = SEVERITY_LABELS[severity];

  return {
    questionnaire_type: session.questionnaire_type,
    total_items: totalItems,
    scored_count: scores.length,
    total_score: totalScore,
    average: avg,
    factors: factorScores,
    hyperactivity_index: hiFactor,
    severity,
    severity_label: sev.label,
    severity_desc: sev.desc,
  };
}

// ─── Token helpers (for parent scan) ────────────────────────────────

export function createToken(childId: number): string {
  const token = randomUUID();
  db.prepare(
    `INSERT INTO conners_tokens (child_id, token) VALUES (?, ?)`
  ).run(childId, token);
  return token;
}

export function getToken(token: string) {
  return db
    .prepare(`SELECT * FROM conners_tokens WHERE token = ?`)
    .get(token) as
    | { id: number; child_id: number; token: string; used_session_id: number | null; created_at: string }
    | undefined;
}

export function markTokenUsed(tokenId: number, sessionId: number) {
  db.prepare(
    `UPDATE conners_tokens SET used_session_id = ? WHERE id = ?`
  ).run(sessionId, tokenId);
}

export function getLatestTokenForChild(childId: number) {
  return db
    .prepare(
      `SELECT * FROM conners_tokens WHERE child_id = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(childId) as
    | { id: number; child_id: number; token: string; used_session_id: number | null; created_at: string }
    | undefined;
}

// ─── Get item DB id by (type, item_number) ──────────────────────────

export function getItemId(
  questionnaireType: QuestionnaireType,
  itemNumber: number
): number | undefined {
  const row = db
    .prepare(
      `SELECT id FROM conners_items WHERE questionnaire_type = ? AND item_number = ?`
    )
    .get(questionnaireType, itemNumber) as { id: number } | undefined;
  return row?.id;
}

// ─── Questionnaire label helper ─────────────────────────────────────

export function questionnaireLabel(type: QuestionnaireType): string {
  switch (type) {
    case "parent":
      return "父母问卷";
    case "teacher":
      return "教师问卷";
    case "brief":
      return "简明问卷";
  }
}

export function respondentRoleLabel(role: string | null): string {
  if (!role) return "";
  switch (role) {
    case "father":
      return "父亲";
    case "mother":
      return "母亲";
    case "teacher":
      return "教师";
    default:
      return role;
  }
}
