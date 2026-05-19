/**
 * ABLLS-R 评估目录(自动从 ABLLS-R_专业评估表.xlsx 抽出)。
 * 92 项技能,跨 10 个领域。0-4 分制。
 *
 * 注意:这是静态目录,数据库启动时种入 ablls_items 表;运行时只查表,不读这里。
 * 修改目录后需要(1) 改这里 (2) 改 lib/db.ts 的 seed 逻辑或手动 UPDATE 表。
 */

export type AbllsDomain = {
  code: string;
  label: string;
  label_en: string;
  item_count: number;
};

export type AbllsItem = {
  domain_code: string;
  item_code: string;
  name: string;
  goal: string;
  materials: string;
  procedure: string;
  order_in_domain: number;
};

export const ABLLS_DOMAINS: AbllsDomain[] = [
  {
    "code": "A",
    "label": "合作与强化物",
    "label_en": "Cooperation and Reinforcer Effectiveness",
    "item_count": 10
  },
  {
    "code": "B",
    "label": "视觉表现",
    "label_en": "Visual Performance",
    "item_count": 12
  },
  {
    "code": "C",
    "label": "动作模仿",
    "label_en": "Motor Imitation",
    "item_count": 8
  },
  {
    "code": "E",
    "label": "语言理解",
    "label_en": "Receptive Language",
    "item_count": 10
  },
  {
    "code": "F",
    "label": "语言表达-要求",
    "label_en": "Mands / Requests",
    "item_count": 8
  },
  {
    "code": "G",
    "label": "命名能力",
    "label_en": "Tacts / Naming",
    "item_count": 8
  },
  {
    "code": "H",
    "label": "对话能力",
    "label_en": "Intraverbals",
    "item_count": 10
  },
  {
    "code": "K",
    "label": "游戏技能",
    "label_en": "Play Skills",
    "item_count": 8
  },
  {
    "code": "L",
    "label": "社交互动",
    "label_en": "Social Interaction",
    "item_count": 8
  },
  {
    "code": "N",
    "label": "自理与常规",
    "label_en": "Self-help & Daily Routine",
    "item_count": 10
  }
];

