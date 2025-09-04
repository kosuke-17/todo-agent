export const getTimeTool = {
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
} as const;

export async function getTime(): Promise<string> {
  return new Date().toISOString();
}
