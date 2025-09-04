import * as fs from "fs";
import * as path from "path";
import type { Todo } from "./types.js";

const DB_PATH = path.join(process.cwd(), "todos.json");

export function readTodos(): Todo[] {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    return JSON.parse(raw) as Todo[];
  } catch {
    return [];
  }
}

export function writeTodos(todos: Todo[]) {
  fs.writeFileSync(DB_PATH, JSON.stringify(todos, null, 2));
}
