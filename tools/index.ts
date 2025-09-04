import { getTimeTool, getTime } from "./getTime.js";
import { addTodoTool, addTodo } from "./addTodo.js";
import { listTodosTool, listTodos } from "./listTodos.js";

// ツール定義の配列
export const toolDefs = [getTimeTool, addTodoTool, listTodosTool] as const;

// ツール実行関数
export async function callTool(name: string, args: any): Promise<string> {
  // ツール名の検証
  if (!name || typeof name !== "string") {
    throw new Error("Invalid tool name");
  }

  try {
    switch (name) {
      case "get_time":
        return await getTime();
      case "add_todo":
        return await addTodo(args);
      case "list_todos":
        return await listTodos();
      default:
        throw new Error("Unknown tool");
    }
  } catch (error) {
    // エラーメッセージから内部情報を除去
    console.error(`ツール実行エラー (${name}):`, error);
    throw new Error("ツールの実行に失敗しました");
  }
}

// 個別のツールもエクスポート（必要に応じて）
export { getTime, addTodo, listTodos };
export { getTimeTool, addTodoTool, listTodosTool };
