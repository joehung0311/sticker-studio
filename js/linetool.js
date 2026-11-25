/* 09 LINE 貼圖工具箱：宮格切圖、ZIP、尺寸調整、主圖／標籤圖、規格檢查 */
(function () {
  const { $, $$, esc } = SS;
  const SPEC = SS.LINE_SPEC;

  /* 找出非透明內容範圍 */
  function contentBounds(cv) {
    const w = cv.width, h = cv.height, d = cv.getContext('2d').getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  /* 等比縮放放進 W×H 畫布，四周留白 margin，不拉伸 */
  SS.fitInto = function (src, W, H, margin = 10, trim = true) {
    let b = { x: 0, y: 0, w: src.width, h: src.height };
    if (trim) { const cb = contentBounds(src); if (cb) b = cb; }
    const k = Math.min((W - margin * 2) / b.w, (H - margin * 2) / b.h);
    const dw = Math.max(1, Math.round(b.w * k)), dh = Math.max(1, Math.round(b.h * k));
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const c = out.getContext('2d'); c.imageSmoothingQuality = 'high';
    c.drawImage(src, b.x, b.y, b.w, b.h, Math.round((W - dw) / 2), Math.round((H - dh) / 2), dw, dh);
    return { canvas: out, upscale: k > 1.05 };
  };
  const hasAlpha = (cv) => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] < 255) return true; return false; };
  const toCanvas = (img) => { const c = document.createElement('canvas'); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height; c.getContext('2d').drawImage(img, 0, 0); return c; };
  const blobToCanvas = (blob) => new Promise((res, rej) => { const u = URL.createObjectURL(blob); const i = new Image(); i.onload = () => { res(toCanvas(i)); URL.revokeObjectURL(u); }; i.onerror = rej; i.src = u; });

  async function zipAndDownload(files, name) {
    if (!window.JSZip) return SS.toast('ZIP 元件載入失敗，請重新整理');
    SS.toast('打包中…');
    const zip = new JSZip(); files.forEach((f) => zip.file(f.name, f.blob));
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    SS.download(blob, name);
    SS.toast(`ZIP 已下載（${files.length} 個檔案，${SS.fmtBytes(blob.size)}）`);
    return blob;
  }

  SS.views.line = {
    title: '📱 LINE 貼圖工具箱',
    render(el) {
      el.innerHTML = `
      <div class="tabs" role="tablist"><button class="tab on" data-tab="split">🧩 宮格切圖</button><button class="tab" data-tab="check">📏 尺寸與檢查</button><button class="tab" data-tab="spec">📘 官方規格</button></div>

      <section class="tab-panel" data-panel="split">
        <div class="card">
          <label class="drop small-drop"><input type="file" id="sp-file" accept="image/*" hidden><div id="sp-empty"><div class="drop-ic">🧩</div><b>匯入宮格貼圖總表</b><small>例如 AI 一次畫好的 3×3 九宮格</small></div></label>
          <div id="sp-ui" hidden>
            <div class="field-label">切割方式</div>
            <div class="chips" id="sp-preset"><button class="chip" data-g="2,2">2×2 四宮格</button><button class="chip on" data-g="3,3">3×3 九宮格</button><button class="chip" data-g="4,4">4×4 十六宮格</button><button class="chip" data-g="custom">自訂</button></div>
            <div class="grid2" id="sp-custom" hidden><label>橫列（rows）<input type="number" id="sp-rows" min="1" max="10" value="3"></label><label>直欄（cols）<input type="number" id="sp-cols" min="1" max="10" value="3"></label></div>
            <div class="canvas-wrap checker"><canvas id="sp-prev" aria-label="切割預覽"></canvas></div>
            <details class="adjust" open><summary>微調切割位置</summary>
              <div class="grid2">
                <label>上邊裁掉 <span data-v="t">0</span>%<input type="range" id="sp-t" min="0" max="25" step="0.5" value="0"></label>
                <label>下邊裁掉 <span data-v="b">0</span>%<input type="range" id="sp-b" min="0" max="25" step="0.5" value="0"></label>
                <label>左邊裁掉 <span data-v="l">0</span>%<input type="range" id="sp-l" min="0" max="25" step="0.5" value="0"></label>
                <label>右邊裁掉 <span data-v="r">0</span>%<input type="range" id="sp-r" min="0" max="25" step="0.5" value="0"></label>
              </div>
              <label>格子間距 <span data-v="g">0</span>%<input type="range" id="sp-g" min="0" max="10" step="0.25" value="0"></label>
            </details>
            <div class="field-label">輸出設定</div>
            <label class="ck"><input type="checkbox" id="sp-line" checked> 轉成 LINE 貼圖尺寸（370×320、等比例縮放、四周留白 10px）</label>
            <label class="ck"><input type="checkbox" id="sp-rm"> 切割後做單色去背（移除與邊緣相連的白色）</label>
            <button class="btn primary block" id="sp-go">✂️ 開始切割</button>
          </div>
        </div>
        <div class="card" id="sp-out" hidden>
          <h2>切割結果 <small class="muted" id="sp-count"></small></h2>
          <p class="muted small">點圖片可單張下載。</p>
          <div class="tiles" id="sp-tiles"></div>
          <label class="ck"><input type="checkbox" id="sp-extra"> ZIP 內附主圖 main.png（240×240）與標籤圖 tab.png（96×74），使用第 <input type="number" id="sp-mainidx" min="1" value="1" class="tiny"> 張製作</label>
          <div class="btn-row"><button class="btn primary" id="sp-zip">📦 全部下載 ZIP</button><button class="btn sage" id="sp-save">💗 全部存到收藏</button><button class="btn ghost" id="sp-tocheck">📏 送去規格檢查</button></div>
        </div>
      </section>

      <section class="tab-panel" data-panel="check" hidden>
        <div class="card">
          <label class="drop small-drop"><input type="file" id="ck-file" accept="image/*" multiple hidden><div><div class="drop-ic">📏</div><b>選擇一張或多張貼圖</b><small>檢查尺寸、檔案大小、PNG 與透明背景</small></div></label>
          <div class="summary" id="ck-sum"></div>
          <div class="check-list" id="ck-list"></div>
          <div id="ck-actions" hidden>
            <label class="ck"><input type="checkbox" id="ck-trim" checked> 調整前自動裁掉透明邊</label>
            <div class="btn-row">
              <button class="btn primary" id="ck-fix">🔧 全部調整為 LINE 貼圖尺寸</button>
              <button class="btn" id="ck-main">🖼️ 用第 1 張製作主圖</button>
              <button class="btn" id="ck-tab">🏷️ 用第 1 張製作標籤圖</button>
              <button class="btn ghost" id="ck-zip">📦 全部下載 ZIP</button>
            </div>
            <p class="muted small">調整一律保留原始長寬比例，不會拉伸變形。</p>
          </div>
        </div>
      </section>

      <section class="tab-panel" data-panel="spec" hidden>
        <div class="card">
          <h2>LINE 靜態貼圖規格</h2>
          <table class="spec"><tr><th>項目</th><th>數量</th><th>尺寸</th></tr>
            <tr><td>主要圖片</td><td>1 張</td><td>240 × 240 px</td></tr>
            <tr><td>貼圖圖片</td><td>8／16／24／32／40 張</td><td>最大 370 × 320 px</td></tr>
            <tr><td>聊天室標籤圖片</td><td>1 張</td><td>96 × 74 px</td></tr></table>
          <ul class="list small">
            <li>圖檔均為 PNG、RGB 色彩，解析度 72dpi 以上，尺寸建議設為偶數。</li>
            <li>每張圖片須小於 1MB；整包 ZIP 須小於 60MB。</li>
            <li>需去背成透明背景；圖案與邊緣保留約 10px 留白。</li>
          </ul>
          <p class="note">以上整理自 LINE Creators Market 官方製作準則（2026 年 11 月查證）。規格可能更新，<b>上架前請以官方頁面為準</b>。本工具僅協助準備與初步檢查，不保證通過審核。</p>
          <p class="muted small">「整套企劃」的 1、4 張是自用規劃張數；LINE 正式上架只接受 8／16／24／32／40 張。</p>
          <div class="btn-row"><a class="btn" href="${SS.LINKS.lineGuide}" target="_blank" rel="noopener">📘 官方製作準則</a><a class="btn" href="${SS.LINKS.lineHowto}" target="_blank" rel="noopener">🧭 官方上架教學</a></div>
        </div>
      </section>`;

      $$('.tab', el).forEach((t) => t.addEventListener('click', () => { $$('.tab', el).forEach((x) => x.classList.toggle('on', x === t)); $$('.tab-panel', el).forEach((p) => { p.hidden = p.dataset.panel !== t.dataset.tab; }); }));
      const showTab = (n) => $(`.tab[data-tab="${n}"]`, el).click();

      /* ============ 切圖 ============ */
      let src = null, rows = 3, cols = 3, tiles = [];
      const P = { t: 0, b: 0, l: 0, r: 0, g: 0 };
      const prev = $('#sp-prev', el), pc = prev.getContext('2d');
      function cells() {
        const w = src.width, h = src.height;
        const x0 = w * P.l / 100, x1 = w - w * P.r / 100, y0 = h * P.t / 100, y1 = h - h * P.b / 100;
        const gx = w * P.g / 100, gy = h * P.g / 100;
        const cw = (x1 - x0 - gx * (cols - 1)) / cols, ch = (y1 - y0 - gy * (rows - 1)) / rows;
        const out = [];
        if (cw < 2 || ch < 2) return out;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ x: Math.round(x0 + c * (cw + gx)), y: Math.round(y0 + r * (ch + gy)), w: Math.round(cw), h: Math.round(ch) });
        return out;
      }
      function drawPreview() {
        if (!src) return;
        const k = Math.min(1, 720 / Math.max(src.width, src.height));
        prev.width = Math.round(src.width * k); prev.height = Math.round(src.height * k);
        pc.drawImage(src, 0, 0, prev.width, prev.height);
        const cs = cells();
        pc.save(); pc.fillStyle = 'rgba(60,40,30,.45)'; pc.beginPath(); pc.rect(0, 0, prev.width, prev.height);
        cs.forEach((c) => pc.rect(c.x * k, c.y * k, c.w * k, c.h * k)); pc.fill('evenodd'); pc.restore();
        pc.strokeStyle = '#F59E6C'; pc.lineWidth = 2; pc.font = 'bold 16px sans-serif'; pc.fillStyle = '#F59E6C';
        cs.forEach((c, i) => { pc.strokeRect(c.x * k + 1, c.y * k + 1, c.w * k - 2, c.h * k - 2); pc.fillText(String(i + 1), c.x * k + 6, c.y * k + 20); });
      }
      async function loadSplit(blobOrFile) {
        try {
          let cv;
          if (blobOrFile instanceof File) { const { img, url } = await SS.fileToImage(blobOrFile); cv = toCanvas(img); URL.revokeObjectURL(url); }
          else cv = await blobToCanvas(blobOrFile);
          src = cv; $('#sp-empty', el).innerHTML = `<b>✅ 已載入 ${cv.width}×${cv.height}</b><small>點這裡更換圖片</small>`; $('#sp-ui', el).hidden = false; drawPreview();
        } catch (e) { SS.toast(e.message || '圖片讀取失敗'); }
      }
      $('#sp-file', el).addEventListener('change', (e) => { if (e.target.files[0]) loadSplit(e.target.files[0]); e.target.value = ''; });
      $('#sp-preset', el).addEventListener('click', (e) => {
        const b = e.target.closest('[data-g]'); if (!b) return;
        $$('#sp-preset .chip', el).forEach((x) => x.classList.toggle('on', x === b));
        $('#sp-custom', el).hidden = b.dataset.g !== 'custom';
        if (b.dataset.g !== 'custom') { [rows, cols] = b.dataset.g.split(',').map(Number); $('#sp-rows', el).value = rows; $('#sp-cols', el).value = cols; }
        drawPreview();
      });
      ['rows', 'cols'].forEach((k) => $('#sp-' + k, el).addEventListener('input', (e) => { const v = Math.max(1, Math.min(10, Math.round(+e.target.value || 1))); if (k === 'rows') rows = v; else cols = v; drawPreview(); }));
      ['t', 'b', 'l', 'r', 'g'].forEach((k) => $('#sp-' + k, el).addEventListener('input', (e) => { P[k] = +e.target.value; $(`[data-v="${k}"]`, el).textContent = P[k]; drawPreview(); }));

      $('#sp-go', el).addEventListener('click', async () => {
        if (!src) return;
        const cs = cells(); if (!cs.length) return SS.toast('切割範圍太小，請調整邊界');
        const toLine = $('#sp-line', el).checked, rm = $('#sp-rm', el).checked;
        tiles = [];
        for (let i = 0; i < cs.length; i++) {
          const c = cs[i]; let t = document.createElement('canvas'); t.width = c.w; t.height = c.h;
          t.getContext('2d').drawImage(src, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
          if (rm) t = SS.removeColor(t, [255, 255, 255], 40, true).canvas;
          if (toLine) t = SS.fitInto(t, SPEC.sticker.w, SPEC.sticker.h, SPEC.margin, rm).canvas;
          const blob = await SS.canvasToBlob(t);
          tiles.push({ name: String(i + 1).padStart(2, '0') + '.png', blob, canvas: t });
        }
        renderTiles();
      });
      function renderTiles() {
        $('#sp-out', el).hidden = false;
        $('#sp-count', el).textContent = `${tiles.length} 張`;
        $('#sp-mainidx', el).max = tiles.length;
        $('#sp-tiles', el).innerHTML = tiles.map((t, i) => `<button class="tile checker" data-i="${i}" title="下載 ${t.name}"><img src="${URL.createObjectURL(t.blob)}" alt="第 ${i + 1} 張"><span>${t.name}・${t.canvas.width}×${t.canvas.height}</span></button>`).join('');
        const lineOk = SPEC.counts.includes(tiles.length);
        if (!lineOk) $('#sp-count', el).textContent += `（LINE 上架需 8／16／24／32／40 張，可分批切割後再合併）`;
        $('#sp-out', el).scrollIntoView({ behavior: 'smooth' });
      }
      $('#sp-tiles', el).addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) { const t = tiles[+b.dataset.i]; SS.download(t.blob, t.name); } });
      $('#sp-zip', el).addEventListener('click', async () => {
        const files = tiles.map((t) => ({ name: t.name, blob: t.blob }));
        if ($('#sp-extra', el).checked) {
          const base = tiles[Math.max(0, Math.min(tiles.length - 1, (+$('#sp-mainidx', el).value || 1) - 1))].canvas;
          files.push({ name: 'main.png', blob: await SS.canvasToBlob(SS.fitInto(base, SPEC.main.w, SPEC.main.h, 10).canvas) });
          files.push({ name: 'tab.png', blob: await SS.canvasToBlob(SS.fitInto(base, SPEC.tab.w, SPEC.tab.h, 2).canvas) });
        }
        zipAndDownload(files, `stickers-${SS.ts()}.zip`);
      });
      $('#sp-save', el).addEventListener('click', async () => {
        const cat = prompt('收藏分類名稱', '宮格切圖') || '宮格切圖';
        for (const t of tiles) await SS.saveSticker(t.blob, t.name.replace('.png', ''), cat);
        SS.toast(`已存 ${tiles.length} 張到收藏`);
      });
      $('#sp-tocheck', el).addEventListener('click', async () => { await addCheck(tiles.map((t) => ({ name: t.name, blob: t.blob }))); showTab('check'); });

      /* ============ 檢查與調整 ============ */
      let items = [];
      async function inspect(f) {
        const cv = await blobToCanvas(f.blob);
        return { name: f.name, blob: f.blob, canvas: cv, w: cv.width, h: cv.height, size: f.blob.size, png: f.blob.type === 'image/png' || /\.png$/i.test(f.name), alpha: hasAlpha(cv) };
      }
      async function addCheck(files) {
        for (const f of files) { try { items.push(await inspect(f)); } catch (e) { SS.toast(f.name + ' 讀取失敗'); } }
        renderCheck();
      }
      function verdict(it, kind = 'sticker') {
        const s = SPEC[kind] || SPEC.sticker; const issues = [];
        if (!it.png) issues.push('不是 PNG');
        if (!it.alpha) issues.push('沒有透明背景');
        if (kind === 'sticker' ? (it.w > s.w || it.h > s.h) : (it.w !== s.w || it.h !== s.h)) issues.push(`尺寸應${kind === 'sticker' ? '不超過' : '為'} ${s.w}×${s.h}`);
        if (it.w % 2 || it.h % 2) issues.push('寬高建議為偶數');
        if (it.size >= SPEC.maxFileBytes) issues.push('檔案超過 1MB');
        return issues;
      }
      function renderCheck() {
        $('#ck-actions', el).hidden = !items.length;
        const stickers = items.filter((i) => !/^(main|tab)\.png$/.test(i.name));
        const okCount = stickers.filter((i) => !verdict(i).length).length;
        $('#ck-sum', el).innerHTML = items.length ? `<span>貼圖 ${stickers.length} 張</span><span>符合規格 ${okCount} 張</span><span>${SPEC.counts.includes(stickers.length) ? '✅ 張數可上架' : '⚠️ 上架需 8／16／24／32／40 張'}</span>` : '';
        $('#ck-list', el).innerHTML = items.map((it, i) => {
          const kind = it.name === 'main.png' ? 'main' : it.name === 'tab.png' ? 'tab' : 'sticker';
          const iss = verdict(it, kind);
          return `<div class="check-item ${iss.length ? 'bad' : 'good'}"><img class="checker" src="${URL.createObjectURL(it.blob)}" alt="">
            <div><b>${esc(it.name)}</b><small>${it.w}×${it.h}・${SS.fmtBytes(it.size)}・${it.png ? 'PNG' : '非 PNG'}・${it.alpha ? '有透明' : '無透明'}</small>
            <small class="${iss.length ? 'warn-t' : 'ok-t'}">${iss.length ? '⚠️ ' + iss.join('、') : '✅ 初步檢查符合'}</small></div>
            <div class="col"><button class="btn sm ghost" data-dl="${i}">⬇️</button><button class="btn sm ghost" data-rm="${i}" aria-label="移除">✕</button></div></div>`;
        }).join('');
      }
      $('#ck-file', el).addEventListener('change', (e) => { addCheck(Array.from(e.target.files).map((f) => ({ name: f.name, blob: f }))); e.target.value = ''; });
      $('#ck-list', el).addEventListener('click', (e) => {
        const d = e.target.closest('[data-dl]'), r = e.target.closest('[data-rm]');
        if (d) { const it = items[+d.dataset.dl]; SS.download(it.blob, it.name.replace(/\.[^.]+$/, '') + '.png'); }
        if (r) { items.splice(+r.dataset.rm, 1); renderCheck(); }
      });
      const stickerItems = () => items.filter((i) => !/^(main|tab)\.png$/.test(i.name));
      $('#ck-fix', el).addEventListener('click', async () => {
        const trim = $('#ck-trim', el).checked; let up = 0;
        const out = [];
        for (const [n, it] of stickerItems().entries()) {
          const r = SS.fitInto(it.canvas, SPEC.sticker.w, SPEC.sticker.h, SPEC.margin, trim); if (r.upscale) up++;
          out.push({ name: String(n + 1).padStart(2, '0') + '.png', blob: await SS.canvasToBlob(r.canvas) });
        }
        const keep = items.filter((i) => /^(main|tab)\.png$/.test(i.name)).map((i) => ({ name: i.name, blob: i.blob }));
        items = []; await addCheck(out.concat(keep));
        SS.toast(up ? `已調整，其中 ${up} 張原圖較小被放大，可能略模糊` : '已全部調整為 370×320');
      });
      const makeExtra = async (kind) => {
        const first = stickerItems()[0]; if (!first) return SS.toast('請先加入貼圖');
        const s = SPEC[kind]; const r = SS.fitInto(first.canvas, s.w, s.h, kind === 'main' ? 10 : 2, $('#ck-trim', el).checked);
        items = items.filter((i) => i.name !== kind + '.png');
        await addCheck([{ name: kind + '.png', blob: await SS.canvasToBlob(r.canvas) }]);
        SS.toast(kind === 'main' ? '主圖 240×240 已加入' : '標籤圖 96×74 已加入');
      };
      $('#ck-main', el).addEventListener('click', () => makeExtra('main'));
      $('#ck-tab', el).addEventListener('click', () => makeExtra('tab'));
      $('#ck-zip', el).addEventListener('click', async () => {
        const blob = await zipAndDownload(items.map((i) => ({ name: i.name.replace(/\.[^.]+$/, '') + '.png', blob: i.blob })), `line-stickers-${SS.ts()}.zip`);
        if (blob && blob.size >= SPEC.maxZipBytes) SS.toast('⚠️ ZIP 超過 60MB，LINE 無法一次上傳');
      });

      /* 從加工室交接過來的圖片 */
      if (SS.handoff) { const h = SS.handoff; SS.handoff = null; addCheck([h]); showTab('check'); SS.toast('已從加工室帶入圖片'); }
    }
  };
})();
