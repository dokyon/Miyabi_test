/**
 * ChromaDBベクトルストア
 * OpenAI Embeddingsを使用したベクトル検索機能
 */

import { ChromaClient, Collection } from 'chromadb';
import { OpenAI } from 'openai';
import { env } from '../config/env.js';
import type {
  VectorDocument,
  VectorSearchOptions,
  VectorSearchResult,
} from '../types/index.js';

/**
 * ベクトルストアクラス
 */
export class VectorStore {
  private client: ChromaClient;
  private openai: OpenAI;
  private collection: Collection | null = null;

  constructor() {
    // ChromaDBクライアントの初期化
    // Note: JavaScript版ChromaDBはHTTPサーバーへの接続が必要
    // デフォルトでlocalhost:8000に接続
    // 開発環境ではインメモリストレージを使用する場合もあり
    this.client = new ChromaClient();

    // OpenAIクライアントの初期化
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  /**
   * コレクションの初期化
   */
  async initialize(): Promise<void> {
    try {
      // 既存のコレクションを取得、なければ作成
      this.collection = await this.client.getOrCreateCollection({
        name: env.COLLECTION_NAME,
        metadata: { description: '板金塗装業界CRMデータ' },
      });

      console.log(`✅ コレクション "${env.COLLECTION_NAME}" を初期化しました`);
    } catch (error) {
      console.error('❌ コレクション初期化エラー:', error);
      throw new Error('ChromaDBコレクションの初期化に失敗しました');
    }
  }

  /**
   * テキストからエンベディングを生成
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('❌ エンベディング生成エラー:', error);
      throw new Error('エンベディングの生成に失敗しました');
    }
  }

  /**
   * ドキュメントを追加
   */
  async addDocument(document: VectorDocument): Promise<void> {
    if (!this.collection) {
      throw new Error('コレクションが初期化されていません。initialize()を先に呼び出してください。');
    }

    try {
      // エンベディングを生成
      const embedding = await this.generateEmbedding(document.content);

      // コレクションに追加
      await this.collection.add({
        ids: [document.id],
        documents: [document.content],
        metadatas: [document.metadata],
        embeddings: [embedding],
      });

      console.log(`✅ ドキュメント追加: ${document.id}`);
    } catch (error) {
      console.error('❌ ドキュメント追加エラー:', error);
      throw new Error(`ドキュメント追加に失敗しました: ${document.id}`);
    }
  }

  /**
   * 複数のドキュメントを一括追加
   */
  async addDocuments(documents: VectorDocument[]): Promise<void> {
    if (!this.collection) {
      throw new Error('コレクションが初期化されていません。initialize()を先に呼び出してください。');
    }

    if (documents.length === 0) {
      return;
    }

    try {
      // すべてのドキュメントのエンベディングを生成
      const embeddings = await Promise.all(
        documents.map((doc) => this.generateEmbedding(doc.content))
      );

      // コレクションに一括追加
      await this.collection.add({
        ids: documents.map((doc) => doc.id),
        documents: documents.map((doc) => doc.content),
        metadatas: documents.map((doc) => doc.metadata),
        embeddings: embeddings,
      });

      console.log(`✅ ${documents.length}件のドキュメントを追加しました`);
    } catch (error) {
      console.error('❌ ドキュメント一括追加エラー:', error);
      throw new Error('ドキュメントの一括追加に失敗しました');
    }
  }

  /**
   * ベクトル検索
   */
  async search(
    query: string,
    options: VectorSearchOptions = {}
  ): Promise<VectorSearchResult[]> {
    if (!this.collection) {
      throw new Error('コレクションが初期化されていません。initialize()を先に呼び出してください。');
    }

    const { topK = 5, filter } = options;

    try {
      // クエリのエンベディングを生成
      const queryEmbedding = await this.generateEmbedding(query);

      // ベクトル検索を実行
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
        where: filter,
      });

      // 結果を整形
      const searchResults: VectorSearchResult[] = [];

      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const id = results.ids[0][i];
          const content = results.documents?.[0]?.[i] || '';
          const metadata = results.metadatas?.[0]?.[i] || {};
          const distance = results.distances?.[0]?.[i];

          // 距離からスコアに変換（距離が小さいほどスコアが高い）
          const score = distance !== undefined ? 1 / (1 + distance) : 0;

          searchResults.push({
            document: {
              id,
              content,
              metadata,
            },
            score,
            distance,
          });
        }
      }

      return searchResults;
    } catch (error) {
      console.error('❌ ベクトル検索エラー:', error);
      throw new Error('ベクトル検索に失敗しました');
    }
  }

  /**
   * コレクションの状態を取得
   */
  async getStatus(): Promise<{
    collectionName: string;
    totalDocuments: number;
  }> {
    if (!this.collection) {
      throw new Error('コレクションが初期化されていません。initialize()を先に呼び出してください。');
    }

    try {
      const count = await this.collection.count();

      return {
        collectionName: env.COLLECTION_NAME,
        totalDocuments: count,
      };
    } catch (error) {
      console.error('❌ ステータス取得エラー:', error);
      throw new Error('コレクションのステータス取得に失敗しました');
    }
  }

  /**
   * コレクションをリセット（全データ削除）
   */
  async reset(): Promise<void> {
    try {
      // コレクションを削除
      await this.client.deleteCollection({
        name: env.COLLECTION_NAME,
      });

      console.log(`✅ コレクション "${env.COLLECTION_NAME}" を削除しました`);

      // 再初期化
      await this.initialize();
    } catch (error) {
      console.error('❌ コレクションリセットエラー:', error);
      throw new Error('コレクションのリセットに失敗しました');
    }
  }

  /**
   * すべてのドキュメントを取得
   */
  async listDocuments(options?: {
    limit?: number;
    offset?: number;
    filter?: Record<string, any>;
  }): Promise<VectorDocument[]> {
    if (!this.collection) {
      throw new Error('コレクションが初期化されていません。initialize()を先に呼び出してください。');
    }

    try {
      const { limit, offset, filter } = options || {};

      const results = await this.collection.get({
        limit,
        offset,
        where: filter,
      });

      const documents: VectorDocument[] = [];

      if (results.ids) {
        for (let i = 0; i < results.ids.length; i++) {
          documents.push({
            id: results.ids[i],
            content: results.documents?.[i] || '',
            metadata: results.metadatas?.[i] || {},
          });
        }
      }

      return documents;
    } catch (error) {
      console.error('❌ ドキュメント一覧取得エラー:', error);
      throw new Error('ドキュメントの一覧取得に失敗しました');
    }
  }
}

/**
 * シングルトンインスタンス
 */
let vectorStoreInstance: VectorStore | null = null;

/**
 * VectorStoreのシングルトンインスタンスを取得
 */
export async function getVectorStore(): Promise<VectorStore> {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStore();
    await vectorStoreInstance.initialize();
  }
  return vectorStoreInstance;
}
