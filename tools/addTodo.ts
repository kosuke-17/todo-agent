import { readTodos, writeTodos } from "../utils/database.js";
import type { Todo } from "../utils/types.js";

export const addTodoTool = {
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
} as const;

export async function addTodo(args: { text: string }): Promise<string> {
  // 入力検証
  if (!args || typeof args !== "object") {
    throw new Error("Invalid arguments");
  }

  const text = String(args.text || "").trim();
  if (!text) {
    throw new Error("TODO内容が空です");
  }

  if (text.length > 500) {
    throw new Error("TODO内容が長すぎます（500文字以内）");
  }

  // 危険な文字の検証
  const dangerousChars = /[<>\"'&]/;
  if (dangerousChars.test(text)) {
    throw new Error("TODO内容に無効な文字が含まれています");
  }

  const todos = readTodos();
  const next: Todo = {
    id: todos.length ? Math.max(...todos.map((t) => t.id)) + 1 : 1,
    text: text,
    done: false,
    createdAt: new Date().toISOString(),
  };
  todos.push(next);
  writeTodos(todos);
  return `Added #${next.id}: ${next.text}`;
}
