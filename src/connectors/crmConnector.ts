/**
 * CRMデータコネクター
 * CSV、Excel、JSON、REST APIからのデータ読み込み
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { DataSource, Customer, Quote, WorkHistory } from '../types/index.js';

/**
 * CRMデータの型
 */
export type CRMData = Customer | Quote | WorkHistory;

/**
 * CRMデータコネクター
 */
export class CRMConnector {
  /**
   * JSONファイルを読み込み
   */
  private async readJSON(filePath: string): Promise<any[]> {
    try {
      const absolutePath = path.resolve(filePath);
      const content = await fs.readFile(absolutePath, 'utf-8');
      const data = JSON.parse(content);

      // 配列でない場合は配列にラップ
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error(`❌ JSONファイル読み込みエラー: ${filePath}`, error);
      throw new Error(`JSONファイルの読み込みに失敗しました: ${filePath}`);
    }
  }

  /**
   * CSVファイルを読み込み
   */
  private async readCSV(filePath: string): Promise<any[]> {
    try {
      const absolutePath = path.resolve(filePath);
      const content = await fs.readFile(absolutePath, 'utf-8');

      // 簡易的なCSVパーサー（実用にはcsv-parserなどを使用推奨）
      const lines = content.trim().split('\n');
      if (lines.length === 0) {
        return [];
      }

      // ヘッダー行を取得
      const headers = lines[0].split(',').map((h) => h.trim());

      // データ行をパース
      const data = lines.slice(1).map((line) => {
        const values = line.split(',').map((v) => v.trim());
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index];
        });
        return obj;
      });

      return data;
    } catch (error) {
      console.error(`❌ CSVファイル読み込みエラー: ${filePath}`, error);
      throw new Error(`CSVファイルの読み込みに失敗しました: ${filePath}`);
    }
  }

  /**
   * REST APIからデータを取得
   */
  private async fetchFromAPI(
    apiEndpoint: string,
    headers?: Record<string, string>
  ): Promise<any[]> {
    try {
      const response = await fetch(apiEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // 配列でない場合は配列にラップ
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error(`❌ API取得エラー: ${apiEndpoint}`, error);
      throw new Error(`APIからのデータ取得に失敗しました: ${apiEndpoint}`);
    }
  }

  /**
   * データソースからデータを読み込み
   */
  async loadData(source: DataSource): Promise<CRMData[]> {
    switch (source.type) {
      case 'json':
        if (!source.path) {
          throw new Error('JSONソースにはpathが必要です');
        }
        return await this.readJSON(source.path);

      case 'csv':
        if (!source.path) {
          throw new Error('CSVソースにはpathが必要です');
        }
        return await this.readCSV(source.path);

      case 'excel':
        if (!source.path) {
          throw new Error('Excelソースにはpathが必要です');
        }
        // Excel読み込みは将来実装（xlsxライブラリなどを使用）
        throw new Error('Excel読み込みは未実装です');

      case 'api':
        if (!source.apiEndpoint) {
          throw new Error('APIソースにはapiEndpointが必要です');
        }
        return await this.fetchFromAPI(source.apiEndpoint, source.headers);

      default:
        throw new Error(`未対応のデータソースタイプ: ${source.type}`);
    }
  }

  /**
   * ディレクトリ内の全ファイルを読み込み
   */
  async loadDirectory(directoryPath: string): Promise<CRMData[]> {
    try {
      const absolutePath = path.resolve(directoryPath);
      const files = await fs.readdir(absolutePath);

      const allData: CRMData[] = [];

      for (const file of files) {
        const filePath = path.join(absolutePath, file);
        const ext = path.extname(file).toLowerCase();

        try {
          if (ext === '.json') {
            const data = await this.readJSON(filePath);
            allData.push(...data);
          } else if (ext === '.csv') {
            const data = await this.readCSV(filePath);
            allData.push(...data);
          }
          // .xlsx, .xlsは将来対応
        } catch (error) {
          console.warn(`⚠️ ファイル読み込みスキップ: ${file}`, error);
        }
      }

      return allData;
    } catch (error) {
      console.error(`❌ ディレクトリ読み込みエラー: ${directoryPath}`, error);
      throw new Error(`ディレクトリの読み込みに失敗しました: ${directoryPath}`);
    }
  }

  /**
   * データをテキスト形式に変換（ベクトル化用）
   */
  convertToText(data: CRMData, dataType: string): string {
    if (dataType === 'customer') {
      const customer = data as Customer;
      return `顧客情報
顧客ID: ${customer.customerId}
顧客名: ${customer.name}
電話番号: ${customer.phone}
メールアドレス: ${customer.email || 'なし'}
住所: ${customer.address || 'なし'}
累計売上: ${customer.totalSales.toLocaleString()}円
来店回数: ${customer.visitCount}回
${customer.notes ? `メモ: ${customer.notes}` : ''}`;
    }

    if (dataType === 'quote') {
      const quote = data as Quote;
      const itemsText = quote.items
        .map((item) => `  - ${item.description}: ${item.totalPrice.toLocaleString()}円`)
        .join('\n');
      return `見積情報
見積ID: ${quote.quoteId}
顧客ID: ${quote.customerId}
車両情報: ${quote.vehicleInfo}
見積明細:
${itemsText}
合計金額: ${quote.totalAmount.toLocaleString()}円
ステータス: ${quote.status}
見積日: ${quote.quoteDate}
${quote.notes ? `メモ: ${quote.notes}` : ''}`;
    }

    if (dataType === 'work_history') {
      const work = data as WorkHistory;
      const partsText = work.partsUsed
        ? work.partsUsed.map((part) => `  - ${part.partName}: ${part.unitPrice.toLocaleString()}円`).join('\n')
        : '';
      return `作業履歴
作業ID: ${work.workId}
顧客ID: ${work.customerId}
車両情報: ${work.vehicleInfo}
作業種別: ${work.workType}
作業内容: ${work.description}
担当技術者: ${work.technician}
作業日: ${work.workDate}
${partsText ? `使用部品:\n${partsText}` : ''}
工賃: ${work.laborCost.toLocaleString()}円
部品代: ${work.partsCost.toLocaleString()}円
合計費用: ${work.totalCost.toLocaleString()}円
${work.rating ? `評価: ${work.rating}つ星` : ''}
${work.notes ? `メモ: ${work.notes}` : ''}`;
    }

    return JSON.stringify(data, null, 2);
  }
}

/**
 * シングルトンインスタンス
 */
let crmConnectorInstance: CRMConnector | null = null;

/**
 * CRMConnectorのシングルトンインスタンスを取得
 */
export function getCRMConnector(): CRMConnector {
  if (!crmConnectorInstance) {
    crmConnectorInstance = new CRMConnector();
  }
  return crmConnectorInstance;
}
