import db from "./db";
import { ABLLS_DOMAINS, avgToLevel } from "./ablls-catalog";

export type SessionRow = {
  id: number;
  child_id: number;
  evaluator_user_id: number | null;
  evaluator_name: string | null;
  session_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ScoreRow = {
  item_id: number;
  score: number;
  notes: string | null;
  // joined fields:
  domain_code: string;
  item_code: string;
  name: string;
  goal: string;
  order_in_domain: number;
};

export type DomainSummary = {
  code: string;
  label: string;
  total_items: number; // 该领域目录里的总题数
  scored_count: number; // 本次评估这个领域评了几项
  average: number | null; // 已评项的平均分
  level: { label: string; desc: string } | null;
};

/** 取一次评估的所有得分(联表带题目信息) */
export function getScoresForSession(sessionId: number): ScoreRow[] {
  return db
    .prepare(
      `SELECT s.item_id, s.score, s.notes,
              i.domain_code, i.item_code, i.name, i.goal, i.order_in_domain
       FROM assessment_scores s
       JOIN ablls_items i ON i.id = s.item_id
       WHERE s.session_id = ?
       ORDER BY i.domain_code, i.order_in_domain`
    )
    .all(sessionId) as ScoreRow[];
}

/** 算每个领域的均分和等级 */
export function summarizeByDomain(scores: ScoreRow[]): DomainSummary[] {
  // 各领域目录总数
  const totalsByDomain = new Map<string, number>();
  for (const d of ABLLS_DOMAINS) {
    totalsByDomain.set(d.code, d.item_count);
  }
  // 各领域得分聚合
  const sumByDomain = new Map<string, { sum: number; count: number }>();
  for (const s of scores) {
    const agg = sumByDomain.get(s.domain_code) ?? { sum: 0, count: 0 };
    agg.sum += s.score;
    agg.count += 1;
    sumByDomain.set(s.domain_code, agg);
  }

  return ABLLS_DOMAINS.map((d) => {
    const agg = sumByDomain.get(d.code);
    const average =
      agg && agg.count > 0 ? Math.round((agg.sum / agg.count) * 100) / 100 : null;
    return {
      code: d.code,
      label: d.label,
      total_items: d.item_count,
      scored_count: agg?.count ?? 0,
      average,
      level: avgToLevel(average),
    };
  });
}

/** 取学生的最新一次评估 session(可能为 null) */
export function getLatestSessionForChild(childId: number): SessionRow | null {
  return (
    (db
      .prepare(
        "SELECT * FROM assessment_sessions WHERE child_id = ? ORDER BY created_at DESC LIMIT 1"
      )
      .get(childId) as SessionRow | undefined) ?? null
  );
}

/** 取学生的所有评估 session 列表(按时间倒序) */
export function getSessionsForChild(childId: number): SessionRow[] {
  return db
    .prepare(
      "SELECT * FROM assessment_sessions WHERE child_id = ? ORDER BY created_at DESC"
    )
    .all(childId) as SessionRow[];
}
