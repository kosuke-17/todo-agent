export type Todo = {
  id: number;
  text: string;
  done: boolean;
  createdAt: string;
};

export type Msg = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
};
