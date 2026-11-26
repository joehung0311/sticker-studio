/* 貼圖裝飾素材庫：全部為原創 SVG（v1.2） */
(function () {
  const O = '#5A3E2B'; // 外框色
  const W = 4;         // 外框粗細
  /* [id, 名稱, 可變色?, 預設色, svg(color) ] viewBox 0 0 100 100 */
  const L = [
    ['heart', '愛心', true, '#F2707A', (c) => `<path d="M50 88C20 66 7 49 7 32 7 18 18 8 31 8c9 0 15 5 19 12 4-7 10-12 19-12 13 0 24 10 24 24 0 17-13 34-43 56z" fill="${c}" stroke="${O}" stroke-width="${W}" stroke-linejoin="round"/><ellipse cx="28" cy="27" rx="7" ry="4.5" fill="#fff" opacity=".7" transform="rotate(-30 28 27)"/>`],
    ['bow', '蝴蝶結', true, '#F59EB5', (c) => `<path d="M50 50L12 26c-6-3-9 1-9 6v36c0 5 3 9 9 6zM50 50l38-24c6-3 9 1 9 6v36c0 5-3 9-9 6z" fill="${c}" stroke="${O}" stroke-width="${W}" stroke-linejoin="round"/><path d="M44 54l-10 32 10-4 6 8 4-36M56 54l10 32-10-4-6 8" fill="${c}" stroke="${O}" stroke-width="${W}" stroke-linejoin="round"/><circle cx="50" cy="50" r="10" fill="${c}" stroke="${O}" stroke-width="${W}"/>`],
    ['star', '星星', true, '#FFD45E', (c) => `<path d="M50 6l12.6 27.4 29.9 3.3-22.3 20.2 6.2 29.5L50 71.3 23.6 86.4l6.2-29.5L7.5 36.7l29.9-3.3z" fill="${c}" stroke="${O}" stroke-width="${W}" stroke-linejoin="round"/>`],
    ['sparkle', '閃亮光芒', true, '#FFD45E', (c) => `<path d="M42 6q5 30 34 36-29 6-34 36-5-30-34-36 29-6 34-36z" fill="${c}" stroke="${O}" stroke-width="${W}" stroke-linejoin="round"/><path d="M80 58q2.5 12 13 15-10.5 3-13 15-2.5-12-13-15 10.5-3 13-15z" fill="${c}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>`],
    ['flower', '小花', true, '#F7A6C1', (c) => `<g fill="${c}" stroke="${O}" stroke-width="${W}">${[0, 72, 144, 216, 288].map((a) => `<circle cx="50" cy="26" r="16" transform="rotate(${a} 50 50)"/>`).join('')}</g><circle cx="50" cy="50" r="13" fill="#FFD45E" stroke="${O}" stroke-width="${W}"/>`],
    ['note', '音符', true, '#7FA8E8', (c) => `<path d="M38 74V20l46-10v52" fill="none" stroke="${O}" stroke-width="7" stroke-linejoin="round"/><path d="M38 20l46-10v14L38 34z" fill="${c}" stroke="${O}" stroke-width="${W}" stroke-linejoin="round"/><ellipse cx="27" cy="76" rx="15" ry="11" fill="${c}" stroke="${O}" stroke-width="${W}"/><ellipse cx="73" cy="64" rx="15" ry="11" fill="${c}" stroke="${O}" stroke-width="${W}"/>`],
    ['sweat', '汗滴', true, '#8CCBF0', (c) => `<path d="M50 6S82 48 82 66a32 32 0 0 1-64 0C18 48 50 6 50 6z" fill="${c}" stroke="${O}" stroke-width="${W}"/><path d="M34 64a16 16 0 0 0 10 16" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".8"/>`],
    ['tear', '淚滴', true, '#6FB6EA', (c) => `<path d="M34 8S56 38 56 52a22 22 0 0 1-44 0C12 38 34 8 34 8z" fill="${c}" stroke="${O}" stroke-width="${W}"/><path d="M72 44s16 22 16 32a16 16 0 0 1-32 0c0-10 16-32 16-32z" fill="${c}" stroke="${O}" stroke-width="${W}"/>`],
    ['anger', '生氣符號', true, '#E8484A', (c) => `<g fill="none" stroke="${c}" stroke-width="11" stroke-linecap="round">${[0, 90, 180, 270].map((a) => `<path d="M40 14q0 24-24 26" transform="rotate(${a} 50 50)"/>`).join('')}</g>`],
    ['question', '問號', true, '#7FA8E8', (c) => `<path d="M30 34c0-14 10-24 22-24s22 9 22 21c0 16-18 18-18 32v4" fill="none" stroke="${O}" stroke-width="22" stroke-linecap="round"/><path d="M30 34c0-14 10-24 22-24s22 9 22 21c0 16-18 18-18 32v4" fill="none" stroke="${c}" stroke-width="13" stroke-linecap="round"/><circle cx="56" cy="88" r="9" fill="${c}" stroke="${O}" stroke-width="${W}"/>`],
    ['exclaim', '驚嘆號', true, '#F2707A', (c) => `<path d="M38 10h24l-5 56H43z" fill="${c}" stroke="${O}" stroke-width="${W}" stroke-linejoin="round"/><circle cx="50" cy="84" r="10" fill="${c}" stroke="${O}" stroke-width="${W}"/>`],
    ['bubble', '對話框', true, '#FFFFFF', (c) => `<path d="M14 12h72a8 8 0 0 1 8 8v44a8 8 0 0 1-8 8H44L24 90l4-18H14a8 8 0 0 1-8-8V20a8 8 0 0 1 8-8z" fill="${c}" stroke="${O}" stroke-width="${W}" stroke-linejoin="round"/>`],
    ['ribbon', '彩帶', false, '', () => `<g fill="none" stroke-width="7" stroke-linecap="round"><path d="M10 20q12 10 4 22t6 24" stroke="#F2707A"/><path d="M50 8q12 10 4 22t6 24" stroke="#7FA8E8"/><path d="M86 22q12 10 4 22t6 24" stroke="#8FC28A"/></g><g stroke="${O}" stroke-width="2"><rect x="28" y="70" width="9" height="13" rx="2" fill="#FFD45E" transform="rotate(25 32 76)"/><rect x="66" y="74" width="9" height="13" rx="2" fill="#C9B8E8" transform="rotate(-30 70 80)"/><circle cx="46" cy="88" r="5" fill="#F59EB5"/><circle cx="18" cy="84" r="4" fill="#8CCBF0"/></g>`],
    ['crown', '小皇冠', true, '#FFC93C', (c) => `<path d="M10 78L6 30l24 20 20-34 20 34 24-20-4 48z" fill="${c}" stroke="${O}" stroke-width="${W}" stroke-linejoin="round"/><rect x="10" y="74" width="80" height="12" rx="4" fill="${c}" stroke="${O}" stroke-width="${W}"/><circle cx="50" cy="60" r="7" fill="#F2707A" stroke="${O}" stroke-width="3"/><circle cx="28" cy="64" r="5" fill="#7FA8E8" stroke="${O}" stroke-width="3"/><circle cx="72" cy="64" r="5" fill="#8FC28A" stroke="${O}" stroke-width="3"/>`],
    ['fire', '火焰', false, '', () => `<path d="M50 94c-22 0-36-14-36-32 0-20 16-28 18-46 10 8 14 18 12 28 6-4 10-12 10-20 16 12 28 26 28 40 0 18-12 30-32 30z" fill="#FF7A3D" stroke="${O}" stroke-width="${W}" stroke-linejoin="round"/><path d="M50 90c-11 0-18-7-18-17 0-9 8-14 10-24 8 6 12 12 11 20 4-2 7-6 8-10 6 6 8 12 8 16 0 9-8 15-19 15z" fill="#FFD45E"/>`],
    ['cloud', '雲朵', true, '#FFFFFF', (c) => `<path d="M26 78a18 18 0 0 1-2-36 22 22 0 0 1 40-12 16 16 0 0 1 24 14 17 17 0 0 1-4 34z" fill="${c}" stroke="${O}" stroke-width="${W}" stroke-linejoin="round"/>`],
    ['paw', '腳印', true, '#C49A7A', (c) => `<g fill="${c}" stroke="${O}" stroke-width="${W}"><path d="M50 50c14 0 26 14 26 26 0 10-8 14-14 14-5 0-8-3-12-3s-7 3-12 3c-6 0-14-4-14-14 0-12 12-26 26-26z"/><ellipse cx="22" cy="42" rx="9" ry="12" transform="rotate(-20 22 42)"/><ellipse cx="39" cy="22" rx="9" ry="12" transform="rotate(-8 39 22)"/><ellipse cx="61" cy="22" rx="9" ry="12" transform="rotate(8 61 22)"/><ellipse cx="78" cy="42" rx="9" ry="12" transform="rotate(20 78 42)"/></g>`],
    ['smile', '笑臉', true, '#FFD45E', (c) => `<circle cx="50" cy="50" r="42" fill="${c}" stroke="${O}" stroke-width="${W}"/><path d="M30 44q6-10 12 0M58 44q6-10 12 0" fill="none" stroke="${O}" stroke-width="5" stroke-linecap="round"/><path d="M30 58q20 26 40 0z" fill="#E86A5A" stroke="${O}" stroke-width="4" stroke-linejoin="round"/><ellipse cx="24" cy="58" rx="6" ry="4" fill="#F2707A" opacity=".6"/><ellipse cx="76" cy="58" rx="6" ry="4" fill="#F2707A" opacity=".6"/>`]
  ];
  SS.DECOS = L.map(([id, name, colorable, color, svg]) => ({ id, name, colorable, color, svg }));
  SS.decoById = Object.fromEntries(SS.DECOS.map((d) => [d.id, d]));
  SS.decoSVG = (id, color) => { const d = SS.decoById[id]; return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="200" height="200">${d.svg(color || d.color)}</svg>`; };
  SS.decoURL = (id, color) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(SS.decoSVG(id, color));

  /* 圖片快取：載入完成後呼叫 onReady 重新繪製 */
  const cache = new Map();
  SS.decoImage = function (id, color, onReady) {
    const key = id + '|' + (color || '');
    let e = cache.get(key);
    if (!e) {
      const img = new Image(); e = { img, ok: false, wait: [] }; cache.set(key, e);
      img.onload = () => { e.ok = true; e.wait.splice(0).forEach((f) => f()); };
      img.src = SS.decoURL(id, color);
    }
    if (!e.ok && onReady) e.wait.push(onReady);
    return e.ok ? e.img : null;
  };
})();
