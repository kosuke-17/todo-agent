import { readTodos } from "../utils/database.js";

export const listTodosTool = {
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
} as const;

export async function listTodos(): Promise<string> {
  const todos = readTodos();
  if (!todos.length) return "No todos.";
  return todos
    .map((t) => `#${t.id} ${t.done ? "[x]" : "[ ]"} ${t.text}`)
    .join("\n");
}
