/* 08 貼圖加工室 v1.2：圖層（底圖／多組文字／裝飾）、消除工具、隨機設計、純文字貼圖 */
(function () {
  const { $, $$, esc, pick, shuffle } = SS;
  const MAX_SRC = 1536;
  const HIST_MAX = 20;
  const FRAMES = {
    line: { w: 370, h: 320, label: 'LINE 貼圖 370×320' },
    main: { w: 240, h: 240, label: 'LINE 主圖 240×240' },
    sq: { w: 512, h: 512, label: '正方形 512×512' },
    orig: { w: 0, h: 0, label: '原圖比例' },
    custom: { w: 400, h: 400, label: '自訂尺寸' }
  };
  /* 字型（皆為 OFL 開源授權，見 fonts/ 資料夾） */
  const FB = '"PingFang TC","Noto Sans TC","Microsoft JhengHei","Apple SD Gothic Neo","Hiragino Sans","SS Huninn",sans-serif'; // 粉圓收錄罕用台語字（如 𪜶），作為缺字備援
  SS.FONTS = [
    { id: 'round', name: '可愛圓體（粉圓）', family: `"SS Huninn",${FB}`, weight: 400 },
    { id: 'hand', name: '手寫字體（霞鶩文楷）', family: `"SS LXGW WenKai TC",${FB}`, weight: 400 },
    { id: 'kid', name: '童趣手寫（芫荽）', family: `"SS Iansui",${FB}`, weight: 400 },
    { id: 'comic', name: '搞笑漫畫（Chiron 粗圓）', family: `"SS Chiron GoRound TC",${FB}`, weight: 900 },
    { id: 'bold', name: '粗體字（思源黑體 Black）', family: `"SS Noto Sans TC Black",${FB}`, weight: 900 },
    { id: 'retro', name: '復古字體（仙人掌明體）', family: `"SS Cactus Classical Serif","Noto Serif TC","PMingLiU","SS Huninn",serif`, weight: 400 },
    { id: 'sans', name: '標準黑體（系統字型）', family: FB, weight: 700 }
  ];
  const fontOf = (id) => SS.FONTS.find((f) => f.id === id) || SS.FONTS[0];
  /* 隨機設計用的配色（文字色、描邊色），都經過對比挑選 */
  const PALETTE = [['#FFFFFF', '#5A3E2B'], ['#F59E6C', '#FFFFFF'], ['#FFFFFF', '#E8484A'], ['#5A3E2B', '#FFFFFF'], ['#FFD45E', '#5A3E2B'], ['#7FA8E8', '#FFFFFF'], ['#FFFFFF', '#6F9466'], ['#F2707A', '#FFFFFF'], ['#3B2A1E', '#FFE3D2'], ['#FFFFFF', '#8D6FC4']];
  const POS = {
    tl: ['左上角', 0.22, 0.16], top: ['主角上方', 0.5, 0.15], tr: ['右上角', 0.78, 0.16],
    left: ['左側', 0.2, 0.5], mid: ['中間', 0.5, 0.5], right: ['右側', 0.8, 0.5],
    bl: ['左下角', 0.22, 0.85], bottom: ['主角下方', 0.5, 0.86], br: ['右下角', 0.78, 0.85]
  };
  SS.TEXT_POS = POS;
  const LANGS = { zh: '華語', taigi: '台語', kinmen: '金門話', en: 'English', ja: '日本語', ko: '한국어' };
  const SAMPLE = {
    en: ['Good morning', 'Thank you!', 'OK!', 'LOL', 'Love you', 'Good night', 'Sorry', 'See you'],
    ja: ['おはよう', 'ありがとう', 'おつかれさま', 'おやすみ', '了解！', 'ごめんね', 'がんばって', 'またね'],
    ko: ['안녕', '고마워', '사랑해', '잘 자', '화이팅!', '미안해', '좋아요', '배고파']
  };

  const textDefaults = () => ({ type: 'text', content: '', font: 'round', size: 56, color: '#FFFFFF', stroke: '#5A3E2B', strokeW: 8, shadow: false, shadowColor: 'rgba(0,0,0,0.35)', rot: 0, ls: 0, lh: 1.15, vertical: false, x: 0.5, y: 0.85 });
  const defaultState = () => ({ rot: 0, flip: false, scale: 1, ox: 0, oy: 0, frame: 'line', cw: 400, ch: 400, bg: 'transparent', bgColor: '#ffffff', layers: [], sel: null, nid: 1 });

  function mountEditor(el, opts = {}) {
    let srcCanvas = null, work = null, S = defaultState();
    const past = [], fut = [];
    let tab = opts.textMode ? 'text' : 'crop';
    let eraseMode = 'erase', brush = 24, fillColor = [255, 255, 255], rectFill = 'clear', pickTarget = null;
    let zoom = 1, panView = false, rmColor = [255, 255, 255];
    const locks = SS.ls.get('designLocks', { font: false, color: false, size: false, pos: false, deco: false });
    let decoCount = SS.ls.get('decoCount', '1');
    let lang = SS.ls.get('editorLang', 'zh');

    el.innerHTML = `
    ${opts.textMode ? `<div class="card tx-intro"><b>🔤 純文字貼圖</b><p class="muted small">不用上傳圖片、也不用 AI 生圖：輸入文字、選字體和裝飾，就能直接下載 PNG。</p></div>` : ''}
    <div class="card" id="ed-empty" ${opts.textMode ? 'hidden' : ''}>
      <label class="drop">
        <input type="file" id="ed-file" accept="image/png,image/jpeg,image/webp,image/*" hidden>
        <div><div class="drop-ic">🖼️</div><b>匯入 AI 生成的圖片或照片</b><small>JPG、PNG、WebP・只在本機處理</small></div>
      </label>
      <button class="btn ghost block" id="ed-blank">或從空白透明畫布開始（純文字貼圖）</button>
    </div>
    <div id="ed-main" hidden>
      <div class="canvas-wrap checker" id="ed-wrap"><canvas id="ed-cv" aria-label="貼圖編輯畫布"></canvas></div>
      <div class="canvas-info"><span id="ed-size"></span>
        <span class="zoom-btns"><button class="btn xs on" data-zoom="1">1×</button><button class="btn xs" data-zoom="2">2×</button><button class="btn xs" data-zoom="3">3×</button><button class="btn xs" id="ed-panview" hidden>✋ 移動畫面</button></span></div>
      <div class="toolbar">
        <button class="btn sm" id="ed-undo">↩️ 還原</button><button class="btn sm" id="ed-redo">↪️ 重做</button>
        <button class="btn sm" id="ed-reset">🔄 重設</button><button class="btn sm ghost" id="ed-change">🖼️ ${opts.textMode ? '加底圖' : '換圖'}</button>
      </div>
      <div class="layers" id="ed-layers" aria-label="圖層"></div>

      <div class="tabs scroll-tabs" role="tablist">
        ${[['crop', '✂️', '裁切縮放'], ['erase', '🧽', '消除工具'], ['text', '🔤', '文字編輯'], ['deco', '⭐', '裝飾素材'], ['bg', '🪄', '去除背景'], ['rand', '🎲', '隨機設計'], ['out', '💾', '輸出下載']]
          .map(([k, ic, n]) => `<button class="tab" data-tab="${k}" role="tab">${ic} ${n}</button>`).join('')}
      </div>

      <div class="card tab-panel" data-panel="crop">
        <label>輸出尺寸（＝裁切框）<select id="ed-frame">${Object.entries(FRAMES).map(([k, f]) => `<option value="${k}">${f.label}</option>`).join('')}</select></label>
        <div class="grid2" id="ed-custom" hidden><label>寬 px<input type="number" id="ed-cw" min="16" max="2048" value="400"></label><label>高 px<input type="number" id="ed-ch" min="16" max="2048" value="400"></label></div>
        <label>底圖縮放 <span id="ed-zv"></span><input type="range" id="ed-zoom" min="5" max="400" value="100"></label>
        <div class="btn-row">
          <button class="btn sm" id="ed-fit">⬜ 完整顯示</button><button class="btn sm" id="ed-fill">⬛ 填滿裁切框</button>
          <button class="btn sm" id="ed-rotl">⟲ 左轉</button><button class="btn sm" id="ed-rotr">⟳ 右轉</button><button class="btn sm" id="ed-flip">⇋ 水平翻轉</button>
        </div>
        <p class="muted small">在畫面空白處拖曳可移動底圖、雙指縮放。只會等比例縮放，不會變形；文字與裝飾會自動保持在輸出範圍內。</p>
      </div>

      <div class="card tab-panel" data-panel="erase" hidden>
        <div class="warn small">🧽 <b>手動消除工具，不是 AI 智慧修復。</b>適合消除 AI 畫錯的字。<b>如果字和角色重疊，擦掉字也會擦到角色</b>，建議放大後只擦文字範圍，或用「框選＋周圍延伸填補」。</div>
        <div class="seg" role="radiogroup" aria-label="消除方式">
          <label><input type="radio" name="emode" value="erase" checked><span>🧽 橡皮擦</span></label>
          <label><input type="radio" name="emode" value="paint"><span>🖌️ 填色筆刷</span></label>
          <label><input type="radio" name="emode" value="rect"><span>⬚ 框選消除</span></label>
        </div>
        <p class="muted small" id="ed-emode-tip"></p>
        <label id="ed-brush-wrap">筆刷大小 <span id="ed-brushv">24</span>px<input type="range" id="ed-brush" min="4" max="120" value="24"></label>
        <div id="ed-rectfill-wrap" hidden><div class="field-label">框選後怎麼處理</div>
          <div class="seg" role="radiogroup" aria-label="框選處理"><label><input type="radio" name="rfill" value="clear" checked><span>變透明</span></label><label><input type="radio" name="rfill" value="color"><span>塗上指定色</span></label><label><input type="radio" name="rfill" value="heal"><span>周圍延伸填補</span></label></div>
          <p class="muted small">「周圍延伸填補」把框外的顏色往內延伸補滿（簡易修補，非 AI），適合單色或漸層背景上的字。</p></div>
        <div class="row gap wrap" id="ed-fillc-wrap"><span>填色</span><span class="swatch" id="ed-fillsw"></span><button class="btn sm" id="ed-pickfill">💧 從圖片吸色</button></div>
        <button class="btn sage block" id="ed-after-erase">➕ 消除完成，加上正確文字</button>
      </div>

      <div class="card tab-panel" data-panel="text" hidden>
        <div class="row gap wrap"><label class="grow">語言<select id="ed-lang">${Object.entries(LANGS).map(([k, n]) => `<option value="${k}" ${k === lang ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <button class="btn primary" id="ed-addtext">➕ 新增文字</button><button class="btn" id="ed-pick">💬 挑用語</button></div>
        <p class="muted small" id="ed-langnote"></p>
        <div id="ed-tprops">
          <label>文字內容（可換行，支援台語漢字）<textarea id="ed-text" rows="2" placeholder="例如：早安、食飽未？" maxlength="60"></textarea></label>
          <p class="warn small" id="ed-textwarn" hidden></p>
          <label>字體<select id="ed-font">${SS.FONTS.map((f) => `<option value="${f.id}">${f.name}</option>`).join('')}</select></label>
          <div class="seg" role="radiogroup" aria-label="排列"><label><input type="radio" name="tdir" value="h" checked><span>橫排</span></label><label><input type="radio" name="tdir" value="v"><span>直排</span></label></div>
          <label>文字大小 <span id="ed-tsv"></span><input type="range" id="ed-ts" min="12" max="220" value="56"></label>
          <div class="grid3">
            <label>文字顏色<input type="color" id="ed-tc" value="#ffffff"></label>
            <label>描邊顏色<input type="color" id="ed-sc" value="#5A3E2B"></label>
            <label>描邊粗細<input type="range" id="ed-sw" min="0" max="30" value="8"></label>
          </div>
          <div class="grid2">
            <label>旋轉 <span id="ed-trv">0°</span><input type="range" id="ed-tr" min="-180" max="180" value="0"></label>
            <label class="ck inline"><input type="checkbox" id="ed-shadow"> 文字陰影</label>
          </div>
          <div class="grid2">
            <label>字距<input type="range" id="ed-ls" min="-10" max="40" value="0"></label>
            <label>行距<input type="range" id="ed-lh" min="80" max="200" value="115"></label>
          </div>
          <div class="field-label">快速定位（也可以直接拖曳；雙指可縮放、旋轉）</div>
          <div class="pos-grid">${Object.entries(POS).map(([k, [n]]) => `<button class="btn xs" data-pos="${k}">${n}</button>`).join('')}</div>
          <p class="muted small">「主角上方／下方」會依圖片中不透明的主角範圍定位；沒有透明背景時以整張圖為準。</p>
        </div>
      </div>

      <div class="card tab-panel" data-panel="deco" hidden>
        <div class="deco-grid">${SS.DECOS.map((d) => `<button class="deco-btn" data-deco="${d.id}" title="${d.name}"><img src="${SS.decoURL(d.id)}" alt=""><small>${d.name}</small></button>`).join('')}</div>
        <div id="ed-dprops" hidden>
          <div class="field-label">選取中的裝飾</div>
          <label>大小 <span id="ed-dsv"></span><input type="range" id="ed-ds" min="16" max="300" value="70"></label>
          <label>旋轉 <span id="ed-drv">0°</span><input type="range" id="ed-dr" min="-180" max="180" value="0"></label>
          <label id="ed-dc-wrap">顏色<input type="color" id="ed-dc" value="#F2707A"></label>
        </div>
        <div class="field-label">隨機添加裝飾</div>
        <div class="seg" role="radiogroup" aria-label="裝飾數量">${[['0', '0 個'], ['1', '1 簡約'], ['2', '2 活潑'], ['3', '3 豐富'], ['r', '隨機']].map(([v, n]) => `<label><input type="radio" name="dcount" value="${v}" ${v === decoCount ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
        <div class="btn-row"><button class="btn" id="ed-randdeco">🎲 隨機添加裝飾</button><button class="btn ghost" id="ed-cleardeco">🗑️ 清除全部裝飾</button></div>
      </div>

      <div class="card tab-panel" data-panel="bg" hidden>
        <div class="warn small">⚠️ 這是<b>單色去背</b>：只會移除和指定顏色相近的區域（例如純白背景），<b>不是 AI 智慧去背</b>。</div>
        <div class="row gap wrap"><span>要移除的顏色</span><span class="swatch" id="ed-swatch"></span><button class="btn sm" id="ed-pickc">💧 點圖片選色</button><button class="btn sm ghost" id="ed-corner">用左上角顏色</button></div>
        <label>容差 <span id="ed-tolv">40</span><input type="range" id="ed-tol" min="0" max="160" value="40"></label>
        <label class="ck"><input type="checkbox" id="ed-edge" checked> 只移除與圖片邊緣相連的區域（建議）</label>
        <div class="btn-row"><button class="btn primary" id="ed-rmbg">✨ 去除背景</button><button class="btn ghost" id="ed-restore">↩️ 恢復原始底圖</button></div>
        <p class="muted small">「恢復原始底圖」也會復原消除工具做過的修改。</p>
      </div>

      <div class="card tab-panel" data-panel="rand" hidden>
        <p class="small">一鍵隨機搭配字體、大小、顏色、位置與裝飾，<b>不會改動你輸入的文字內容</b>。鎖住喜歡的項目，再按一次只換其他項目。</p>
        <div class="lock-row">${[['font', '字體'], ['size', '大小'], ['color', '顏色'], ['pos', '位置'], ['deco', '裝飾']].map(([k, n]) => `<button class="lock-chip ${locks[k] ? 'on' : ''}" data-dlock="${k}" aria-pressed="${!!locks[k]}">${locks[k] ? '🔒' : '🔓'} ${n}</button>`).join('')}</div>
        <p class="muted small">裝飾數量依「裝飾素材」分頁的設定（目前：<span id="ed-dcount-label"></span>）。</p>
        <button class="btn primary block big-btn" id="ed-random">🎲 隨機設計</button>
        <p class="note small">這是<b>本機隨機排版</b>，不需要 AI。想讓 AI 依隨機設計直接畫，請到「🎨 創造新角色」或「📸 照片變貼圖」使用「隨機設計提示詞」。</p>
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

    /* ================= 座標與尺寸 ================= */
    const srcW = () => (work ? work.width : 1), srcH = () => (work ? work.height : 1);
    const rotated = () => (S.rot % 180 === 0 ? [srcW(), srcH()] : [srcH(), srcW()]);
    function frameSize() {
      if (S.frame === 'orig') { if (!work) return [FRAMES.line.w, FRAMES.line.h]; const [w, h] = rotated(); return [Math.round(w), Math.round(h)]; }
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
      return [x + srcW() / 2, y + srcH() / 2];
    }
    const selLayer = () => S.layers.find((l) => l.id === S.sel) || null;

    /* ================= 文字排版 ================= */
    const fontStr = (l, size = l.size) => { const f = fontOf(l.font); return `${f.weight} ${size}px ${f.family}`; };
    const pendingFonts = new Set();
    function ensureFont(l) {
      if (!document.fonts || !document.fonts.load) return;
      const key = l.font + '|' + l.content;
      if (pendingFonts.has(key)) return; pendingFonts.add(key);
      document.fonts.load(fontStr(l, 40), l.content || 'A').then(() => { clampAll(); draw(); }).catch(() => {});
    }
    function layoutText(l) {
      ctx.save(); ctx.font = fontStr(l);
      const lines = (l.content || '').split('\n'); const glyphs = []; const step = l.size * l.lh;
      let w = 0, h = 0;
      if (!l.vertical) {
        const widths = lines.map((ln) => { const cs = Array.from(ln); return cs.reduce((s, c) => s + ctx.measureText(c).width, 0) + Math.max(0, cs.length - 1) * l.ls; });
        w = Math.max(0, ...widths); h = lines.length * step;
        lines.forEach((ln, i) => {
          let x = -widths[i] / 2; const y = -h / 2 + step * (i + 0.5);
          Array.from(ln).forEach((c) => { const cw = ctx.measureText(c).width; glyphs.push({ c, x: x + cw / 2, y }); x += cw + l.ls; });
        });
      } else {
        const adv = l.size + l.ls; const cols = lines.map((ln) => Array.from(ln));
        const maxLen = Math.max(0, ...cols.map((c) => c.length));
        w = cols.length * step; h = maxLen * adv - (maxLen ? l.ls : 0);
        cols.forEach((cs, i) => {
          const x = w / 2 - step * (i + 0.5);
          cs.forEach((c, j) => glyphs.push({ c, x, y: -h / 2 + adv * j + l.size / 2 }));
        });
      }
      ctx.restore();
      return { glyphs, w: Math.max(w, 1), h: Math.max(h, 1) };
    }
    function layerBox(l) {
      if (l.type === 'text') { const L = layoutText(l); const pad = l.strokeW + 4; return { w: L.w + pad * 2, h: L.h + pad * 2, L }; }
      return { w: l.size, h: l.size };
    }
    /* 讓圖層完整留在輸出範圍內（必要時縮小） */
    function clampLayer(l) {
      const [fw, fh] = frameSize();
      for (let k = 0; k < 3; k++) {
        const b = layerBox(l); const a = l.rot * Math.PI / 180;
        const hw = (Math.abs(b.w * Math.cos(a)) + Math.abs(b.h * Math.sin(a))) / 2;
        const hh = (Math.abs(b.w * Math.sin(a)) + Math.abs(b.h * Math.cos(a))) / 2;
        const over = Math.max(hw * 2 / fw, hh * 2 / fh);
        if (over > 1.001 && (l.content || l.type === 'deco')) { l.size = Math.max(8, Math.floor(l.size / over)); if (l.type === 'text') l.strokeW = Math.min(l.strokeW, Math.max(0, Math.round(l.size / 4))); continue; }
        l.x = Math.min(Math.max(l.x, hw / fw), 1 - hw / fw); l.y = Math.min(Math.max(l.y, hh / fh), 1 - hh / fh);
        break;
      }
    }
    const clampAll = () => S.layers.forEach(clampLayer);

    /* ================= 繪製 ================= */
    let rectDrag = null;
    function drawLayer(l, fw, fh) {
      ctx.save(); ctx.translate(l.x * fw, l.y * fh); ctx.rotate(l.rot * Math.PI / 180);
      if (l.type === 'text') {
        if (l.content) {
          ensureFont(l);
          const { glyphs } = layoutText(l);
          ctx.font = fontStr(l); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
          const sh = () => { if (l.shadow) { ctx.shadowColor = l.shadowColor; ctx.shadowBlur = l.size * 0.1; ctx.shadowOffsetX = l.size * 0.05; ctx.shadowOffsetY = l.size * 0.07; } };
          if (l.strokeW > 0) { ctx.save(); sh(); ctx.strokeStyle = l.stroke; ctx.lineWidth = l.strokeW * 2; glyphs.forEach((g) => ctx.strokeText(g.c, g.x, g.y)); ctx.restore(); }
          ctx.save(); if (l.strokeW <= 0) sh(); ctx.fillStyle = l.color; glyphs.forEach((g) => ctx.fillText(g.c, g.x, g.y)); ctx.restore();
        }
      } else {
        const d = SS.decoById[l.kind]; const img = SS.decoImage(l.kind, d.colorable ? l.color : '', () => draw());
        if (img) ctx.drawImage(img, -l.size / 2, -l.size / 2, l.size, l.size);
      }
      ctx.restore();
    }
    function draw(forExport) {
      const [fw, fh] = frameSize();
      if (cv.width !== fw || cv.height !== fh) { cv.width = fw; cv.height = fh; }
      ctx.clearRect(0, 0, fw, fh);
      if (S.bg === 'color') { ctx.fillStyle = S.bgColor; ctx.fillRect(0, 0, fw, fh); }
      if (work) {
        ctx.save(); ctx.translate(fw / 2 + S.ox, fh / 2 + S.oy); ctx.rotate(S.rot * Math.PI / 180); ctx.scale(S.flip ? -S.scale : S.scale, S.scale);
        ctx.imageSmoothingQuality = 'high'; ctx.drawImage(work, -srcW() / 2, -srcH() / 2); ctx.restore();
      }
      S.layers.forEach((l) => drawLayer(l, fw, fh));
      if (!forExport) {
        const l = selLayer();
        if (l && tab !== 'erase') {
          const b = layerBox(l);
          ctx.save(); ctx.translate(l.x * fw, l.y * fh); ctx.rotate(l.rot * Math.PI / 180);
          ctx.setLineDash([6, 4]); ctx.strokeStyle = '#F59E6C'; ctx.lineWidth = 2; ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
          ctx.setLineDash([]); ctx.fillStyle = '#fff'; ctx.strokeStyle = '#F59E6C'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(b.w / 2, b.h / 2, handleR(), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.restore();
        }
        if (rectDrag) { ctx.save(); ctx.setLineDash([6, 4]); ctx.strokeStyle = '#E8484A'; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(232,72,74,.12)'; const [x0, y0, x1, y1] = rectDrag; ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)); ctx.strokeRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)); ctx.restore(); }
      }
      $('#ed-size', el).textContent = `輸出 ${fw} × ${fh} px`;
      $('#ed-zv', el).textContent = Math.round(S.scale * 100) + '%';
      $('#ed-zoom', el).value = Math.max(5, Math.min(400, Math.round(S.scale * 100)));
    }
    const handleR = () => { const r = cv.getBoundingClientRect(); return Math.max(9, 14 * cv.width / Math.max(1, r.width)); };

    /* ================= 歷史紀錄（還原／重做） ================= */
    const snap = () => ({ S: JSON.parse(JSON.stringify(S)), work });
    const push = () => { past.push(snap()); if (past.length > HIST_MAX) past.shift(); fut.length = 0; updHist(); };
    const restore = (h) => { S = h.S; work = h.work; syncAll(); draw(); };
    const updHist = () => { $('#ed-undo', el).disabled = !past.length; $('#ed-redo', el).disabled = !fut.length; };
    $('#ed-undo', el).addEventListener('click', () => { if (!past.length) return SS.toast('沒有可以還原的步驟'); fut.push(snap()); restore(past.pop()); updHist(); });
    $('#ed-redo', el).addEventListener('click', () => { if (!fut.length) return SS.toast('沒有可以重做的步驟'); past.push(snap()); restore(fut.pop()); updHist(); });

    /* ================= 圖層清單 ================= */
    function renderLayers() {
      const box = $('#ed-layers', el);
      const items = [`<button class="layer-chip ${S.sel === null ? 'on' : ''}" data-layer="">🖼️ ${work ? '底圖' : '畫布'}</button>`]
        .concat(S.layers.map((l) => `<button class="layer-chip ${l.id === S.sel ? 'on' : ''}" data-layer="${l.id}">${l.type === 'text' ? '🔤 ' + esc((l.content || '（空白文字）').split('\n')[0].slice(0, 8)) : '⭐ ' + esc(SS.decoById[l.kind].name)}</button>`));
      const l = selLayer();
      box.innerHTML = `<div class="layer-list">${items.join('')}</div>` + (l ? `<div class="layer-acts"><button class="btn xs" data-lact="dup">📄 複製</button><button class="btn xs" data-lact="up">⬆️ 上移</button><button class="btn xs" data-lact="down">⬇️ 下移</button><button class="btn xs danger" data-lact="del" id="ed-del">🗑️ 刪除</button></div>` : '');
    }
    $('#ed-layers', el).addEventListener('click', (e) => {
      const c = e.target.closest('[data-layer]');
      if (c) { select(c.dataset.layer ? +c.dataset.layer : null); return; }
      const a = e.target.closest('[data-lact]'); const l = selLayer(); if (!a || !l) return;
      push(); const i = S.layers.indexOf(l);
      if (a.dataset.lact === 'del') { S.layers.splice(i, 1); S.sel = null; SS.toast('已刪除圖層（可按還原）'); }
      if (a.dataset.lact === 'dup') { const n = JSON.parse(JSON.stringify(l)); n.id = S.nid++; n.x = Math.min(0.9, l.x + 0.05); n.y = Math.min(0.9, l.y + 0.05); clampLayer(n); S.layers.splice(i + 1, 0, n); S.sel = n.id; }
      if (a.dataset.lact === 'up' && i < S.layers.length - 1) [S.layers[i], S.layers[i + 1]] = [S.layers[i + 1], S.layers[i]];
      if (a.dataset.lact === 'down' && i > 0) [S.layers[i], S.layers[i - 1]] = [S.layers[i - 1], S.layers[i]];
      syncAll(); draw();
    });
    function select(id) {
      S.sel = id; const l = selLayer();
      if (l && l.type === 'text' && tab !== 'text' && tab !== 'rand') switchTab('text');
      if (l && l.type === 'deco' && tab !== 'deco' && tab !== 'rand') switchTab('deco');
      syncAll(); draw();
    }

    /* ================= 介面同步 ================= */
    function syncAll() {
      $('#ed-frame', el).value = S.frame; $('#ed-custom', el).hidden = S.frame !== 'custom';
      $('#ed-cw', el).value = S.cw; $('#ed-ch', el).value = S.ch;
      $('#ed-bg', el).value = S.bg; $('#ed-bgc', el).value = S.bgColor; $('#ed-bgc-wrap', el).hidden = S.bg !== 'color';
      const l = selLayer();
      const t = l && l.type === 'text' ? l : null;
      const tv = t || textDefaults();
      if (document.activeElement !== $('#ed-text', el)) $('#ed-text', el).value = t ? t.content : '';
      $('#ed-font', el).value = tv.font; $('#ed-ts', el).value = tv.size; $('#ed-tsv', el).textContent = tv.size + 'px';
      $('#ed-tc', el).value = tv.color; $('#ed-sc', el).value = tv.stroke; $('#ed-sw', el).value = tv.strokeW;
      $('#ed-tr', el).value = tv.rot; $('#ed-trv', el).textContent = Math.round(tv.rot) + '°'; $('#ed-shadow', el).checked = tv.shadow;
      $('#ed-ls', el).value = tv.ls; $('#ed-lh', el).value = Math.round(tv.lh * 100);
      $(`input[name=tdir][value="${tv.vertical ? 'v' : 'h'}"]`, el).checked = true;
      const d = l && l.type === 'deco' ? l : null;
      $('#ed-dprops', el).hidden = !d;
      if (d) { $('#ed-ds', el).value = d.size; $('#ed-dsv', el).textContent = Math.round(d.size) + 'px'; $('#ed-dr', el).value = d.rot; $('#ed-drv', el).textContent = Math.round(d.rot) + '°'; $('#ed-dc-wrap', el).hidden = !SS.decoById[d.kind].colorable; if (d.color) $('#ed-dc', el).value = d.color; }
      $('#ed-dcount-label', el).textContent = { 0: '0 個', 1: '1 個', 2: '2 個', 3: '3 個', r: '隨機 1～3 個' }[decoCount];
      renderLayers(); checkText(); updHist();
    }

    /* ================= 載入 ================= */
    function showMain() { $('#ed-empty', el).hidden = true; $('#ed-main', el).hidden = false; }
    function loadSource(imgOrCanvas) {
      let w = imgOrCanvas.naturalWidth || imgOrCanvas.width, h = imgOrCanvas.naturalHeight || imgOrCanvas.height;
      const k = Math.min(1, MAX_SRC / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
      srcCanvas = document.createElement('canvas'); srcCanvas.width = w; srcCanvas.height = h;
      srcCanvas.getContext('2d').drawImage(imgOrCanvas, 0, 0, w, h);
      work = srcCanvas; past.length = 0; fut.length = 0;
      const keep = S.layers; const keepNid = S.nid; const keepSel = S.sel; S = defaultState(); S.layers = keep; S.nid = keepNid; S.sel = keepSel;
      S.scale = fitScale(false);
      rmColor = Array.from(srcCanvas.getContext('2d').getImageData(0, 0, 1, 1).data.slice(0, 3)); updSwatch();
      showMain(); clampAll(); syncAll(); draw();
    }
    async function loadFile(f) {
      try { const { img, url } = await SS.fileToImage(f); loadSource(img); URL.revokeObjectURL(url); $('#ed-name', el).value = (f.name || 'my-sticker').replace(/\.[^.]+$/, '').slice(0, 40); SS.toast('圖片已載入（僅在本機）'); }
      catch (e) { SS.toast(e.message); }
    }
    const fileIn = $('#ed-file', el);
    fileIn.addEventListener('change', () => { if (fileIn.files[0]) loadFile(fileIn.files[0]); fileIn.value = ''; });
    $('#ed-change', el).addEventListener('click', () => fileIn.click());
    function startBlank(text) {
      work = null; srcCanvas = null; const keep = S.layers.length ? S.layers : null;
      S = defaultState(); S.frame = 'line';
      if (keep) { S.layers = keep; const tx = keep.filter((l) => l.type === 'text'); S.sel = (tx.length ? tx[tx.length - 1] : keep[keep.length - 1]).id; } else addText(text || sampleText(), { y: 0.5, color: '#F59E6C', stroke: '#FFFFFF', size: 72 }, false);
      showMain(); clampAll(); syncAll(); draw(); switchTab('text');
    }
    $('#ed-blank', el).addEventListener('click', () => startBlank(pendText));
    $('#ed-reset', el).addEventListener('click', () => {
      push(); work = srcCanvas; const frame = S.frame; S = defaultState(); S.frame = work ? 'line' : frame; if (work) S.scale = fitScale(false);
      syncAll(); draw(); SS.toast('已重設（可按還原復原）');
    });

    /* ================= 分頁 ================= */
    function switchTab(name) {
      tab = name;
      $$('.tab', el).forEach((t) => t.classList.toggle('on', t.dataset.tab === name));
      $$('.tab-panel', el).forEach((p) => { p.hidden = p.dataset.panel !== name; });
      pickTarget = null; $$('#ed-pickc, #ed-pickfill', el).forEach((b) => b.classList.remove('on'));
      cv.classList.toggle('erasing', name === 'erase');
      const on = $(`.tab[data-tab="${name}"]`, el); if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      draw();
    }
    $$('.tab', el).forEach((t) => t.addEventListener('click', () => switchTab(t.dataset.tab)));

    /* ================= 放大檢視 ================= */
    $$('[data-zoom]', el).forEach((b) => b.addEventListener('click', () => {
      zoom = +b.dataset.zoom; const wrap = $('#ed-wrap', el);
      wrap.classList.toggle('zoomed', zoom > 1); cv.style.width = zoom > 1 ? (zoom * 100) + '%' : ''; cv.style.maxHeight = zoom > 1 ? 'none' : '';
      $('#ed-panview', el).hidden = zoom === 1; if (zoom === 1) setPanView(false);
      wrap.scrollTo(0, 0); wrap.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      $$('[data-zoom]', el).forEach((x) => x.classList.toggle('on', x === b));
    }));
    function setPanView(on) { panView = on; cv.style.touchAction = on ? 'auto' : 'none'; $('#ed-panview', el).classList.toggle('on', on); $('#ed-wrap', el).classList.toggle('panning', on); }
    $('#ed-panview', el).addEventListener('click', () => { setPanView(!panView); SS.toast(panView ? '可以用手指捲動畫面；再按一次回到編輯' : '回到編輯模式'); });

    /* ================= 裁切縮放 ================= */
    $('#ed-frame', el).addEventListener('change', (e) => { push(); S.frame = e.target.value; $('#ed-custom', el).hidden = S.frame !== 'custom'; S.ox = S.oy = 0; if (work) S.scale = fitScale(false); clampAll(); draw(); });
    ['cw', 'ch'].forEach((k) => $('#ed-' + k, el).addEventListener('change', (e) => { push(); S[k] = Math.max(16, Math.min(2048, Math.round(+e.target.value || 400))); e.target.value = S[k]; clampAll(); draw(); }));
    $('#ed-zoom', el).addEventListener('pointerdown', push);
    $('#ed-zoom', el).addEventListener('input', (e) => { S.scale = +e.target.value / 100; draw(); });
    $('#ed-fit', el).addEventListener('click', () => { if (!work) return; push(); S.ox = S.oy = 0; S.scale = fitScale(false); draw(); });
    $('#ed-fill', el).addEventListener('click', () => { if (!work) return; push(); S.ox = S.oy = 0; S.scale = fitScale(true); draw(); });
    $('#ed-rotl', el).addEventListener('click', () => { push(); S.rot = (S.rot + 270) % 360; if (S.frame === 'orig') { S.scale = fitScale(false); clampAll(); } draw(); });
    $('#ed-rotr', el).addEventListener('click', () => { push(); S.rot = (S.rot + 90) % 360; if (S.frame === 'orig') { S.scale = fitScale(false); clampAll(); } draw(); });
    $('#ed-flip', el).addEventListener('click', () => { push(); S.flip = !S.flip; draw(); });

    /* ================= 文字 ================= */
    const sampleText = () => (lang === 'en' || lang === 'ja' || lang === 'ko') ? SAMPLE[lang][0] : (lang === 'zh' ? '早安' : '食飽未？');
    function addText(content, over = {}, doPush = true) {
      if (doPush) push();
      const l = Object.assign(textDefaults(), over, { id: S.nid++, content });
      const n = S.layers.filter((x) => x.type === 'text').length;
      if (n && over.y === undefined) { l.y = [0.85, 0.15, 0.5][n % 3]; }
      S.layers.push(l); S.sel = l.id; clampLayer(l); return l;
    }
    const curText = (create) => { let l = selLayer(); if (l && l.type === 'text') return l; if (!create) return null; return addText('', {}, true); };
    const T = (k, v, clamp = true) => { const l = curText(false); if (!l) return; l[k] = v; if (clamp) clampLayer(l); draw(); if (k === 'content') { renderLayers(); checkText(); } };
    $('#ed-addtext', el).addEventListener('click', () => { addText(sampleText()); syncAll(); draw(); setTimeout(() => { $('#ed-text', el).focus(); $('#ed-text', el).select(); }, 50); });
    $('#ed-text', el).addEventListener('focus', () => { if (curText(false)) push(); });
    $('#ed-text', el).addEventListener('input', (e) => {
      let l = curText(false);
      if (!l) { l = addText('', {}, true); }
      l.content = e.target.value; clampLayer(l); draw(); renderLayers(); checkText();
    });
    $('#ed-pick', el).addEventListener('click', () => {
      if (SAMPLE[lang]) {
        SS.modal(`<h3>${LANGS[lang]} 常用語</h3><div class="chips">${SAMPLE[lang].map((p) => `<button class="chip big" data-sp="${esc(p)}">${esc(p)}</button>`).join('')}</div>`, {
          onOpen(b) { b.addEventListener('click', (e) => { const c = e.target.closest('[data-sp]'); if (c) { applyPicked(c.dataset.sp); SS.closeModal(); } }); }
        });
        return;
      }
      if (lang === 'taigi' || lang === 'kinmen') SS.ls.set('pickLang', 'taigi');
      SS.pickPhrase((p) => applyPicked(p));
    });
    function applyPicked(p) { const l = curText(false); if (l) { push(); l.content = p; clampLayer(l); } else addText(p); syncAll(); draw(); }
    $('#ed-lang', el).addEventListener('change', (e) => { lang = e.target.value; SS.ls.set('editorLang', lang); langNote(); });
    function langNote() {
      const n = {
        zh: '可直接輸入，或按「挑用語」從生活用語庫選。',
        taigi: '支援台語漢字（如：媠、袂、𪜶、䆀）。按「挑用語」可從台語專區選擇。',
        kinmen: '金門話屬閩南語，可用相同的漢字書寫並正常顯示。目前沒有金門話專屬用語庫（缺少可查核的開放資料），可參考台語用語後依金門說法修改。',
        en: '英文建議用「可愛圓體」或「搞笑漫畫」字體。',
        ja: '日文假名可正常顯示；部分字體缺少日文漢字時會自動改用系統字型。',
        ko: '內建字型不含韓文，會自動使用手機或電腦的系統韓文字型。'
      }[lang];
      $('#ed-langnote', el).textContent = n;
    }
    $('#ed-font', el).addEventListener('change', (e) => { push(); T('font', e.target.value); checkText(); });
    $$('input[name=tdir]', el).forEach((r) => r.addEventListener('change', () => { push(); T('vertical', r.value === 'v'); }));
    $('#ed-shadow', el).addEventListener('change', (e) => { push(); T('shadow', e.target.checked); });
    [['ts', 'size', 1, (v) => v + 'px', 'ed-tsv'], ['sw', 'strokeW', 1], ['tr', 'rot', 1, (v) => v + '°', 'ed-trv'], ['ls', 'ls', 1], ['lh', 'lh', 100]].forEach(([id, k, div, fmt, lab]) => {
      const r = $('#ed-' + id, el); r.addEventListener('pointerdown', () => { if (curText(false)) push(); });
      r.addEventListener('input', () => { T(k, +r.value / div); if (lab) $('#' + lab, el).textContent = fmt(r.value); });
    });
    [['tc', 'color'], ['sc', 'stroke']].forEach(([id, k]) => { const r = $('#ed-' + id, el); r.addEventListener('click', () => { if (curText(false)) push(); }); r.addEventListener('input', () => T(k, r.value, false)); });
    /* 主角範圍：底圖中不透明的部分（在輸出座標） */
    function subjectBox() {
      const [fw, fh] = frameSize(); if (!work) return { x0: 0, y0: 0, x1: fw, y1: fh };
      const c = document.createElement('canvas'); c.width = fw; c.height = fh; const x = c.getContext('2d');
      x.translate(fw / 2 + S.ox, fh / 2 + S.oy); x.rotate(S.rot * Math.PI / 180); x.scale(S.flip ? -S.scale : S.scale, S.scale); x.drawImage(work, -srcW() / 2, -srcH() / 2);
      const d = x.getImageData(0, 0, fw, fh).data; let x0 = fw, y0 = fh, x1 = -1, y1 = -1;
      for (let y = 0; y < fh; y += 2) for (let xx = 0; xx < fw; xx += 2) if (d[(y * fw + xx) * 4 + 3] > 30) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0 || (x1 - x0 > fw * 0.97 && y1 - y0 > fh * 0.97)) return { x0: 0, y0: 0, x1: fw, y1: fh, full: true };
      return { x0, y0, x1, y1 };
    }
    function placeAt(l, key) {
      const [fw, fh] = frameSize(); const [, px, py] = POS[key];
      l.x = px; l.y = py;
      if (key === 'top' || key === 'bottom') {
        const sb = subjectBox();
        if (!sb.full) { const b = layerBox(l); l.y = key === 'top' ? (sb.y0 - b.h / 2 - 4) / fh : (sb.y1 + b.h / 2 + 4) / fh; l.x = ((sb.x0 + sb.x1) / 2) / fw; }
      }
      clampLayer(l);
    }
    $$('[data-pos]', el).forEach((b) => b.addEventListener('click', () => { const l = curText(false) || (selLayer()); if (!l) return SS.toast('請先新增或選取文字'); push(); placeAt(l, b.dataset.pos); draw(); }));
    function checkText() {
      const w = $('#ed-textwarn', el); const l = curText(false); const t = l ? l.content : '';
      const miss = SS.findMissingGlyphs ? SS.findMissingGlyphs(t, `${fontOf(l ? l.font : 'round').weight} 40px ${fontOf(l ? l.font : 'round').family}`) : [];
      const simp = SS.findSimplified ? SS.findSimplified(t) : [];
      const msg = [];
      if (miss.length) msg.push(`⚠️ 這台裝置可能畫不出：${miss.join(' ')}（會變成方塊）。可換字型或改用常用寫法。`);
      if (simp.length && lang !== 'ja') msg.push(`⚠️ 疑似簡體字：${simp.join(' ')}，請確認是否要改成繁體。`);
      w.hidden = !msg.length; w.textContent = msg.join(' ');
    }

    /* ================= 裝飾 ================= */
    function freeSpot(size) {
      const [fw, fh] = frameSize(); const boxes = S.layers.map((l) => { const b = layerBox(l); return { x: l.x * fw, y: l.y * fh, w: b.w, h: b.h }; });
      const sb = subjectBox(); const cx = (sb.x0 + sb.x1) / 2, cy = (sb.y0 + sb.y1) / 2;
      const cands = shuffle([[0.14, 0.16], [0.86, 0.16], [0.12, 0.5], [0.88, 0.5], [0.14, 0.84], [0.86, 0.84], [0.32, 0.12], [0.68, 0.12], [0.32, 0.9], [0.68, 0.9]]);
      let best = [0.86, 0.16], bestScore = -Infinity;
      cands.forEach(([x, y]) => {
        const px = x * fw, py = y * fh; let score = Math.hypot(px - cx, py - cy) * 0.3;
        boxes.forEach((b) => { const dx = Math.max(0, Math.abs(px - b.x) - (b.w + size) / 2), dy = Math.max(0, Math.abs(py - b.y) - (b.h + size) / 2); score += Math.min(200, Math.hypot(dx, dy)); if (!dx && !dy) score -= 500; });
        if (score > bestScore) { bestScore = score; best = [x, y]; }
      });
      return best;
    }
    function addDeco(kind, over = {}) {
      const d = SS.decoById[kind]; const [fw, fh] = frameSize(); const size = Math.round(Math.min(fw, fh) * 0.2);
      const [x, y] = over.x !== undefined ? [over.x, over.y] : freeSpot(size);
      const l = Object.assign({ type: 'deco', kind, size, rot: 0, color: d.color, x, y }, over, { id: S.nid++ });
      S.layers.push(l); clampLayer(l); return l;
    }
    $('.deco-grid', el).addEventListener('click', (e) => { const b = e.target.closest('[data-deco]'); if (!b) return; push(); const l = addDeco(b.dataset.deco); S.sel = l.id; syncAll(); draw(); });
    [['ds', 'size', (v) => v + 'px', 'ed-dsv'], ['dr', 'rot', (v) => v + '°', 'ed-drv']].forEach(([id, k, fmt, lab]) => {
      const r = $('#ed-' + id, el); r.addEventListener('pointerdown', push);
      r.addEventListener('input', () => { const l = selLayer(); if (!l || l.type !== 'deco') return; l[k] = +r.value; clampLayer(l); $('#' + lab, el).textContent = fmt(r.value); draw(); });
    });
    $('#ed-dc', el).addEventListener('click', push);
    $('#ed-dc', el).addEventListener('input', (e) => { const l = selLayer(); if (l && l.type === 'deco') { l.color = e.target.value; draw(); } });
    $$('input[name=dcount]', el).forEach((r) => r.addEventListener('change', () => { decoCount = r.value; SS.ls.set('decoCount', decoCount); syncAll(); }));
    const countNow = () => decoCount === 'r' ? 1 + Math.floor(Math.random() * 3) : +decoCount;
    function randomDecos(n) {
      S.layers = S.layers.filter((l) => l.type !== 'deco');
      const kinds = shuffle(SS.DECOS.map((d) => d.id)).slice(0, n);
      kinds.forEach((k) => { const l = addDeco(k); l.rot = Math.round(Math.random() * 40 - 20); l.size = Math.round(l.size * (0.8 + Math.random() * 0.4)); clampLayer(l); });
      return kinds.length;
    }
    $('#ed-randdeco', el).addEventListener('click', () => { push(); const n = randomDecos(countNow()); S.sel = null; syncAll(); draw(); SS.toast(n ? `已隨機添加 ${n} 個裝飾` : '裝飾數量設定為 0，未添加'); });
    $('#ed-cleardeco', el).addEventListener('click', () => { if (!S.layers.some((l) => l.type === 'deco')) return; push(); S.layers = S.layers.filter((l) => l.type !== 'deco'); S.sel = null; syncAll(); draw(); });

    /* ================= 隨機設計（本機） ================= */
    $('.lock-row', el).addEventListener('click', (e) => {
      const b = e.target.closest('[data-dlock]'); if (!b) return; const k = b.dataset.dlock; locks[k] = !locks[k]; SS.ls.set('designLocks', locks);
      b.classList.toggle('on', locks[k]); b.setAttribute('aria-pressed', locks[k]); b.textContent = (locks[k] ? '🔒 ' : '🔓 ') + b.textContent.slice(3);
    });
    $('#ed-random', el).addEventListener('click', () => {
      const texts = S.layers.filter((l) => l.type === 'text');
      if (!texts.length && locks.deco) return SS.toast('請先在「文字編輯」新增文字');
      push();
      const posKeys = shuffle(['top', 'bottom', 'tl', 'tr', 'bl', 'br']);
      const lockedPos = Object.fromEntries(texts.map((l) => [l.id, [l.x, l.y]]));
      const [fw, fh] = frameSize();
      texts.forEach((l, i) => {
        const before = l.content;
        if (!locks.font) l.font = pick(SS.FONTS.filter((f) => f.id !== 'sans')).id;
        if (!locks.color) { const [c, s] = pick(PALETTE); l.color = c; l.stroke = s; l.strokeW = Math.max(4, Math.round(l.size / 9)); l.shadow = Math.random() < 0.35; }
        if (!locks.size) { l.size = Math.round(Math.min(fw, fh) * (0.14 + Math.random() * 0.1)); l.strokeW = Math.max(3, Math.round(l.size / 9)); l.rot = Math.round(Math.random() * 16 - 8); }
        if (!locks.pos) { placeAt(l, posKeys[i % posKeys.length]); clampLayer(l); }
        else { // 位置已鎖定：維持原位置，放不下就縮小字級
          const [x0, y0] = [lockedPos[l.id][0], lockedPos[l.id][1]];
          for (let k = 0; k < 12; k++) { l.x = x0; l.y = y0; clampLayer(l); if (Math.abs(l.x - x0) < 1e-6 && Math.abs(l.y - y0) < 1e-6) break; l.x = x0; l.y = y0; l.size = Math.max(10, Math.round(l.size * 0.9)); l.strokeW = Math.max(2, Math.round(l.size / 9)); }
          l.x = x0; l.y = y0; clampLayer(l);
        }
        l.content = before; // 隨機設計絕不改動文字內容
      });
      if (!locks.deco) randomDecos(countNow());
      S.sel = null; syncAll(); draw();
      SS.toast(texts.length ? '已隨機設計（文字內容沒有改變）' : '已隨機添加裝飾；新增文字後可一起隨機');
    });

    /* ================= 消除工具 ================= */
    const cloneCanvas = (c) => { const n = document.createElement('canvas'); n.width = c.width; n.height = c.height; n.getContext('2d').drawImage(c, 0, 0); return n; };
    const emodeTip = { erase: '在圖上拖曳，被擦過的地方會變透明。', paint: '用「填色」的顏色塗蓋文字，適合純色背景（例如白底上的字）。', rect: '在圖上拖曳拉出方框，放開後處理框內區域。' };
    function updEraseUI() {
      $('#ed-emode-tip', el).textContent = emodeTip[eraseMode];
      $('#ed-brush-wrap', el).hidden = eraseMode === 'rect'; $('#ed-rectfill-wrap', el).hidden = eraseMode !== 'rect';
      $('#ed-fillc-wrap', el).hidden = !(eraseMode === 'paint' || (eraseMode === 'rect' && rectFill === 'color'));
      $('#ed-fillsw', el).style.background = `rgb(${fillColor.join(',')})`;
    }
    $$('input[name=emode]', el).forEach((r) => r.addEventListener('change', () => { eraseMode = r.value; updEraseUI(); }));
    $$('input[name=rfill]', el).forEach((r) => r.addEventListener('change', () => { rectFill = r.value; updEraseUI(); }));
    $('#ed-brush', el).addEventListener('input', (e) => { brush = +e.target.value; $('#ed-brushv', el).textContent = brush; });
    $('#ed-pickfill', el).addEventListener('click', (e) => { if (!work) return SS.toast('請先匯入圖片'); pickTarget = pickTarget === 'fill' ? null : 'fill'; e.currentTarget.classList.toggle('on', !!pickTarget); if (pickTarget) SS.toast('請點圖片上要吸取的顏色'); });
    $('#ed-after-erase', el).addEventListener('click', () => { switchTab('text'); addText(sampleText()); syncAll(); draw(); SS.toast('已新增文字，請輸入正確內容'); setTimeout(() => $('#ed-text', el).select(), 60); });
    function ensureEditable() { if (work === srcCanvas) work = cloneCanvas(srcCanvas); }
    function strokeTo(p0, p1) {
      const c = work.getContext('2d'); const r = brush / S.scale / 2;
      const [a, b] = [toSource(...p0), toSource(...p1)];
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = r * 2;
      if (eraseMode === 'erase') { c.globalCompositeOperation = 'destination-out'; c.strokeStyle = '#000'; }
      else { c.strokeStyle = `rgb(${fillColor.join(',')})`; }
      c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0] + 0.01, b[1]); c.stroke(); c.restore();
    }
    function rectRegion() {
      const [x0, y0, x1, y1] = rectDrag; const pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map((p) => toSource(...p));
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const rx0 = Math.max(0, Math.floor(Math.min(...xs))), ry0 = Math.max(0, Math.floor(Math.min(...ys)));
      const rx1 = Math.min(srcW(), Math.ceil(Math.max(...xs))), ry1 = Math.min(srcH(), Math.ceil(Math.max(...ys)));
      return rx1 - rx0 < 2 || ry1 - ry0 < 2 ? null : [rx0, ry0, rx1 - rx0, ry1 - ry0];
    }
    function applyRect() {
      const r = rectRegion(); if (!r) return false;
      const c = work.getContext('2d'); const [x, y, w, h] = r;
      if (rectFill === 'clear') c.clearRect(x, y, w, h);
      else if (rectFill === 'color') { c.fillStyle = `rgb(${fillColor.join(',')})`; c.fillRect(x, y, w, h); }
      else SS.healRect(work, x, y, w, h);
      return true;
    }

    /* ================= 指標操作 ================= */
    let drag = null; const pts = new Map(); let pinch = null; let lastP = null;
    function hitLayer(x, y) {
      const [fw, fh] = frameSize();
      for (let i = S.layers.length - 1; i >= 0; i--) {
        const l = S.layers[i]; const b = layerBox(l); const a = -l.rot * Math.PI / 180;
        const dx = x - l.x * fw, dy = y - l.y * fh; const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
        if (Math.abs(lx) <= b.w / 2 + 6 && Math.abs(ly) <= b.h / 2 + 6) return l;
      }
      return null;
    }
    function hitHandle(x, y) {
      const l = selLayer(); if (!l) return false; const [fw, fh] = frameSize(); const b = layerBox(l); const a = l.rot * Math.PI / 180;
      const hx = l.x * fw + (b.w / 2) * Math.cos(a) - (b.h / 2) * Math.sin(a), hy = l.y * fh + (b.w / 2) * Math.sin(a) + (b.h / 2) * Math.cos(a);
      return Math.hypot(x - hx, y - hy) <= handleR() * 1.8;
    }
    cv.addEventListener('pointerdown', (e) => {
      if (panView) return;
      cv.setPointerCapture(e.pointerId);
      const [x, y] = toCanvas(e); pts.set(e.pointerId, [x, y]);
      if (pickTarget && work) {
        const [sx, sy] = toSource(x, y).map(Math.floor);
        if (sx >= 0 && sy >= 0 && sx < srcW() && sy < srcH()) {
          const c = Array.from(work.getContext('2d').getImageData(sx, sy, 1, 1).data.slice(0, 3));
          if (pickTarget === 'bg') { rmColor = c; updSwatch(); } else { fillColor = c; updEraseUI(); }
          SS.toast('已選取顏色');
        }
        pickTarget = null; $$('#ed-pickc, #ed-pickfill', el).forEach((b) => b.classList.remove('on')); pts.delete(e.pointerId); return;
      }
      if (pts.size === 2) {
        const [a, b] = Array.from(pts.values()); const l = selLayer();
        if (drag && drag.kind === 'erase') { drag = null; }
        pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), ang: Math.atan2(b[1] - a[1], b[0] - a[0]), layer: l && tab !== 'erase' ? l : null, size: l ? l.size : 0, rot: l ? l.rot : 0, scale: S.scale };
        drag = null; return;
      }
      if (tab === 'erase' && work) {
        push(); ensureEditable();
        if (eraseMode === 'rect') { drag = { kind: 'rect' }; rectDrag = [x, y, x, y]; }
        else { drag = { kind: 'erase' }; strokeTo([x, y], [x, y]); draw(); }
        lastP = [x, y]; return;
      }
      if (tab === 'erase' && !work) { SS.toast('消除工具用在匯入的圖片上；文字可以直接在圖層刪除'); return; }
      if (hitHandle(x, y)) { const l = selLayer(); const [fw, fh] = frameSize(); drag = { kind: 'handle', l, cx: l.x * fw, cy: l.y * fh, d0: Math.hypot(x - l.x * fw, y - l.y * fh), a0: Math.atan2(y - l.y * fh, x - l.x * fw), size0: l.size, rot0: l.rot }; return; }
      const hit = hitLayer(x, y);
      if (hit) { if (S.sel !== hit.id) select(hit.id); drag = { kind: 'layer', l: hit }; lastP = [x, y]; return; }
      if (S.sel !== null) { S.sel = null; syncAll(); }
      if (work) { drag = { kind: 'pan' }; lastP = [x, y]; }
      draw();
    });
    cv.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const [x, y] = toCanvas(e); pts.set(e.pointerId, [x, y]);
      if (pinch && pts.size === 2) {
        const [a, b] = Array.from(pts.values()); const k = Math.hypot(a[0] - b[0], a[1] - b[1]) / pinch.d;
        if (pinch.layer) { if (!pinch.pushed) { push(); pinch.pushed = true; } const l = pinch.layer; l.size = Math.max(8, Math.min(400, pinch.size * k)); l.rot = pinch.rot + (Math.atan2(b[1] - a[1], b[0] - a[0]) - pinch.ang) * 180 / Math.PI; clampLayer(l); }
        else if (work && tab !== 'erase') S.scale = Math.max(0.05, Math.min(4, pinch.scale * k));
        draw(); return;
      }
      if (!drag) return;
      const [fw, fh] = frameSize();
      if (!drag.pushed && (drag.kind === 'handle' || drag.kind === 'layer' || drag.kind === 'pan')) { push(); drag.pushed = true; }
      if (drag.kind === 'erase') { strokeTo(lastP, [x, y]); lastP = [x, y]; draw(); return; }
      if (drag.kind === 'rect') { rectDrag[2] = x; rectDrag[3] = y; draw(); return; }
      if (drag.kind === 'handle') { const l = drag.l; const d = Math.hypot(x - drag.cx, y - drag.cy); l.size = Math.max(8, Math.min(400, drag.size0 * d / Math.max(1, drag.d0))); l.rot = drag.rot0 + (Math.atan2(y - drag.cy, x - drag.cx) - drag.a0) * 180 / Math.PI; clampLayer(l); draw(); return; }
      const dx = x - lastP[0], dy = y - lastP[1]; lastP = [x, y];
      if (drag.kind === 'layer') { drag.l.x += dx / fw; drag.l.y += dy / fh; clampLayer(drag.l); }
      else if (drag.kind === 'pan') { S.ox += dx; S.oy += dy; }
      draw();
    });
    const end = (e) => {
      pts.delete(e.pointerId); if (pts.size < 2) pinch = null;
      if (pts.size === 0) {
        if (drag && drag.kind === 'rect') { if (!applyRect()) past.pop(); rectDrag = null; }
        if (drag && (drag.kind === 'handle' || drag.kind === 'layer')) syncAll();
        drag = null; lastP = null; draw();
      }
    };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', (e) => {
      if (panView) return; e.preventDefault(); const l = selLayer();
      if (l && tab !== 'erase') { l.size = Math.max(8, Math.min(400, l.size * (e.deltaY < 0 ? 1.06 : 0.94))); clampLayer(l); syncAll(); }
      else if (work) S.scale = Math.max(0.05, Math.min(4, S.scale * (e.deltaY < 0 ? 1.06 : 0.94)));
      draw();
    }, { passive: false });
    document.addEventListener('keydown', onKey);
    function onKey(e) {
      if (!el.isConnected) return document.removeEventListener('keydown', onKey);
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selLayer()) { e.preventDefault(); $('#ed-del', el) && $('#ed-del', el).click(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); (e.shiftKey ? $('#ed-redo', el) : $('#ed-undo', el)).click(); }
    }

    /* ================= 單色去背 ================= */
    const updSwatch = () => { $('#ed-swatch', el).style.background = `rgb(${rmColor.join(',')})`; };
    $('#ed-tol', el).addEventListener('input', (e) => { $('#ed-tolv', el).textContent = e.target.value; });
    $('#ed-pickc', el).addEventListener('click', (e) => { if (!work) return SS.toast('請先匯入圖片'); pickTarget = pickTarget === 'bg' ? null : 'bg'; e.currentTarget.classList.toggle('on', !!pickTarget); if (pickTarget) SS.toast('請點畫面上要移除的背景顏色'); });
    $('#ed-corner', el).addEventListener('click', () => { if (!work) return; rmColor = Array.from(work.getContext('2d').getImageData(0, 0, 1, 1).data.slice(0, 3)); updSwatch(); });
    $('#ed-rmbg', el).addEventListener('click', () => {
      if (!work) return SS.toast('請先匯入圖片');
      push(); const out = SS.removeColor(work, rmColor, +$('#ed-tol', el).value, $('#ed-edge', el).checked);
      work = out.canvas; draw(); SS.toast(`已移除 ${out.removed.toLocaleString()} 個像素（可按還原）`);
    });
    $('#ed-restore', el).addEventListener('click', () => { if (!srcCanvas || work === srcCanvas) return; push(); work = srcCanvas; draw(); });

    /* ================= 輸出 ================= */
    $('#ed-bg', el).addEventListener('change', (e) => { push(); S.bg = e.target.value; $('#ed-bgc-wrap', el).hidden = S.bg !== 'color'; draw(); });
    $('#ed-bgc', el).addEventListener('input', (e) => { S.bgColor = e.target.value; draw(); });
    const exportBlob = async () => {
      if (document.fonts && document.fonts.ready) { await Promise.all(S.layers.filter((l) => l.type === 'text' && l.content).map((l) => document.fonts.load(fontStr(l, 40), l.content).catch(() => {}))); }
      clampAll(); draw(true); const b = await SS.canvasToBlob(cv); draw();
      $('#ed-outinfo', el).textContent = `PNG ${cv.width}×${cv.height}，${SS.fmtBytes(b.size)}${b.size > SS.LINE_SPEC.maxFileBytes ? '（超過 LINE 單張 1MB 限制）' : ''}`; return b;
    };
    const fname = () => ($('#ed-name', el).value.trim() || 'my-sticker').replace(/[\\/:*?"<>|]/g, '_') + '.png';
    $('#ed-dl', el).addEventListener('click', async () => { SS.download(await exportBlob(), fname()); });
    $('#ed-share', el).addEventListener('click', async () => { SS.shareBlob(await exportBlob(), fname()); });
    $('#ed-save', el).addEventListener('click', async () => {
      try { await SS.saveSticker(await exportBlob(), $('#ed-name', el).value.trim() || '我的貼圖', opts.textMode || !work ? '文字貼圖' : '未分類'); SS.toast('已存到「我的貼圖收藏」💗'); }
      catch (e) { SS.toast('儲存失敗：' + e.message); }
    });
    $('#ed-toline', el).addEventListener('click', async () => { SS.handoff = { blob: await exportBlob(), name: fname() }; location.hash = '#line'; });

    /* 測試用：唯讀狀態快照 */
    SS._editorState = () => JSON.parse(JSON.stringify(S));

    /* ================= 啟動 ================= */
    langNote(); updEraseUI(); updSwatch();
    const pendText = SS.ls.get('pendingText', ''); if (pendText) SS.ls.set('pendingText', '');
    if (SS.handoffEditor) {
      const b = SS.handoffEditor; SS.handoffEditor = null;
      const img = new Image(); const u = URL.createObjectURL(b.blob);
      img.onload = () => { loadSource(img); URL.revokeObjectURL(u); $('#ed-name', el).value = (b.name || 'my-sticker').replace(/\.png$/, ''); }; img.src = u;
    } else if (opts.textMode) {
      $('#ed-name', el).value = 'text-sticker'; startBlank(pendText);
      if (!pendText) { const l = S.layers[0]; if (l) { const [c, s] = pick(PALETTE.slice(1, 6)); l.color = c; l.stroke = s; draw(); syncAll(); } }
    } else if (pendText) {
      S.layers = []; addText(pendText, {}, false);
      SS.toast('已帶入文字「' + pendText + '」，請匯入圖片或用空白畫布');
    }
    switchTab(tab);
  }
  SS.mountEditor = mountEditor;

  SS.views.editor = { title: '✂️ 貼圖加工室', render: (el) => mountEditor(el, {}) };
  SS.views.textsticker = { title: '🔤 純文字貼圖', render: (el) => mountEditor(el, { textMode: true }) };

  /* 周圍延伸填補：以框外一圈的顏色往內做調和延伸（簡易修補，非 AI） */
  SS.healRect = function (canvas, x, y, w, h) {
    const c = canvas.getContext('2d');
    const X = Math.max(0, x - 1), Y = Math.max(0, y - 1), W = Math.min(canvas.width, x + w + 1) - X, H = Math.min(canvas.height, y + h + 1) - Y;
    const k = Math.min(1, Math.sqrt(40000 / (W * H)));
    const sw = Math.max(3, Math.round(W * k)), sh = Math.max(3, Math.round(H * k));
    const tmp = document.createElement('canvas'); tmp.width = sw; tmp.height = sh; const t = tmp.getContext('2d');
    t.imageSmoothingQuality = 'high'; t.drawImage(canvas, X, Y, W, H, 0, 0, sw, sh);
    const id = t.getImageData(0, 0, sw, sh), d = id.data;
    const inner = (i, j) => i > 0 && j > 0 && i < sw - 1 && j < sh - 1;
    // 以邊框平均色初始化，再反覆以上下左右平均（Jacobi 迭代）
    const avg = [0, 0, 0, 0]; let n = 0;
    for (let i = 0; i < sw; i++) for (let j = 0; j < sh; j++) if (!inner(i, j)) { const p = (j * sw + i) * 4; for (let q = 0; q < 4; q++) avg[q] += d[p + q]; n++; }
    for (let i = 1; i < sw - 1; i++) for (let j = 1; j < sh - 1; j++) { const p = (j * sw + i) * 4; for (let q = 0; q < 4; q++) d[p + q] = avg[q] / n; }
    const f = new Float32Array(d);
    for (let it = 0; it < 400; it++) {
      for (let j = 1; j < sh - 1; j++) for (let i = 1; i < sw - 1; i++) {
        const p = (j * sw + i) * 4;
        for (let q = 0; q < 4; q++) f[p + q] = (f[p - 4 + q] + f[p + 4 + q] + f[p - sw * 4 + q] + f[p + sw * 4 + q]) / 4;
      }
    }
    for (let p = 0; p < d.length; p++) d[p] = f[p];
    t.putImageData(id, 0, 0);
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip(); c.clearRect(x, y, w, h); c.imageSmoothingQuality = 'high'; c.drawImage(tmp, X, Y, W, H); c.restore();
  };

  /* 單色去背（沿用 v1.0 演算法） */
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
    if (!edgeOnly) { for (let p = 0; p < w * h; p++) apply(p); }
    else {
      const seen = new Uint8Array(w * h); const stack = new Int32Array(w * h); let sp = 0;
      const seed = (p) => { if (!seen[p]) { seen[p] = 1; stack[sp++] = p; } };
      for (let x = 0; x < w; x++) { seed(x); seed((h - 1) * w + x); }
      for (let y = 0; y < h; y++) { seed(y * w); seed(y * w + w - 1); }
      while (sp) {
        const p = stack[--sp]; if (!apply(p)) continue;
        const x = p % w;
        if (x > 0) seed(p - 1); if (x < w - 1) seed(p + 1);
        if (p >= w) seed(p - w); if (p < w * (h - 1)) seed(p + w);
      }
    }
    c.putImageData(id, 0, 0);
    return { canvas: out, removed };
  };
})();
