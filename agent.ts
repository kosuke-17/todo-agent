import "dotenv/config";
import * as readline from "readline";
import OpenAI from "openai";
import { toolDefs, callTool } from "./tools";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// モデルは手元の環境に合わせて置き換えてOK
const MODEL = "gpt-4o-mini"; // 例: コスト軽めのtool-calling対応モデル

const SYSTEM = `
あなたは「シンプル家事秘書」エージェントです。
- ユーザーの依頼に応じて、必要ならツールを呼び出して実行結果を要約して返す。
- 一度に1ツールずつ。ツール結果を受けたら最終回答を出す（無限ループ禁止）。
- 返答は簡潔・実用的に。日本語。
`;

type Msg = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
};
const history: Msg[] = [{ role: "system", content: SYSTEM }];

async function step(userInput: string) {
  history.push({ role: "user", content: userInput });

  const res = await client.chat.completions.create({
    model: MODEL,
    messages: history.map(({ role, content, name, tool_call_id }) => {
      const base = { role, content };
      if (role === "tool" && name && tool_call_id) {
        return { ...base, name, tool_call_id };
      }
      return base;
    }) as any,
    tools: toolDefs as any,
    tool_choice: "auto",
  });

  const msg = res.choices[0]?.message;
  if (!msg) {
    throw new Error("No message received");
  }

  // ツール呼び出し？
  const calls = msg.tool_calls;
  if (calls && calls.length > 0) {
    const call = calls[0];
    if (call && call.type === "function") {
      // assistantメッセージを追加（tool_callsを含む）
      history.push({
        role: "assistant",
        content: msg.content || "",
        tool_calls: calls,
      });

      const args = call.function.arguments
        ? JSON.parse(call.function.arguments)
        : {};
      const result = await callTool(call.function.name, args);

      // toolメッセージ追加
      history.push({
        role: "tool",
        name: call.function.name,
        tool_call_id: call.id,
        content: result,
      });

      // ツール結果を踏まえ最終回答
      const follow = await client.chat.completions.create({
        model: MODEL,
        messages: history.map(
          ({ role, content, name, tool_call_id, tool_calls }) => {
            const base = { role, content };
            if (role === "tool" && name && tool_call_id) {
              return { ...base, name, tool_call_id };
            }
            if (role === "assistant" && tool_calls) {
              return { ...base, tool_calls };
            }
            return base;
          }
        ) as any,
      });

      const finalMsg = follow.choices[0]?.message.content || "(no content)";
      history.push({ role: "assistant", content: finalMsg });
      return finalMsg;
    }
  } else {
    const final = msg.content || "(no content)";
    history.push({ role: "assistant", content: final });
    return final;
  }
}

// CLI ループ
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
console.log(
  "🧭 Tiny Agent 起動。何でも話しかけてください（例: 「15時に買い物リマインド…は無理なので代わりにTODO登録して」）"
);
function ask() {
  rl.question("> ", async (q: string) => {
    if (!q.trim()) return ask();
    if (q.trim().toLowerCase() === "exit") {
      rl.close();
      return;
    }
    try {
      const out = await step(q);
      console.log(out);
    } catch (e: any) {
      console.error("Error:", e?.message || e);
    }
    ask();
  });
}
ask();
