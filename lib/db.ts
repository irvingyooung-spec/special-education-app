import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { ABLLS_ITEMS } from "./ablls-catalog";
import { CPEP_ITEMS } from "./cpep-catalog";
import { CONNERS_ITEMS } from "./conners-catalog";

// 数据库文件路径
const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "database.db");

// 确保 data 目录存在
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// 创建数据库连接
const db = new Database(DB_PATH);

// 启用外键约束
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON"); // 让 ON DELETE CASCADE 生效

// 旧的简化版 assessments 表(language_score 等 5 列 + 1-5 分制) → 替换为 ABLLS-R 系统。
// 检测到旧结构就 DROP,丢弃旧记录(用户确认过只是测试数据)。
const assessmentCols = db
  .prepare("PRAGMA table_info(assessments)")
  .all() as Array<{ name: string }>;
if (assessmentCols.some((c) => c.name === "language_score")) {
  db.exec("DROP TABLE assessments");
  console.log("[migrate] 已删除旧的 5 维度 assessments 表(用户确认丢弃测试数据)");
}

// 初始化表结构（如果不存在）
db.exec(`
  CREATE TABLE IF NOT EXISTS children (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER,
    diagnosis_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS treatment_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS parent_questionnaires (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL UNIQUE,
    token TEXT NOT NULL UNIQUE,
    parent_name TEXT,
    relation TEXT,
    contact TEXT,
    daily_behavior TEXT,
    prior_training TEXT,
    parent_expectations TEXT,
    submitted_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'teacher', 'parent')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS parent_child (
    parent_user_id INTEGER NOT NULL,
    child_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (parent_user_id, child_id),
    FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_at DATETIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    course_name TEXT NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS schedule_children (
    schedule_id INTEGER NOT NULL,
    child_id INTEGER NOT NULL,
    PRIMARY KEY (schedule_id, child_id),
    FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
  );

  -- ABLLS-R 评估系统
  CREATE TABLE IF NOT EXISTS ablls_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_code TEXT NOT NULL,
    item_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    goal TEXT NOT NULL,
    materials TEXT,
    procedure TEXT,
    order_in_domain INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS assessment_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    evaluator_user_id INTEGER,
    evaluator_name TEXT,
    session_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluator_user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS assessment_scores (
    session_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 4),
    notes TEXT,
    PRIMARY KEY (session_id, item_id),
    FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES ablls_items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS assessment_reports (
    session_id INTEGER PRIMARY KEY,
    strengths TEXT,
    weaknesses TEXT,
    analysis TEXT,
    short_term_goals TEXT,
    mid_term_goals TEXT,
    long_term_goals TEXT,
    family_advice TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES assessment_sessions(id) ON DELETE CASCADE
  );

  -- 家长芽宝聊天系统 (Step 11)
  CREATE TABLE IF NOT EXISTS chat_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    parent_user_id INTEGER NOT NULL,
    title TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(child_id, parent_user_id)
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
  );

  -- CPEP 评估系统
  CREATE TABLE IF NOT EXISTS cpep_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain_code TEXT NOT NULL,
    item_code TEXT NOT NULL UNIQUE,
    subdomain TEXT NOT NULL,
    name TEXT NOT NULL,
    goal TEXT NOT NULL,
    materials TEXT,
    method TEXT,
    criteria TEXT,
    age TEXT,
    marker TEXT,
    order_in_domain INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cpep_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    evaluator_user_id INTEGER,
    evaluator_name TEXT,
    domain_code TEXT,
    session_notes TEXT,
    status TEXT DEFAULT 'completed' CHECK(status IN ('draft', 'completed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluator_user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS cpep_scores (
    session_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    score TEXT NOT NULL CHECK(score IN ('P', 'E', 'F', 'X', 'A', 'M', 'S')),
    notes TEXT,
    PRIMARY KEY (session_id, item_id),
    FOREIGN KEY (session_id) REFERENCES cpep_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES cpep_items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cpep_reports (
    session_id INTEGER PRIMARY KEY,
    domain_analysis TEXT,
    emotion_analysis TEXT,
    training_goals TEXT,
    family_advice TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES cpep_sessions(id) ON DELETE CASCADE
  );

  -- Conners 儿童行为问卷评估系统
  CREATE TABLE IF NOT EXISTS conners_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    questionnaire_type TEXT NOT NULL,
    item_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    factor_code TEXT,
    is_hyperactivity_index INTEGER DEFAULT 0,
    order_in_questionnaire INTEGER NOT NULL,
    UNIQUE(questionnaire_type, item_number)
  );

  CREATE TABLE IF NOT EXISTS conners_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    evaluator_user_id INTEGER,
    evaluator_name TEXT,
    questionnaire_type TEXT NOT NULL,
    respondent_role TEXT,
    respondent_name TEXT,
    session_notes TEXT,
    status TEXT DEFAULT 'completed' CHECK(status IN ('draft', 'completed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (evaluator_user_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS conners_scores (
    session_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    score INTEGER NOT NULL CHECK(score BETWEEN 0 AND 3),
    notes TEXT,
    PRIMARY KEY (session_id, item_id),
    FOREIGN KEY (session_id) REFERENCES conners_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES conners_items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS conners_reports (
    session_id INTEGER PRIMARY KEY,
    factor_analysis TEXT,
    interpretation TEXT,
    intervention_suggestions TEXT,
    family_advice TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES conners_sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS conners_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    child_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    used_session_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
  );
`);

