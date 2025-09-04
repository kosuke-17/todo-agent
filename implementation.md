いいね、まずは“超ミニ”だけど本当に動くやつを作ろう。
目的は「LLM が“自分で考えて → 必要ならツールを呼んで → 答えを返す”」という**エージェントの最小骨格**を体感すること。
ここでは **Node + TypeScript** で、ツールは 3 つだけ（`get_time` / `add_todo` / `list_todos`）。CLI で対話します。

---

# ゴール

- 会話 →LLM が必要に応じて**ツール呼び出し（function calling）**
- TODO の追加・一覧、現在時刻の取得を**LLM が自律的に選ぶ**
- 1 ファイルでも動くが、拡張しやすい構成

> 「AI に TODO を頼むけど、実行は**本当に**AI がやってる」感を出します。ドミノ倒しの“最初の 1 枚”です。

---

# 1) ひな形作成

```bash
mkdir tiny-agent && cd tiny-agent
npm init -y
npm i typescript ts-node @types/node openai dotenv
npx tsc --init
touch agent.ts tools.ts todos.json .env
```

`.env`（自分のキーを入れる）

```
OPENAI_API_KEY=sk-...
```

`todos.json`（空配列で OK）

```json
[]
```

---

# 2) ツール定義（`tools.ts`）

```ts
import fs from "fs";
import path from "path";

type Todo = { id: number; text: string; done: boolean; createdAt: string };

const DB_PATH = path.join(process.cwd(), "todos.json");

function readTodos(): Todo[] {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw) as Todo[];
  } catch {
    return [];
  }
}

function writeTodos(todos: Todo[]) {
  fs.writeFileSync(DB_PATH, JSON.stringify(todos, null, 2));
}

export const toolDefs = [
  {
    type: "function",
    function: {
      name: "get_time",
      description: "現在の日時（ISO文字列）を返す",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_todo",
      description: "TODOを1件追加する",
      parameters: {
        type: "object",
        properties: { text: { type: "string", description: "TODO内容" } },
        required: ["text"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_todos",
      description: "TODOの一覧を返す",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
] as const;

export async function callTool(name: string, args: any): Promise<string> {
  switch (name) {
    case "get_time": {
      return new Date().toISOString();
    }
    case "add_todo": {
      const todos = readTodos();
      const next: Todo = {
        id: todos.length ? Math.max(...todos.map((t) => t.id)) + 1 : 1,
        text: String(args.text),
        done: false,
        createdAt: new Date().toISOString(),
      };
      todos.push(next);
      writeTodos(todos);
      return `Added #${next.id}: ${next.text}`;
    }
    case "list_todos": {
      const todos = readTodos();
      if (!todos.length) return "No todos.";
      return todos
        .map((t) => `#${t.id} ${t.done ? "[x]" : "[ ]"} ${t.text}`)
        .join("\n");
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
```

---

# 3) エージェント本体（`agent.ts`）

```ts
import "dotenv/config";
import readline from "readline";
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
  content: any;
  name?: string;
  tool_call_id?: string;
};
const history: Msg[] = [{ role: "system", content: SYSTEM }];

async function step(userInput: string) {
  history.push({ role: "user", content: userInput });

  const res = await client.chat.completions.create({
    model: MODEL,
    messages: history.map(({ role, content, name, tool_call_id }) => ({
      role,
      content: typeof content === "string" ? content : JSON.stringify(content),
      name,
      tool_call_id,
    })),
    tools: toolDefs as any,
    tool_choice: "auto",
  });

  const msg = res.choices[0].message;

  // ツール呼び出し？
  const calls = msg.tool_calls;
  if (calls && calls.length > 0) {
    const call = calls[0];
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
      messages: history.map(({ role, content, name, tool_call_id }) => ({
        role,
        content:
          typeof content === "string" ? content : JSON.stringify(content),
        name,
        tool_call_id,
      })),
    });

    const finalMsg = follow.choices[0].message.content || "(no content)";
    history.push({ role: "assistant", content: finalMsg });
    return finalMsg;
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
  rl.question("> ", async (q) => {
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
```

---

# 4) 実行

```bash
npx ts-node agent.ts
# 例の会話
# > 今の時間は？
# > 買い物をTODOに追加して
# > TODO見せて
```

---

## 仕組みのポイント

- **LLM の意思決定**：`tools` に関数スキーマを渡す →LLM が「使う/使わない」を判断
- **実行**：実際の処理は `callTool()` 内の**あなたのコード**
- **ループ制御**：最小構成なので「1 回ツール → 最終回答」で終わり（無限思考はさせない）
- **拡張容易**：`tools.ts` に関数を足すだけで機能が増やせる

---

TODO

- **Web UI**：Next.js の API Route から `step()` を呼ぶだけで、すぐ画面化

---
