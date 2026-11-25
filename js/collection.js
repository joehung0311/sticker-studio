/* 10 我的貼圖收藏：IndexedDB 圖片、LocalStorage 角色、備份匯出匯入 */
(function () {
  const { $, $$, esc } = SS;
  const blobToDataURL = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
  const dataURLToBlob = (u) => fetch(u).then((r) => r.blob());

  SS.views.collection = {
    title: '💗 我的貼圖收藏',
    render(el) {
      let all = [], urls = [];
      el.innerHTML = `
      <div class="warn">💾 收藏只存在<b>目前這個瀏覽器</b>。清除瀏覽器資料、無痕模式或換裝置都可能遺失，請定期「匯出備份」。</div>
      <div class="card">
        <div class="row gap wrap"><input id="co-q" type="search" placeholder="🔍 搜尋名稱" class="grow"><select id="co-cat"></select></div>
        <div class="row gap wrap mt"><label class="btn ghost sm">📥 匯入備份<input type="file" id="co-import" accept=".json,application/json" hidden></label><button class="btn ghost sm" id="co-export">📤 匯出備份</button><a class="btn sm" href="#/editor">＋ 新增貼圖</a></div>
        <p class="muted small" id="co-usage"></p>
      </div>
      <div class="tiles coll" id="co-grid"></div>
      <div class="card"><h2>🗂️ 角色設定 <small class="muted" id="co-cn"></small></h2><div id="co-chars"></div></div>`;

      async function load() {
        try { all = await SS.idb.all(); } catch (e) { all = []; SS.toast('無法讀取收藏：' + e.message); }
        const cats = Array.from(new Set(all.map((x) => x.category || '未分類')));
        const cur = $('#co-cat', el).value;
        $('#co-cat', el).innerHTML = `<option value="">全部分類（${all.length}）</option>` + cats.map((c) => `<option ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join('');
        render();
        if (navigator.storage && navigator.storage.estimate) navigator.storage.estimate().then((s) => { $('#co-usage', el).textContent = `已使用約 ${SS.fmtBytes(s.usage || 0)}`; });
      }
      function render() {
        urls.forEach((u) => URL.revokeObjectURL(u)); urls = [];
        const q = $('#co-q', el).value.trim().toLowerCase(), cat = $('#co-cat', el).value;
        const list = all.filter((x) => (!cat || (x.category || '未分類') === cat) && (!q || (x.name || '').toLowerCase().includes(q)));
        $('#co-grid', el).innerHTML = list.length ? list.map((x) => { const u = URL.createObjectURL(x.blob); urls.push(u); return `
          <div class="coll-item"><button class="tile checker" data-open="${x.id}"><img src="${u}" alt="${esc(x.name)}" loading="lazy"></button>
          <b>${esc(x.name)}</b><small>${esc(x.category || '未分類')}</small></div>`; }).join('')
          : `<div class="empty"><div class="drop-ic">💗</div><p>${all.length ? '找不到符合的貼圖' : '還沒有收藏。到「✂️ 貼圖加工室」完成貼圖後按「存到收藏」。'}</p></div>`;
        const chars = SS.chars.list();
        $('#co-cn', el).textContent = chars.length + ' 個';
        $('#co-chars', el).innerHTML = chars.length ? `<div class="char-list">${chars.map((c) => `<div class="char-item"><div><b>${esc(c.name || '未命名角色')}</b><small>${esc(SS.styleName(c))}</small></div><div class="row"><button class="btn sm" data-usechar="${c.id}">使用</button><button class="btn sm ghost" data-delchar="${c.id}">🗑️</button></div></div>`).join('')}</div>` : '<p class="muted small">到「🎨 創造新角色」儲存角色後會出現在這裡。</p>';
      }
      function openItem(id) {
        const x = all.find((i) => i.id === id); if (!x) return;
        const u = URL.createObjectURL(x.blob);
        SS.modal(`<div class="checker preview-big"><img src="${u}" alt=""></div>
          <label>名稱<input id="m-name" value="${esc(x.name)}" maxlength="40"></label>
          <label>分類<input id="m-cat" value="${esc(x.category || '未分類')}" maxlength="20" list="m-cats"></label>
          <datalist id="m-cats">${Array.from(new Set(all.map((i) => i.category))).map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
          <div class="btn-row"><button class="btn primary" id="m-save">💾 儲存修改</button><button class="btn" id="m-dl">⬇️ 下載</button><button class="btn" id="m-share">📤 分享</button><button class="btn" id="m-edit">✂️ 再加工</button><button class="btn danger" id="m-del">🗑️ 刪除</button></div>`, {
          onOpen(b) {
            const fn = () => (x.name || 'sticker').replace(/[\\/:*?"<>|]/g, '_') + '.png';
            $('#m-save', b).onclick = async () => { x.name = $('#m-name', b).value.trim() || '我的貼圖'; x.category = $('#m-cat', b).value.trim() || '未分類'; await SS.idb.put(x); SS.closeModal(); SS.toast('已更新'); load(); };
            $('#m-dl', b).onclick = () => SS.download(x.blob, fn());
            $('#m-share', b).onclick = () => SS.shareBlob(x.blob, fn());
            $('#m-edit', b).onclick = () => { SS.handoffEditor = { blob: x.blob, name: fn() }; SS.closeModal(); location.hash = '#/editor'; };
            $('#m-del', b).onclick = async () => { if (!confirm('確定刪除這張貼圖？刪除後無法復原。')) return; await SS.idb.del(x.id); SS.closeModal(); SS.toast('已刪除'); load(); };
          }
        });
      }
      el.addEventListener('click', (e) => {
        const o = e.target.closest('[data-open]'); if (o) return openItem(o.dataset.open);
        const u = e.target.closest('[data-usechar]'); if (u) { const c = SS.chars.list().find((x) => x.id === u.dataset.usechar); SS.draft.set(Object.assign({}, c, { charId: c.id })); location.hash = '#/character'; }
        const d = e.target.closest('[data-delchar]'); if (d && confirm('確定刪除這個角色設定？')) { SS.chars.remove(d.dataset.delchar); render(); }
      });
      $('#co-q', el).addEventListener('input', render);
      $('#co-cat', el).addEventListener('change', render);
      $('#co-export', el).addEventListener('click', async () => {
        SS.toast('備份中…');
        const stickers = []; for (const x of all) stickers.push({ id: x.id, name: x.name, category: x.category, created: x.created, data: await blobToDataURL(x.blob) });
        const data = { app: 'sticker-studio', version: SS.VERSION, exported: new Date().toISOString(), characters: SS.chars.list(), stickers };
        SS.downloadText(JSON.stringify(data), `sticker-studio-backup-${SS.ts()}.json`, 'application/json');
      });
      $('#co-import', el).addEventListener('change', async (e) => {
        const f = e.target.files[0]; e.target.value = ''; if (!f) return;
        try {
          const data = JSON.parse((await f.text()).replace(/^﻿/, ''));
          if (data.app !== 'sticker-studio') throw new Error('不是本 App 的備份檔');
          let n = 0; for (const s of data.stickers || []) { await SS.idb.put({ id: s.id || SS.uid(), name: s.name, category: s.category, created: s.created || Date.now(), blob: await dataURLToBlob(s.data) }); n++; }
          const ids = new Set(SS.chars.list().map((c) => c.id)); let m = 0;
          (data.characters || []).forEach((c) => { if (!ids.has(c.id)) { SS.chars.save(c); m++; } });
          SS.toast(`已匯入 ${n} 張貼圖、${m} 個角色`); load();
        } catch (err) { SS.toast('匯入失敗：' + err.message); }
      });
      load();
      return () => urls.forEach((u) => URL.revokeObjectURL(u));
    }
  };
})();
