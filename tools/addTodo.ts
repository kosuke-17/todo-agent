import { readTodos, writeTodos } from "./database.js";
import type { Todo } from "./types.js";

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
