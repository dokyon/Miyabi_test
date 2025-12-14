// 管理画面 JavaScript

// DOMContentLoadedイベントで初期化を実行
document.addEventListener('DOMContentLoaded', () => {
  initializeAdminUI();
});

function initializeAdminUI() {
  // =====================================
  // DOM要素取得
  // =====================================

  // タブ関連
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  // フォーム
  const customerForm = document.getElementById('customer-form');
  const quoteForm = document.getElementById('quote-form');
  const workhistoryForm = document.getElementById('workhistory-form');

  // ステータス
  const collectionNameEl = document.getElementById('collection-name');
  const totalDocumentsEl = document.getElementById('total-documents');
  const refreshStatusBtn = document.getElementById('refresh-status');
  const resetDbBtn = document.getElementById('reset-db');

  // 一括取り込み
  const bulkUploadBtn = document.getElementById('bulk-upload-btn');
  const bulkFileInput = document.getElementById('bulk-file');
  const bulkDataTypeSelect = document.getElementById('bulk-data-type');

  // データ一覧
  const dataTypeFilter = document.getElementById('data-type-filter');
  const refreshDataListBtn = document.getElementById('refresh-data-list');
  const dataListContainer = document.getElementById('data-list-container');

  // 通知
  const notification = document.getElementById('notification');

  // =====================================
  // タブ切り替え
  // =====================================

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;

      // すべてのタブボタンから active クラスを削除
      tabButtons.forEach(btn => btn.classList.remove('active'));
      // クリックされたボタンに active クラスを追加
      button.classList.add('active');

      // すべてのタブコンテンツを非表示
      tabContents.forEach(content => content.classList.remove('active'));
      // 選択されたタブコンテンツを表示
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });

  // =====================================
  // 通知表示
  // =====================================

  function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
      notification.classList.remove('show');
    }, 4000);
  }

  // =====================================
  // ステータス更新
  // =====================================

  async function updateStatus() {
    try {
      const response = await fetch('/api/status');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      collectionNameEl.textContent = data.collectionName || '-';
      totalDocumentsEl.textContent = data.totalDocuments || '0';

    } catch (error) {
      console.error('ステータス取得エラー:', error);
      collectionNameEl.textContent = 'エラー';
      totalDocumentsEl.textContent = '-';
    }
  }

  refreshStatusBtn.addEventListener('click', async () => {
    refreshStatusBtn.textContent = '更新中...';
    refreshStatusBtn.disabled = true;

    await updateStatus();

    refreshStatusBtn.textContent = '状態更新';
    refreshStatusBtn.disabled = false;
    showNotification('ステータスを更新しました', 'success');
  });

  // 初期ステータス取得
  updateStatus();

  // =====================================
  // データベースリセット
  // =====================================

  resetDbBtn.addEventListener('click', async () => {
    if (!confirm('本当にデータベースをリセットしますか?\nすべてのデータが削除されます。')) {
      return;
    }

    if (!confirm('最終確認: データベース内のすべてのドキュメントが削除されます。\n実行しますか?')) {
      return;
    }

    try {
      resetDbBtn.textContent = 'リセット中...';
      resetDbBtn.disabled = true;

      const response = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      await response.json();

      showNotification('データベースをリセットしました', 'success');
      await updateStatus();

    } catch (error) {
      console.error('リセットエラー:', error);
      showNotification(`エラー: ${error.message}`, 'error');
    } finally {
      resetDbBtn.textContent = 'データベースリセット';
      resetDbBtn.disabled = false;
    }
  });

  // =====================================
  // 顧客データ登録
  // =====================================

  customerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const customerId = document.getElementById('customer-id').value.trim();
    const name = document.getElementById('customer-name').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const email = document.getElementById('customer-email').value.trim();
    const address = document.getElementById('customer-address').value.trim();
    const tier = document.getElementById('customer-tier').value;
    const totalSpent = parseInt(document.getElementById('customer-total-spent').value) || 0;
    const notes = document.getElementById('customer-notes').value.trim();

    const customerData = {
      id: customerId,
      name: name,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
      tier: tier,
      totalSpent: totalSpent,
      notes: notes || undefined,
    };

    // 顧客データをテキストに変換
    const content = `
顧客ID: ${customerData.id}
名前: ${customerData.name}
電話番号: ${customerData.phone || '未設定'}
メールアドレス: ${customerData.email || '未設定'}
住所: ${customerData.address || '未設定'}
顧客ランク: ${customerData.tier}
累計利用額: ${customerData.totalSpent}円
備考: ${customerData.notes || 'なし'}
    `.trim();

    await submitData({
      source: content,
      dataType: 'customer',
      metadata: customerData,
    }, customerForm, '顧客データ');
  });

  // =====================================
  // 見積データ登録
  // =====================================

  quoteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const quoteId = document.getElementById('quote-id').value.trim();
    const customerId = document.getElementById('quote-customer-id').value.trim();
    const date = document.getElementById('quote-date').value;
    const amount = parseInt(document.getElementById('quote-amount').value);
    const description = document.getElementById('quote-description').value.trim();
    const status = document.getElementById('quote-status').value;

    const quoteData = {
      id: quoteId,
      customerId: customerId,
      date: date,
      amount: amount,
      description: description,
      status: status,
    };

    // 見積データをテキストに変換
    const content = `
見積ID: ${quoteData.id}
顧客ID: ${quoteData.customerId}
見積日: ${quoteData.date}
見積金額: ${quoteData.amount}円
作業内容: ${quoteData.description}
ステータス: ${quoteData.status}
    `.trim();

    await submitData({
      source: content,
      dataType: 'quote',
      metadata: quoteData,
    }, quoteForm, '見積データ');
  });

  // =====================================
  // 作業履歴登録
  // =====================================

  workhistoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const workId = document.getElementById('work-id').value.trim();
    const customerId = document.getElementById('work-customer-id').value.trim();
    const date = document.getElementById('work-date').value;
    const amount = parseInt(document.getElementById('work-amount').value);
    const description = document.getElementById('work-description').value.trim();
    const notes = document.getElementById('work-notes').value.trim();

    const workData = {
      id: workId,
      customerId: customerId,
      date: date,
      amount: amount,
      description: description,
      notes: notes || undefined,
    };

    // 作業履歴をテキストに変換
    const content = `
作業ID: ${workData.id}
顧客ID: ${workData.customerId}
作業日: ${workData.date}
作業金額: ${workData.amount}円
作業内容: ${workData.description}
備考: ${workData.notes || 'なし'}
    `.trim();

    await submitData({
      source: content,
      dataType: 'work_history',
      metadata: workData,
    }, workhistoryForm, '作業履歴');
  });

  // =====================================
  // データ送信共通関数
  // =====================================

  async function submitData(requestData, formElement, dataTypeName) {
    try {
      // フォームを送信中状態に
      formElement.classList.add('submitting');

      const response = await fetch('/api/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      showNotification(`${dataTypeName}を登録しました (${data.count}件)`, 'success');

      // フォームをリセット
      formElement.reset();

      // ステータスを更新
      await updateStatus();

    } catch (error) {
      console.error(`${dataTypeName}登録エラー:`, error);
      showNotification(`エラー: ${error.message}`, 'error');
    } finally {
      // フォームの送信中状態を解除
      formElement.classList.remove('submitting');
    }
  }

  // =====================================
  // 一括取り込み
  // =====================================

  bulkUploadBtn.addEventListener('click', async () => {
    const file = bulkFileInput.files[0];
    const dataType = bulkDataTypeSelect.value;

    if (!file) {
      showNotification('ファイルを選択してください', 'error');
      return;
    }

    try {
      bulkUploadBtn.textContent = '取り込み中...';
      bulkUploadBtn.disabled = true;

      // ファイルを読み込み
      const fileContent = await readFileAsText(file);

      // JSONパース
      let jsonData;
      try {
        jsonData = JSON.parse(fileContent);
      } catch (parseError) {
        throw new Error('JSONの形式が正しくありません');
      }

      // 配列でない場合はエラー
      if (!Array.isArray(jsonData)) {
        throw new Error('JSONは配列形式である必要があります');
      }

      if (jsonData.length === 0) {
        throw new Error('データが空です');
      }

      // 各データを順次送信
      let successCount = 0;
      let errorCount = 0;

      for (const item of jsonData) {
        try {
          const content = convertToContent(item, dataType);

          const response = await fetch('/api/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source: content,
              dataType: dataType,
              metadata: item,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
            console.error(`データ ${item.id || 'unknown'} の取り込み失敗`);
          }
        } catch (error) {
          errorCount++;
          console.error('データ取り込みエラー:', error);
        }
      }

      showNotification(
        `一括取り込み完了: 成功 ${successCount}件, 失敗 ${errorCount}件`,
        errorCount === 0 ? 'success' : 'info'
      );

      // ステータスを更新
      await updateStatus();

      // ファイル入力をリセット
      bulkFileInput.value = '';

    } catch (error) {
      console.error('一括取り込みエラー:', error);
      showNotification(`エラー: ${error.message}`, 'error');
    } finally {
      bulkUploadBtn.textContent = '一括取り込み実行';
      bulkUploadBtn.disabled = false;
    }
  });

  // =====================================
  // ヘルパー関数
  // =====================================

  /**
   * ファイルをテキストとして読み込み
   */
  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('ファイル読み込みエラー'));
      reader.readAsText(file);
    });
  }

  /**
   * データオブジェクトをテキストコンテンツに変換
   */
  function convertToContent(data, dataType) {
    switch (dataType) {
      case 'customer':
        return `
顧客ID: ${data.id}
名前: ${data.name}
電話番号: ${data.phone || '未設定'}
メールアドレス: ${data.email || '未設定'}
住所: ${data.address || '未設定'}
顧客ランク: ${data.tier || '一般'}
累計利用額: ${data.totalSpent || 0}円
備考: ${data.notes || 'なし'}
        `.trim();

      case 'quote':
        return `
見積ID: ${data.id}
顧客ID: ${data.customerId}
見積日: ${data.date}
見積金額: ${data.amount}円
作業内容: ${data.description}
ステータス: ${data.status || '見積中'}
        `.trim();

      case 'work_history':
        return `
作業ID: ${data.id}
顧客ID: ${data.customerId}
作業日: ${data.date}
作業金額: ${data.amount}円
作業内容: ${data.description}
備考: ${data.notes || 'なし'}
        `.trim();

      default:
        return JSON.stringify(data, null, 2);
    }
  }

  // =====================================
  // データ一覧表示
  // =====================================

  async function loadDataList() {
    try {
      dataListContainer.innerHTML = '<p class="loading">データを読み込み中...</p>';

      const type = dataTypeFilter.value;
      const url = type ? `/api/documents?type=${type}&limit=100` : '/api/documents?limit=100';

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.documents.length === 0) {
        dataListContainer.innerHTML = '<p class="no-data">データが登録されていません</p>';
        return;
      }

      // データをテーブル形式で表示
      let html = `<p class="data-count">全${data.total}件</p><div class="data-table-wrapper"><table class="data-table">`;
      html += '<thead><tr><th>種別</th><th>ID</th><th>内容</th></tr></thead><tbody>';

      data.documents.forEach(doc => {
        const typeName = doc.metadata.type === 'customer' ? '顧客' :
                        doc.metadata.type === 'quote' ? '見積' :
                        doc.metadata.type === 'work_history' ? '作業履歴' : doc.metadata.type;

        const preview = doc.content.substring(0, 100).replace(/\n/g, ' ');

        html += `<tr>
          <td><span class="type-badge type-${doc.metadata.type}">${typeName}</span></td>
          <td>${doc.metadata.id || doc.id}</td>
          <td class="content-preview">${preview}${doc.content.length > 100 ? '...' : ''}</td>
        </tr>`;
      });

      html += '</tbody></table></div>';
      dataListContainer.innerHTML = html;

    } catch (error) {
      console.error('データ一覧取得エラー:', error);
      dataListContainer.innerHTML = `<p class="error">データの取得に失敗しました: ${error.message}</p>`;
    }
  }

  // データ一覧の更新ボタン
  refreshDataListBtn.addEventListener('click', loadDataList);

  // データ種別フィルタの変更時に自動更新
  dataTypeFilter.addEventListener('change', loadDataList);

  // 初回読み込み
  loadDataList();

  // =====================================
  // 初期化完了
  // =====================================

  console.log('管理画面を読み込みました');
}
