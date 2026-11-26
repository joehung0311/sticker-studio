/* 10 LINE 上架包：收集做好的貼圖 → 自動調整成 LINE 規格 → 打包成可上傳的 ZIP
   資料只存在本機（獨立的 IndexedDB，不影響原本的收藏資料庫） */
(function () {
  const { $, $$, esc } = SS;
  const SPEC = SS.LINE_SPEC;

  /* ---------- 本機儲存 ---------- */
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    if (!('indexedDB' in window)) return rej(new Error('此瀏覽器不支援 IndexedDB'));
    const r = indexedDB.open('sticker-studio-pack', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('items', { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  }));
  const tx = (mode, fn) => db().then((d) => new Promise((res, rej) => {
    const t = d.transaction('items', mode); const out = fn(t.objectStore('items'));
    t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error);
  }));
  const store = {
    all: () => tx('readonly', (s) => s.getAll()).then((r) => (r || []).sort((a, b) => a.order - b.order)),
    put: (x) => tx('readwrite', (s) => s.put(x)),
    del: (id) => tx('readwrite', (s) => s.delete(id)),
    clear: () => tx('readwrite', (s) => s.clear())
  };
  const meta = () => Object.assign({ target: 8, mainId: null, tabId: null, rmWhite: false, title: 'my-stickers' }, SS.ls.get('pack', {}));
  const setMeta = (m) => SS.ls.set('pack', m);

  /* ---------- 影像處理 ---------- */
  const blobToCanvas = (blob) => new Promise((res, rej) => {
    const u = URL.createObjectURL(blob); const i = new Image();
    i.onload = () => { const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0); URL.revokeObjectURL(u); res(c); };
    i.onerror = () => { URL.revokeObjectURL(u); rej(new Error('圖片讀取失敗')); }; i.src = u;
  });
  /* 判斷背景是否不透明：找出非透明內容的外框，看外框那一圈是不是幾乎都是不透明像素
     （白底圖即使已被縮小放在透明畫布上，也能正確判斷出來） */
  function opaqueBackground(cv) {
    const w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return false;
    let n = 0, op = 0; const a = (x, y) => d[(y * w + x) * 4 + 3];
    for (let x = x0; x <= x1; x += 2) { n += 2; op += (a(x, y0) >= 250) + (a(x, y1) >= 250); }
    for (let y = y0; y <= y1; y += 2) { n += 2; op += (a(x0, y) >= 250) + (a(x1, y) >= 250); }
    return op / n > 0.6;
  }
  /* 依設定把一張原圖處理成 LINE 規格：去白底（選用）→ 去掉空白 → 等比放進 W×H、留白 */
  async function prepared(item, m) {
    let cv = await blobToCanvas(item.blob);
    let opaque = opaqueBackground(cv);
    if (m.rmWhite && opaque) { cv = SS.removeColor(cv, [255, 255, 255], 40, true).canvas; opaque = opaqueBackground(cv); }
    return { src: cv, opaque };
  }
  const fit = (cv, kind) => SS.fitInto(cv, SPEC[kind].w, SPEC[kind].h, kind === 'tab' ? 2 : SPEC.margin, true);

  /* ---------- 對外 API：任何頁面都可以把貼圖加入上架包 ---------- */
  async function add(files) {
    const list = await store.all(); let order = list.length ? list[list.length - 1].order + 1 : 0; let n = 0;
    for (const f of files) {
      if (!f || !f.blob || !/^image\//.test(f.blob.type || 'image/png')) continue;
      await store.put({ id: SS.uid(), name: (f.name || 'sticker').replace(/\.[^.]+$/, ''), blob: f.blob, order: order++, created: Date.now() }); n++;
    }
    const total = list.length + n, m = meta();
    SS.toast(n ? `已加入上架包 ${n} 張（目前 ${total}／${m.target} 張）` : '沒有可加入的圖片');
    return { added: n, total };
  }
  SS.pack = { add, all: () => store.all(), clear: () => store.clear() };

  /* ---------- 上架包頁面 ---------- */
  SS.views.pack = {
    title: '📦 LINE 上架包',
    render(el) {
      let items = [], m = meta(); const urls = [];
      const cache = new Map(); // id -> { thumb, info }
      el.innerHTML = `
      <section class="card">
        <h2>📦 LINE 上架包</h2>
        <p class="muted small">把做好的貼圖放進來，App 會自動調整成 LINE 規格，最後打包成一個 ZIP，直接到 LINE Creators Market 上傳。全部在你的裝置上處理。</p>
        <ol class="list small"><li>選好要上架的張數</li><li>加入貼圖（可一次選多張）</li><li>指定主圖與聊天室標籤圖、調整順序</li><li>下載上架包 ZIP</li></ol>
      </section>
      <section class="card">
        <div class="field-label">1．上架張數</div>
        <div class="chips" id="pk-target">${SPEC.counts.map((n) => `<button type="button" class="chip" data-n="${n}">${n} 張</button>`).join('')}</div>
        <div class="progress mt" aria-hidden="true"><i id="pk-bar"></i></div>
        <p id="pk-status" class="small" role="status"></p>
        <div class="field-label">2．加入貼圖</div>
        <div class="btn-row">
          <label class="btn primary">＋ 從裝置選多張<input type="file" id="pk-file" accept="image/*" multiple hidden></label>
          <button type="button" class="btn" id="pk-fromcoll">💗 從收藏挑選</button>
          <a class="btn ghost" href="#editor">✂️ 到加工室製作</a>
        </div>
        <label class="ck"><input type="checkbox" id="pk-rmwhite"> 沒有透明背景的圖，自動去除白色背景</label>
      </section>
      <section class="card" id="pk-listcard">
        <div class="row between"><div class="field-label">3．貼圖順序與主圖</div><button type="button" class="btn sm ghost" id="pk-clear">🗑️ 清空</button></div>
        <p class="muted small">點「⭐ 主圖」「🏷️ 標籤」指定由哪一張製作主圖（240×240）與聊天室標籤圖（96×74），未指定時用第 1 張。</p>
        <div class="pack-grid" id="pk-grid"></div>
        <div class="row gap wrap mt" id="pk-special">
          <figure class="pk-fig"><div class="checker"><canvas id="pk-main" width="240" height="240"></canvas></div><figcaption>main.png 240×240</figcaption></figure>
          <figure class="pk-fig"><div class="checker"><canvas id="pk-tab" width="96" height="74"></canvas></div><figcaption>tab.png 96×74</figcaption></figure>
        </div>
      </section>
      <section class="card">
        <div class="field-label">4．檢查與下載</div>
        <ul class="list small" id="pk-checks"></ul>
        <label>ZIP 檔名<input id="pk-title" maxlength="40"></label>
        <div class="btn-row"><button type="button" class="btn primary" id="pk-zip">📦 下載上架包 ZIP</button></div>
        <p class="note small">規格依 LINE Creators Market 官方製作準則整理：貼圖最大 370×320、主圖 240×240、標籤圖 96×74，PNG、透明背景、每張小於 1MB、整包小於 60MB。本工具協助準備檔案，不保證通過審核；上架前請以<a href="${SS.LINKS.lineGuide}" target="_blank" rel="noopener">官方準則</a>為準。</p>
      </section>`;

      const fileName = () => ($('#pk-title', el).value.trim() || 'my-stickers').replace(/[\\/:*?"<>|\s]+/g, '_');
      $('#pk-title', el).value = m.title;
      $('#pk-title', el).addEventListener('input', (e) => { m.title = e.target.value; setMeta(m); });
      $('#pk-rmwhite', el).checked = !!m.rmWhite;
      $('#pk-rmwhite', el).addEventListener('change', (e) => { m.rmWhite = e.target.checked; setMeta(m); cache.clear(); render(); });
      $('#pk-target', el).addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (!b) return; m.target = +b.dataset.n; setMeta(m); render(); });

      const mainItem = () => items.find((x) => x.id === m.mainId) || items[0];
      const tabItem = () => items.find((x) => x.id === m.tabId) || mainItem();

      async function info(it) {
        if (cache.has(it.id)) return cache.get(it.id);
        const p = await prepared(it, m); const r = fit(p.src, 'sticker');
        const blob = await SS.canvasToBlob(r.canvas); const u = URL.createObjectURL(blob); urls.push(u);
        const warn = [];
        if (p.opaque) warn.push(m.rmWhite ? '背景不是白色，無法自動去背，請到加工室處理' : '沒有透明背景（可勾選上方自動去白底）');
        if (r.upscale) warn.push('原圖太小，放大後可能模糊');
        if (blob.size > SPEC.maxFileBytes) warn.push('超過 1MB');
        const v = { url: u, warn, src: p.src };
        cache.set(it.id, v); return v;
      }

      async function render() {
        try { items = await store.all(); } catch (e) { items = []; SS.toast('無法讀取上架包：' + e.message); }
        $$('#pk-target .chip', el).forEach((b) => b.classList.toggle('on', +b.dataset.n === m.target));
        const n = items.length, t = m.target;
        $('#pk-bar', el).style.width = Math.min(100, n / t * 100) + '%';
        $('#pk-status', el).innerHTML = n === t ? `✅ 已有 <b>${n}</b> 張，剛好符合 ${t} 張` : n < t ? `目前 <b>${n}</b>／${t} 張，還差 <b>${t - n}</b> 張` : `目前 <b>${n}</b> 張，比 ${t} 張多 <b>${n - t}</b> 張（只會打包前 ${t} 張，或改選更多張數）`;
        $('#pk-listcard', el).hidden = !n;
        const grid = $('#pk-grid', el);
        grid.innerHTML = items.map((it, i) => `<div class="pk-item ${i >= t ? 'over' : ''}" data-id="${it.id}">
            <div class="checker pk-thumb"><img alt="第 ${i + 1} 張"><b class="pk-no">${String(i + 1).padStart(2, '0')}</b></div>
            <small class="pk-warn"></small>
            <div class="pk-acts">
              <button type="button" class="btn xs" data-act="up" aria-label="往前" ${i === 0 ? 'disabled' : ''}>◀</button>
              <button type="button" class="btn xs" data-act="down" aria-label="往後" ${i === n - 1 ? 'disabled' : ''}>▶</button>
              <button type="button" class="btn xs ${mainItem() === it ? 'on' : ''}" data-act="main">⭐ 主圖</button>
              <button type="button" class="btn xs ${tabItem() === it ? 'on' : ''}" data-act="tab">🏷️ 標籤</button>
              <button type="button" class="btn xs ghost" data-act="del" aria-label="移除">🗑️</button>
            </div></div>`).join('');
        const warns = [];
        for (const [i, it] of items.entries()) {
          const v = await info(it); const box = grid.querySelector(`[data-id="${it.id}"]`); if (!box) continue;
          box.querySelector('img').src = v.url; box.querySelector('.pk-warn').textContent = v.warn.length ? '⚠️ ' + v.warn.join('、') : '✓ 符合規格';
          if (v.warn.length && i < t) warns.push(`第 ${i + 1} 張：${v.warn.join('、')}`);
        }
        if (n) {
          const mi = await info(mainItem()), ti = await info(tabItem());
          const mc = $('#pk-main', el).getContext('2d'); mc.clearRect(0, 0, 240, 240); mc.drawImage(fit(mi.src, 'main').canvas, 0, 0);
          const tc = $('#pk-tab', el).getContext('2d'); tc.clearRect(0, 0, 96, 74); tc.drawImage(fit(ti.src, 'tab').canvas, 0, 0);
        }
        const ck = [
          [n >= t, n >= t ? `張數：${Math.min(n, t)} 張（符合 LINE ${t} 張）` : `張數：還差 ${t - n} 張才夠 ${t} 張`],
          [true, `貼圖會自動調整為 ${SPEC.sticker.w}×${SPEC.sticker.h}（偶數尺寸）、四周留白 ${SPEC.margin}px、PNG`],
          [n > 0, '主圖 main.png 240×240、聊天室標籤圖 tab.png 96×74 會自動製作'],
          [!warns.length, warns.length ? '需要注意：' + warns.join('；') : '每張圖片都通過初步檢查']
        ];
        $('#pk-checks', el).innerHTML = ck.map(([ok, s]) => `<li>${ok ? '✅' : '⚠️'} ${esc(s)}</li>`).join('');
      }

      $('#pk-grid', el).addEventListener('click', async (e) => {
        const b = e.target.closest('[data-act]'); if (!b) return; const id = b.closest('[data-id]').dataset.id; const i = items.findIndex((x) => x.id === id); if (i < 0) return;
        const a = b.dataset.act;
        if (a === 'main') { m.mainId = id; setMeta(m); }
        if (a === 'tab') { m.tabId = id; setMeta(m); }
        if (a === 'del') { await store.del(id); cache.delete(id); }
        if (a === 'up' || a === 'down') {
          const j = a === 'up' ? i - 1 : i + 1; if (j < 0 || j >= items.length) return;
          const o = items[i].order; items[i].order = items[j].order; items[j].order = o;
          if (items[i].order === items[j].order) { items.forEach((x, k) => { x.order = k; }); [items[i].order, items[j].order] = [j, i]; }
          await store.put(items[i]); await store.put(items[j]);
        }
        render();
      });
      $('#pk-file', el).addEventListener('change', async (e) => { const fs = Array.from(e.target.files); e.target.value = ''; await add(fs.map((f) => ({ name: f.name, blob: f }))); render(); });
      $('#pk-clear', el).addEventListener('click', async () => { if (!(await SS.confirmBox('確定清空上架包？（收藏裡的貼圖不會被刪除）'))) return; await store.clear(); cache.clear(); m.mainId = m.tabId = null; setMeta(m); render(); });
      $('#pk-fromcoll', el).addEventListener('click', async () => {
        let all = []; try { all = await SS.idb.all(); } catch (er) { /* 無收藏 */ }
        if (!all.length) return SS.toast('收藏裡還沒有貼圖');
        const local = all.map((x) => ({ x, u: URL.createObjectURL(x.blob) }));
        SS.modal(`<h3>從收藏挑選</h3><p class="muted small">點選要放進上架包的貼圖（依點選順序加入）。</p>
          <div class="pk-pick" id="pk-pick">${local.map(({ x, u }) => `<button type="button" class="tile checker" data-pid="${x.id}"><img src="${u}" alt=""><span>${esc(x.name)}</span><i class="pk-ord"></i></button>`).join('')}</div>
          <div class="btn-row"><button type="button" class="btn ghost" id="pk-pall">全選</button><button type="button" class="btn primary" id="pk-padd">加入已選的 0 張</button></div>`, {
          onOpen(bx) {
            const sel = [];
            const upd = () => { $$('[data-pid]', bx).forEach((t) => { const k = sel.indexOf(t.dataset.pid); t.classList.toggle('on', k >= 0); t.querySelector('.pk-ord').textContent = k >= 0 ? k + 1 : ''; }); $('#pk-padd', bx).textContent = `加入已選的 ${sel.length} 張`; };
            $('#pk-pick', bx).addEventListener('click', (ev) => { const t = ev.target.closest('[data-pid]'); if (!t) return; const k = sel.indexOf(t.dataset.pid); if (k >= 0) sel.splice(k, 1); else sel.push(t.dataset.pid); upd(); });
            $('#pk-pall', bx).onclick = () => { sel.length = 0; all.forEach((x) => sel.push(x.id)); upd(); };
            $('#pk-padd', bx).onclick = async () => { if (!sel.length) return SS.toast('請先點選貼圖'); const pickd = sel.map((id) => all.find((x) => x.id === id)); SS.closeModal(); local.forEach(({ u }) => URL.revokeObjectURL(u)); await add(pickd.map((x) => ({ name: x.name, blob: x.blob }))); render(); };
          }
        });
      });

      let busy = false;
      $('#pk-zip', el).addEventListener('click', async () => {
        if (busy) return; if (!items.length) return SS.toast('上架包還是空的，請先加入貼圖');
        if (!window.JSZip) return SS.toast('ZIP 元件載入失敗，請重新整理');
        const t = m.target;
        if (items.length < t && !(await SS.confirmBox(`目前只有 ${items.length} 張，LINE 需要剛好 ${t} 張才能送審。仍要先下載目前的內容（草稿）嗎？`))) return;
        busy = true; const btn = $('#pk-zip', el); btn.disabled = true; btn.textContent = '打包中…';
        try {
          const use = items.slice(0, t); const zip = new JSZip(); let big = [];
          for (const [i, it] of use.entries()) {
            const p = await prepared(it, m); const b = await SS.canvasToBlob(fit(p.src, 'sticker').canvas);
            if (b.size > SPEC.maxFileBytes) big.push(i + 1);
            zip.file(String(i + 1).padStart(2, '0') + '.png', b);
          }
          zip.file('main.png', await SS.canvasToBlob(fit((await prepared(mainItem(), m)).src, 'main').canvas));
          zip.file('tab.png', await SS.canvasToBlob(fit((await prepared(tabItem(), m)).src, 'tab').canvas));
          const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
          const draft = use.length < t ? '-draft' : '';
          SS.download(blob, `${fileName()}-LINE-${use.length}${draft}.zip`);
          SS.toast(`上架包已下載：${use.length} 張＋主圖＋標籤圖（${SS.fmtBytes(blob.size)}）`);
          if (big.length) SS.toast(`⚠️ 第 ${big.join('、')} 張超過 1MB`);
          if (blob.size > SPEC.maxZipBytes) SS.toast('⚠️ ZIP 超過 60MB，LINE 無法一次上傳');
        } catch (er) { SS.toast('打包失敗：' + er.message); }
        finally { busy = false; btn.disabled = false; btn.textContent = '📦 下載上架包 ZIP'; }
      });

      render();
      return () => urls.forEach((u) => URL.revokeObjectURL(u));
    }
  };
})();
