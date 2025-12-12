/**
 * 板金塗装業界向けRAGシステム - 型定義
 * CRMデータモデルとRAGシステムのインターフェース定義
 */

// =====================================
// 顧客関連の型定義
// =====================================

/**
 * 顧客情報
 */
export interface Customer {
  /** 顧客ID */
  customerId: string;
  /** 顧客名 */
  name: string;
  /** 電話番号 */
  phone: string;
  /** メールアドレス（任意） */
  email?: string;
  /** 住所（任意） */
  address?: string;
  /** 累計売上金額 */
  totalSales: number;
  /** 来店回数 */
  visitCount: number;
  /** 登録日 */
  registeredAt?: string;
  /** メモ（任意） */
  notes?: string;
}

// =====================================
// 見積関連の型定義
// =====================================

/**
 * 見積ステータス
 */
export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';

/**
 * 見積明細
 */
export interface QuoteItem {
  /** 明細ID */
  itemId: string;
  /** 作業内容 */
  description: string;
  /** 数量 */
  quantity: number;
  /** 単価 */
  unitPrice: number;
  /** 合計金額 */
  totalPrice: number;
}

/**
 * 見積情報
 */
export interface Quote {
  /** 見積ID */
  quoteId: string;
  /** 顧客ID */
  customerId: string;
  /** 車両情報 */
  vehicleInfo: string;
  /** 見積明細 */
  items: QuoteItem[];
  /** 合計金額 */
  totalAmount: number;
  /** ステータス */
  status: QuoteStatus;
  /** 見積日 */
  quoteDate: string;
  /** 有効期限 */
  validUntil?: string;
  /** メモ */
  notes?: string;
}

// =====================================
// 作業履歴関連の型定義
// =====================================

/**
 * 作業種別
 */
export type WorkType = 'repair' | 'paint' | 'inspection' | 'maintenance' | 'other';

/**
 * 使用部品情報
 */
export interface PartUsed {
  /** 部品ID */
  partId: string;
  /** 部品名 */
  partName: string;
  /** 数量 */
  quantity: number;
  /** 単価 */
  unitPrice: number;
}

/**
 * 作業履歴
 */
export interface WorkHistory {
  /** 作業ID */
  workId: string;
  /** 顧客ID */
  customerId: string;
  /** 車両情報 */
  vehicleInfo: string;
  /** 作業種別 */
  workType: WorkType;
  /** 作業内容 */
  description: string;
  /** 担当技術者 */
  technician: string;
  /** 作業日 */
  workDate: string;
  /** 使用部品リスト */
  partsUsed?: PartUsed[];
  /** 工賃 */
  laborCost: number;
  /** 部品代 */
  partsCost: number;
  /** 合計費用 */
  totalCost: number;
  /** 評価（1-5） */
  rating?: number;
  /** メモ */
  notes?: string;
}

// =====================================
// CRM連携用インターフェース
// =====================================

/**
 * データソースタイプ
 */
export type DataSourceType = 'csv' | 'excel' | 'json' | 'api';

/**
 * CRMデータソース設定
 */
export interface DataSource {
  /** データソースタイプ */
  type: DataSourceType;
  /** ファイルパス（file系の場合） */
  path?: string;
  /** APIエンドポイント（API系の場合） */
  apiEndpoint?: string;
  /** 認証ヘッダー（API系の場合） */
  headers?: Record<string, string>;
}

/**
 * データ取り込みリクエスト
 */
export interface DataIngestionRequest {
  /** データソース */
  source: DataSource;
  /** データタイプ */
  dataType: 'customer' | 'quote' | 'work_history';
}

// =====================================
// RAGシステム用の型定義
// =====================================

/**
 * RAGクエリリクエスト
 */
export interface RAGQuery {
  /** 検索クエリ */
  query: string;
  /** 検索オプション */
  options?: {
    /** 取得する上位K件 */
    topK?: number;
    /** 最小スコア閾値 */
    minScore?: number;
  };
}

/**
 * 検索結果の元データ
 */
export interface SearchSource {
  /** 元データのコンテンツ */
  content: string;
  /** メタデータ */
  metadata: Record<string, any>;
  /** 類似度スコア */
  score: number;
}

/**
 * RAGクエリレスポンス
 */
export interface RAGResponse {
  /** 生成された回答 */
  answer: string;
  /** 検索に使用された元データ */
  sources: SearchSource[];
  /** 信頼度スコア */
  confidence: number;
}

/**
 * 会話履歴メッセージ
 */
export interface ConversationMessage {
  /** ロール */
  role: 'user' | 'assistant';
  /** メッセージ内容 */
  content: string;
}

/**
 * 会話履歴付きRAGクエリ
 */
export interface ConversationalRAGQuery extends RAGQuery {
  /** 会話履歴 */
  history: ConversationMessage[];
}

// =====================================
// ベクトルストア用の型定義
// =====================================

/**
 * ベクトルストアドキュメント
 */
export interface VectorDocument {
  /** ドキュメントID */
  id: string;
  /** ドキュメントコンテンツ */
  content: string;
  /** メタデータ */
  metadata: Record<string, any>;
  /** エンベディングベクトル（任意） */
  embedding?: number[];
}

/**
 * ベクトル検索オプション
 */
export interface VectorSearchOptions {
  /** 取得する上位K件 */
  topK?: number;
  /** フィルタ条件 */
  filter?: Record<string, any>;
}

/**
 * ベクトル検索結果
 */
export interface VectorSearchResult {
  /** ドキュメント */
  document: VectorDocument;
  /** 類似度スコア */
  score: number;
  /** 距離 */
  distance?: number;
}
