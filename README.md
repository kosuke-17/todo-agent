# Tiny Agent - 超ミニエージェントアプリ

LLM が「自分で考えて → 必要ならツールを呼んで → 答えを返す」というエージェントの最小骨格を体感できるアプリです。

## 機能

- TODO の追加・一覧表示
- Google カレンダーへの予定追加
- LLM が自律的にツールを選択・実行

## セットアップ

1. 依存関係のインストール

```bash
npm install
```

2. 環境変数の設定
   `.env`ファイルを作成して、API キーを設定してください：

```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

3. Google カレンダー API の設定（オプション）
   Google カレンダー機能を使用する場合は、以下を設定してください：

   a) Google Cloud Console でプロジェクトを作成し、Calendar API を有効化
   b) OAuth 2.0 クライアント ID を作成し、`credentials.json`として保存
   c) 初回実行時に認証フローが開始されます

## 実行

```bash
npm start
```

または

```bash
npx tsx agent.ts
```

## 使用例

```
🧭 Tiny Agent 起動。何でも話しかけてください
（例: 「15時に買い物リマインド…は無理なので代わりにTODO登録して」）
（例: 「明日15時から16時に 会議準備 をGoogleカレンダーに追加して」）
> 買い物をTODOに追加して
> TODO見せて
> 明日15時から16時に会議をカレンダーに追加して
> exit
```

## ファイル構成

- `agent.ts` - エージェント本体（CLI 対話ループ）
- `tools/` - ツール実装ディレクトリ
  - `index.ts` - ツール定義と実行関数
  - `addTodo.ts` - TODO 追加機能
  - `listTodos.ts` - TODO 一覧表示機能
  - `addCalender.ts` - Google カレンダー予定追加機能
  - `auth.ts` - Google 認証機能
  - `database.ts` - データベース操作
  - `types.ts` - 型定義
- `todos.json` - TODO データの保存先
- `token.json` - Google 認証トークン（自動生成）
- `credentials.json` - Google OAuth 認証情報（手動設定）
- `.env` - 環境変数（API キー）

## 仕組み

1. ユーザーが入力
2. LLM がツールが必要かどうか判断
3. 必要ならツールを実行（TODO 操作 or Google カレンダー操作）
4. 結果を踏まえて最終回答を生成

## 特徴

- **モジュラー設計**: ツール機能が個別ファイルに分割され、拡張しやすい構成
- **安全な実装**: 入力検証、エラーハンドリング、パス検証を実装
- **Google カレンダー連携**: 相対時間表現（「明日」「来週」など）を自動で ISO8601 形式に変換
- **大阪弁エージェント**: 親しみやすい関西弁で応答
