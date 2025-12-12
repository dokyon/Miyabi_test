# BSサミット用RAGシステム

板金塗装業界向けRAG（Retrieval-Augmented Generation）システム

Powered by **Miyabi** - AI-driven autonomous development framework

## 概要

このシステムは板金塗装業界のCRMデータ（顧客情報、見積、作業履歴）を活用して、自然言語での質問に高精度で回答するRAGシステムです。

**技術スタック:**
- **LLM**: Claude 3.5 Sonnet (Anthropic)
- **Embeddings**: OpenAI text-embedding-3-small
- **Vector DB**: ChromaDB
- **API**: Express.js + TypeScript
- **Testing**: Vitest + Supertest

## クイックスタート

### 1. 環境変数の設定

```bash
cp .env.example .env
```

以下の環境変数を設定してください：
- `ANTHROPIC_API_KEY` - Claude APIキー（必須）
- `OPENAI_API_KEY` - OpenAI APIキー（必須）
- `GITHUB_TOKEN` - GitHub Personal Access Token（Miyabi用、オプション）

### 2. インストール

```bash
npm install
```

### 3. サンプルデータの読み込み

```bash
npm run load-sample-data
```

8件の顧客データ、7件の見積データ、8件の作業履歴データが読み込まれます。

### 4. サーバーの起動

```bash
npm start
```

サーバーは `http://localhost:3000` で起動します。

### 5. クエリを送信

```bash
curl -X POST http://localhost:3000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "VIP顧客を教えてください"}'
```

## プロジェクト構造

```
Miyabi_BS_RAG/
├── src/
│   ├── api/              # REST APIサーバー
│   │   └── server.ts     # Express APIエンドポイント
│   ├── config/           # 設定
│   │   └── env.ts        # 環境変数管理（Zod）
│   ├── connectors/       # データコネクター
│   │   └── crmConnector.ts  # CSV/JSON/API読み込み
│   ├── services/         # ビジネスロジック
│   │   ├── vectorStore.ts    # ChromaDB操作
│   │   ├── rag.ts            # RAGエンジン
│   │   └── dataIngestion.ts # データ取り込み
│   ├── scripts/          # ユーティリティスクリプト
│   │   └── loadSampleData.ts  # サンプルデータ読み込み
│   ├── types/            # TypeScript型定義
│   │   └── index.ts
│   └── index.ts          # エントリーポイント
├── tests/
│   ├── unit/             # ユニットテスト
│   │   └── crmConnector.test.ts
│   └── integration/      # 統合テスト
│       └── api.test.ts
├── data/
│   ├── raw/              # サンプルデータ
│   │   ├── sample_customers.json
│   │   ├── sample_quotes.json
│   │   └── sample_work_history.json
│   └── chromadb/         # ベクトルDB（自動生成）
├── .github/
│   ├── workflows/        # GitHub Actions（26+ workflows）
│   └── labels.yml        # 識学理論65ラベル体系
├── USAGE.md              # 詳細な使用方法ガイド
└── CLAUDE.md             # Miyabi Framework説明
```

## npm スクリプト

```bash
npm start              # サーバー起動
npm run dev            # 開発モード（ホットリロード）
npm test               # テスト実行（17テスト）
npm run typecheck      # TypeScript型チェック
npm run lint           # ESLint実行
npm run build          # TypeScriptビルド
npm run load-sample-data  # サンプルデータ読み込み
```

## APIエンドポイント

### ヘルスチェック
```
GET /health
```

### RAGクエリ
```
POST /api/query
{
  "query": "VIP顧客を教えてください",
  "options": { "topK": 5, "minScore": 0.5 }
}
```

### 会話型RAGクエリ
```
POST /api/query/conversation
{
  "query": "その顧客の来店回数は？",
  "history": [
    { "role": "user", "content": "山田太郎さんについて教えて" },
    { "role": "assistant", "content": "..." }
  ]
}
```

### データ取り込み
```
POST /api/ingest
{
  "source": { "type": "json", "path": "./data/raw/customers.json" },
  "dataType": "customer"
}
```

### ステータス確認
```
GET /api/status
```

詳細は[USAGE.md](./USAGE.md)を参照してください。

## Miyabi Framework

このプロジェクトは**7つの自律AI Agents**で構築されています：

1. **CoordinatorAgent** - タスク統括・並列実行制御
2. **IssueAgent** - Issue分析・自動ラベル付け（識学理論65ラベル）
3. **CodeGenAgent** - AI駆動コード生成
4. **ReviewAgent** - コード品質判定（80点以上で合格）
5. **PRAgent** - Pull Request自動作成
6. **DeploymentAgent** - CI/CD自動デプロイ
7. **TestAgent** - テスト実行・カバレッジレポート

### 開発ワークフロー

1. **Issueを作成** - 実装したい機能を記述
2. **Agentが自動実行** - 分析→実装→テスト→PR作成
3. **レビュー** - 生成されたPRを確認
4. **マージ** - 自動デプロイ

詳細は[CLAUDE.md](./CLAUDE.md)を参照してください。

## テスト

```bash
npm test
```

**テストカバレッジ:**
- ユニットテスト: 6テスト（CRMコネクター）
- 統合テスト: 11テスト（APIエンドポイント）
- 合計: 17/17 passed ✅

## ドキュメント

- **詳細な使用方法**: [USAGE.md](./USAGE.md)
- **Miyabi Framework**: [CLAUDE.md](./CLAUDE.md)
- **Miyabi公式**: https://github.com/ShunsukeHayashi/Miyabi
- **Label体系**: `.github/labels.yml`（識学理論準拠）

## トラブルシューティング

### サーバーが起動しない
1. `.env`ファイルが正しく設定されているか確認
2. `ANTHROPIC_API_KEY`と`OPENAI_API_KEY`が有効か確認
3. ポート3000が使用されていないか確認

### データ取り込みが失敗する
1. JSONファイルのパスが正しいか確認
2. ChromaDBディレクトリの書き込み権限を確認

### クエリの精度が低い
1. `minScore`の値を調整（デフォルト: 0.5）
2. `topK`の値を増やす
3. より具体的な質問に変更

詳細は[USAGE.md](./USAGE.md)のトラブルシューティングセクションを参照してください。

## ライセンス

MIT

---

🌸 Built with [Miyabi](https://github.com/ShunsukeHayashi/Miyabi) - Beauty in Autonomous Development

🤖 Powered by [Claude Code](https://claude.com/claude-code)
