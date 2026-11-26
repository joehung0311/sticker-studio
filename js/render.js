/* 共用貼圖繪製引擎（v1.3）：字型、文字排版、裝飾、限制在輸出範圍內 */
(function () {
  const FB = '"PingFang TC","Noto Sans TC","Microsoft JhengHei","Apple SD Gothic Neo","Hiragino Sans","SS Huninn",sans-serif'; // 粉圓收錄罕用台語字（如 𪜶），作為缺字備援
  SS.FONTS = [
    { id: 'round', name: '可愛圓體（粉圓）', prompt: '可愛圓體', en: 'cute rounded', family: `"SS Huninn",${FB}`, weight: 400 },
    { id: 'hand', name: '手寫字體（霞鶩文楷）', prompt: '手寫字', en: 'handwritten', family: `"SS LXGW WenKai TC",${FB}`, weight: 400 },
    { id: 'kid', name: '童趣手寫（芫荽）', prompt: '童趣手寫', en: 'playful handwriting', family: `"SS Iansui",${FB}`, weight: 400 },
    { id: 'comic', name: '搞笑漫畫（Chiron 粗圓）', prompt: '搞笑漫畫字', en: 'bold comic', family: `"SS Chiron GoRound TC",${FB}`, weight: 900 },
    { id: 'bold', name: '粗體字（思源黑體 Black）', prompt: '超粗黑體', en: 'extra-bold sans-serif', family: `"SS Noto Sans TC Black",${FB}`, weight: 900 },
    { id: 'retro', name: '復古字體（仙人掌明體）', prompt: '復古明體', en: 'retro serif', family: `"SS Cactus Classical Serif","Noto Serif TC","PMingLiU","SS Huninn",serif`, weight: 400 },
    { id: 'sans', name: '標準黑體（系統字型）', prompt: '標準黑體', en: 'clean sans-serif', family: FB, weight: 700 }
  ];
  SS.fontOf = (id) => SS.FONTS.find((f) => f.id === id) || SS.FONTS[0];
  /* 配色：[文字色, 描邊色, 名稱, 英文] */
  SS.PALETTE = [
    ['#FFFFFF', '#5A3E2B', '白字＋咖啡色描邊', 'white with dark brown outline'], ['#F59E6C', '#FFFFFF', '蜜桃橘字＋白色描邊', 'peach orange with white outline'],
    ['#FFFFFF', '#E8484A', '白字＋紅色描邊', 'white with red outline'], ['#5A3E2B', '#FFFFFF', '深咖啡字＋白色描邊', 'dark brown with white outline'],
    ['#FFD45E', '#5A3E2B', '黃字＋咖啡色描邊', 'yellow with brown outline'], ['#7FA8E8', '#FFFFFF', '天空藍字＋白色描邊', 'sky blue with white outline'],
    ['#FFFFFF', '#6F9466', '白字＋綠色描邊', 'white with green outline'], ['#F2707A', '#FFFFFF', '粉紅字＋白色描邊', 'pink with white outline'],
    ['#3B2A1E', '#FFE3D2', '深咖啡字＋淡粉描邊', 'dark brown with pale pink outline'], ['#FFFFFF', '#8D6FC4', '白字＋紫色描邊', 'white with purple outline']
  ];
  SS.TEXT_POS = {
    tl: ['左上角', 0.22, 0.16, 'top-left corner'], top: ['主角上方', 0.5, 0.15, 'above the character'], tr: ['右上角', 0.78, 0.16, 'top-right corner'],
    left: ['左側', 0.2, 0.5, 'left side'], mid: ['中間', 0.5, 0.5, 'center'], right: ['右側', 0.8, 0.5, 'right side'],
    bl: ['左下角', 0.22, 0.85, 'bottom-left corner'], bottom: ['主角下方', 0.5, 0.86, 'below the character'], br: ['右下角', 0.78, 0.85, 'bottom-right corner']
  };
  SS.textDefaults = () => ({ type: 'text', content: '', font: 'round', size: 56, color: '#FFFFFF', stroke: '#5A3E2B', strokeW: 8, shadow: false, shadowColor: 'rgba(0,0,0,0.35)', rot: 0, ls: 0, lh: 1.15, vertical: false, x: 0.5, y: 0.85 });

  const fontStr = (l, size = l.size) => { const f = SS.fontOf(l.font); return `${f.weight} ${size}px ${f.family}`; };
  const pending = new Set();
  /* 確保網頁字型已下載；完成後呼叫 redraw */
  function ensureFont(l, redraw) {
    if (!document.fonts || !document.fonts.load || !l.content) return;
    const key = l.font + '|' + l.content; if (pending.has(key)) return; pending.add(key);
    document.fonts.load(fontStr(l, 40), l.content).then(() => { if (redraw) redraw(); }).catch(() => {});
  }
  function layout(ctx, l) {
    ctx.save(); ctx.font = fontStr(l);
    const lines = (l.content || '').split('\n'); const glyphs = []; const step = l.size * l.lh; let w = 0, h = 0;
    if (!l.vertical) {
      const widths = lines.map((ln) => { const cs = Array.from(ln); return cs.reduce((s, c) => s + ctx.measureText(c).width, 0) + Math.max(0, cs.length - 1) * l.ls; });
      w = Math.max(0, ...widths); h = lines.length * step;
      lines.forEach((ln, i) => { let x = -widths[i] / 2; const y = -h / 2 + step * (i + 0.5); Array.from(ln).forEach((c) => { const cw = ctx.measureText(c).width; glyphs.push({ c, x: x + cw / 2, y }); x += cw + l.ls; }); });
    } else {
      const adv = l.size + l.ls; const cols = lines.map((ln) => Array.from(ln)); const maxLen = Math.max(0, ...cols.map((c) => c.length));
      w = cols.length * step; h = maxLen * adv - (maxLen ? l.ls : 0);
      cols.forEach((cs, i) => { const x = w / 2 - step * (i + 0.5); cs.forEach((c, j) => glyphs.push({ c, x, y: -h / 2 + adv * j + l.size / 2 })); });
    }
    ctx.restore();
    return { glyphs, w: Math.max(w, 1), h: Math.max(h, 1) };
  }
  function box(ctx, l) {
    if (l.type === 'text') { const L = layout(ctx, l); const pad = l.strokeW + 4; return { w: L.w + pad * 2, h: L.h + pad * 2, L }; }
    return { w: l.size, h: l.size };
  }
  /* 讓圖層完整留在 fw×fh 範圍內（必要時縮小） */
  function clamp(ctx, l, fw, fh) {
    for (let k = 0; k < 3; k++) {
      const b = box(ctx, l); const a = l.rot * Math.PI / 180;
      const hw = (Math.abs(b.w * Math.cos(a)) + Math.abs(b.h * Math.sin(a))) / 2;
      const hh = (Math.abs(b.w * Math.sin(a)) + Math.abs(b.h * Math.cos(a))) / 2;
      const over = Math.max(hw * 2 / fw, hh * 2 / fh);
      if (over > 1.001 && (l.content || l.type === 'deco')) { l.size = Math.max(8, Math.floor(l.size / over)); if (l.type === 'text') l.strokeW = Math.min(l.strokeW, Math.max(0, Math.round(l.size / 4))); continue; }
      l.x = Math.min(Math.max(l.x, hw / fw), 1 - hw / fw); l.y = Math.min(Math.max(l.y, hh / fh), 1 - hh / fh);
      break;
    }
  }
  function draw(ctx, l, fw, fh, redraw) {
    ctx.save(); ctx.translate(l.x * fw, l.y * fh); ctx.rotate(l.rot * Math.PI / 180);
    if (l.type === 'text') {
      if (l.content) {
        ensureFont(l, redraw);
        const { glyphs } = layout(ctx, l);
        ctx.font = fontStr(l); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round'; ctx.miterLimit = 2;
        const sh = () => { if (l.shadow) { ctx.shadowColor = l.shadowColor; ctx.shadowBlur = l.size * 0.1; ctx.shadowOffsetX = l.size * 0.05; ctx.shadowOffsetY = l.size * 0.07; } };
        if (l.strokeW > 0) { ctx.save(); sh(); ctx.strokeStyle = l.stroke; ctx.lineWidth = l.strokeW * 2; glyphs.forEach((g) => ctx.strokeText(g.c, g.x, g.y)); ctx.restore(); }
        ctx.save(); if (l.strokeW <= 0) sh(); ctx.fillStyle = l.color; glyphs.forEach((g) => ctx.fillText(g.c, g.x, g.y)); ctx.restore();
      }
    } else {
      const d = SS.decoById[l.kind]; const img = SS.decoImage(l.kind, d.colorable ? l.color : '', redraw);
      if (img) ctx.drawImage(img, -l.size / 2, -l.size / 2, l.size, l.size);
    }
    ctx.restore();
  }
  /* 依現有圖層，找一個不擋字、離主角遠的位置放裝飾 */
  function freeSpot(ctx, layers, fw, fh, size, subject) {
    const boxes = layers.map((l) => { const b = box(ctx, l); return { x: l.x * fw, y: l.y * fh, w: b.w, h: b.h }; });
    const sb = subject || { x0: 0, y0: 0, x1: fw, y1: fh }; const cx = (sb.x0 + sb.x1) / 2, cy = (sb.y0 + sb.y1) / 2;
    const cands = SS.shuffle([[0.14, 0.16], [0.86, 0.16], [0.12, 0.5], [0.88, 0.5], [0.14, 0.84], [0.86, 0.84], [0.32, 0.12], [0.68, 0.12], [0.32, 0.9], [0.68, 0.9]]);
    let best = [0.86, 0.16], bestScore = -Infinity;
    cands.forEach(([x, y]) => {
      const px = x * fw, py = y * fh; let score = Math.hypot(px - cx, py - cy) * 0.3;
      boxes.forEach((b) => { const dx = Math.max(0, Math.abs(px - b.x) - (b.w + size) / 2), dy = Math.max(0, Math.abs(py - b.y) - (b.h + size) / 2); score += Math.min(200, Math.hypot(dx, dy)); if (!dx && !dy) score -= 500; });
      if (score > bestScore) { bestScore = score; best = [x, y]; }
    });
    return best;
  }
  /* 依設定組出文字貼圖圖層（製作流程與批次輸出共用） */
  function buildTextLayers(ctx, fw, fh, o) {
    // o: { text, text2, font, colorIdx, color, stroke, strokeW, shadow, pos, vertical, sizeRatio, decos:[ids], decoCount }
    const layers = []; let nid = 1;
    const pal = SS.PALETTE[o.colorIdx || 0] || SS.PALETTE[0];
    if (o.text) {
      const l = Object.assign(SS.textDefaults(), { id: nid++, content: o.text, font: o.font || 'round', color: o.color || pal[0], stroke: o.stroke || pal[1], shadow: !!o.shadow, vertical: !!o.vertical });
      l.size = Math.round(Math.min(fw, fh) * (o.sizeRatio || 0.24)); l.strokeW = o.strokeW !== undefined ? o.strokeW : Math.max(3, Math.round(l.size / 9));
      const p = SS.TEXT_POS[o.pos || 'mid'] || SS.TEXT_POS.mid; l.x = p[1]; l.y = p[2]; clamp(ctx, l, fw, fh); layers.push(l);
    }
    if (o.text2) {
      const m = layers[0];
      const l = Object.assign(SS.textDefaults(), { id: nid++, content: o.text2, font: o.font || 'round', color: m ? m.stroke : pal[1], stroke: m ? m.color : pal[0], shadow: false });
      l.size = Math.round((m ? m.size : Math.min(fw, fh) * 0.2) * 0.45); l.strokeW = Math.max(2, Math.round(l.size / 8));
      l.x = 0.5; l.y = m && m.y < 0.5 ? 0.88 : 0.14; clamp(ctx, l, fw, fh); layers.push(l);
    }
    const decos = (o.decos || []).slice(0, 3);
    decos.forEach((k) => {
      const d = SS.decoById[k]; if (!d) return; const size = Math.round(Math.min(fw, fh) * 0.2);
      const [x, y] = freeSpot(ctx, layers, fw, fh, size);
      const l = { id: nid++, type: 'deco', kind: k, size, rot: Math.round(Math.random() * 30 - 15), color: d.color, x, y }; clamp(ctx, l, fw, fh); layers.push(l);
    });
    return layers;
  }
  /* 繪成一張 canvas；回傳 Promise（等字型與裝飾圖載入） */
  async function renderToCanvas(w, h, layers, bg, base) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d');
    if (document.fonts) await Promise.all(layers.filter((l) => l.type === 'text' && l.content).map((l) => document.fonts.load(fontStr(l, 40), l.content).catch(() => {})));
    await Promise.all(layers.filter((l) => l.type === 'deco').map((l) => new Promise((res) => { const d = SS.decoById[l.kind]; if (SS.decoImage(l.kind, d.colorable ? l.color : '', res)) res(); })));
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
    if (base) ctx.drawImage(base, 0, 0, w, h);
    layers.forEach((l) => draw(ctx, l, w, h));
    return cv;
  }
  SS.R = { fontStr, ensureFont, layout, box, clamp, draw, freeSpot, buildTextLayers, renderToCanvas };
})();
