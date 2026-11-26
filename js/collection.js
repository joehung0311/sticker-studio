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
      <div class="tabs coll-tabs" role="tablist"><button class="tab on" data-ct="works">🖼️ 作品</button><button class="tab" data-ct="chars">🗂️ 角色</button><button class="tab" data-ct="texts">⭐ 常用文字</button><button class="tab" data-ct="home">🏡 家鄉話</button></div>
      <section data-cp="works">
      <div class="warn small">💾 收藏只存在<b>目前這個瀏覽器</b>。清除瀏覽器資料、無痕模式或換裝置都可能遺失，請定期「匯出備份」（含作品、角色、常用文字與家鄉話）。</div>
      <div class="card">
        <div class="row gap wrap"><input id="co-q" type="search" placeholder="🔍 搜尋名稱" class="grow"><select id="co-cat"></select></div>
        <div class="row gap wrap mt"><label class="btn ghost sm">📥 匯入備份<input type="file" id="co-import" accept=".json,application/json" hidden></label><button class="btn ghost sm" id="co-export">📤 匯出備份</button><a class="btn sm" href="#editor">＋ 新增貼圖</a></div>
        <p class="muted small" id="co-usage"></p>
      </div>
      <div class="tiles coll" id="co-grid"></div>
      </section>
      <section data-cp="chars" hidden><div class="card"><h2>🗂️ 角色設定 <small class="muted" id="co-cn"></small></h2><div id="co-chars"></div>
        <a class="btn sm block" href="#make">＋ 到「開始製作」設定新角色</a></div></section>
      <section data-cp="texts" hidden><div class="card"><h2>⭐ 常用文字</h2>
        <div class="row gap"><input id="co-newtext" placeholder="新增一句常用文字" maxlength="40" class="grow"><button class="btn" id="co-addtext">新增</button></div>
        <div id="co-texts" class="mt"></div><h2 class="mt">☆ 收藏的用語</h2><div id="co-favs"><p class="muted small">載入中…</p></div></div></section>
      <section data-cp="home" hidden><div class="card"><h2>🏡 我的家鄉話</h2>
        <p class="note small">記錄你家鄉的說法（例如澎湖話、客語、原住民族語）。內容由你自建，<b>App 不會查證</b>，在製作流程中會標示為「自建」。</p>
        <label>家鄉話名稱<input id="co-hname" placeholder="例如：澎湖話" maxlength="20"></label>
        <div class="grid2"><label>這句話<input id="co-htext" maxlength="30"></label><label>意思（選填）<input id="co-hmean" maxlength="40"></label></div>
        <label>備註（選填）<input id="co-hnote" maxlength="40" placeholder="例如：阿嬤常說"></label>
        <button class="btn primary" id="co-hadd">＋ 加入</button>
        <div id="co-hlist" class="mt"></div></div></section>`;

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
      $('.coll-tabs', el).addEventListener('click', (e) => { const b = e.target.closest('[data-ct]'); if (!b) return; $$('.coll-tabs .tab', el).forEach((x) => x.classList.toggle('on', x === b)); $$('[data-cp]', el).forEach((p) => { p.hidden = p.dataset.cp !== b.dataset.ct; }); if (b.dataset.ct === 'texts') renderTexts(); if (b.dataset.ct === 'home') renderHome(); });
      const useText = (t, lang, meaning) => { SS.draft.set({ text: t, noText: false, textLang: lang || 'zh', textZh: meaning || '' }); const mk = SS.ls.get('make', {}); mk.step = 3; SS.ls.set('make', mk); location.hash = '#make'; };
      async function renderTexts() {
        const my = SS.myTexts.get();
        $('#co-texts', el).innerHTML = my.length ? `<div class="char-list">${my.map((x) => `<div class="char-item"><div><b>${esc(x.text)}</b><small>${esc(SS.langOf(x.lang).short)}</small></div><div class="row"><button class="btn sm" data-usetext="${x.id}">使用</button><button class="btn sm ghost" data-deltext="${x.id}" aria-label="刪除">🗑️</button></div></div>`).join('')}</div>` : '<p class="muted small">還沒有常用文字。可在這裡新增，或在製作流程按「⭐ 存成常用文字」。</p>';
        const favs = SS.favs.all(); const rows = [];
        for (const [lg, ids] of Object.entries(favs)) {
          if (!ids || !ids.length || !SS.LANGS.some((l) => l.id === lg)) continue;
          try { const data = await SS.lang.load(lg); ids.forEach((id) => { const x = data.items.find((i) => i.id === id); if (x) rows.push({ lg, x }); }); } catch (e) { /* 離線或資料缺失時略過 */ }
        }
        $('#co-favs', el).innerHTML = rows.length ? `<div class="char-list">${rows.map(({ lg, x }) => `<div class="char-item"><div><b>${esc(x.text)}</b><small>${esc(SS.langOf(lg).short)}${x.meaning && x.meaning !== x.text ? '・' + esc(x.meaning) : ''}</small></div><div class="row"><button class="btn sm" data-usefav="${esc(lg)}|${esc(x.id)}">使用</button></div></div>`).join('')}</div>` : '<p class="muted small">在用語清單點 ☆ 就會出現在這裡。</p>';
        $('#co-favs', el).dataset.rows = JSON.stringify(rows.map(({ lg, x }) => [lg, x.id, x.text, x.meaning || '']));
      }
      function renderHome() {
        const h = SS.hometown.get(); $('#co-hname', el).value = h.name || '';
        $('#co-hlist', el).innerHTML = h.items.length ? `<div class="char-list">${h.items.map((x) => `<div class="char-item"><div><b>${esc(x.text)}</b><small>${esc(x.meaning || '')}${x.note ? '・' + esc(x.note) : ''}</small></div><div class="row"><button class="btn sm" data-usehome="${x.id}">使用</button><button class="btn sm ghost" data-delhome="${x.id}" aria-label="刪除">🗑️</button></div></div>`).join('')}</div>` : '<p class="muted small">還沒有家鄉話。</p>';
      }
      $('#co-addtext', el).addEventListener('click', () => { const t = $('#co-newtext', el).value.trim(); if (!t) return; SS.myTexts.add(t, 'zh'); $('#co-newtext', el).value = ''; renderTexts(); });
      $('#co-hname', el).addEventListener('change', (e) => { const h = SS.hometown.get(); h.name = e.target.value.trim(); SS.hometown.set(h); });
      $('#co-hadd', el).addEventListener('click', () => { const t = $('#co-htext', el).value.trim(); if (!t) return SS.toast('請輸入這句話'); const h = SS.hometown.get(); h.name = $('#co-hname', el).value.trim(); SS.hometown.set(h); SS.hometown.add(t, $('#co-hmean', el).value.trim(), $('#co-hnote', el).value.trim()); ['#co-htext', '#co-hmean', '#co-hnote'].forEach((q) => { $(q, el).value = ''; }); renderHome(); SS.toast('已加入'); });
      el.addEventListener('click', (e) => {
        const ut = e.target.closest('[data-usetext]'); if (ut) { const x = SS.myTexts.get().find((i) => i.id === ut.dataset.usetext); if (x) useText(x.text, x.lang); return; }
        const dt = e.target.closest('[data-deltext]'); if (dt) { SS.myTexts.remove(dt.dataset.deltext); renderTexts(); return; }
        const uf = e.target.closest('[data-usefav]'); if (uf) { const [lg, id] = uf.dataset.usefav.split('|'); const r = JSON.parse($('#co-favs', el).dataset.rows || '[]').find((x) => x[0] === lg && x[1] === id); if (r) useText(r[2], lg, r[3]); return; }
        const uh = e.target.closest('[data-usehome]'); if (uh) { const x = SS.hometown.get().items.find((i) => i.id === uh.dataset.usehome); if (x) useText(x.text, 'hometown', x.meaning); return; }
        const dh = e.target.closest('[data-delhome]'); if (dh) { SS.confirmBox('確定刪除這句家鄉話？').then((ok) => { if (ok) { SS.hometown.remove(dh.dataset.delhome); renderHome(); } }); }
      });
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
            $('#m-edit', b).onclick = () => { SS.handoffEditor = { blob: x.blob, name: fn() }; SS.closeModal(); location.hash = '#editor'; };
            $('#m-del', b).onclick = async () => { if (!(await SS.confirmBox('確定刪除這張貼圖？刪除後無法復原。'))) return; await SS.idb.del(x.id); SS.closeModal(); SS.toast('已刪除'); load(); };
          }
        });
      }
      el.addEventListener('click', (e) => {
        const o = e.target.closest('[data-open]'); if (o) return openItem(o.dataset.open);
        const u = e.target.closest('[data-usechar]'); if (u) { const c = SS.chars.list().find((x) => x.id === u.dataset.usechar); SS.draft.set(Object.assign({}, c, { charId: c.id })); const mk = SS.ls.get('make', {}); mk.type = 'char'; mk.step = 2; SS.ls.set('make', mk); location.hash = '#make'; }
        const d = e.target.closest('[data-delchar]'); if (d) SS.confirmBox('確定刪除這個角色設定？').then((ok) => { if (ok) { SS.chars.remove(d.dataset.delchar); render(); } });
      });
      $('#co-q', el).addEventListener('input', render);
      $('#co-cat', el).addEventListener('change', render);
      $('#co-export', el).addEventListener('click', async () => {
        SS.toast('備份中…');
        const stickers = []; for (const x of all) stickers.push({ id: x.id, name: x.name, category: x.category, created: x.created, data: await blobToDataURL(x.blob) });
        const data = { app: 'sticker-studio', version: SS.VERSION, exported: new Date().toISOString(), characters: SS.chars.list(), stickers, hometown: SS.hometown.get(), myTexts: SS.myTexts.get(), favPhrases: SS.ls.get('favPhrases', {}), taigiFav: SS.ls.get('taigiFav', []) };
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
          if (data.hometown && data.hometown.items) { const h = SS.hometown.get(); const have = new Set(h.items.map((x) => x.text)); data.hometown.items.forEach((x) => { if (!have.has(x.text)) h.items.push(x); }); if (!h.name) h.name = data.hometown.name || ''; SS.hometown.set(h); }
          (data.myTexts || []).forEach((x) => SS.myTexts.add(x.text, x.lang));
          if (data.favPhrases) { const f = SS.ls.get('favPhrases', {}); for (const [k, v] of Object.entries(data.favPhrases)) f[k] = Array.from(new Set([...(f[k] || []), ...v])); SS.ls.set('favPhrases', f); }
          if (data.taigiFav) SS.ls.set('taigiFav', Array.from(new Set([...SS.ls.get('taigiFav', []), ...data.taigiFav])));
          SS.toast(`已匯入 ${n} 張貼圖、${m} 個角色`); load();
        } catch (err) { SS.toast('匯入失敗：' + err.message); }
      });
      load();
      return () => urls.forEach((u) => URL.revokeObjectURL(u));
    }
  };
})();
