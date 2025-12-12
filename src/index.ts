/**
 * BSサミット用RAGシステム - Entry Point
 * 板金塗装業界向けRAGシステム
 */

import { startServer } from './api/server.js';

console.log('🌸 BSサミット用RAGシステム');
console.log('板金塗装業界向けRAGシステム powered by Miyabi');
console.log('');

// Run server if this is the entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((error) => {
    console.error('❌ サーバー起動エラー:', error);
    process.exit(1);
  });
}
