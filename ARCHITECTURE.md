# 特教助手 — 项目模块架构

## 一、技术栈

| 层级 | 技术 | 版本 | 作用 |
|------|------|------|------|
| 框架 | Next.js | 16.2.6 | React 全栈框架，App Router |
| 语言 | TypeScript | 5.x | 类型安全 |
| UI | React | 19.2.4 | UI 组件 |
| 样式 | Tailwind CSS | 4.x | 原子化 CSS |
| 数据库 | SQLite + better-sqlite3 | 12.10 | 本地文件数据库 |
| ORM | 无（原生 SQL） | — | 用 prepared statement 直接操作 |

---

## 二、目录结构

```
special-education-app/
├── app/                          # Next.js App Router 页面
│   ├── layout.tsx                # 根布局（HTML lang、全局 metadata）
│   ├── page.tsx                  # 首页：老师工作台 → 学生列表
│   ├── globals.css               # 全局样式（Tailwind v4 语法）
│   ├── children/
│   │   ├── new/
│   │   │   └── page.tsx          # 添加学生表单
│   │   └── [id]/                 # 动态路由：学生ID
│   │       ├── page.tsx          # 学生详情页（信息+评估+治疗计划）
│   │       ├── assess/
│   │       │   └── page.tsx      # 填写评估（5维度1-5分）
│   │       ├── assessments/
│   │       │   └── page.tsx      # 评估历史列表
│   │       └── treatment/
│   │           └── page.tsx      # 编辑治疗计划
│   └── favicon.ico
├── lib/
│   └── db.ts                     # 数据库连接 + 表初始化
├── data/
│   ├── database.db               # SQLite 数据文件
│   ├── database.db-shm           # WAL 模式共享内存
│   └── database.db-wal           # WAL 日志
├── public/                       # 静态资源
├── next.config.ts                # Next.js 配置
├── tsconfig.json                 # TypeScript 配置（含 @/* 路径别名）
├── postcss.config.mjs            # PostCSS 配置（Tailwind）
└── package.json
```

---

## 三、数据库架构

### 表结构

| 表名 | 作用 | 字段 |
|------|------|------|
| `children` | 学生基本信息 | `id`, `name`, `age`, `diagnosis_notes`, `created_at` |
| `assessments` | 评估记录（每次评估一行） | `id`, `child_id`, `language_score`, `social_score`, `cognitive_score`, `motor_score`, `self_care_score`, `notes`, `created_at` |
| `treatment_plans` | 治疗/教育计划 | `id`, `child_id`, `content`, `created_at`, `updated_at` |

### 关系

```
children (1) ──────< (N) assessments
        (1) ──────< (N) treatment_plans
```

---

## 四、页面路由与功能对照

| URL | 文件 | 用户 | 功能 |
|-----|------|------|------|
| `/` | `app/page.tsx` | 老师 | 学生列表、添加入口 |
| `/children/new` | `app/children/new/page.tsx` | 老师 | 表单：姓名+年龄+诊断备注 |
| `/children/123` | `app/children/[id]/page.tsx` | 老师/家长 | 学生详情：基本信息、最新评估（进度条）、治疗计划 |
| `/children/123/assess` | `app/children/[id]/assess/page.tsx` | 老师 | 5维度评估表单（每项1-5分单选+备注） |
| `/children/123/assessments` | `app/children/[id]/assessments/page.tsx` | 老师/家长 | 所有评估历史，每次一行 |
| `/children/123/treatment` | `app/children/[id]/treatment/page.tsx` | 老师 | 大文本框编辑治疗计划内容 |

---

## 五、数据流

```
浏览器请求 → Next.js Server Component
                      ↓
              import db from "@/lib/db"
                      ↓
            better-sqlite3 → data/database.db
                      ↓
              直接执行 SQL (SELECT/INSERT/UPDATE)
                      ↓
              渲染 HTML → 返回浏览器
```

**关键点：**
- 所有数据库操作都在 **Server Component** 中直接执行（没有 API 路由层）
- 表单提交用 Next.js **Server Action**（`"use server"`）
- `lib/db.ts` 是单例：import 时自动建表，整个应用共用同一个连接

