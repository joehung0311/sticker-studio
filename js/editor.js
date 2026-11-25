/* 08 貼圖加工室：Canvas 裁切、縮放、旋轉、翻轉、加字、單色去背、PNG 輸出 */
(function () {
  const { $, $$, esc } = SS;
  const MAX_SRC = 2048;
  const FRAMES = {
    line: { w: 370, h: 320, label: 'LINE 貼圖 370×320' },
    main: { w: 240, h: 240, label: 'LINE 主圖 240×240' },
    sq: { w: 512, h: 512, label: '正方形 512×512' },
    orig: { w: 0, h: 0, label: '原圖比例' },
    custom: { w: 400, h: 400, label: '自訂尺寸' }
  };
  const FONTS = {
    sans: '"PingFang TC","Noto Sans TC","Microsoft JhengHei","Heiti TC",sans-serif',
    round: '"Arial Rounded MT Bold","jf-openhuninn","Yuanti TC","PingFang TC","Microsoft JhengHei",sans-serif',
    serif: '"Noto Serif TC","PMingLiU","Songti TC",serif'
  };

  function defaultState() {
    return {
      rot: 0, flip: false, scale: 1, ox: 0, oy: 0, frame: 'line', cw: 400, ch: 400, bg: 'transparent', bgColor: '#ffffff',
      text: { content: '', size: 56, color: '#ffffff', stroke: '#5A3E2B', strokeW: 8, x: 0.5, y: 0.85, font: 'round', bold: true }
    };
  }

  SS.views.editor = {
    title: '✂️ 貼圖加工室',
    render(el) {
      let srcCanvas = null;      // 原始（縮到 2048 內）
      let work = null;           // 目前用於繪製（可能已去背）
      let S = defaultState();
      const hist = [];
      let textBox = null, pickMode = false;

      el.innerHTML = `
      <div class="card" id="ed-empty">
        <label class="drop">
          <input type="file" id="ed-file" accept="image/png,image/jpeg,image/webp,image/*" hidden>
          <div><div class="drop-ic">🖼️</div><b>匯入 AI 生成的圖片或照片</b><small>JPG、PNG、WebP・只在本機處理</small></div>
        </label>
        <button class="btn ghost block" id="ed-blank">或從空白透明畫布開始（只加字）</button>
      </div>
      <div id="ed-main" hidden>
        <div class="canvas-wrap checker" id="ed-wrap"><canvas id="ed-cv" aria-label="貼圖編輯畫布"></canvas></div>
        <div class="canvas-info"><span id="ed-size"></span><span class="muted small">拖曳移動・雙指縮放</span></div>
        <div class="toolbar">
          <button class="btn sm" id="ed-undo">↩️ 還原</button>
          <button class="btn sm" id="ed-reset">🔄 重設</button>
          <button class="btn sm ghost" id="ed-change">🖼️ 換圖</button>
        </div>

        <div class="tabs" role="tablist">
          <button class="tab on" data-tab="crop" role="tab">裁切縮放</button>
          <button class="tab" data-tab="text" role="tab">加文字</button>
          <button class="tab" data-tab="bg" role="tab">去背景</button>
          <button class="tab" data-tab="out" role="tab">輸出</button>
        </div>

        <div class="card tab-panel" data-panel="crop">
          <label>輸出尺寸（＝裁切框）<select id="ed-frame">${Object.entries(FRAMES).map(([k, f]) => `<option value="${k}">${f.label}</option>`).join('')}</select></label>
          <div class="grid2" id="ed-custom" hidden><label>寬 px<input type="number" id="ed-cw" min="16" max="2048" value="400"></label><label>高 px<input type="number" id="ed-ch" min="16" max="2048" value="400"></label></div>
          <label>縮放 <span id="ed-zv"></span><input type="range" id="ed-zoom" min="5" max="400" value="100"></label>
          <div class="btn-row">
            <button class="btn sm" id="ed-fit">⬜ 完整顯示</button><button class="btn sm" id="ed-fill">⬛ 填滿裁切框</button>
            <button class="btn sm" id="ed-rotl">⟲ 左轉</button><button class="btn sm" id="ed-rotr">⟳ 右轉</button><button class="btn sm" id="ed-flip">⇋ 水平翻轉</button>
          </div>
          <p class="muted small">縮放只會等比例放大縮小，不會拉伸變形。框外的部分會被裁掉。</p>
        </div>

        <div class="card tab-panel" data-panel="text" hidden>
          <label>文字內容（可換行，支援台語漢字）<div class="row gap"><textarea id="ed-text" rows="2" placeholder="例如：早安、食飽未？" maxlength="40"></textarea><button class="btn ghost nowrap" id="ed-pick" aria-label="挑用語">💬</button></div></label>
          <p class="warn small" id="ed-textwarn" hidden></p>
          <div class="grid2">
            <label>字型<select id="ed-font"><option value="round">圓體感</option><option value="sans">黑體</option><option value="serif">明體</option></select></label>
            <label class="ck inline"><input type="checkbox" id="ed-bold" checked> 粗體</label>
          </div>
          <label>文字大小 <span id="ed-tsv"></span><input type="range" id="ed-ts" min="12" max="200" value="56"></label>
          <div class="grid3">
            <label>文字顏色<input type="color" id="ed-tc" value="#ffffff"></label>
            <label>外框顏色<input type="color" id="ed-sc" value="#5A3E2B"></label>
            <label>外框粗細<input type="range" id="ed-sw" min="0" max="30" value="8"></label>
          </div>
          <div class="field-label">位置（也可以直接拖曳文字）</div>
          <div class="btn-row"><button class="btn sm" data-pos="0.15">⬆️ 上方</button><button class="btn sm" data-pos="0.5">⏺ 中間</button><button class="btn sm" data-pos="0.85">⬇️ 下方</button></div>
          <div class="grid2"><label>左右<input type="range" id="ed-tx" min="0" max="100" value="50"></label><label>上下<input type="range" id="ed-ty" min="0" max="100" value="85"></label></div>
        </div>

        <div class="card tab-panel" data-panel="bg" hidden>
          <div class="warn">⚠️ 這是<b>單色去背</b>：只會移除和指定顏色相近的區域（例如純白背景），<b>不是 AI 智慧去背</b>。背景複雜、有漸層或陰影時效果有限。</div>
          <div class="row gap wrap"><span>要移除的顏色</span><span class="swatch" id="ed-swatch"></span><button class="btn sm" id="ed-pickc">💧 點圖片選色</button><button class="btn sm ghost" id="ed-corner">用左上角顏色</button></div>
          <label>容差 <span id="ed-tolv">40</span><input type="range" id="ed-tol" min="0" max="160" value="40"></label>
          <label class="ck"><input type="checkbox" id="ed-edge" checked> 只移除與圖片邊緣相連的區域（建議，避免把角色身上的白色也挖掉）</label>
          <div class="btn-row"><button class="btn primary" id="ed-rmbg">✨ 去除背景</button><button class="btn ghost" id="ed-restore">↩️ 恢復原始背景</button></div>
        </div>

        <div class="card tab-panel" data-panel="out" hidden>
          <label>背景<select id="ed-bg"><option value="transparent">透明（PNG）</option><option value="color">單色</option></select></label>
          <label id="ed-bgc-wrap" hidden>背景顏色<input type="color" id="ed-bgc" value="#ffffff"></label>
          <label>檔名<input id="ed-name" value="my-sticker" maxlength="40"></label>
          <div class="btn-row">
            <button class="btn primary" id="ed-dl">⬇️ 下載 PNG</button>
            <button class="btn sage" id="ed-save">💗 存到收藏</button>
            <button class="btn" id="ed-share">📤 分享</button>
            <button class="btn ghost" id="ed-toline">📱 送到 LINE 工具</button>
          </div>
          <p class="muted small" id="ed-outinfo"></p>
        </div>
      </div>`;

      const cv = $('#ed-cv', el), ctx = cv.getContext('2d');
      let rmColor = [255, 255, 255];

      /* ---------- 尺寸與座標 ---------- */
      const srcW = () => (work ? work.width : 1), srcH = () => (work ? work.height : 1);
      const rotated = () => (S.rot % 180 === 0 ? [srcW(), srcH()] : [srcH(), srcW()]);
      function frameSize() {
        if (S.frame === 'orig') { const [w, h] = rotated(); return [Math.round(w), Math.round(h)]; }
        if (S.frame === 'custom') return [S.cw, S.ch];
        return [FRAMES[S.frame].w, FRAMES[S.frame].h];
      }
      function fitScale(fill) { const [fw, fh] = frameSize(); const [w, h] = rotated(); return fill ? Math.max(fw / w, fh / h) : Math.min(fw / w, fh / h); }
      function toCanvas(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height]; }
      function toSource(px, py) {
        const [fw, fh] = frameSize();
        let x = px - (fw / 2 + S.ox), y = py - (fh / 2 + S.oy);
        const a = -S.rot * Math.PI / 180; const rx = x * Math.cos(a) - y * Math.sin(a), ry = x * Math.sin(a) + y * Math.cos(a);
        x = rx / S.scale; y = ry / S.scale; if (S.flip) x = -x;
        return [Math.floor(x + srcW() / 2), Math.floor(y + srcH() / 2)];
      }

      /* ---------- 繪製 ---------- */
      function draw(forExport) {
        const [fw, fh] = frameSize();
        if (cv.width !== fw || cv.height !== fh) { cv.width = fw; cv.height = fh; }
        ctx.clearRect(0, 0, fw, fh);
        if (S.bg === 'color') { ctx.fillStyle = S.bgColor; ctx.fillRect(0, 0, fw, fh); }
        if (work) {
          ctx.save();
          ctx.translate(fw / 2 + S.ox, fh / 2 + S.oy); ctx.rotate(S.rot * Math.PI / 180); ctx.scale(S.flip ? -S.scale : S.scale, S.scale);
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(work, -srcW() / 2, -srcH() / 2);
          ctx.restore();
        }
        textBox = null;
        const t = S.text;
        if (t.content.trim()) {
          ctx.save();
          ctx.font = `${t.bold ? '900' : '400'} ${t.size}px ${FONTS[t.font]}`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
          const lines = t.content.split('\n'); const lh = t.size * 1.15;
          const cx = t.x * fw, cy = t.y * fh - (lines.length - 1) * lh / 2;
          let maxW = 0;
          lines.forEach((ln, i) => {
            const y = cy + i * lh; maxW = Math.max(maxW, ctx.measureText(ln).width);
            if (t.strokeW > 0) { ctx.strokeStyle = t.stroke; ctx.lineWidth = t.strokeW * 2; ctx.strokeText(ln, cx, y); }
            ctx.fillStyle = t.color; ctx.fillText(ln, cx, y);
          });
          ctx.restore();
          const pad = t.strokeW + 6, hh = lines.length * lh;
          textBox = { x: cx - maxW / 2 - pad, y: t.y * fh - hh / 2 - pad, w: maxW + pad * 2, h: hh + pad * 2 };
          if (!forExport && dragging === 'text') { ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#F59E6C'; ctx.lineWidth = 2; ctx.strokeRect(textBox.x, textBox.y, textBox.w, textBox.h); ctx.restore(); }
        }
        $('#ed-size', el).textContent = `輸出 ${fw} × ${fh} px`;
        $('#ed-zv', el).textContent = Math.round(S.scale * 100) + '%';
        $('#ed-zoom', el).value = Math.max(5, Math.min(400, Math.round(S.scale * 100)));
      }

      /* ---------- 歷史紀錄 ---------- */
      const snapshot = () => ({ S: JSON.parse(JSON.stringify(S)), work });
      const push = () => { hist.push(snapshot()); if (hist.length > 40) hist.shift(); };
      function syncUI() {
        $('#ed-frame', el).value = S.frame; $('#ed-custom', el).hidden = S.frame !== 'custom';
        $('#ed-cw', el).value = S.cw; $('#ed-ch', el).value = S.ch;
        const t = S.text;
        $('#ed-text', el).value = t.content; $('#ed-font', el).value = t.font; $('#ed-bold', el).checked = t.bold;
        $('#ed-ts', el).value = t.size; $('#ed-tsv', el).textContent = t.size + 'px';
        $('#ed-tc', el).value = t.color; $('#ed-sc', el).value = t.stroke; $('#ed-sw', el).value = t.strokeW;
        $('#ed-tx', el).value = Math.round(t.x * 100); $('#ed-ty', el).value = Math.round(t.y * 100);
        $('#ed-bg', el).value = S.bg; $('#ed-bgc', el).value = S.bgColor; $('#ed-bgc-wrap', el).hidden = S.bg !== 'color';
      }

      /* ---------- 載入圖片 ---------- */
      function loadSource(imgOrCanvas) {
        let w = imgOrCanvas.naturalWidth || imgOrCanvas.width, h = imgOrCanvas.naturalHeight || imgOrCanvas.height;
        const k = Math.min(1, MAX_SRC / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
        srcCanvas = document.createElement('canvas'); srcCanvas.width = w; srcCanvas.height = h;
        srcCanvas.getContext('2d').drawImage(imgOrCanvas, 0, 0, w, h);
        work = srcCanvas; hist.length = 0;
        const keepText = S.text; S = defaultState(); S.text = keepText;
        S.scale = fitScale(false);
        rmColor = Array.from(srcCanvas.getContext('2d').getImageData(0, 0, 1, 1).data.slice(0, 3)); updSwatch();
        $('#ed-empty', el).hidden = true; $('#ed-main', el).hidden = false;
        syncUI(); draw(); checkText();
      }
      async function loadFile(f) {
        try { const { img, url } = await SS.fileToImage(f); loadSource(img); URL.revokeObjectURL(url); $('#ed-name', el).value = (f.name || 'my-sticker').replace(/\.[^.]+$/, '').slice(0, 40); SS.toast('圖片已載入（僅在本機）'); }
        catch (e) { SS.toast(e.message); }
      }
      const fileIn = $('#ed-file', el);
      fileIn.addEventListener('change', () => { if (fileIn.files[0]) loadFile(fileIn.files[0]); fileIn.value = ''; });
      $('#ed-change', el).addEventListener('click', () => fileIn.click());
      $('#ed-blank', el).addEventListener('click', () => {
        const keepTxt = S.text.content; work = null; srcCanvas = null; S = defaultState(); S.frame = 'line'; S.text.content = keepTxt || '早安'; S.text.y = 0.5; S.text.color = '#F59E6C'; S.text.stroke = '#ffffff';
        $('#ed-empty', el).hidden = true; $('#ed-main', el).hidden = false; syncUI(); draw(); checkText(); switchTab('text');
      });

      /* ---------- 頁籤 ---------- */
      function switchTab(name) { $$('.tab', el).forEach((t) => t.classList.toggle('on', t.dataset.tab === name)); $$('.tab-panel', el).forEach((p) => { p.hidden = p.dataset.panel !== name; }); pickMode = false; $('#ed-pickc', el).classList.remove('on'); }
      $$('.tab', el).forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));

      /* ---------- 裁切縮放 ---------- */
      $('#ed-frame', el).addEventListener('change', (e) => { push(); S.frame = e.target.value; $('#ed-custom', el).hidden = S.frame !== 'custom'; S.ox = S.oy = 0; S.scale = fitScale(false); draw(); });
      ['cw', 'ch'].forEach((k) => $('#ed-' + k, el).addEventListener('change', (e) => { push(); S[k] = Math.max(16, Math.min(2048, Math.round(+e.target.value || 400))); e.target.value = S[k]; draw(); }));
      $('#ed-zoom', el).addEventListener('pointerdown', push);
      $('#ed-zoom', el).addEventListener('input', (e) => { S.scale = +e.target.value / 100; draw(); });
      $('#ed-fit', el).addEventListener('click', () => { push(); S.ox = S.oy = 0; S.scale = fitScale(false); draw(); });
      $('#ed-fill', el).addEventListener('click', () => { push(); S.ox = S.oy = 0; S.scale = fitScale(true); draw(); });
      $('#ed-rotl', el).addEventListener('click', () => { push(); S.rot = (S.rot + 270) % 360; if (S.frame === 'orig') S.scale = fitScale(false); draw(); });
      $('#ed-rotr', el).addEventListener('click', () => { push(); S.rot = (S.rot + 90) % 360; if (S.frame === 'orig') S.scale = fitScale(false); draw(); });
      $('#ed-flip', el).addEventListener('click', () => { push(); S.flip = !S.flip; draw(); });
      $('#ed-undo', el).addEventListener('click', () => { const h = hist.pop(); if (!h) return SS.toast('沒有可以還原的步驟'); S = h.S; work = h.work; syncUI(); draw(); });
      $('#ed-reset', el).addEventListener('click', () => { if (!work && !S.text.content) return; push(); work = srcCanvas; S = defaultState(); if (work) S.scale = fitScale(false); syncUI(); draw(); SS.toast('已重設（可按還原復原）'); });

      /* ---------- 文字 ---------- */
      const T = (k, v) => { S.text[k] = v; draw(); if (k === 'content' || k === 'font' || k === 'bold') checkText(); };
      /* 檢查缺字與疑似簡體字 */
      function checkText() {
        const w = $('#ed-textwarn', el); const t = S.text.content || '';
        const miss = SS.findMissingGlyphs ? SS.findMissingGlyphs(t, `${S.text.bold ? '900' : '400'} 40px ${FONTS[S.text.font]}`) : [];
        const simp = SS.findSimplified ? SS.findSimplified(t) : [];
        const msg = [];
        if (miss.length) msg.push(`⚠️ 這台裝置的字型可能畫不出：${miss.join(' ')}（會變成方塊）。可換字型，或改用常用寫法。`);
        if (simp.length) msg.push(`⚠️ 疑似簡體字：${simp.join(' ')}，請確認是否要改成繁體。`);
        w.hidden = !msg.length; w.textContent = msg.join(' ');
      }
      $('#ed-text', el).addEventListener('focus', push);
      $('#ed-text', el).addEventListener('input', (e) => T('content', e.target.value));
      $('#ed-pick', el).addEventListener('click', () => SS.pickPhrase((p) => { push(); $('#ed-text', el).value = p; T('content', p); }));
      $('#ed-font', el).addEventListener('change', (e) => { push(); T('font', e.target.value); });
      $('#ed-bold', el).addEventListener('change', (e) => { push(); T('bold', e.target.checked); });
      [['ts', 'size', 1], ['sw', 'strokeW', 1], ['tx', 'x', 100], ['ty', 'y', 100]].forEach(([id, k, div]) => {
        const r = $('#ed-' + id, el); r.addEventListener('pointerdown', push);
        r.addEventListener('input', () => { T(k, +r.value / div); if (id === 'ts') $('#ed-tsv', el).textContent = r.value + 'px'; });
      });
      [['tc', 'color'], ['sc', 'stroke']].forEach(([id, k]) => { const r = $('#ed-' + id, el); r.addEventListener('click', push); r.addEventListener('input', () => T(k, r.value)); });
      $$('[data-pos]', el).forEach((b) => b.addEventListener('click', () => { push(); S.text.x = 0.5; S.text.y = +b.dataset.pos; syncUI(); draw(); }));

      /* ---------- 單色去背 ---------- */
      const updSwatch = () => { $('#ed-swatch', el).style.background = `rgb(${rmColor.join(',')})`; };
      $('#ed-tol', el).addEventListener('input', (e) => { $('#ed-tolv', el).textContent = e.target.value; });
      $('#ed-pickc', el).addEventListener('click', (e) => { if (!work) return SS.toast('請先匯入圖片'); pickMode = !pickMode; e.currentTarget.classList.toggle('on', pickMode); if (pickMode) SS.toast('請點畫面上要移除的背景顏色'); });
      $('#ed-corner', el).addEventListener('click', () => { if (!srcCanvas) return; rmColor = Array.from(srcCanvas.getContext('2d').getImageData(0, 0, 1, 1).data.slice(0, 3)); updSwatch(); });
      $('#ed-rmbg', el).addEventListener('click', () => {
        if (!srcCanvas) return SS.toast('請先匯入圖片');
        push();
        const tol = +$('#ed-tol', el).value, edgeOnly = $('#ed-edge', el).checked;
        const out = SS.removeColor(srcCanvas, rmColor, tol, edgeOnly);
        work = out.canvas; draw();
        SS.toast(`已移除 ${out.removed.toLocaleString()} 個像素（可按還原）`);
      });
      $('#ed-restore', el).addEventListener('click', () => { if (work === srcCanvas) return; push(); work = srcCanvas; draw(); });

      /* ---------- 指標操作：拖曳、雙指縮放、選色 ---------- */
      let dragging = null, last = null; const pts = new Map(); let pinch = null;
      cv.addEventListener('pointerdown', (e) => {
        cv.setPointerCapture(e.pointerId);
        const [x, y] = toCanvas(e); pts.set(e.pointerId, [x, y]);
        if (pickMode && work) {
          const [sx, sy] = toSource(x, y);
          if (sx >= 0 && sy >= 0 && sx < srcW() && sy < srcH()) { rmColor = Array.from(srcCanvas.getContext('2d').getImageData(sx, sy, 1, 1).data.slice(0, 3)); updSwatch(); SS.toast('已選取顏色'); }
          pickMode = false; $('#ed-pickc', el).classList.remove('on'); return;
        }
        if (pts.size === 2) { const [a, b] = Array.from(pts.values()); pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), s: S.scale }; dragging = null; return; }
        push();
        dragging = textBox && x >= textBox.x && x <= textBox.x + textBox.w && y >= textBox.y && y <= textBox.y + textBox.h ? 'text' : (work ? 'img' : null);
        last = [x, y]; draw();
      });
      cv.addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId)) return;
        const [x, y] = toCanvas(e); pts.set(e.pointerId, [x, y]);
        if (pinch && pts.size === 2) { const [a, b] = Array.from(pts.values()); S.scale = Math.max(0.05, Math.min(4, pinch.s * Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d)); draw(); return; }
        if (!dragging || !last) return;
        const dx = x - last[0], dy = y - last[1]; last = [x, y];
        if (dragging === 'text') { const [fw, fh] = frameSize(); S.text.x = Math.max(0, Math.min(1, S.text.x + dx / fw)); S.text.y = Math.max(0, Math.min(1, S.text.y + dy / fh)); }
        else { S.ox += dx; S.oy += dy; }
        draw();
      });
      const end = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (pts.size === 0) { if (dragging === 'text') syncUI(); dragging = null; last = null; draw(); } };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
      cv.addEventListener('wheel', (e) => { if (!work) return; e.preventDefault(); S.scale = Math.max(0.05, Math.min(4, S.scale * (e.deltaY < 0 ? 1.06 : 0.94))); draw(); }, { passive: false });

      /* ---------- 輸出 ---------- */
      $('#ed-bg', el).addEventListener('change', (e) => { push(); S.bg = e.target.value; $('#ed-bgc-wrap', el).hidden = S.bg !== 'color'; draw(); });
      $('#ed-bgc', el).addEventListener('input', (e) => { S.bgColor = e.target.value; draw(); });
      const exportBlob = async () => { dragging = null; draw(true); const b = await SS.canvasToBlob(cv); draw(); $('#ed-outinfo', el).textContent = `PNG ${cv.width}×${cv.height}，${SS.fmtBytes(b.size)}${b.size > SS.LINE_SPEC.maxFileBytes ? '（超過 LINE 單張 1MB 限制）' : ''}`; return b; };
      const fname = () => ($('#ed-name', el).value.trim() || 'my-sticker').replace(/[\\/:*?"<>|]/g, '_') + '.png';
      $('#ed-dl', el).addEventListener('click', async () => { SS.download(await exportBlob(), fname()); });
      $('#ed-share', el).addEventListener('click', async () => { SS.shareBlob(await exportBlob(), fname()); });
      $('#ed-save', el).addEventListener('click', async () => {
        try { await SS.saveSticker(await exportBlob(), $('#ed-name', el).value.trim() || '我的貼圖'); SS.toast('已存到「我的貼圖收藏」💗'); }
        catch (e) { SS.toast('儲存失敗：' + e.message); }
      });
      $('#ed-toline', el).addEventListener('click', async () => { SS.handoff = { blob: await exportBlob(), name: fname() }; location.hash = '#line'; });

      /* 來自其他頁面的交接 */
      const pend = SS.ls.get('pendingText', '');
      if (pend) { S.text.content = pend; SS.ls.set('pendingText', ''); }
      SS._edCheck = () => checkText();
      if (SS.handoffEditor) {
        const b = SS.handoffEditor; SS.handoffEditor = null;
        const img = new Image(); const u = URL.createObjectURL(b.blob);
        img.onload = () => { loadSource(img); URL.revokeObjectURL(u); $('#ed-name', el).value = (b.name || 'my-sticker').replace(/\.png$/, ''); }; img.src = u;
      } else if (pend) { SS.toast('已帶入文字「' + pend + '」，請匯入圖片或用空白畫布'); }
    }
  };

  /**
   * 單色去背：rgb 距離 <= tol 的像素設為透明；tol～tol*1.35 之間做半透明柔邊
   * edgeOnly=true 時只處理與四周邊緣相連的區域（flood fill）
   */
  SS.removeColor = function (src, rgb, tol, edgeOnly) {
    const w = src.width, h = src.height;
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const c = out.getContext('2d'); c.drawImage(src, 0, 0);
    const id = c.getImageData(0, 0, w, h), d = id.data;
    const soft = Math.max(6, tol * 0.35), t2 = tol + soft;
    const dist = (i) => { const dr = d[i] - rgb[0], dg = d[i + 1] - rgb[1], db = d[i + 2] - rgb[2]; return Math.sqrt(dr * dr + dg * dg + db * db); };
    let removed = 0;
    const apply = (p) => {
      const i = p * 4; if (d[i + 3] === 0) return true;
      const ds = dist(i);
      if (ds <= tol) { d[i + 3] = 0; removed++; return true; }
      if (ds <= t2) { d[i + 3] = Math.round(d[i + 3] * (ds - tol) / soft); return false; }
      return false;
    };
    if (!edgeOnly) {
      for (let p = 0; p < w * h; p++) apply(p);
    } else {
      const seen = new Uint8Array(w * h); const stack = new Int32Array(w * h); let sp = 0;
      const seed = (p) => { if (!seen[p]) { seen[p] = 1; stack[sp++] = p; } };
      for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
      for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
      while (sp) {
        const p = stack[--sp];
        if (!apply(p)) continue;              // 只有完全移除的像素才繼續擴散
        const x = p % w;
        if (x > 0) seed(p - 1); if (x < w - 1) seed(p + 1);
        if (p >= w) seed(p - w); if (p < w * (h - 1)) seed(p + w);
      }
    }
    c.putImageData(id, 0, 0);
    return { canvas: out, removed };
  };
})();
