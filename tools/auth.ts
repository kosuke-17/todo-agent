import fs from "fs";
import path from "path";
import { google } from "googleapis";
import readline from "readline";

const TOKEN_PATH = path.join(process.cwd(), "token.json");
// このファイルはCloud ConsoleからDLしたOAuthクライアントID/Secretを使用しています。
const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");

// credentials.json は Cloud Console からDLした OAuth クライアントID/Secret
// @see: https://zenn.dev/nomhiro/articles/google-calendar-api
export async function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf-8"));
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  // token.json があれば再利用
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  // なければユーザーにブラウザで承認させる
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar"],
  });
  console.log("このURLを開いて認証してください:", authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const code: string = await new Promise((resolve) =>
    rl.question("認証コードを貼り付けてください: ", (ans) => {
      rl.close();
      resolve(ans);
    })
  );

  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log("認証情報を保存しました → token.json");
  return oAuth2Client;
}
