import db from "./db";
import { CARS_DOMAINS } from "./cars-catalog";

export type CarsSessionRow = {
  id: number;
  child_id: number;
  evaluator_user_id: number | null;
  evaluator_name: string | null;
  session_notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CarsScoreRow = {
  item_id: number;
  score: string;
  notes: string | null;
  // joined fields:
  domain_code: string;
  item_code: string;
  name: string;
  goal: string;
  materials: string | null;
  method: string | null;
  is_observation: number;
  order_in_domain: number;
};

export type DomainSummary = {
  code: string;
  label: string;
  is_pathology: boolean;
  total_items: number;
  p_count: number;
  m_count: number;
  f_count: number;
  n_count: number;
  l_count: number;
  s_count: number;
  pass_rate: number | null; // 功能领域:通过率, 病理领域:异常率
};

/** 取一次评估的所有得分(联表带题目信息) */
export function getScoresForSession(sessionId: number): CarsScoreRow[] {
  return db
    .prepare(
      `SELECT s.item_id, s.score, s.notes,
              i.domain_code, i.item_code, i.name, i.goal,
              i.materials, i.method, i.is_observation, i.order_in_domain
       FROM cars_scores s
       JOIN cars_items i ON i.id = s.item_id
       WHERE s.session_id = ?
       ORDER BY i.domain_code, i.order_in_domain`
    )
    .all(sessionId) as CarsScoreRow[];
}

/** 按领域汇总得分 */
export function summarizeByDomain(scores: CarsScoreRow[]): DomainSummary[] {
  const totalsByDomain = new Map<string, number>();
  for (const d of CARS_DOMAINS) {
    totalsByDomain.set(d.code, d.item_count);
  }

  const countsByDomain = new Map<
    string,
    { p: number; m: number; f: number; n: number; l: number; s: number }
  >();

  for (const s of scores) {
    const agg = countsByDomain.get(s.domain_code) ?? {
      p: 0, m: 0, f: 0, n: 0, l: 0, s: 0,
    };
    switch (s.score) {
      case "P": agg.p++; break;
      case "M": agg.m++; break;
      case "F": agg.f++; break;
      case "N": agg.n++; break;
      case "L": agg.l++; break;
      case "S": agg.s++; break;
    }
    countsByDomain.set(s.domain_code, agg);
  }

  return CARS_DOMAINS.map((d) => {
    const agg = countsByDomain.get(d.code);
    const total = totalsByDomain.get(d.code) ?? 0;

    if (d.is_pathology) {
      // 病理领域:计算异常率(轻度+重度 / 总评)
      const scored = (agg?.n ?? 0) + (agg?.l ?? 0) + (agg?.s ?? 0);
      const abnormalRate = scored > 0
        ? Math.round(((agg?.l ?? 0) + (agg?.s ?? 0)) / scored * 100)
        : null;
      return {
        code: d.code,
        label: d.label,
        is_pathology: true,
        total_items: total,
        p_count: agg?.p ?? 0,
        m_count: agg?.m ?? 0,
        f_count: agg?.f ?? 0,
        n_count: agg?.n ?? 0,
        l_count: agg?.l ?? 0,
        s_count: agg?.s ?? 0,
        pass_rate: abnormalRate,
      };
    } else {
      // 功能领域:计算通过率
      const scored = (agg?.p ?? 0) + (agg?.m ?? 0) + (agg?.f ?? 0);
      const passRate = scored > 0
        ? Math.round(((agg?.p ?? 0) / scored) * 100)
        : null;
      return {
        code: d.code,
        label: d.label,
        is_pathology: false,
        total_items: total,
        p_count: agg?.p ?? 0,
        m_count: agg?.m ?? 0,
        f_count: agg?.f ?? 0,
        n_count: agg?.n ?? 0,
        l_count: agg?.l ?? 0,
        s_count: agg?.s ?? 0,
        pass_rate: passRate,
      };
    }
  });
}

// ==================== Unified Session ====================

/** 查找某儿童的 draft session */
export function getDraftSession(childId: number): CarsSessionRow | null {
  return (
    (db
      .prepare(
        `SELECT * FROM cars_sessions
         WHERE child_id = ? AND status = 'draft'
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(childId) as CarsSessionRow | undefined) ?? null
  );
}

/** 创建 draft session */
export function createDraftSession(
  childId: number,
  evaluatorUserId: number,
  evaluatorName: string
): number {
  const existing = getDraftSession(childId);
  if (existing) return existing.id;

  const result = db
    .prepare(
      `INSERT INTO cars_sessions (child_id, evaluator_user_id, evaluator_name, status)
       VALUES (?, ?, ?, 'draft')`
    )
    .run(childId, evaluatorUserId, evaluatorName);
  return Number(result.lastInsertRowid);
}

/** 取某儿童的最新 completed session */
export function getLatestCompletedSession(childId: number): CarsSessionRow | null {
  return (
    (db
      .prepare(
        `SELECT * FROM cars_sessions
         WHERE child_id = ? AND status = 'completed'
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(childId) as CarsSessionRow | undefined) ?? null
  );
}

/** 获取一次 session 在 14 个领域的进度 */
export function getCarsProgress(sessionId: number): Array<{
  code: string;
  label: string;
  scored: number;
  total: number;
}> {
  const scores = getScoresForSession(sessionId);
  const scoredByDomain = new Map<string, number>();
  for (const s of scores) {
    scoredByDomain.set(s.domain_code, (scoredByDomain.get(s.domain_code) ?? 0) + 1);
  }

  return CARS_DOMAINS.map((d) => ({
    code: d.code,
    label: d.label,
    scored: scoredByDomain.get(d.code) ?? 0,
    total: d.item_count,
  }));
}

/** 取某领域最新已完成评估的得分 */
export function getLatestCompletedDomainScores(
  childId: number,
  domainCode: string
): CarsScoreRow[] {
  const latest = getLatestCompletedSession(childId);
  if (!latest) return [];
  const scores = getScoresForSession(latest.id).filter(
    (s) => s.domain_code === domainCode
  );
  return scores;
}

// ==================== Session lists ====================

/** 取学生的最新一次 CARS 评估 session */
export function getLatestSessionForChild(childId: number): CarsSessionRow | null {
  return (
    (db
      .prepare(
        "SELECT * FROM cars_sessions WHERE child_id = ? ORDER BY created_at DESC LIMIT 1"
      )
      .get(childId) as CarsSessionRow | undefined) ?? null
  );
}

/** 取学生的所有 CARS 评估 session 列表 */
export function getSessionsForChild(childId: number): CarsSessionRow[] {
  return db
    .prepare(
      "SELECT * FROM cars_sessions WHERE child_id = ? ORDER BY created_at DESC"
    )
    .all(childId) as CarsSessionRow[];
}

/** 取某领域的所有项目 */
export function getItemsByDomain(domainCode: string) {
  return db
    .prepare(
      `SELECT * FROM cars_items WHERE domain_code = ? ORDER BY order_in_domain`
    )
    .all(domainCode);
}

/** 取某次评估某领域的得分 */
export function getDomainScores(sessionId: number, domainCode: string): CarsScoreRow[] {
  return db
    .prepare(
      `SELECT s.item_id, s.score, s.notes,
              i.domain_code, i.item_code, i.name, i.goal,
              i.materials, i.method, i.is_observation, i.order_in_domain
       FROM cars_scores s
       JOIN cars_items i ON i.id = s.item_id
       WHERE s.session_id = ? AND i.domain_code = ?
       ORDER BY i.order_in_domain`
    )
    .all(sessionId, domainCode) as CarsScoreRow[];
}

/** 保存/更新单个评分（用于自动保存） */
export function saveDraftScore(
  sessionId: number,
  itemId: number,
  score: string,
  notes: string | null
): void {
  const existing = db
    .prepare("SELECT 1 FROM cars_scores WHERE session_id = ? AND item_id = ?")
    .get(sessionId, itemId);

  if (existing) {
    db.prepare(
      `UPDATE cars_scores SET score = ?, notes = ? WHERE session_id = ? AND item_id = ?`
    ).run(score, notes, sessionId, itemId);
  } else {
    db.prepare(
      `INSERT INTO cars_scores (session_id, item_id, score, notes) VALUES (?, ?, ?, ?)`
    ).run(sessionId, itemId, score, notes);
  }
}

/** 提交草稿 session（改为 completed） */
export function submitDraftSession(
  sessionId: number,
  sessionNotes: string | null
): void {
  db.prepare(
    `UPDATE cars_sessions SET status = 'completed', session_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(sessionNotes, sessionId);
}

/** 取某 session 的所有得分（仅 item_id + score，用于草稿加载） */
export function getDraftScores(
  sessionId: number
): Array<{ item_id: number; score: string; notes: string | null }> {
  return db
    .prepare("SELECT item_id, score, notes FROM cars_scores WHERE session_id = ?")
    .all(sessionId) as Array<{ item_id: number; score: string; notes: string | null }>;
}
