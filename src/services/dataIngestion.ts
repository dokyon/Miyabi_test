/**
 * データ取り込み機能
 * CRMデータをベクトルデータベースに取り込む
 */

import { getCRMConnector } from '../connectors/crmConnector.js';
import { getVectorStore } from './vectorStore.js';
import type { DataIngestionRequest, DirectDataIngestionRequest, VectorDocument } from '../types/index.js';

/**
 * データ取り込みサービス
 */
export class DataIngestionService {
  /**
   * 直接データソースからデータを取り込み（Web UI用）
   */
  async ingestFromDirectSource(request: DirectDataIngestionRequest): Promise<number> {
    const { source, dataType, metadata } = request;

    try {
      console.log(`📥 直接データ取り込み開始: ${dataType}`);

      // ベクトルドキュメントに変換
      const document: VectorDocument = {
        id: `${dataType}_${metadata?.id || Date.now()}`,
        content: source,
        metadata: {
          type: dataType,
          ...metadata,
        },
      };

      // ベクトルストアに追加
      const vectorStore = await getVectorStore();
      await vectorStore.addDocuments([document]);

      console.log(`✅ 1件のデータを取り込みました`);

      return 1;
    } catch (error) {
      console.error('❌ 直接データ取り込みエラー:', error);
      throw new Error('データの取り込みに失敗しました');
    }
  }

  /**
   * 単一データソースからデータを取り込み
   */
  async ingestFromSource(request: DataIngestionRequest): Promise<number> {
    const { source, dataType } = request;

    try {
      console.log(`📥 データ取り込み開始: ${dataType} (${source.type})`);

      // 1. CRMデータを読み込み
      const connector = getCRMConnector();
      const data = await connector.loadData(source);

      if (data.length === 0) {
        console.log('⚠️ データが見つかりませんでした');
        return 0;
      }

      console.log(`📊 ${data.length}件のデータを読み込みました`);

      // 2. ベクトルドキュメントに変換
      const documents: VectorDocument[] = data.map((item, index) => {
        const content = connector.convertToText(item, dataType);
        return {
          id: `${dataType}_${(item as any).customerId || (item as any).quoteId || (item as any).workId || index}`,
          content,
          metadata: {
            type: dataType,
            ...item,
          },
        };
      });

      // 3. ベクトルストアに追加
      const vectorStore = await getVectorStore();
      await vectorStore.addDocuments(documents);

      console.log(`✅ ${documents.length}件のデータを取り込みました`);

      return documents.length;
    } catch (error) {
      console.error('❌ データ取り込みエラー:', error);
      throw new Error('データの取り込みに失敗しました');
    }
  }

  /**
   * 複数のデータソースから一括取り込み
   */
  async ingestBulk(requests: DataIngestionRequest[]): Promise<{
    total: number;
    byType: Record<string, number>;
  }> {
    const byType: Record<string, number> = {};
    let total = 0;

    for (const request of requests) {
      try {
        const count = await this.ingestFromSource(request);
        byType[request.dataType] = (byType[request.dataType] || 0) + count;
        total += count;
      } catch (error) {
        console.error(`⚠️ データソース取り込みエラー: ${request.dataType}`, error);
      }
    }

    return { total, byType };
  }

  /**
   * ディレクトリ内の全ファイルを一括取り込み
   */
  async ingestFromDirectory(
    directoryPath: string,
    dataType: 'customer' | 'quote' | 'work_history'
  ): Promise<number> {
    try {
      console.log(`📥 ディレクトリ取り込み開始: ${directoryPath}`);

      // 1. ディレクトリからデータを読み込み
      const connector = getCRMConnector();
      const data = await connector.loadDirectory(directoryPath);

      if (data.length === 0) {
        console.log('⚠️ データが見つかりませんでした');
        return 0;
      }

      console.log(`📊 ${data.length}件のデータを読み込みました`);

      // 2. ベクトルドキュメントに変換
      const documents: VectorDocument[] = data.map((item, index) => {
        const content = connector.convertToText(item, dataType);
        return {
          id: `${dataType}_${(item as any).customerId || (item as any).quoteId || (item as any).workId || index}`,
          content,
          metadata: {
            type: dataType,
            ...item,
          },
        };
      });

      // 3. ベクトルストアに追加
      const vectorStore = await getVectorStore();
      await vectorStore.addDocuments(documents);

      console.log(`✅ ${documents.length}件のデータを取り込みました`);

      return documents.length;
    } catch (error) {
      console.error('❌ ディレクトリ取り込みエラー:', error);
      throw new Error('ディレクトリからのデータ取り込みに失敗しました');
    }
  }
}

/**
 * シングルトンインスタンス
 */
let dataIngestionServiceInstance: DataIngestionService | null = null;

/**
 * DataIngestionServiceのシングルトンインスタンスを取得
 */
export function getDataIngestionService(): DataIngestionService {
  if (!dataIngestionServiceInstance) {
    dataIngestionServiceInstance = new DataIngestionService();
  }
  return dataIngestionServiceInstance;
}