// 增量迁移：为已存在的旧表补字段（SQLite 没有 ADD COLUMN IF NOT EXISTS，需要先查再加）
function addColumnIfMissing(table: string, column: string, definition: string) {
  const columns = db
    .prepare(`PRAGMA table_info(${table})`)
    .all() as { name: string }[];
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

addColumnIfMissing("children", "parent_expectations", "TEXT");
addColumnIfMissing("children", "child_gender", "TEXT");
addColumnIfMissing("children", "child_birth_date", "TEXT");

// 一次性迁移:旧的整数 age 列已淘汰,改用 child_birth_date 计算实足年龄。
// 1. 如果家长问卷已经提交过 child_birth_date / child_gender,把它们同步到 children 表
// 2. 还没有 child_birth_date 的学生,如果有旧 age 字段,推算一个近似日期(当年 1 月 1 日)
db.exec(`
  UPDATE children
  SET child_birth_date = (
    SELECT child_birth_date FROM parent_questionnaires
    WHERE parent_questionnaires.child_id = children.id
      AND parent_questionnaires.child_birth_date IS NOT NULL
      AND parent_questionnaires.child_birth_date != ''
  )
  WHERE (child_birth_date IS NULL OR child_birth_date = '')
    AND EXISTS (
      SELECT 1 FROM parent_questionnaires
      WHERE parent_questionnaires.child_id = children.id
        AND parent_questionnaires.child_birth_date IS NOT NULL
        AND parent_questionnaires.child_birth_date != ''
    );

  UPDATE children
  SET child_gender = (
    SELECT child_gender FROM parent_questionnaires
    WHERE parent_questionnaires.child_id = children.id
      AND parent_questionnaires.child_gender IS NOT NULL
      AND parent_questionnaires.child_gender != ''
  )
  WHERE (child_gender IS NULL OR child_gender = '')
    AND EXISTS (
      SELECT 1 FROM parent_questionnaires
      WHERE parent_questionnaires.child_id = children.id
        AND parent_questionnaires.child_gender IS NOT NULL
        AND parent_questionnaires.child_gender != ''
    );

  UPDATE children
  SET child_birth_date = printf('%d-01-01', CAST(strftime('%Y', 'now') AS INTEGER) - age)
  WHERE age IS NOT NULL AND (child_birth_date IS NULL OR child_birth_date = '')
`);

// 家长问卷整合 ABLLS-R sheet 1 评估档案的字段
addColumnIfMissing("parent_questionnaires", "child_gender", "TEXT");
addColumnIfMissing("parent_questionnaires", "child_birth_date", "TEXT");
addColumnIfMissing("parent_questionnaires", "diagnosis", "TEXT");
addColumnIfMissing("parent_questionnaires", "diagnosis_hospital", "TEXT");
addColumnIfMissing("parent_questionnaires", "diagnosis_date", "TEXT");
addColumnIfMissing("parent_questionnaires", "current_training", "TEXT");
addColumnIfMissing("parent_questionnaires", "medication", "TEXT");
addColumnIfMissing("parent_questionnaires", "main_reinforcers", "TEXT");
addColumnIfMissing("parent_questionnaires", "allergies", "TEXT");
addColumnIfMissing("parent_questionnaires", "top_concerns", "TEXT");
addColumnIfMissing("parent_questionnaires", "prior_assessment", "TEXT");

// ABLLS-R 评估系统添加 status 列（草稿/已完成）
addColumnIfMissing("assessment_sessions", "status", "TEXT DEFAULT 'completed'");

// 迁移已有数据：旧数据全部视为已完成
const hasStatusCol = db
  .prepare("PRAGMA table_info(assessment_sessions)")
  .all() as { name: string }[];
if (hasStatusCol.some((c) => c.name === "status")) {
  db.exec(
    "UPDATE assessment_sessions SET status = 'completed' WHERE status IS NULL OR status = ''"
  );
}

// CPEP 评估系统迁移：清理旧按领域 draft sessions（改造为 unified session 模式）
// 保留所有 completed 记录用于历史查看，删除所有按领域的 draft（domain_code IS NOT NULL AND status = 'draft'）
db.exec(`
  DELETE FROM cpep_sessions
  WHERE status = 'draft' AND domain_code IS NOT NULL
`);

// 课表表结构升级：旧版每条课程绑定单一 child_id，新版改为多对多。
// 若检测到旧表带 child_id 列，则把数据迁到新结构（schedules 去掉 child_id + 新建 schedule_children）。
const scheduleCols = db
  .prepare("PRAGMA table_info(schedules)")
  .all() as Array<{ name: string }>;
if (scheduleCols.some((c) => c.name === "child_id")) {
  const oldRows = db.prepare("SELECT * FROM schedules").all() as Array<{
    id: number;
    child_id: number;
    start_at: string;
    duration_minutes: number;
    course_name: string;
    notes: string | null;
    created_at: string;
  }>;

  db.exec("DROP TABLE schedules");
  db.exec(`
    CREATE TABLE schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      start_at DATETIME NOT NULL,
      duration_minutes INTEGER NOT NULL DEFAULT 60,
      course_name TEXT NOT NULL,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS schedule_children (
      schedule_id INTEGER NOT NULL,
      child_id INTEGER NOT NULL,
      PRIMARY KEY (schedule_id, child_id),
      FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
      FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
    );
  `);

  const insertSchedule = db.prepare(
    "INSERT INTO schedules (id, start_at, duration_minutes, course_name, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertJunction = db.prepare(
    "INSERT INTO schedule_children (schedule_id, child_id) VALUES (?, ?)"
  );
  for (const row of oldRows) {
    insertSchedule.run(
      row.id,
      row.start_at,
      row.duration_minutes,
      row.course_name,
      row.notes,
      row.created_at
    );
    insertJunction.run(row.id, row.child_id);
  }
  if (oldRows.length > 0) {
    console.log(`[migrate] schedules 旧表已迁移 ${oldRows.length} 行到新多对多结构`);
  }
}

// 首次启动：若无管理员，预置默认 admin/changeme123（请第一次登录后立即改密码）
const adminCount = (
  db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'admin'").get() as {
    c: number;
  }
).c;
if (adminCount === 0) {
  const hash = bcrypt.hashSync("changeme123", 10);
  db.prepare(
    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')"
  ).run("admin", hash);
  console.log(
    "[seed] 已创建默认管理员: admin / changeme123 — 请第一次登录后立刻修改密码"
  );
}

