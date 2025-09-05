import "dotenv/config";
import * as readline from "readline";
import OpenAI from "openai";
import { toolDefs, callTool } from "./tools";

// APIキーの検証
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error(
    "❌ OPENAI_API_KEY が設定されていません。.envファイルを確認してください。"
  );
  process.exit(1);
}

const client = new OpenAI({ apiKey });

// モデルは手元の環境に合わせて置き換えてOK
const MODEL = "gpt-4o-mini"; // 例: コスト軽めのtool-calling対応モデル

const SYSTEM = `
あなたは「シンプル家事秘書」エージェントです。
- ユーザーの依頼に応じて、必要ならツールを呼び出して実行結果を要約して返す。
- 一度に1ツールずつ。ツール結果を受けたら最終回答を出す（無限ループ禁止）。
- 返答は簡潔・実用的に。日本語。喋り方は大阪のおばちゃんみたいに元気な感じで。

【重要な指示】
- カレンダーイベントの作成時は、現在時刻を取得して直接add_calendar_eventツールを使用してください。
- 入力テキストに含まれる相対的な時間表現（例: 明日、来週の月曜、午後3時）は、
  必ず {now} と {timezone} を基準に ISO8601（タイムゾーンオフセット付き）へ変換してください。
[例1]
入力: "明日12時から13時に 会議準備 を追加"
now=2025-09-05T22:00:00+09:00 timezone=Asia/Tokyo
出力:
{"summary":"会議準備","start":"2025-09-06T12:00:00+09:00","end":"2025-09-06T13:00:00+09:00"}

[例2]
入力: "来週の月曜の午後3時にデザインレビュー"
now=2025-09-05T22:00:00+09:00 timezone=Asia/Tokyo  # 2025-09-05(金)
→ 来週の月曜 = 2025-09-08
出力:
{"summary":"デザインレビュー","start":"2025-09-08T15:00:00+09:00","end":"2025-09-08T16:00:00+09:00"}

[例3]
入力: "9/12 14:30から45分 ミーティング"
→ 明示フォーマット優先、end は +45m
出力:
{"summary":"ミーティング","start":"2025-09-12T14:30:00+09:00","end":"2025-09-12T15:15:00+09:00"}

[例4]
入力: "金曜 夕方に面談"
→ 夕方=17:00開始を規約化（規約は明記）
出力:
{"summary":"面談","start":"2025-09-05T17:00:00+09:00","end":"2025-09-05T18:00:00+09:00"}
`;

const now = new Date().toISOString(); // 例: "2025-09-05T13:00:00.000Z"
// Asia/Tokyo 固定ならアプリ層で "+09:00" 付きに整形して渡す
const timezone = "Asia/Tokyo";
const systemContent = SYSTEM.replace("{now}", now).replace(
  "{timezone}",
  timezone
);

type Msg = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
};
const history: Msg[] = [{ role: "system", content: systemContent }];
const MAX_HISTORY = 50; // 履歴の最大件数を制限

async function step(userInput: string) {
  // 入力検証
  if (!userInput || userInput.length > 1000) {
    return "入力が無効です。1000文字以内で入力してください。";
  }

  history.push({ role: "user", content: userInput });

  // 履歴サイズの制限
  if (history.length > MAX_HISTORY) {
    history.splice(1, history.length - MAX_HISTORY + 1);
  }

  const res = await client.chat.completions.create({
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
    tools: toolDefs as any,
    tool_choice: "auto",
  });

  const msg = res.choices[0]?.message;
  if (!msg) {
    throw new Error("No message received");
  }

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

      // 安全なJSON解析
      let args = {};
      if (call.function.arguments) {
        try {
          args = JSON.parse(call.function.arguments);
          // 基本的な検証
          if (
            typeof args !== "object" ||
            args === null ||
            Array.isArray(args)
          ) {
            throw new Error("Invalid arguments format");
          }
        } catch (error) {
          console.error("❌ ツール引数の解析に失敗しました:", error);
          return "ツール引数の解析に失敗しました。";
        }
      }

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
console.log("🧭 Tiny Agent 起動。何でも話しかけてください");
console.log(
  "（例: 「15時に買い物リマインド…は無理なので代わりにTODO登録して」）"
);
console.log(
  "（例: 「明日15時から16時に 会議準備 をGoogleカレンダーに追加して」）"
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