---

## 六、每个文件职责详解

### `lib/db.ts`
- 导出 `db` 单例
- 自动创建 `data/` 目录
- 自动建表（`CREATE TABLE IF NOT EXISTS`）
- 启用 WAL 模式提升并发性能

### `app/layout.tsx`
- 根布局，所有页面共享
- 设置 `lang="zh-CN"`、页面标题和描述

### `app/page.tsx`（首页）
- `db.prepare("SELECT * FROM children ...").all()` 查所有学生
- 渲染卡片列表，点击进入详情

### `app/children/new/page.tsx`
- 表单：name（必填）、age（数字）、diagnosis_notes（文本）
- Server Action `addChild`：INSERT → `redirect()` 到详情页

### `app/children/[id]/page.tsx`（详情页）
- 从 `params` 取 id
- 查 `children`、`assessments`（最新一条）、`treatment_plans`（最新一条）
- 评估用进度条展示 5 个维度分数

### `app/children/[id]/assess/page.tsx`
- 5 个维度，每个维度 5 个单选（radio）
- 每个选项有文字说明（如"1-无语言输出"到"5-复杂句子"）
- Server Action `submitAssessment`：INSERT → redirect

### `app/children/[id]/assessments/page.tsx`
- 查该学生所有评估，按时间倒序
- 每次评估一行，含 5 维度进度条

### `app/children/[id]/treatment/page.tsx`
- 大文本框编辑治疗计划
- Server Action `saveTreatment`：有则 UPDATE，无则 INSERT

---

## 七、评分标准（1-5分）

| 维度 | 1分 | 2分 | 3分 | 4分 | 5分 |
|------|-----|-----|-----|-----|-----|
| 语言能力 | 无语言输出 | 咿呀/单音 | 单词/短句 | 简单句子 | 复杂句子/讲故事 |
| 社交能力 | 无眼神接触 | 短暂注意面部 | 短暂互动 | 持续玩耍 | 合作游戏/共情 |
| 认知能力 | 无法执行指令 | 识别熟悉物品 | 配对/分类 | 解决简单问题 | 抽象推理 |
| 运动能力 | 无法独立坐 | 有支撑可坐 | 扶站/行走 | 独立行走 | 奔跑/精细动作 |
| 自理能力 | 完全依赖 | 需全程协助 | 需部分协助 | 基本独立 | 完全独立 |

---

## 八、待扩展模块

### 8.1 家长工作台

- 家长工作台和老师工作台独立，权限不同，根据登录账号进入不同工作台。
- **首次评估阶段**：家长可通过**二维码**填写家长问卷，问卷内容会同步到老师工作台对应的学生。
  - 老师添加学生并开始评估后，输出一个二维码给家长。
  - 家长扫码后填写问卷。
  - 老师评估页**新增"家长问卷"维度**，综合对学生进行评估。
  - 家长问卷里**包含"家长对小孩的期望"**字段。
- **评估完成、家长下单后**：可以创建专属账号，查看自己小孩的状态（**只能看到自己孩子**）：
  - 治疗计划
  - 最新评估结果
  - 历史评估结果
  - 日常课表
- **(Phase 2) AI 模块**：AI 助手回答家长关于特殊儿童教育教学、日常治疗的问题，也能回答关于自己孩子的问题。**每个账号的 AI 助手只能读取自己小孩的数据。**

### 8.2 老师工作台

- **删除权限收紧**：老师**不允许**删除学生档案，只有**管理员**可以。
- **管理员**：最高权限，可以**创建、修改、删除**老师账号和家长账号。
- **治疗计划改为 AI 自动生成**：生成后，老师拥有编辑权限，可重新制定和修改。
- 学生档案里**增加"家长期望"字段**。
- **新增课表**：以**日历形式**展示和编辑（学生名字 + 课程内容）。课表会**同步到家长工作台**，家长**只能看到自己小孩的课表**，看不到其他小孩的。
