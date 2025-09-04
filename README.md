# Tiny Agent - 超ミニエージェントアプリ

LLM が「自分で考えて → 必要ならツールを呼んで → 答えを返す」というエージェントの最小骨格を体感できるアプリです。

## 機能

- 現在時刻の取得
- TODO の追加・一覧表示
- LLM が自律的にツールを選択・実行

## セットアップ

1. 依存関係のインストール

```bash
npm install
```

2. OpenAI API キーの設定
   `.env`ファイルを編集して、実際の API キーを設定してください：

```
OPENAI_API_KEY=sk-your-actual-api-key-here
```

## 実行

```bash
npm start
```

または

```bash
npx ts-node agent.ts
```

## 使用例

```
🧭 Tiny Agent 起動。何でも話しかけてください（例: 「15時に買い物リマインド…は無理なので代わりにTODO登録して」）
> 今の時間は？
> 買い物をTODOに追加して
> TODO見せて
> exit
```

## ファイル構成

- `agent.ts` - エージェント本体（CLI 対話ループ）
- `tools.ts` - ツール定義と実装
- `todos.json` - TODO データの保存先
- `.env` - 環境変数（API キー）

## 仕組み

1. ユーザーが入力
2. LLM がツールが必要かどうか判断
3. 必要ならツールを実行
4. 結果を踏まえて最終回答を生成
