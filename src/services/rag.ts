/**
 * RAGエンジン
 * Claude 3.5 Sonnetを使用した検索拡張生成
 */

import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';
import { getVectorStore } from './vectorStore.js';
import type {
  RAGQuery,
  RAGResponse,
  ConversationalRAGQuery,
  ConversationMessage,
  SearchSource,
} from '../types/index.js';

/**
 * 板金塗装業界特化のシステムプロンプト
 */
const SYSTEM_PROMPT = `あなたは板金塗装業界のCRMデータを分析する専門アシスタントです。

以下の点に注意して回答してください：
1. 顧客情報、見積情報、作業履歴などのCRMデータを正確に解釈する
2. 板金塗装業界の専門用語（へこみ修理、塗装、コーティング、バンパー交換など）を適切に使用する
3. 提供されたコンテキスト情報に基づいて、具体的で正確な回答を生成する
4. 不明な点や情報が不足している場合は、その旨を明確に伝える
5. 金額や日付などの数値情報は正確に伝える
6. 顧客に対して丁寧で分かりやすい言葉を使う

回答は簡潔で、要点を押さえたものにしてください。`;

/**
 * RAGエンジンクラス
 */
export class RAGEngine {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * コンテキストを構築
   */
  private buildContext(sources: SearchSource[]): string {
    if (sources.length === 0) {
      return '関連する情報が見つかりませんでした。';
    }

    const contextParts = sources.map((source, index) => {
      return `【コンテキスト ${index + 1}】（関連度: ${(source.score * 100).toFixed(1)}%）\n${source.content}`;
    });

    return contextParts.join('\n\n');
  }

  /**
   * 信頼度スコアを計算
   */
  private calculateConfidence(sources: SearchSource[]): number {
    if (sources.length === 0) {
      return 0;
    }

    // 上位の検索結果の平均スコアを信頼度とする
    const avgScore = sources.reduce((sum, source) => sum + source.score, 0) / sources.length;
    return Math.min(avgScore, 1.0);
  }

  /**
   * RAGクエリを実行
   */
  async query(queryRequest: RAGQuery): Promise<RAGResponse> {
    const { query, options } = queryRequest;
    const { topK = 5, minScore = 0.5 } = options || {};

    try {
      // 1. ベクトル検索で関連情報を取得
      const vectorStore = await getVectorStore();
      const searchResults = await vectorStore.search(query, { topK });

      // 最小スコアでフィルタリング
      const filteredResults = searchResults.filter((result) => result.score >= minScore);

      // SearchSource形式に変換
      const sources: SearchSource[] = filteredResults.map((result) => ({
        content: result.document.content,
        metadata: result.document.metadata,
        score: result.score,
      }));

      // 2. コンテキストを構築
      const context = this.buildContext(sources);

      // 3. Claudeでプロンプトを構築
      const userPrompt = `以下のコンテキスト情報を参考に、ユーザーの質問に答えてください。

${context}

【ユーザーの質問】
${query}

【回答】`;

      // 4. Claude APIを呼び出し
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      // 5. レスポンスを抽出
      const answer =
        response.content[0].type === 'text' ? response.content[0].text : '回答を生成できませんでした。';

      // 6. 信頼度を計算
      const confidence = this.calculateConfidence(sources);

      return {
        answer,
        sources,
        confidence,
      };
    } catch (error) {
      console.error('❌ RAGクエリエラー:', error);
      throw new Error('RAGクエリの実行に失敗しました');
    }
  }

  /**
   * 会話履歴を考慮したRAGクエリを実行
   */
  async conversationalQuery(queryRequest: ConversationalRAGQuery): Promise<RAGResponse> {
    const { query, history, options } = queryRequest;
    const { topK = 5, minScore = 0.5 } = options || {};

    try {
      // 1. ベクトル検索で関連情報を取得
      const vectorStore = await getVectorStore();
      const searchResults = await vectorStore.search(query, { topK });

      // 最小スコアでフィルタリング
      const filteredResults = searchResults.filter((result) => result.score >= minScore);

      // SearchSource形式に変換
      const sources: SearchSource[] = filteredResults.map((result) => ({
        content: result.document.content,
        metadata: result.document.metadata,
        score: result.score,
      }));

      // 2. コンテキストを構築
      const context = this.buildContext(sources);

      // 3. 会話履歴をClaudeのメッセージ形式に変換
      const messages: Anthropic.MessageParam[] = [
        ...history.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: `以下のコンテキスト情報を参考に、ユーザーの質問に答えてください。

${context}

【ユーザーの質問】
${query}

【回答】`,
        },
      ];

      // 4. Claude APIを呼び出し
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      });

      // 5. レスポンスを抽出
      const answer =
        response.content[0].type === 'text' ? response.content[0].text : '回答を生成できませんでした。';

      // 6. 信頼度を計算
      const confidence = this.calculateConfidence(sources);

      return {
        answer,
        sources,
        confidence,
      };
    } catch (error) {
      console.error('❌ 会話型RAGクエリエラー:', error);
      throw new Error('会話型RAGクエリの実行に失敗しました');
    }
  }
}

/**
 * シングルトンインスタンス
 */
let ragEngineInstance: RAGEngine | null = null;

/**
 * RAGEngineのシングルトンインスタンスを取得
 */
export function getRAGEngine(): RAGEngine {
  if (!ragEngineInstance) {
    ragEngineInstance = new RAGEngine();
  }
  return ragEngineInstance;
}
