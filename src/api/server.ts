/**
 * REST APIサーバー
 * RAGシステムのHTTPインターフェース
 */

import express, { Request, Response } from 'express';
import { env } from '../config/env.js';
import { getRAGEngine } from '../services/rag.js';
import { getVectorStore } from '../services/vectorStore.js';
import { getDataIngestionService } from '../services/dataIngestion.js';
import type {
  RAGQuery,
  ConversationalRAGQuery,
  DataIngestionRequest,
} from '../types/index.js';

const app = express();

// ミドルウェア
app.use(express.json());

// CORS設定（開発環境用）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// =====================================
// ヘルスチェック
// =====================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// =====================================
// RAGクエリエンドポイント
// =====================================

/**
 * RAGクエリ（基本）
 */
app.post('/api/query', async (req: Request, res: Response) => {
  try {
    const queryRequest: RAGQuery = req.body;

    if (!queryRequest.query) {
      return res.status(400).json({ error: 'クエリが指定されていません' });
    }

    const ragEngine = getRAGEngine();
    const response = await ragEngine.query(queryRequest);

    res.json(response);
  } catch (error: any) {
    console.error('❌ RAGクエリエラー:', error);
    res.status(500).json({ error: error.message || 'RAGクエリの実行に失敗しました' });
  }
});

/**
 * 会話履歴付きRAGクエリ
 */
app.post('/api/query/conversation', async (req: Request, res: Response) => {
  try {
    const queryRequest: ConversationalRAGQuery = req.body;

    if (!queryRequest.query) {
      return res.status(400).json({ error: 'クエリが指定されていません' });
    }

    if (!Array.isArray(queryRequest.history)) {
      return res.status(400).json({ error: '会話履歴が正しい形式ではありません' });
    }

    const ragEngine = getRAGEngine();
    const response = await ragEngine.conversationalQuery(queryRequest);

    res.json(response);
  } catch (error: any) {
    console.error('❌ 会話型RAGクエリエラー:', error);
    res.status(500).json({
      error: error.message || '会話型RAGクエリの実行に失敗しました',
    });
  }
});

// =====================================
// データ取り込みエンドポイント
// =====================================

/**
 * データ取り込み（単一ソース）
 */
app.post('/api/ingest', async (req: Request, res: Response) => {
  try {
    const request: DataIngestionRequest = req.body;

    if (!request.source || !request.dataType) {
      return res.status(400).json({ error: 'source と dataType が必要です' });
    }

    const service = getDataIngestionService();
    const count = await service.ingestFromSource(request);

    res.json({
      success: true,
      message: `${count}件のデータを取り込みました`,
      count,
    });
  } catch (error: any) {
    console.error('❌ データ取り込みエラー:', error);
    res.status(500).json({ error: error.message || 'データ取り込みに失敗しました' });
  }
});

/**
 * データ取り込み（複数ソース一括）
 */
app.post('/api/ingest/bulk', async (req: Request, res: Response) => {
  try {
    const requests: DataIngestionRequest[] = req.body.sources;

    if (!Array.isArray(requests)) {
      return res.status(400).json({ error: 'sources は配列である必要があります' });
    }

    const service = getDataIngestionService();
    const result = await service.ingestBulk(requests);

    res.json({
      success: true,
      message: `${result.total}件のデータを取り込みました`,
      ...result,
    });
  } catch (error: any) {
    console.error('❌ 一括データ取り込みエラー:', error);
    res.status(500).json({ error: error.message || '一括データ取り込みに失敗しました' });
  }
});

/**
 * ディレクトリ一括取り込み
 */
app.post('/api/ingest/directory', async (req: Request, res: Response) => {
  try {
    const { directoryPath, dataType } = req.body;

    if (!directoryPath || !dataType) {
      return res.status(400).json({
        error: 'directoryPath と dataType が必要です',
      });
    }

    const service = getDataIngestionService();
    const count = await service.ingestFromDirectory(directoryPath, dataType);

    res.json({
      success: true,
      message: `${count}件のデータを取り込みました`,
      count,
    });
  } catch (error: any) {
    console.error('❌ ディレクトリ取り込みエラー:', error);
    res.status(500).json({
      error: error.message || 'ディレクトリからのデータ取り込みに失敗しました',
    });
  }
});

// =====================================
// 管理エンドポイント
// =====================================

/**
 * データベース状態確認
 */
app.get('/api/status', async (req: Request, res: Response) => {
  try {
    const vectorStore = await getVectorStore();
    const status = await vectorStore.getStatus();

    res.json(status);
  } catch (error: any) {
    console.error('❌ ステータス取得エラー:', error);
    res.status(500).json({ error: error.message || 'ステータス取得に失敗しました' });
  }
});

/**
 * データベースリセット
 */
app.post('/api/reset', async (req: Request, res: Response) => {
  try {
    const vectorStore = await getVectorStore();
    await vectorStore.reset();

    res.json({
      success: true,
      message: 'データベースをリセットしました',
    });
  } catch (error: any) {
    console.error('❌ リセットエラー:', error);
    res.status(500).json({ error: error.message || 'リセットに失敗しました' });
  }
});

// =====================================
// サーバー起動
// =====================================

/**
 * サーバーを起動
 */
export async function startServer(): Promise<void> {
  const PORT = env.PORT;

  app.listen(PORT, () => {
    console.log(`
🚀 RAGシステムAPIサーバー起動
   ポート: ${PORT}
   環境: ${env.NODE_ENV}

利用可能なエンドポイント:
   GET  /health                      - ヘルスチェック
   POST /api/query                   - RAGクエリ
   POST /api/query/conversation      - 会話履歴付きクエリ
   POST /api/ingest                  - データ取り込み
   POST /api/ingest/bulk             - 複数ソース一括取り込み
   POST /api/ingest/directory        - ディレクトリ一括取り込み
   GET  /api/status                  - データベース状態確認
   POST /api/reset                   - データベースリセット

サーバー準備完了: http://localhost:${PORT}
    `);
  });
}