export const ABLLS_ITEMS: AbllsItem[] = [
  {
    "domain_code": "A",
    "item_code": "A1",
    "name": "接受强化物",
    "goal": "当给予一个已知的具有强化作用的东西或活动时，学生会拿或使用该东西或活动。",
    "materials": "孩子已知喜欢的零食/玩具/活动",
    "procedure": "1. 呈现强化物，说\"给你\"\n2. 观察是否在3秒内接受\n3. 测试3次，记录反应",
    "order_in_domain": 1
  },
  {
    "domain_code": "A",
    "item_code": "A2",
    "name": "选择强化物",
    "goal": "从一个强化物和一个非强化物中，学生会选择具有强化作用的东西或活动。",
    "materials": "强化物+非强化物各1个",
    "procedure": "1. 同时呈现两个物品\n2. 观察选择反应\n3. 左右位置轮换3次",
    "order_in_domain": 2
  },
  {
    "domain_code": "A",
    "item_code": "A3",
    "name": "目光注视",
    "goal": "当老师出示非强化物的东西时，学生会看着它并观察它。",
    "materials": "新奇但中性的物品",
    "procedure": "1. 在桌上呈现物品\n2. 观察是否在2-3秒内注视\n3. 在不同位置测试",
    "order_in_domain": 3
  },
  {
    "domain_code": "A",
    "item_code": "A4",
    "name": "拿着常见物品",
    "goal": "当老师拿出某个常见的东西时，学生会拿着它。",
    "materials": "杯子、鞋子、笔等日常物品",
    "procedure": "1. 递给孩子物品\n2. 观察是否在3秒内拿着\n3. 测试5种不同物品",
    "order_in_domain": 4
  },
  {
    "domain_code": "A",
    "item_code": "A5",
    "name": "为强化物而反应",
    "goal": "为得到强化物，学生愿意走过来并完成一个已知的简单反应。",
    "materials": "强化物、简单任务材料",
    "procedure": "1. 将强化物放在需要走几步才能拿到的地方\n2. 要求孩子做一个简单任务\n3. 完成后立即给予强化物",
    "order_in_domain": 5
  },
  {
    "domain_code": "A",
    "item_code": "A6",
    "name": "对控制的强化物有反应",
    "goal": "为了得到老师控制的强化物，学生会做事情。",
    "materials": "老师控制的强化物、已学会的任务",
    "procedure": "1. 老师拿着强化物\n2. 要求学生做已学会的技能\n3. 正确完成后给予强化物\n4. 测试多种任务和强化物",
    "order_in_domain": 6
  },
  {
    "domain_code": "A",
    "item_code": "A7",
    "name": "对多个教师有反应",
    "goal": "学生从一位老师那里学习到的技能，能在其他老师那里表现和应用。",
    "materials": "多位老师、已学会的技能",
    "procedure": "1. 由主要老师教授新技能\n2. 换其他老师测试该技能\n3. 记录泛化情况",
    "order_in_domain": 7
  },
  {
    "domain_code": "A",
    "item_code": "A8",
    "name": "教室里的强化物",
    "goal": "在教室环境中，各种强化物能保持它们的强化效果。",
    "materials": "多种强化物",
    "procedure": "1. 在教室内测试各种强化物\n2. 观察孩子是否仍然愿意为该强化物工作\n3. 记录有效强化物",
    "order_in_domain": 8
  },
  {
    "domain_code": "A",
    "item_code": "A9",
    "name": "对一个项目的注意力",
    "goal": "当所有材料就绪时，学生能持续参与一个项目或活动。",
    "materials": "孩子喜欢的活动材料",
    "procedure": "1. 呈现一个完整的活动\n2. 计时孩子参与活动的时间\n3. 记录持续时间和参与质量",
    "order_in_domain": 9
  },
  {
    "domain_code": "A",
    "item_code": "A10",
    "name": "在群体中有反应",
    "goal": "在群体环境中，学生能对老师的要求做出适当反应。",
    "materials": "群体环境、简单指令",
    "procedure": "1. 在有其他孩子的情况下给出指令\n2. 观察反应是否和一对一情况下相似\n3. 记录配合程度",
    "order_in_domain": 10
  },
  {
    "domain_code": "B",
    "item_code": "B1",
    "name": "视觉配对-完全相同",
    "goal": "能将一个物品与其完全相同的物品配对。",
    "materials": "2个完全相同的物品（积木、杯子等）",
    "procedure": "1. 桌上放1个样品，给孩子1个相同的\n2. 说\"一样的放一起\"\n3. 观察配对反应",
    "order_in_domain": 1
  },
  {
    "domain_code": "B",
    "item_code": "B2",
    "name": "视觉配对-相似物品",
    "goal": "能将一个物品与相似但非完全相同的物品配对。",
    "materials": "相似物品（不同颜色的杯子、不同大小的球）",
    "procedure": "1. 呈现样品和2个选项（1个相似，1个不同）\n2. 说\"找一样的\"\n3. 记录选择正确率",
    "order_in_domain": 2
  },
  {
    "domain_code": "B",
    "item_code": "B3",
    "name": "图片配对-完全相同",
    "goal": "能将一张图片与其完全相同的图片配对。",
    "materials": "完全相同的图片卡片",
    "procedure": "1. 桌上放1张样品图片\n2. 给孩子1张相同的\n3. 说\"一样的放一起\"",
    "order_in_domain": 3
  },
  {
    "domain_code": "B",
    "item_code": "B4",
    "name": "图片配对-相似图片",
    "goal": "能将一张图片与相似的图片配对。",
    "materials": "相似图片（同类物品不同款式）",
    "procedure": "1. 呈现样品和2个选项\n2. 观察选择是否正确\n3. 测试10组",
    "order_in_domain": 4
  },
  {
    "domain_code": "B",
    "item_code": "B5",
    "name": "物品与图片配对",
    "goal": "能将物品与代表它的图片配对。",
    "materials": "常见物品+对应图片",
    "procedure": "1. 桌上放1个物品和2张图片\n2. 说\"这个（指物品）是哪张图片？\"\n3. 测试多种物品",
    "order_in_domain": 5
  },
  {
    "domain_code": "B",
    "item_code": "B6",
    "name": "图片与物品配对",
    "goal": "能将图片与对应的实物物品配对。",
    "materials": "图片+实物物品",
    "procedure": "1. 给孩子1张图片\n2. 桌上放2个物品\n3. 说\"拿和图片一样的\"",
    "order_in_domain": 6
  },
  {
    "domain_code": "B",
    "item_code": "B7",
    "name": "拼搭物品-复制模型",
    "goal": "能根据模型拼搭出相同的物品结构。",
    "materials": "积木、模型范例",
    "procedure": "1. 呈现拼好的模型\n2. 给孩子相同的材料\n3. 说\"搭一个一样的\"\n4. 观察复制准确性",
    "order_in_domain": 7
  },
  {
    "domain_code": "B",
    "item_code": "B8",
    "name": "按顺序排列",
    "goal": "能按大小、长度或数量等顺序排列物品。",
    "materials": "大小不同的积木/棍子",
    "procedure": "1. 给3-5个不同大小的物品\n2. 说\"排排队，从大到小\"\n3. 观察排列是否正确",
    "order_in_domain": 8
  },
  {
    "domain_code": "B",
    "item_code": "B9",
    "name": "完成图案",
    "goal": "能根据规律完成图案序列。",
    "materials": "积木/珠子、未完成的图案",
    "procedure": "1. 呈现ABCABC模式（缺最后1-2个）\n2. 说\"接下来放什么？\"\n3. 测试多种模式",
    "order_in_domain": 9
  },
  {
    "domain_code": "B",
    "item_code": "B10",
    "name": "视觉追踪",
    "goal": "能追踪移动中的物品或线条。",
    "materials": "小球、泡泡、走迷宫图",
    "procedure": "1. 滚动小球/吹泡泡\n2. 观察眼睛是否跟随移动\n3. 或给简单迷宫追踪线条",
    "order_in_domain": 10
  },
  {
    "domain_code": "B",
    "item_code": "B11",
    "name": "视觉辨认-复杂背景",
    "goal": "能在复杂背景或干扰物中找到目标物品。",
    "materials": "多种物品混放、图片中有背景",
    "procedure": "1. 在多种物品中找目标\n2. 或在有背景的图片中指出目标\n3. 记录正确率和反应时间",
    "order_in_domain": 11
  },
  {
    "domain_code": "B",
    "item_code": "B12",
    "name": "临摹画图",
    "goal": "能临摹画出简单的图形。",
    "materials": "纸、笔、图形范例",
    "procedure": "1. 呈现图形范例（圆、方、十字）\n2. 说\"画一个一样的\"\n3. 观察临摹相似度",
    "order_in_domain": 12
  },
  {
    "domain_code": "C",
    "item_code": "C1",
    "name": "模仿大肌肉动作",
    "goal": "能模仿涉及大肌肉群的动作（拍手、举手、跺脚等）。",
    "materials": "无需材料",
    "procedure": "1. 老师做动作\n2. 说\"做一样的\"\n3. 观察是否在5秒内模仿\n4. 测试：拍手、举手、摸头、跺脚",
    "order_in_domain": 1
  },
  {
    "domain_code": "C",
    "item_code": "C2",
    "name": "模仿精细动作",
    "goal": "能模仿涉及精细动作的手部动作（手指动作等）。",
    "materials": "无需材料",
    "procedure": "1. 老师做精细动作\n2. 观察模仿准确性\n3. 测试：指鼻子、比OK、握笔姿势",
    "order_in_domain": 2
  },
  {
    "domain_code": "C",
    "item_code": "C3",
    "name": "模仿物体操作动作",
    "goal": "能模仿使用物品的动作（假装用梳子梳头等）。",
    "materials": "梳子、电话、杯子等",
    "procedure": "1. 老师用物品做动作\n2. 说\"你做一样的\"\n3. 测试：假装梳头、打电话、喝水",
    "order_in_domain": 3
  },
  {
    "domain_code": "C",
    "item_code": "C4",
    "name": "模仿连续动作",
    "goal": "能模仿包含2-3个步骤的连续动作。",
    "materials": "无需材料",
    "procedure": "1. 老师做2-3步连续动作\n2. 说\"做一样的\"\n3. 观察是否能按顺序完成\n4. 如：拍手→摸头→举手",
    "order_in_domain": 4
  },
  {
    "domain_code": "C",
    "item_code": "C5",
    "name": "模仿声音",
    "goal": "能模仿各种声音（动物叫声、环境音等）。",
    "materials": "动物图片/玩具（可选）",
    "procedure": "1. 老师发出声音\n2. 说\"你说一样的\"\n3. 测试：喵、汪、咩、汽车声",
    "order_in_domain": 5
  },
  {
    "domain_code": "C",
    "item_code": "C6",
    "name": "模仿口型",
    "goal": "能模仿老师的口型和发音。",
    "materials": "镜子（可选）",
    "procedure": "1. 老师做夸张口型\n2. 观察孩子是否模仿口型\n3. 测试：啊、呜、吧、妈",
    "order_in_domain": 6
  },
  {
    "domain_code": "C",
    "item_code": "C7",
    "name": "模仿延迟动作",
    "goal": "在延迟后能模仿动作（老师做完后隔几秒再让孩子做）。",
    "materials": "无需材料",
    "procedure": "1. 老师做动作\n2. 等待3-5秒\n3. 说\"现在你做\"\n4. 观察是否能回忆起并模仿",
    "order_in_domain": 7
  },
  {
    "domain_code": "C",
    "item_code": "C8",
    "name": "模仿新动作",
    "goal": "能快速学会模仿新的、未教过的动作。",
    "materials": "无需材料",
    "procedure": "1. 呈现一个从未教过的动作\n2. 观察是否能在5次以内学会\n3. 记录学习速度",
    "order_in_domain": 8
  },
  {
    "domain_code": "E",
    "item_code": "E1",
    "name": "听从一步指令",
    "goal": "能听懂并执行单步指令（如\"坐下\"\"过来\"\"拍手\"）。",
    "materials": "无需材料",
    "procedure": "1. 发出清晰的一步指令\n2. 不给予手势辅助\n3. 观察3秒内是否执行\n4. 测试10种不同指令",
    "order_in_domain": 1
  },
  {
    "domain_code": "E",
    "item_code": "E2",
    "name": "听从二步指令",
    "goal": "能听懂并执行包含两个步骤的指令（如\"拿杯子，放桌上\"）。",
    "materials": "常见物品",
    "procedure": "1. 发出两步指令\n2. 观察是否按正确顺序执行\n3. 测试多种组合",
    "order_in_domain": 2
  },
  {
    "domain_code": "E",
    "item_code": "E3",
    "name": "指出身体部位",
    "goal": "能根据名称指出自己或他人的身体部位。",
    "materials": "身体部位图（可选）",
    "procedure": "1. 说\"指鼻子\"\"指眼睛\"\n2. 观察是否正确指出\n3. 测试10个部位",
    "order_in_domain": 3
  },
  {
    "domain_code": "E",
    "item_code": "E4",
    "name": "指出常见物品",
    "goal": "能根据名称指出环境中的常见物品。",
    "materials": "多种常见物品",
    "procedure": "1. 说\"指杯子\"\"指鞋子\"\n2. 观察是否正确指出\n3. 测试至少50种物品",
    "order_in_domain": 4
  },
  {
    "domain_code": "E",
    "item_code": "E5",
    "name": "指出图片中的物品",
    "goal": "能根据名称指出图片中的物品。",
    "materials": "物品图片",
    "procedure": "1. 呈现图片\n2. 说\"指___\"\n3. 观察是否正确指出\n4. 测试至少50张图片",
    "order_in_domain": 5
  },
  {
    "domain_code": "E",
    "item_code": "E6",
    "name": "理解方位词",
    "goal": "能理解并执行包含方位词的指令（如\"放桌上\"\"放椅子下面\"）。",
    "materials": "常见物品、家具",
    "procedure": "1. 说\"放桌上\"\"从盒子里拿出来\"\n2. 观察是否正确执行\n3. 测试多种方位词",
    "order_in_domain": 6
  },
  {
    "domain_code": "E",
    "item_code": "E7",
    "name": "理解形容词",
    "goal": "能根据形容词选择物品（如\"拿大的\"\"拿红色的\"）。",
    "materials": "多种大小/颜色的物品",
    "procedure": "1. 说\"拿大的\"\"拿红色的\"\n2. 观察是否正确选择\n3. 测试多种形容词",
    "order_in_domain": 7
  },
  {
    "domain_code": "E",
    "item_code": "E8",
    "name": "理解动作词汇",
    "goal": "能根据动作名称做出相应动作（如\"跳\"\"跑\"\"睡觉\"）。",
    "materials": "无需材料",
    "procedure": "1. 说\"跳一跳\"\"跑一跑\"\n2. 观察是否正确执行\n3. 测试至少10个动作词",
    "order_in_domain": 8
  },
  {
    "domain_code": "E",
    "item_code": "E9",
    "name": "理解人称代词",
    "goal": "能正确理解\"你\"\"我\"\"他\"等人称代词。",
    "materials": "无需材料",
    "procedure": "1. 说\"给我\"\"给你\"\n2. 观察动作对象是否正确\n3. 测试多种人称代词",
    "order_in_domain": 9
  },
  {
    "domain_code": "E",
    "item_code": "E10",
    "name": "理解否定词",
    "goal": "能理解否定指令（如\"不要碰\"\"不是这个\"）。",
    "materials": "物品若干",
    "procedure": "1. 说\"不要碰\"\"拿不是红色的\"\n2. 观察是否正确执行\n3. 测试多种否定情境",
    "order_in_domain": 10
  },
  {
    "domain_code": "F",
    "item_code": "F1",
    "name": "要求物品（食物）",
    "goal": "能用手势/语言主动要求得到食物或喜欢的物品。",
    "materials": "孩子喜欢的食物/物品",
    "procedure": "1. 把食物放在看得到拿不到的地方\n2. 观察是否主动要求\n3. 记录要求方式（手势/声音/语言）",
    "order_in_domain": 1
  },
  {
    "domain_code": "F",
    "item_code": "F2",
    "name": "要求帮助",
    "goal": "遇到困难时能用手势/语言主动请求帮助。",
    "materials": "拧不开的瓶子、打不开的盒子等",
    "procedure": "1. 设置需要帮助的障碍\n2. 观察是否主动请求帮助\n3. 记录要求方式",
    "order_in_domain": 2
  },
  {
    "domain_code": "F",
    "item_code": "F3",
    "name": "要求信息",
    "goal": "能主动提问（如\"在哪里？\"\"是什么？\"）。",
    "materials": "藏起来的物品",
    "procedure": "1. 把喜欢的物品藏起来\n2. 观察是否主动询问位置\n3. 记录提问方式",
    "order_in_domain": 3
  },
  {
    "domain_code": "F",
    "item_code": "F4",
    "name": "要求关注",
    "goal": "能用适当方式获得他人关注（如叫名字、拉衣服等）。",
    "materials": "无需材料",
    "procedure": "1. 老师在忙其他事情\n2. 观察孩子如何获得关注\n3. 记录方式是否恰当",
    "order_in_domain": 4
  },
  {
    "domain_code": "F",
    "item_code": "F5",
    "name": "要求活动",
    "goal": "能用手势/语言主动要求开始或继续某项活动。",
    "materials": "孩子喜欢的活动",
    "procedure": "1. 暂停正在进行的喜欢的活动\n2. 观察是否主动要求继续\n3. 记录要求方式",
    "order_in_domain": 5
  },
  {
    "domain_code": "F",
    "item_code": "F6",
    "name": "要求去除",
    "goal": "能用手势/语言表示不要某物或停止某项活动。",
    "materials": "不喜欢的物品/活动",
    "procedure": "1. 呈现不喜欢的东西\n2. 观察是否主动表示拒绝\n3. 记录拒绝方式",
    "order_in_domain": 6
  },
  {
    "domain_code": "F",
    "item_code": "F7",
    "name": "用语言要求物品",
    "goal": "能用词语/短句主动要求物品。",
    "materials": "多种物品",
    "procedure": "1. 把物品放在拿不到的地方\n2. 观察是否用语言表达要求\n3. 测试至少20种物品",
    "order_in_domain": 7
  },
  {
    "domain_code": "F",
    "item_code": "F8",
    "name": "用句子要求",
    "goal": "能用完整句子主动提出要求（如\"我要喝水\"）。",
    "materials": "多种情境",
    "procedure": "1. 创造各种需要提要求的情境\n2. 观察是否用完整句子表达\n3. 测试多种句型",
    "order_in_domain": 8
  },
  {
    "domain_code": "G",
    "item_code": "G1",
    "name": "命名常见物品",
    "goal": "能说出常见物品的名称（如\"杯子\"\"鞋子\"）。",
    "materials": "常见物品（至少50种）",
    "procedure": "1. 拿起物品问\"这是什么？\"\n2. 观察是否能说出名称\n3. 测试至少50种物品",
    "order_in_domain": 1
  },
  {
    "domain_code": "G",
    "item_code": "G2",
    "name": "命名身体部位",
    "goal": "能说出身体部位的名称。",
    "materials": "身体部位图或真人",
    "procedure": "1. 指着部位问\"这是什么？\"\n2. 或说\"指出你的鼻子\"\n3. 测试10个以上部位",
    "order_in_domain": 2
  },
  {
    "domain_code": "G",
    "item_code": "G3",
    "name": "命名图片中的物品",
    "goal": "能说出图片中物品的名称。",
    "materials": "物品图片（至少50张）",
    "procedure": "1. 呈现图片\n2. 问\"这是什么？\"\n3. 测试至少50张图片",
    "order_in_domain": 3
  },
  {
    "domain_code": "G",
    "item_code": "G4",
    "name": "命名动作",
    "goal": "能描述正在发生的动作（如\"跑\"\"吃\"\"睡觉\"）。",
    "materials": "动作图片/视频/现场演示",
    "procedure": "1. 呈现动作\n2. 问\"他在做什么？\"\n3. 测试至少10个动作",
    "order_in_domain": 4
  },
  {
    "domain_code": "G",
    "item_code": "G5",
    "name": "命名属性",
    "goal": "能描述物品的属性（颜色、大小、形状等）。",
    "materials": "多种属性的物品",
    "procedure": "1. 拿起物品问\"这是什么颜色？\"\"这是什么形状？\"\n2. 测试多种属性",
    "order_in_domain": 5
  },
  {
    "domain_code": "G",
    "item_code": "G6",
    "name": "命名场所",
    "goal": "能说出常见场所的名称（如\"学校\"\"医院\"\"超市\"）。",
    "materials": "场所图片",
    "procedure": "1. 呈现场所图片\n2. 问\"这是哪里？\"\n3. 测试至少10个场所",
    "order_in_domain": 6
  },
  {
    "domain_code": "G",
    "item_code": "G7",
    "name": "命名人物",
    "goal": "能说出熟悉人物的名称或关系（如\"妈妈\"\"老师\"）。",
    "materials": "人物照片",
    "procedure": "1. 呈现人物照片\n2. 问\"这是谁？\"\n3. 测试熟悉人物",
    "order_in_domain": 7
  },
  {
    "domain_code": "G",
    "item_code": "G8",
    "name": "命名情感",
    "goal": "能识别并说出人物的情感（如\"开心\"\"难过\"\"生气\"）。",
    "materials": "表情图片",
    "procedure": "1. 呈现表情图片\n2. 问\"他怎么了？\"\n3. 测试基本情绪",
    "order_in_domain": 8
  },
  {
    "domain_code": "H",
    "item_code": "H1",
    "name": "回答\"是不是\"",
    "goal": "能回答是非问题。",
    "materials": "无需材料",
    "procedure": "1. 问\"这是杯子吗？\"\n2. 问\"你饿了吗？\"\n3. 记录回答正确率",
    "order_in_domain": 1
  },
  {
    "domain_code": "H",
    "item_code": "H2",
    "name": "回答\"什么\"",
    "goal": "能回答\"什么\"类问题。",
    "materials": "常见物品",
    "procedure": "1. 问\"这是什么？\"\n2. 问\"你在吃什么？\"\n3. 测试多种情境",
    "order_in_domain": 2
  },
  {
    "domain_code": "H",
    "item_code": "H3",
    "name": "回答\"谁\"",
    "goal": "能回答\"谁\"类问题。",
    "materials": "熟悉人物场景",
    "procedure": "1. 问\"谁给你拿的水？\"\n2. 问\"这是谁的鞋？\"\n3. 测试多种情境",
    "order_in_domain": 3
  },
  {
    "domain_code": "H",
    "item_code": "H4",
    "name": "回答\"哪里\"",
    "goal": "能回答\"哪里\"类问题。",
    "materials": "熟悉场所/物品位置",
    "procedure": "1. 问\"杯子在哪里？\"\n2. 问\"妈妈在哪里？\"\n3. 测试多种情境",
    "order_in_domain": 4
  },
  {
    "domain_code": "H",
    "item_code": "H5",
    "name": "填空式对话",
    "goal": "能完成熟悉的儿歌/故事/日常对话中的填空。",
    "materials": "熟悉的儿歌/故事书",
    "procedure": "1. 说\"小白兔，白又白，两只耳朵___\"\n2. 观察是否填空\n3. 测试多种熟悉的内容",
    "order_in_domain": 5
  },
  {
    "domain_code": "H",
    "item_code": "H6",
    "name": "回答\"为什么\"",
    "goal": "能回答\"为什么\"类问题。",
    "materials": "日常情境",
    "procedure": "1. 问\"为什么要洗手？\"\n2. 问\"为什么要穿鞋子？\"\n3. 测试多种情境",
    "order_in_domain": 6
  },
  {
    "domain_code": "H",
    "item_code": "H7",
    "name": "回答\"什么时候\"",
    "goal": "能回答\"什么时候\"类问题。",
    "materials": "日常活动情境",
    "procedure": "1. 问\"什么时候吃饭？\"\n2. 问\"什么时候睡觉？\"\n3. 测试时间概念",
    "order_in_domain": 7
  },
  {
    "domain_code": "H",
    "item_code": "H8",
    "name": "回答\"多少\"",
    "goal": "能回答\"多少\"类问题。",
    "materials": "可数物品",
    "procedure": "1. 指着物品问\"有几个？\"\n2. 测试数量概念\n3. 从1-10逐步测试",
    "order_in_domain": 8
  },
  {
    "domain_code": "H",
    "item_code": "H9",
    "name": "功能、特征、类别",
    "goal": "能回答关于物品功能、特征、类别的问题。",
    "materials": "常见物品",
    "procedure": "1. 问\"杯子是用来做什么的？\"\n2. 问\"苹果是什么颜色的？\"\n3. 问\"苹果和香蕉属于什么？\"",
    "order_in_domain": 9
  },
  {
    "domain_code": "H",
    "item_code": "H10",
    "name": "对话维持",
    "goal": "能进行至少3个来回的对话。",
    "materials": "无需材料",
    "procedure": "1. 开始一个话题\n2. 观察能否维持对话\n3. 记录对话轮数",
    "order_in_domain": 10
  },
  {
    "domain_code": "K",
    "item_code": "K1",
    "name": "功能性游戏",
    "goal": "能用物品进行其本来用途的游戏（如推车、打电话）。",
    "materials": "车子、电话、杯子等",
    "procedure": "1. 给孩子玩具\n2. 观察是否进行功能性玩法\n3. 测试多种玩具",
    "order_in_domain": 1
  },
  {
    "domain_code": "K",
    "item_code": "K2",
    "name": "建构游戏",
    "goal": "能用积木等材料搭建简单结构。",
    "materials": "积木、磁力片等",
    "procedure": "1. 给孩子建构玩具\n2. 观察是否会搭建\n3. 测试是否会模仿搭建",
    "order_in_domain": 2
  },
  {
    "domain_code": "K",
    "item_code": "K3",
    "name": "假装游戏-简单",
    "goal": "能进行简单的假装游戏（如假装喝水、假装睡觉）。",
    "materials": "杯子、枕头等",
    "procedure": "1. 示范假装动作\n2. 观察是否模仿\n3. 测试多种假装情境",
    "order_in_domain": 3
  },
  {
    "domain_code": "K",
    "item_code": "K4",
    "name": "假装游戏-复杂",
    "goal": "能进行包含角色和情节的假装游戏（如\"当医生看病\"）。",
    "materials": "医生玩具、厨房玩具等",
    "procedure": "1. 设置假装情境\n2. 观察是否能进行角色扮演\n3. 测试情节复杂度",
    "order_in_domain": 4
  },
  {
    "domain_code": "K",
    "item_code": "K5",
    "name": "游戏规则理解",
    "goal": "能理解并遵守简单游戏规则。",
    "materials": "球、滑梯等",
    "procedure": "1. 和孩子玩\"躲猫猫\"\"传球\"等\n2. 观察是否理解轮流、规则\n3. 测试多种游戏",
    "order_in_domain": 5
  },
  {
    "domain_code": "K",
    "item_code": "K6",
    "name": "独立游戏",
    "goal": "能独立进行游戏活动至少5分钟。",
    "materials": "孩子喜欢的玩具",
    "procedure": "1. 给孩子玩具后离开\n2. 计时独立游戏时间\n3. 记录游戏内容和持续时间",
    "order_in_domain": 6
  },
  {
    "domain_code": "K",
    "item_code": "K7",
    "name": "平行游戏",
    "goal": "能在其他孩子旁边玩自己的游戏。",
    "materials": "群体环境、玩具",
    "procedure": "1. 在其他孩子在场的情况下\n2. 观察是否能在旁边独立玩耍\n3. 记录社交互动情况",
    "order_in_domain": 7
  },
  {
    "domain_code": "K",
    "item_code": "K8",
    "name": "合作游戏",
    "goal": "能与其他孩子一起进行需要合作的游戏。",
    "materials": "群体环境、合作性玩具",
    "procedure": "1. 组织需要合作的游戏\n2. 观察是否参与合作\n3. 记录合作程度",
    "order_in_domain": 8
  },
  {
    "domain_code": "L",
    "item_code": "L1",
    "name": "分享兴趣",
    "goal": "看到有趣事物时会与他人分享（指、拉人看等）。",
    "materials": "新奇有趣的物品/事件",
    "procedure": "1. 呈现有趣的事物\n2. 观察是否拉大人来看或指给大人看\n3. 记录分享方式",
    "order_in_domain": 1
  },
  {
    "domain_code": "L",
    "item_code": "L2",
    "name": "寻求安慰",
    "goal": "受伤或害怕时会主动寻求他人安慰。",
    "materials": "日常情境",
    "procedure": "1. 观察孩子在不适情境中的反应\n2. 是否找大人抱抱/安慰\n3. 记录寻求安慰的方式",
    "order_in_domain": 2
  },
  {
    "domain_code": "L",
    "item_code": "L3",
    "name": "回应他人情绪",
    "goal": "能对他人的情绪做出适当反应（如递纸巾、安慰）。",
    "materials": "日常情境",
    "procedure": "1. 观察看到大人哭泣时的反应\n2. 是否有共情行为\n3. 记录反应类型",
    "order_in_domain": 3
  },
  {
    "domain_code": "L",
    "item_code": "L4",
    "name": "主动社交发起",
    "goal": "能主动发起社交互动（如打招呼、邀请游戏）。",
    "materials": "社交情境",
    "procedure": "1. 观察是否主动与人打招呼\n2. 是否主动邀请小朋友玩\n3. 记录主动发起频率",
    "order_in_domain": 4
  },
  {
    "domain_code": "L",
    "item_code": "L5",
    "name": "维持社交互动",
    "goal": "能维持至少3个来回的社交互动。",
    "materials": "社交情境",
    "procedure": "1. 与孩子开始互动\n2. 观察互动轮数\n3. 记录是否能维持对话/游戏",
    "order_in_domain": 5
  },
  {
    "domain_code": "L",
    "item_code": "L6",
    "name": "理解社交边界",
    "goal": "能理解个人空间和适当社交距离。",
    "materials": "社交情境",
    "procedure": "1. 观察是否理解\"不要碰别人\"\n2. 是否保持适当距离\n3. 记录社交边界意识",
    "order_in_domain": 6
  },
  {
    "domain_code": "L",
    "item_code": "L7",
    "name": "与同龄人互动",
    "goal": "能与同龄人进行适当的互动和游戏。",
    "materials": "群体环境",
    "procedure": "1. 观察在群体中的表现\n2. 是否参与同龄人的活动\n3. 记录互动质量",
    "order_in_domain": 7
  },
  {
    "domain_code": "L",
    "item_code": "L8",
    "name": "轮流等待",
    "goal": "能理解并执行轮流规则（如排队、轮流玩）。",
    "materials": "需要轮流的活动",
    "procedure": "1. 组织需要轮流的游戏\n2. 观察是否能等待轮到自己\n3. 记录等待能力",
    "order_in_domain": 8
  },
  {
    "domain_code": "N",
    "item_code": "N1",
    "name": "洗手",
    "goal": "能独立完成洗手步骤（湿手-涂皂-搓洗-冲洗-擦干）。",
    "materials": "洗手池、肥皂、毛巾",
    "procedure": "1. 给出\"去洗手\"的指令\n2. 观察是否能独立完成全部步骤\n3. 记录辅助程度",
    "order_in_domain": 1
  },
  {
    "domain_code": "N",
    "item_code": "N2",
    "name": "穿脱简单衣物",
    "goal": "能自己穿脱简单衣物（如T恤、裤子）。",
    "materials": "适合孩子尺寸的衣物",
    "procedure": "1. 给出\"穿衣服\"的指令\n2. 观察穿脱能力\n3. 记录独立程度",
    "order_in_domain": 2
  },
  {
    "domain_code": "N",
    "item_code": "N3",
    "name": "独立进餐",
    "goal": "能独立使用餐具进餐，不洒太多。",
    "materials": "餐具、食物",
    "procedure": "1. 观察进餐过程\n2. 是否能独立使用勺/筷子\n3. 记录进餐质量和整洁度",
    "order_in_domain": 3
  },
  {
    "domain_code": "N",
    "item_code": "N4",
    "name": "表达如厕需求",
    "goal": "能在需要如厕时主动告诉大人。",
    "materials": "日常情境",
    "procedure": "1. 观察是否主动表达如厕需求\n2. 记录表达方式（手势/语言/其他）\n3. 记录成功频率",
    "order_in_domain": 4
  },
  {
    "domain_code": "N",
    "item_code": "N5",
    "name": "整理玩具/物品",
    "goal": "能在提醒下将玩具/物品放回原处。",
    "materials": "玩具、收纳盒",
    "procedure": "1. 游戏结束后说\"把玩具收好\"\n2. 观察是否整理\n3. 记录独立完成程度",
    "order_in_domain": 5
  },
  {
    "domain_code": "N",
    "item_code": "N6",
    "name": "遵循日常常规",
    "goal": "能按照日常时间表完成常规活动（如起床、吃饭、睡觉流程）。",
    "materials": "日常时间表（可选）",
    "procedure": "1. 观察是否理解日常流程\n2. 是否能按顺序完成\n3. 记录遵循程度",
    "order_in_domain": 6
  },
  {
    "domain_code": "N",
    "item_code": "N7",
    "name": "课堂常规-坐好",
    "goal": "能在要求时坐在座位上并保持适当时间。",
    "materials": "椅子、桌子",
    "procedure": "1. 给出\"坐好\"的指令\n2. 计时保持坐姿的时间\n3. 记录持续时间和配合度",
    "order_in_domain": 7
  },
  {
    "domain_code": "N",
    "item_code": "N8",
    "name": "课堂常规-注意力",
    "goal": "能在团体活动中保持对老师的注意力。",
    "materials": "团体环境",
    "procedure": "1. 在团体活动中观察\n2. 是否看向老师\n3. 记录注意力持续时间和质量",
    "order_in_domain": 8
  },
  {
    "domain_code": "N",
    "item_code": "N9",
    "name": "任务转换",
    "goal": "能从一个活动顺利转换到另一个活动。",
    "materials": "两个不同的活动",
    "procedure": "1. 告诉孩子\"现在我们要做___\"\n2. 观察转换过程\n3. 记录转换难度和配合度",
    "order_in_domain": 9
  },
  {
    "domain_code": "N",
    "item_code": "N10",
    "name": "独立完成任务",
    "goal": "能独立完成一个5-10分钟的任务。",
    "materials": "适合的任务材料",
    "procedure": "1. 给出一个明确的任务\n2. 观察是否能独立完成\n3. 计时并记录完成质量",
    "order_in_domain": 10
  }
];

/** 0-4 评分等级 */
export const ABLLS_SCORE_LEVELS = [
  { value: 0, label: '尚未出现', desc: '需要大量辅助,几乎不能独立完成' },
  { value: 1, label: '开始萌芽', desc: '偶尔能完成,需要持续辅助' },
  { value: 2, label: '部分掌握', desc: '有时能完成,需要中等辅助' },
  { value: 3, label: '基本掌握', desc: '经常能完成,需要少量提示' },
  { value: 4, label: '完全掌握', desc: '能独立或泛化完成' },
] as const;

/** 把平均分映射到能力等级(用于报告) */
export function avgToLevel(avg: number | null): { label: string; desc: string } | null {
  if (avg === null) return null;
  if (avg <= 0.5) return { label: '尚未出现', desc: '需要大量辅助,几乎不能独立完成' };
  if (avg <= 1.5) return { label: '开始萌芽', desc: '偶尔能完成,需要持续辅助' };
  if (avg <= 2.5) return { label: '部分掌握', desc: '有时能完成,需要中等辅助' };
  if (avg <= 3.5) return { label: '基本掌握', desc: '经常能完成,需要少量提示' };
  return { label: '完全掌握', desc: '能独立或泛化完成' };
}
