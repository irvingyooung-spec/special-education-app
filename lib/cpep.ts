import db from "./db";
import { CPEP_DOMAINS } from "./cpep-catalog";

export type CpepSessionRow = {
  id: number;
  child_id: number;
  evaluator_user_id: number | null;
  evaluator_name: string | null;
  domain_code: string | null;
  session_notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

export type CpepScoreRow = {
  item_id: number;
  score: string;
  notes: string | null;
  // joined fields:
  domain_code: string;
  item_code: string;
  subdomain: string;
  name: string;
  goal: string;
  materials: string | null;
  method: string | null;
  criteria: string | null;
  age: string | null;
  marker: string | null;
  order_in_domain: number;
};

export type DomainSummary = {
  code: string;
  label: string;
  total_items: number;
  p_count: number;
  e_count: number;
  f_count: number;
  x_count: number;
  a_count: number;
  m_count: number;
  s_count: number;
  pass_rate: number | null;
};

/** 取一次评估的所有得分(联表带题目信息) */
export function getScoresForSession(sessionId: number): CpepScoreRow[] {
  return db
    .prepare(
      `SELECT s.item_id, s.score, s.notes,
              i.domain_code, i.item_code, i.subdomain, i.name, i.goal,
              i.materials, i.method, i.criteria, i.age, i.marker, i.order_in_domain
       FROM cpep_scores s
       JOIN cpep_items i ON i.id = s.item_id
       WHERE s.session_id = ?
       ORDER BY i.domain_code, i.order_in_domain`
    )
    .all(sessionId) as CpepScoreRow[];
}

/** 按领域汇总得分 */
export function summarizeByDomain(scores: CpepScoreRow[]): DomainSummary[] {
  // 各领域目录总数
  const totalsByDomain = new Map<string, number>();
  for (const d of CPEP_DOMAINS) {
    totalsByDomain.set(d.code, d.item_count);
  }

  // 各领域得分聚合
  const countsByDomain = new Map<string, {
    p: number; e: number; f: number; x: number;
    a: number; m: number; s: number;
  }>();

  for (const s of scores) {
    const agg = countsByDomain.get(s.domain_code) ?? {
      p: 0, e: 0, f: 0, x: 0, a: 0, m: 0, s: 0,
    };
    switch (s.score) {
      case "P": agg.p++; break;
      case "E": agg.e++; break;
      case "F": agg.f++; break;
      case "X": agg.x++; break;
      case "A": agg.a++; break;
      case "M": agg.m++; break;
      case "S": agg.s++; break;
    }
    countsByDomain.set(s.domain_code, agg);
  }

  return CPEP_DOMAINS.map((d) => {
    const agg = countsByDomain.get(d.code);
    const total = totalsByDomain.get(d.code) ?? 0;

    if (d.is_emotion) {
      // 情绪与行为: 计算正常率
      const scored = (agg?.a ?? 0) + (agg?.m ?? 0) + (agg?.s ?? 0);
      const normalRate = scored > 0
        ? Math.round(((agg?.a ?? 0) / scored) * 100)
        : null;
      return {
        code: d.code,
        label: d.label,
        total_items: total,
        p_count: agg?.p ?? 0,
        e_count: agg?.e ?? 0,
        f_count: agg?.f ?? 0,
        x_count: agg?.x ?? 0,
        a_count: agg?.a ?? 0,
        m_count: agg?.m ?? 0,
        s_count: agg?.s ?? 0,
        pass_rate: normalRate,
      };
    } else {
      // 发展能力: 计算通过率
      const scored = (agg?.p ?? 0) + (agg?.e ?? 0) + (agg?.f ?? 0);
      const passRate = scored > 0
        ? Math.round(((agg?.p ?? 0) / scored) * 100)
        : null;
      return {
        code: d.code,
        label: d.label,
        total_items: total,
        p_count: agg?.p ?? 0,
        e_count: agg?.e ?? 0,
        f_count: agg?.f ?? 0,
        x_count: agg?.x ?? 0,
        a_count: agg?.a ?? 0,
        m_count: agg?.m ?? 0,
        s_count: agg?.s ?? 0,
        pass_rate: passRate,
      };
    }
  });
}

/** 取学生的最新一次 CPEP 评估 session */
export function getLatestSessionForChild(childId: number): CpepSessionRow | null {
  return (
    (db
      .prepare(
        "SELECT * FROM cpep_sessions WHERE child_id = ? ORDER BY created_at DESC LIMIT 1"
      )
      .get(childId) as CpepSessionRow | undefined) ?? null
  );
}

/** 取学生的所有 CPEP 评估 session 列表 */
export function getSessionsForChild(childId: number): CpepSessionRow[] {
  return db
    .prepare(
      "SELECT * FROM cpep_sessions WHERE child_id = ? ORDER BY created_at DESC"
    )
    .all(childId) as CpepSessionRow[];
}

/** 取某领域的所有项目 */
export function getItemsByDomain(domainCode: string) {
  return db
    .prepare(
      `SELECT * FROM cpep_items WHERE domain_code = ? ORDER BY order_in_domain`
    )
    .all(domainCode);
}

/** 取某次评估某领域的得分 */
export function getDomainScores(sessionId: number, domainCode: string): CpepScoreRow[] {
  return db
    .prepare(
      `SELECT s.item_id, s.score, s.notes,
              i.domain_code, i.item_code, i.subdomain, i.name, i.goal,
              i.materials, i.method, i.criteria, i.age, i.marker, i.order_in_domain
       FROM cpep_scores s
       JOIN cpep_items i ON i.id = s.item_id
       WHERE s.session_id = ? AND i.domain_code = ?
       ORDER BY i.order_in_domain`
    )
    .all(sessionId, domainCode) as CpepScoreRow[];
}

/** 检查某儿童某领域是否有已完成的评估 */
export function hasDomainAssessment(childId: number, domainCode: string): boolean {
  const row = db
    .prepare(
      `SELECT COUNT(*) as c FROM cpep_sessions
       WHERE child_id = ? AND domain_code = ? AND status = 'completed'`
    )
    .get(childId, domainCode) as { c: number };
  return row.c > 0;
}

/** 取某儿童某领域的最新评估 */
export function getLatestDomainSession(childId: number, domainCode: string): CpepSessionRow | null {
  return (
    (db
      .prepare(
        `SELECT * FROM cpep_sessions
         WHERE child_id = ? AND domain_code = ?
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(childId, domainCode) as CpepSessionRow | undefined) ?? null
  );
}

/** 取某儿童某领域的最新已完成评估 */
export function getLatestCompletedDomainSession(childId: number, domainCode: string): CpepSessionRow | null {
  return (
    (db
      .prepare(
        `SELECT * FROM cpep_sessions
         WHERE child_id = ? AND domain_code = ? AND status = 'completed'
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(childId, domainCode) as CpepSessionRow | undefined) ?? null
  );
}

/** 取某儿童某领域的草稿 session */
export function getDraftSession(childId: number, domainCode: string): CpepSessionRow | null {
  return (
    (db
      .prepare(
        `SELECT * FROM cpep_sessions
         WHERE child_id = ? AND domain_code = ? AND status = 'draft'
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(childId, domainCode) as CpepSessionRow | undefined) ?? null
  );
}

/** 创建草稿 session（如果已有 draft 则返回已有 ID） */
export function createDraftSession(
  childId: number,
  evaluatorUserId: number,
  evaluatorName: string,
  domainCode: string
): number {
  const existing = getDraftSession(childId, domainCode);
  if (existing) return existing.id;

  const result = db
    .prepare(
      `INSERT INTO cpep_sessions (child_id, evaluator_user_id, evaluator_name, domain_code, status)
       VALUES (?, ?, ?, ?, 'draft')`
    )
    .run(childId, evaluatorUserId, evaluatorName, domainCode);
  return Number(result.lastInsertRowid);
}

/** 保存/更新单个评分（用于自动保存） */
export function saveDraftScore(
  sessionId: number,
  itemId: number,
  score: string,
  notes: string | null
): void {
  const existing = db
    .prepare("SELECT 1 FROM cpep_scores WHERE session_id = ? AND item_id = ?")
    .get(sessionId, itemId);

  if (existing) {
    db.prepare(
      `UPDATE cpep_scores SET score = ?, notes = ? WHERE session_id = ? AND item_id = ?`
    ).run(score, notes, sessionId, itemId);
  } else {
    db.prepare(
      `INSERT INTO cpep_scores (session_id, item_id, score, notes) VALUES (?, ?, ?, ?)`
    ).run(sessionId, itemId, score, notes);
  }
}

/** 提交草稿 session（改为 completed） */
export function submitDraftSession(
  sessionId: number,
  sessionNotes: string | null
): void {
  db.prepare(
    `UPDATE cpep_sessions SET status = 'completed', session_notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(sessionNotes, sessionId);
}

/** 取某 session 的所有得分（仅 item_id + score，用于草稿加载） */
export function getDraftScores(sessionId: number): Array<{ item_id: number; score: string; notes: string | null }> {
  return db
    .prepare("SELECT item_id, score, notes FROM cpep_scores WHERE session_id = ?")
    .all(sessionId) as Array<{ item_id: number; score: string; notes: string | null }>;
}
