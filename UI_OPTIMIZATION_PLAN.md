# 特教助手 — UI 界面优化方案

> 本文档用于规划和追踪 UI 优化工作。你可以在任意章节后直接添加补充内容，标注"[用户补充]"即可。

---

## 一、设计系统升级

### 1.1 配色方案（当前问题：全灰白蓝，太冷淡）

特殊教育平台应该给人**温暖、安心、专业**的感觉。

| 用途 | 当前色 | 建议色 |
|------|--------|--------|
| 主品牌色 | `blue-600` | `teal-600` (#0d9488) 或保持蓝色但用更柔和的 `sky-600` |
| 辅助色-成功 | `green-600` | `emerald-500` |
| 辅助色-警告 | 无 | `amber-500` |
| 背景色 | `gray-50` | `slate-50` 或自定义暖灰 `#faf9f7` |
| 卡片色 | `white` | 保持白色，但加更柔和的阴影 |
| 家长端强调 | `purple-600` | 渐变 `from-violet-500 to-purple-600` |

### 1.2 图标库

安装 `lucide-react`：
```bash
npm install lucide-react
```

需要图标的位置：
- 登录页：用户图标、锁图标
- 首页学生卡片：用户图标、箭头图标
- 评估页：文件图标、保存图标
- 家长端：消息图标、日历图标、文件图标
- 课表：时钟图标、用户图标
- 删除操作：垃圾桶图标
- 空状态：提示性图标

### 1.3 字体修复

`globals.css` 第 26 行硬编码了 `Arial, Helvetica, sans-serif`，覆盖 Tailwind 的 Geist 字体。

修复：删除该行的 `font-family` 声明。

### 1.4 Dark Mode

当前有 `prefers-color-scheme: dark` 媒体查询但没有完整的暗黑设计，建议删除避免页面闪烁。

---

## 二、共享组件建设

### 2.1 统一页面外壳组件

每个页面都重复写了 header。提取为 `app/components/page-shell.tsx`：

```tsx
interface PageShellProps {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  maxWidth?: "sm" | "md" | "lg" | "xl"
  children: React.ReactNode
  action?: React.ReactNode  // 右上角操作按钮
}
```

### 2.2 统一卡片组件

提取为 `app/components/card.tsx`：

```tsx
interface CardProps {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  variant?: "default" | "danger" | "highlight"
}
```

### 2.3 空状态组件

统一为带图标的空状态，不再只有文字。

### 2.4 表单提交按钮（带 Loading）

当前所有表单提交按钮都没有 loading 状态，提取 `SubmitButton` 客户端组件自动处理 disabled + spinner。

---

## 三、交互体验升级

### 3.1 页面过渡动画

安装 `framer-motion`：
```bash
npm install framer-motion
```

### 3.2 骨架屏（Skeleton）

数据加载时的占位效果，用于学生列表、评估历史、课表。

### 3.3 Toast 通知系统

安装 `sonner`：
```bash
npm install sonner
```

用于：问卷提交成功、评估保存成功、课程添加成功、删除确认后反馈。

### 3.4 按钮状态统一

所有按钮增加：
- `transition-all duration-200`
- `active:scale-[0.98]` 点击反馈
- 阴影变化

---

## 四、响应式适配方案

### 4.1 断点策略

| 断点 | 范围 | 主要调整 |
|------|------|----------|
| 默认 | < 640px | 手机：单列、全宽按钮、底部固定导航 |
| `sm` | 640px+ | 小平板：部分双列 |
| `md` | 768px+ | 平板：标准布局 |
| `lg` | 1024px+ | 桌面：完整布局 |

### 4.2 家长端移动端专项（最高优先级）

家长几乎 100% 用手机访问。需要**底部固定导航栏**：

```
┌─────────────────────────┐
│                         │
│       页面内容          │
│                         │
├─────┬─────────┬─────────┤
│ 首页 │  评估   │  AI助手  │
└─────┴─────────┴─────────┘
```

需要优化的页面：
- `app/parent/[childId]/page.tsx` — 顶部 header 占太大空间
- `app/parent/[childId]/chat/page.tsx` — 输入框可能被输入法顶起
- `app/q/[token]/page.tsx` — 问卷页面必须手机友好

### 4.3 课表页面移动端

`app/schedule/page.tsx` 7 列网格在手机上体验差，需要改成垂直列表或横向滑动。

---

## 五、按页面优化清单

### 5.1 登录页 (`app/login/page.tsx`)

- [ ] 添加背景图/插画（当前纯灰背景）
- [ ] 用户名、密码输入框前加图标
- [ ] 加"显示/隐藏密码"按钮
- [ ] 添加"记住我"选项
- [ ] 登录按钮点击后显示 loading

### 5.2 老师首页 (`app/page.tsx`)

- [ ] 顶部加统计卡片（学生总数/本周课程/待评估）
- [ ] 学生卡片加头像占位、最近评估状态标签
- [ ] 添加学生搜索框
- [ ] 空状态用统一组件，加图标
- [ ] 移动端卡片单列，底部固定导航

### 5.3 学生详情页 (`app/children/[id]/page.tsx`)

- [ ] 内容太多，加标签页/锚点导航
- [ ] 评估进度条优化颜色（低分 amber，高分 emerald）
- [ ] 治疗计划加"最后更新"时间标签
- [ ] AI 对话入口统一用 Card 组件 → **芽宝** 对话入口

### 5.4 ABLLS-R 评估页 (`app/children/[id]/assess/page.tsx`)

- [ ] 评分 0-4 分用不同颜色
- [ ] 加"全部评为 0"等快捷操作
- [ ] 领域折叠状态刷新后保持
- [ ] 顶部显示"已评 X/92 项"进度

### 5.5 家长端 (`app/parent/page.tsx` 和 `app/parent/[childId]/page.tsx`)

- [ ] 底部 Tab 导航（核心）
- [ ] 欢迎语"XXX 家长，您好"
- [ ] 未读评估报告红点提示
- [ ] 评估结果可视化（雷达图）

### 5.6 聊天页面 (`app/parent/[childId]/chat/*`)

- [ ] 底部加常见问题快捷按钮
- [ ] 消息显示发送时间
- [ ] 头像区分用户和 **芽宝**

### 5.7 课表页面 (`app/schedule/page.tsx`)

- [ ] 手机端横向滑动周视图
- [ ] 课程卡片按类型区分颜色
- [ ] 冲突检测警告
- [ ] "每周重复"功能

### 5.8 问卷页面 (`app/q/[token]/page.tsx`)

- [ ] 手机端表单间距加宽
- [ ] 输入框高度 44px 以上
- [ ] 单选/复选框点击区域加大
- [ ] 底部提交按钮固定悬浮

---

## 六、实施顺序建议

### 迭代 1：基础框架（1-2 天）
1. 安装 `lucide-react`、`sonner`
2. 修复字体、移除 dark mode
3. 创建 `PageShell`、`Card`、`EmptyState`、`SubmitButton` 组件
4. 首页和学生详情页用上新组件

### 迭代 2：家长端移动端（2-3 天）
1. 家长端底部导航栏
2. 问卷页面移动端适配
3. 家长详情页响应式优化
4. 聊天页面优化

### 迭代 3：交互体验（2 天）
1. Toast 通知系统接入
2. 表单 loading 状态
3. 按钮动画
4. 骨架屏

### 迭代 4：视觉升级（2-3 天）
1. 新配色系统
2. 登录页美化
3. 评估页评分颜色
4. 课表页面重构

---

## 补充内容区

### [用户可在此添加自己的补充]

