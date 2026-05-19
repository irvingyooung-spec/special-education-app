import OpenAI from "openai";

// DeepSeek 提供 OpenAI 兼容接口,直接复用 OpenAI SDK,只改 baseURL 和 API key。
// 以后想换 Anthropic / 其他厂商,只需改这个文件,业务代码不动。

const apiKey = process.env.DEEPSEEK_API_KEY;
const baseURL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

if (!apiKey) {
  // 不在模块加载阶段抛错,只在真正调用芽宝时再说,避免开发服务器整体起不来
  console.warn("[ai] DEEPSEEK_API_KEY 未设置,芽宝功能不可用");
}

const client = new OpenAI({
  apiKey: apiKey ?? "placeholder-will-fail-at-call-time",
  baseURL,
});

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/**
 * 一次性生成文本(非流式)。用于:治疗计划草稿、单条问答。
 * 返回模型完整回复文本。出错抛异常,调用方负责处理 UI。
 */
export async function generate(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  if (!apiKey) {
    throw new Error("芽宝服务未配置:缺少 DEEPSEEK_API_KEY");
  }

  const resp = await client.chat.completions.create({
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2000,
  });

  const text = resp.choices[0]?.message?.content;
  if (!text) {
    throw new Error("芽宝返回内容为空");
  }
  return text;
}

/**
 * 流式生成,逐 token 推送回调。用于:家长聊天的"打字机"效果。
 * 调用方拿到 ReadableStream,从 Server Action 一路转发到客户端。
 */
export async function* generateStream(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {}
): AsyncGenerator<string, void, unknown> {
  if (!apiKey) {
    throw new Error("芽宝服务未配置:缺少 DEEPSEEK_API_KEY");
  }

  const stream = await client.chat.completions.create({
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 2000,
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}

// 用于其他文件知道当前模型,便于显示"由 deepseek-chat 生成"等
export const aiModelName = model;
