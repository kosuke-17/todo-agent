import "dotenv/config";

import OpenAI from "openai";

// APIキーの検証
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error(
    "❌ OPENAI_API_KEY が設定されていません。.envファイルを確認してください。"
  );
  process.exit(1);
}

export const openai = new OpenAI({ apiKey });
