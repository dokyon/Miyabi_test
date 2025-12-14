// BSサミット用RAGシステム - フロントエンド

const messagesContainer = document.getElementById('messages');
const queryForm = document.getElementById('query-form');
const queryInput = document.getElementById('query-input');
const submitBtn = document.getElementById('submit-btn');
const systemStatus = document.getElementById('system-status');
const exampleBtns = document.querySelectorAll('.example-btn');

// 会話履歴
let conversationHistory = [];

// 初期化
async function init() {
  await fetchSystemStatus();

  // フォーム送信イベント
  queryForm.addEventListener('submit', handleSubmit);

  // サンプルクエリボタン
  exampleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const query = btn.getAttribute('data-query');
      queryInput.value = query;
      queryForm.dispatchEvent(new Event('submit'));
    });
  });
}

// システムステータス取得
async function fetchSystemStatus() {
  try {
    const response = await fetch('/api/status');
    const data = await response.json();

    systemStatus.innerHTML = `
      <p><strong>総ドキュメント数:</strong> ${data.totalDocuments || 0}件</p>
      <p><strong>コレクション:</strong> ${data.collectionName || 'N/A'}</p>
      <p><strong>初期化:</strong> ${data.isInitialized ? '✅ 完了' : '⚠️ 未完了'}</p>
    `;
  } catch (error) {
    systemStatus.innerHTML = `
      <p style="color: #d32f2f;">⚠️ サーバーに接続できません</p>
      <p style="font-size: 0.9em; color: #666;">サーバーを起動してください: <code>npm start</code></p>
    `;
  }
}

// クエリ送信処理
async function handleSubmit(e) {
  e.preventDefault();

  const query = queryInput.value.trim();
  if (!query) return;

  // ユーザーメッセージ表示
  addMessage('user', query);

  // 入力フィールドをクリア
  queryInput.value = '';

  // ボタンを無効化
  submitBtn.disabled = true;

  try {
    // API呼び出し
    const response = await fetch('/api/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
        options: {
          topK: 5,
          minScore: 0.5,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // アシスタントメッセージ表示
    addMessage('assistant', data.answer, data.sources, data.confidence);

    // 会話履歴に追加
    conversationHistory.push({
      role: 'user',
      content: query,
    });
    conversationHistory.push({
      role: 'assistant',
      content: data.answer,
    });

  } catch (error) {
    console.error('Query error:', error);
    addMessage('assistant', `⚠️ エラーが発生しました: ${error.message}`);
  } finally {
    // ボタンを有効化
    submitBtn.disabled = false;
    queryInput.focus();
  }
}

// メッセージ追加
function addMessage(role, content, sources = null, confidence = null) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  let html = '';

  if (role === 'user') {
    html = `
      <strong>あなた</strong>
      <p>${escapeHtml(content)}</p>
    `;
  } else {
    html = `
      <strong>AIアシスタント</strong>
      <div>${formatAnswer(content)}</div>
    `;

    // ソース情報
    if (sources && sources.length > 0) {
      html += `
        <div class="sources">
          <h4>📚 参照元 (${sources.length}件)</h4>
          ${sources.map((source, index) => `
            <div class="source-item">
              <strong>${index + 1}. ${source.metadata?.type || 'データ'}</strong>
              <p>${escapeHtml(source.content.substring(0, 150))}...</p>
              <small>スコア: ${(source.score * 100).toFixed(1)}%</small>
            </div>
          `).join('')}
        </div>
      `;
    }

    // 信頼度
    if (confidence !== null && confidence !== undefined) {
      html += `
        <div class="confidence">
          💯 信頼度: ${(confidence * 100).toFixed(1)}%
        </div>
      `;
    }
  }

  messageDiv.innerHTML = html;
  messagesContainer.appendChild(messageDiv);

  // スクロールを最下部に
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 回答をフォーマット（改行を維持）
function formatAnswer(text) {
  return escapeHtml(text)
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

// HTMLエスケープ
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 初期化実行
init();
