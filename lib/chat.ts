import db from "./db";
import { generate, type ChatMessage } from "./ai";
import { ageLabel } from "./age";
import { getLatestSessionForChild, getScoresForSession, summarizeByDomain } from "./assessment";
import { getReportForSession } from "./report";

export type Conversation = {
  id: number;
  child_id: number;
  parent_user_id: number;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessageRow = {
  id: number;
  conversation_id: number;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

/**
 * 查找或创建聊天会话。每个孩子一个会话(1:1)。
 */
export function getOrCreateConversation(
  childId: number,
  parentUserId: number
): Conversation {
  const existing = db
    .prepare(
      "SELECT * FROM chat_conversations WHERE child_id = ? AND parent_user_id = ?"
    )
    .get(childId, parentUserId) as Conversation | undefined;

  if (existing) return existing;

  const child = db
    .prepare("SELECT name FROM children WHERE id = ?")
    .get(childId) as { name: string } | undefined;

  const title = child ? `关于 ${child.name} 的咨询` : "家长咨询";

  const result = db
    .prepare(
      "INSERT INTO chat_conversations (child_id, parent_user_id, title) VALUES (?, ?, ?)"
    )
    .run(childId, parentUserId, title);

  return {
    id: Number(result.lastInsertRowid),
    child_id: childId,
    parent_user_id: parentUserId,
    title,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * 获取某会话的历史消息,按时间正序。
 * limit: 限制取多少条(用于控制喂给芽宝的 token 量)。
 */
export function getMessagesForConversation(
  conversationId: number,
  limit = 20
): ChatMessageRow[] {
  return db
    .prepare(
      `SELECT * FROM chat_messages
       WHERE conversation_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(conversationId, limit) as ChatMessageRow[];
}

/**
 * 获取某会话的全部历史消息(用于 UI 展示,不限制条数)。
 */
export function getAllMessagesForConversation(
  conversationId: number
): ChatMessageRow[] {
  return db
    .prepare(
      `SELECT * FROM chat_messages
       WHERE conversation_id = ?
       ORDER BY created_at ASC`
    )
    .all(conversationId) as ChatMessageRow[];
}

/**
 * 保存一条消息到数据库。
 */
export function saveMessage(
  conversationId: number,
  role: "user" | "assistant",
  content: string
): void {
  db.prepare(
    "INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, ?, ?)"
  ).run(conversationId, role, content);

  // 更新会话的 updated_at
  db.prepare(
    "UPDATE chat_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(conversationId);
}

/**
 * 验证家长是否有权访问这个孩子。
 */
export function verifyParentChild(
  parentUserId: number,
  childId: number
): boolean {
  const row = db
    .prepare(
      "SELECT 1 FROM parent_child WHERE parent_user_id = ? AND child_id = ?"
    )
    .get(parentUserId, childId);
  return !!row;
}

/**
 * 拼装孩子的档案信息,作为 system prompt 的 context。
 */
function buildChildContext(childId: number): string {
  const child = db
    .prepare(
      "SELECT name, child_gender, child_birth_date, diagnosis_notes, parent_expectations FROM children WHERE id = ?"
    )
    .get(childId) as
    | {
        name: string;
        child_gender: string | null;
        child_birth_date: string | null;
        diagnosis_notes: string | null;
        parent_expectations: string | null;
      }
    | undefined;

  if (!child) return "(孩子信息暂不可用)";

  const lines: string[] = [];
  lines.push(`姓名:${child.name}`);
  if (child.child_gender) lines.push(`性别:${child.child_gender}`);
  if (child.child_birth_date) {
    const age = ageLabel(child.child_birth_date);
    lines.push(`出生日期:${child.child_birth_date}${age ? ` (实足 ${age})` : ""}`);
  }
  if (child.diagnosis_notes) lines.push(`诊断备注:${child.diagnosis_notes}`);
  if (child.parent_expectations) lines.push(`家长期望:${child.parent_expectations}`);

  // 家长问卷
  const q = db
    .prepare(
      `SELECT diagnosis, current_training, medication, allergies,
              main_reinforcers, top_concerns, daily_behavior, prior_assessment
       FROM parent_questionnaires WHERE child_id = ?`
    )
    .get(childId) as
    | {
        diagnosis: string | null;
        current_training: string | null;
        medication: string | null;
        allergies: string | null;
        main_reinforcers: string | null;
        top_concerns: string | null;
        daily_behavior: string | null;
        prior_assessment: string | null;
      }
    | undefined;

  if (q) {
    lines.push("");
    lines.push("# 家长问卷信息");
    if (q.diagnosis) lines.push(`正式诊断:${q.diagnosis}`);
    if (q.current_training) lines.push(`当前康复训练:${q.current_training}`);
    if (q.medication) lines.push(`服药情况:${q.medication}`);
    if (q.allergies) lines.push(`过敏/禁忌:${q.allergies}`);
    if (q.main_reinforcers) lines.push(`主要强化物:${q.main_reinforcers}`);
    if (q.top_concerns) lines.push(`家长最关注的问题:${q.top_concerns}`);
    if (q.daily_behavior) lines.push(`日常表现:${q.daily_behavior}`);
    if (q.prior_assessment) lines.push(`上一次评估:${q.prior_assessment}`);
  }

  // 最新评估报告
  const latestSession = getLatestSessionForChild(childId);
  if (latestSession) {
    const report = getReportForSession(latestSession.id);
    const scores = getScoresForSession(latestSession.id);
    const summary = summarizeByDomain(scores);

    lines.push("");
    lines.push("# 最新 ABLLS-R 评估报告");
    lines.push(`评估时间:${new Date(latestSession.created_at).toLocaleString("zh-CN")}`);
    if (latestSession.evaluator_name) {
      lines.push(`评估师:${latestSession.evaluator_name}`);
    }

    if (summary.length > 0) {
      lines.push("");
      lines.push("各领域均分:");
      for (const d of summary) {
        if (d.scored_count === 0) {
          lines.push(`- ${d.code} ${d.label}:未评`);
        } else {
          lines.push(`- ${d.code} ${d.label}:均分 ${d.average},已评 ${d.scored_count}/${d.total_items} 项`);
        }
      }
    }

    if (report) {
      lines.push("");
      if (report.strengths) lines.push(`优势:${report.strengths}`);
      if (report.weaknesses) lines.push(`待提升:${report.weaknesses}`);
      if (report.short_term_goals) lines.push(`短期目标:${report.short_term_goals}`);
      if (report.family_advice) lines.push(`家长配合建议:${report.family_advice}`);
    }
  }

  // 治疗计划
  const plan = db
    .prepare("SELECT content FROM treatment_plans WHERE child_id = ? ORDER BY updated_at DESC LIMIT 1")
    .get(childId) as { content: string } | undefined;
  if (plan) {
    lines.push("");
    lines.push("# 当前治疗计划");
    lines.push(plan.content);
  }

  return lines.join("\n");
}

const CHAT_SYSTEM_PROMPT = `你是一位特殊教育领域的助手,名字叫芽宝,专门为特殊需要儿童的家长提供教育指导和建议。

你的回答风格:
- 温和、耐心、易懂,避免使用过多专业术语
- 具体可操作,给家长实际能在家执行的方法
- 鼓励为主,帮助家长建立信心

重要限制:
- 只做教育干预建议,不做医学诊断或用药指导
- 涉及医疗问题一律建议家长咨询专业医生
- 不要透露其他孩子的任何信息
- 如果不确定某事,诚实地说"我不太确定,建议咨询老师或医生"

当前你正在帮助一位家长了解ta的孩子。以下是孩子的档案信息:`;

/**
 * 完整的聊天流程:验证权限 → 查找会话 → 读取历史 → 拼装 prompt → 调用大模型 → 保存 → 返回。
 * 返回芽宝的完整回复文本。
 */
export async function chatWithAssistant(
  childId: number,
  parentUserId: number,
  userMessage: string
): Promise<string> {
  // 安全验证
  if (!verifyParentChild(parentUserId, childId)) {
    throw new Error("您无权访问该孩子的信息");
  }

  // 查找或创建会话
  const conversation = getOrCreateConversation(childId, parentUserId);

  // 读取历史消息(最近 20 条,约 10 轮)
  const history = getMessagesForConversation(conversation.id, 20);
  // 按时间正序排列(因为 SQL 是 DESC,需要反转)
  history.reverse();

  // 拼装 system prompt + context
  const childContext = buildChildContext(childId);
  const systemContent = `${CHAT_SYSTEM_PROMPT}\n\n${childContext}\n\n请根据以上信息回答家长的问题。注意:只回答关于这位孩子的问题。`;

  // 构建 messages 数组
  const messages: ChatMessage[] = [
    { role: "system", content: systemContent },
  ];

  // 加入历史消息
  for (const msg of history) {
    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    });
  }

  // 加入当前用户消息
  messages.push({ role: "user", content: userMessage });

  // 保存用户消息到数据库
  saveMessage(conversation.id, "user", userMessage);

  // 调用大模型
  const reply = await generate(messages, { temperature: 0.7, maxTokens: 2000 });

  // 保存芽宝的回复到数据库
  saveMessage(conversation.id, "assistant", reply);

  return reply;
}