// 种入 ABLLS-R 目录(若行数与代码里的不一致就重建,以便修改目录后能更新数据库)
const itemCount = (
  db.prepare("SELECT COUNT(*) as c FROM ablls_items").get() as { c: number }
).c;
if (itemCount !== ABLLS_ITEMS.length) {
  const seedItems = db.transaction(() => {
    db.exec("DELETE FROM ablls_items");
    const insert = db.prepare(
      `INSERT INTO ablls_items (domain_code, item_code, name, goal, materials, procedure, order_in_domain)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    for (const it of ABLLS_ITEMS) {
      insert.run(
        it.domain_code,
        it.item_code,
        it.name,
        it.goal,
        it.materials || null,
        it.procedure || null,
        it.order_in_domain
      );
    }
  });
  seedItems();
  console.log(`[seed] 已种入 ABLLS-R 目录:${ABLLS_ITEMS.length} 项`);
}

// 种入 CPEP 目录
const cpepItemCount = (
  db.prepare("SELECT COUNT(*) as c FROM cpep_items").get() as { c: number }
).c;
if (cpepItemCount !== CPEP_ITEMS.length) {
  const seedCpepItems = db.transaction(() => {
    db.exec("DELETE FROM cpep_items");
    const insert = db.prepare(
      `INSERT INTO cpep_items (domain_code, item_code, subdomain, name, goal, materials, method, criteria, age, marker, order_in_domain)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const it of CPEP_ITEMS) {
      insert.run(
        it.domain_code,
        it.item_code,
        it.subdomain,
        it.name,
        it.goal,
        it.materials || null,
        it.method || null,
        it.criteria || null,
        it.age || null,
        it.marker || null,
        it.order_in_domain
      );
    }
  });
  seedCpepItems();
  console.log(`[seed] 已种入 CPEP 目录:${CPEP_ITEMS.length} 项`);
}

// 种入 Conners 目录
const connersItemCount = (
  db.prepare("SELECT COUNT(*) as c FROM conners_items").get() as { c: number }
).c;
if (connersItemCount !== CONNERS_ITEMS.length) {
  const seedConnersItems = db.transaction(() => {
    db.exec("DELETE FROM conners_items");
    const insert = db.prepare(
      `INSERT INTO conners_items (questionnaire_type, item_number, name, factor_code, is_hyperactivity_index, order_in_questionnaire)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    for (const it of CONNERS_ITEMS) {
      insert.run(
        it.questionnaire_type,
        it.item_number,
        it.name,
        it.factor_code || null,
        it.is_hyperactivity_index ? 1 : 0,
        it.order_in_questionnaire
      );
    }
  });
  seedConnersItems();
  console.log(`[seed] 已种入 Conners 目录:${CONNERS_ITEMS.length} 项`);
}

export default db;
