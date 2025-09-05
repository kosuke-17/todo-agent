import { addTodoTool, addTodo } from "./addTodo.js";
import { listTodosTool, listTodos } from "./listTodos.js";
import { addCalendarEvent, addCalendarEventTool } from "./addCalender.js";

export const toolDefs = [
  addCalendarEventTool,
  addTodoTool,
  listTodosTool,
] as const;

// ツール実行関数
export async function callTool(name: string, args: any): Promise<string> {
  // ツール名の検証
  if (!name || typeof name !== "string") {
    throw new Error("Invalid tool name");
  }

  try {
    switch (name) {
      case "add_todo":
        return await addTodo(args);
      case "list_todos":
        return await listTodos();
      case "add_calendar_event":
        return await addCalendarEvent(args);
      default:
        throw new Error("Unknown tool");
    }
  } catch (error) {
    // エラーメッセージから内部情報を除去
    console.error(`ツール実行エラー (${name}):`, error);
    throw new Error("ツールの実行に失敗しました");
  }
}
