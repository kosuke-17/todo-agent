import * as fs from "fs";
import * as path from "path";
import type { Todo } from "./types.js";

// 安全なファイルパス設定
const DB_PATH = path.resolve(process.cwd(), "todos.json");

// パス検証
if (!DB_PATH.startsWith(process.cwd())) {
  throw new Error("Invalid file path");
}

export function readTodos(): Todo[] {
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(raw);

    // データ構造の検証
    if (!Array.isArray(parsed)) {
      console.warn("Invalid data format, resetting to empty array");
      return [];
    }

    return parsed as Todo[];
  } catch (error) {
    console.warn("Failed to read todos:", error);
    return [];
  }
}

export function writeTodos(todos: Todo[]) {
  try {
    // データ検証
    if (!Array.isArray(todos)) {
      throw new Error("Invalid todos data");
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(todos, null, 2));
  } catch (error) {
    console.error("Failed to write todos:", error);
    throw new Error("データの保存に失敗しました");
  }
}
