/* 核心工具：DOM、儲存、剪貼簿、下載、提示詞產生器 */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  Object.assign(SS, { $, $$, esc, pick, shuffle, uid });

  /* ---------- Toast ---------- */
  SS.toast = function (msg, ms = 2200) {
    let box = $('#toast');
    box.textContent = msg;
    box.classList.add('show');
    clearTimeout(SS._toastT);
    SS._toastT = setTimeout(() => box.classList.remove('show'), ms);
  };

  /* ---------- Modal ---------- */
  SS.modal = function (html, { onOpen } = {}) {
    const wrap = $('#modal');
    $('#modal-body').innerHTML = html;
    wrap.hidden = false;
    requestAnimationFrame(() => wrap.classList.add('open'));
    if (onOpen) onOpen($('#modal-body'));
  };
  SS.closeModal = function () {
    const wrap = $('#modal');
    if (SS._modalCancel) { const c = SS._modalCancel; SS._modalCancel = null; c(); }
    wrap.classList.remove('open');
    setTimeout(() => { wrap.hidden = true; $('#modal-body').innerHTML = ''; }, 180);
  };

  /* 頁內確認框（取代 confirm/prompt，手機與嵌入環境都能用） */
  SS.confirmBox = (msg) => new Promise((res) => {
    let done = false; const fin = (v) => { if (!done) { done = true; res(v); SS.closeModal(); } };
    SS.modal(`<h3>${esc(msg)}</h3><div class="btn-row"><button class="btn danger" id="cb-ok">確定</button><button class="btn ghost" id="cb-no">取消</button></div>`, {
      onOpen(b) { $('#cb-ok', b).onclick = () => fin(true); $('#cb-no', b).onclick = () => fin(false); SS._modalCancel = () => { if (!done) { done = true; res(false); } }; }
    });
  });
  SS.askText = (msg, def = '') => new Promise((res) => {
    let done = false; const fin = (v) => { if (!done) { done = true; res(v); SS.closeModal(); } };
    SS.modal(`<h3>${esc(msg)}</h3><input id="at-in" value="${esc(def)}" maxlength="20"><div class="btn-row"><button class="btn primary" id="at-ok">確定</button><button class="btn ghost" id="at-no">取消</button></div>`, {
      onOpen(b) { $('#at-ok', b).onclick = () => fin($('#at-in', b).value.trim()); $('#at-no', b).onclick = () => fin(null); SS._modalCancel = () => { if (!done) { done = true; res(null); } }; }
    });
  });

  /* ---------- LocalStorage（小型設定） ---------- */
  SS.ls = {
    get(k, d) { try { const v = localStorage.getItem('ss_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('ss_' + k, JSON.stringify(v)); return true; } catch (e) { SS.toast('儲存空間不足或瀏覽器不允許儲存'); return false; } }
  };

  /* ---------- IndexedDB（圖片收藏） ---------- */
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      if (!('indexedDB' in window)) return rej(new Error('此瀏覽器不支援 IndexedDB'));
      const r = indexedDB.open('sticker-studio', 1);
      r.onupgradeneeded = () => { const d = r.result; if (!d.objectStoreNames.contains('stickers')) d.createObjectStore('stickers', { keyPath: 'id' }); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  function tx(mode, fn) {
    return db().then((d) => new Promise((res, rej) => {
      const t = d.transaction('stickers', mode); const st = t.objectStore('stickers');
      const out = fn(st);
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
    }));
  }
  SS.idb = {
    put: (item) => tx('readwrite', (s) => s.put(item)),
    del: (id) => tx('readwrite', (s) => s.delete(id)),
    all: () => tx('readonly', (s) => s.getAll()).then((r) => (r || []).sort((a, b) => b.created - a.created)),
    get: (id) => tx('readonly', (s) => s.get(id))
  };
  SS.saveSticker = async function (blob, name, category = '未分類') {
    const item = { id: uid(), name: name || '我的貼圖', category, blob, type: blob.type, created: Date.now() };
    await SS.idb.put(item);
    return item;
  };

  /* ---------- 角色設定 ---------- */
  SS.chars = {
    list: () => SS.ls.get('characters', []),
    save(c) { const l = SS.chars.list(); const i = l.findIndex((x) => x.id === c.id); if (i >= 0) l[i] = c; else l.unshift(c); SS.ls.set('characters', l); },
    remove(id) { SS.ls.set('characters', SS.chars.list().filter((x) => x.id !== id)); }
  };
  /* 目前草稿（跨頁共用） */
  SS.draft = {
    get: () => Object.assign(SS.defaultDraft(), SS.ls.get('draft', {})),
    set(patch) { SS.ls.set('draft', Object.assign(SS.draft.get(), patch)); }
  };
  SS.defaultDraft = () => ({
    name: '', charType: '貓咪', customType: '', appearance: '', hair: '', outfit: '', colors: '奶油白＋蜜桃橘',
    text2: '', design: null,
    personality: '元氣滿滿', expression: '開心大笑', action: '揮手打招呼', prop: '無',
    style: 'qban', customStyle: '', text: '早安', noText: false, aiText: true, transparent: true
  });

  /* ---------- 剪貼簿 ---------- */
  SS.copy = async function (text, okMsg = '已複製到剪貼簿') {
    try {
      if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); SS.toast(okMsg); return true; }
    } catch (e) { /* fallback */ }
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    SS.toast(ok ? okMsg : '無法自動複製，請長按文字手動複製');
    return ok;
  };

  /* ---------- 下載 ---------- */
  /* 在 Claude 預覽環境中改用 downloads 能力；一般網站用 <a download> */
  SS._dlNs = null;
  try { if (window.claude && typeof window.claude.use === 'function') window.claude.use('downloads').then((ns) => { SS._dlNs = ns; }).catch(() => {}); } catch (e) { /* 一般網站 */ }
  SS.download = function (blobOrUrl, filename) {
    if (SS._dlNs && typeof blobOrUrl !== 'string') {
      SS._dlNs.save({ filename, data: blobOrUrl }).catch((e) => { if (e && e.code !== 'declined') SS.toast('無法下載：' + (e.message || e.code)); });
      return;
    }
    const url = typeof blobOrUrl === 'string' ? blobOrUrl : URL.createObjectURL(blobOrUrl);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    if (typeof blobOrUrl !== 'string') setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  SS.downloadText = (text, filename, type = 'text/plain') => SS.download(new Blob(['﻿' + text], { type: type + ';charset=utf-8' }), filename);

  /* 分享圖片（不支援時改下載） */
  SS.shareBlob = async function (blob, filename) {
    try {
      const file = new File([blob], filename, { type: blob.type || 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: '今天貼什麼？貼圖' });
        return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    SS.download(blob, filename);
    SS.toast('此裝置不支援直接分享，已改為下載圖片');
  };

  /* ---------- 圖片工具 ---------- */
  SS.fileToImage = function (file) {
    return new Promise((res, rej) => {
      if (!file || !/^image\//.test(file.type)) return rej(new Error('請選擇圖片檔（JPG、PNG、WebP）'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => res({ img, url });
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('圖片讀取失敗，格式可能不支援')); };
      img.src = url;
    });
  };
  SS.canvasToBlob = (cv, type = 'image/png') => new Promise((res) => cv.toBlob(res, type));
  SS.fmtBytes = (n) => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : (n / 1048576).toFixed(2) + ' MB';
  SS.ts = () => { const d = new Date(); const p = (x) => String(x).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`; };

  /* ---------- 提示詞產生器 ---------- */
  SS.styleOf = (id) => SS.STYLES.find((s) => s.id === id);
  SS.styleText = (d) => d.style === 'custom' ? (d.customStyle || '使用者自訂畫風') : (SS.styleOf(d.style) || SS.STYLES[0]).prompt;
  SS.styleName = (d) => d.style === 'custom' ? '自訂：' + (d.customStyle || '未填寫') : (SS.styleOf(d.style) || SS.STYLES[0]).name;

  SS.charSummary = function (d) {
    const type = d.charType === '自訂角色' ? (d.customType || '原創角色') : d.charType;
    const parts = [`角色類型：${type}`];
    if (d.name) parts.push(`角色名稱：${d.name}`);
    if (d.appearance) parts.push(`外貌特徵：${d.appearance}`);
    if (d.hair) parts.push(`髮型／毛色：${d.hair}`);
    if (d.outfit) parts.push(`服裝：${d.outfit}`);
    if (d.colors) parts.push(`主要配色：${d.colors}`);
    if (d.personality) parts.push(`個性：${d.personality}`);
    return parts;
  };

  /* 內建選項的英文對照（提示詞英文輸出用；使用者自填內容原樣保留） */
  SS.EN = {
    '人物': 'person', '貓咪': 'cat', '狗狗': 'dog', '兔子': 'rabbit', '幻想生物': 'fantasy creature', '照片中的人物': 'the person in the photo', '照片中的寵物': 'the pet in the photo',
    '開心大笑': 'laughing happily', '甜甜微笑': 'sweet smile', '害羞臉紅': 'shy and blushing', '傻眼': 'dumbfounded', '生氣鼓臉': 'pouting angrily', '哭哭': 'crying', '感動落淚': 'touched to tears', '愛心眼': 'heart eyes', '驚訝': 'surprised', '得意': 'smug', '疲累': 'exhausted', '無言': 'speechless', '眨眼': 'winking', '認真': 'serious', '想睡': 'sleepy', '崇拜發光': 'starry-eyed admiration', '心虛冒汗': 'nervous sweating', '崩潰吶喊': 'screaming in despair', '元氣滿滿': 'full of energy',
    '揮手打招呼': 'waving hello', '比讚': 'thumbs up', '鞠躬': 'bowing', '躺平': 'lying flat', '奔跑': 'running', '張開雙手抱抱': 'arms open for a hug', '比愛心': 'making a heart sign', '雙手捧臉': 'cheeks in both hands', '雙手叉腰': 'hands on hips', '開心跳起來': 'jumping for joy', '撒花': 'throwing confetti', '敬禮': 'saluting', '從牆邊探頭': 'peeking from behind a wall', '趴在地上': 'lying on the floor', '雙手合十': 'palms together', '拍手': 'clapping', '指向前方': 'pointing forward', '抱頭': 'holding head', '舉牌': 'holding up a sign', '轉圈圈': 'spinning around',
    '無': 'none', '愛心': 'heart', '咖啡杯': 'coffee cup', '手機': 'smartphone', '便當': 'lunch box', '枕頭': 'pillow', '花束': 'bouquet', '氣球': 'balloon', '筆電': 'laptop', '雨傘': 'umbrella', '錢包': 'wallet', '生日蛋糕': 'birthday cake', '紅包': 'red envelope', '珍珠奶茶': 'bubble tea', '小旗子': 'small flag', '星星': 'star',
    '溫柔體貼': 'gentle', '傲嬌': 'tsundere', '慵懶': 'lazy', '搞笑': 'funny', '認真負責': 'responsible', '天然呆': 'airheaded', '愛撒嬌': 'clingy and cute',
    '奶油白＋蜜桃橘': 'cream white and peach orange', '粉紅＋白': 'pink and white', '天空藍＋白': 'sky blue and white', '黑白配色': 'black and white', '橘虎斑': 'orange tabby', '灰白': 'grey and white', '抹茶綠＋米色': 'matcha green and beige', '淡紫＋奶油': 'lavender and cream',
    '全身・置中': 'full body, centered', '半身・大頭特寫': 'half body, big-head close-up', '側身回頭': 'side view looking back', '從畫面邊緣探出頭': 'peeking in from the edge', '坐姿': 'sitting', '動態傾斜構圖': 'dynamic tilted composition', '搭配大型道具': 'with a large prop', '雙手舉牌': 'holding a sign with both hands',
    '我本人': 'myself', '家人': 'a family member', '朋友': 'a friend', '寵物': 'a pet'
  };
  const en = (v) => (v && SS.EN[v]) || v;
  SS.styleOf = (id) => SS.STYLES.find((s) => s.id === id);
  SS.styleText = (d, lang) => d.style === 'custom' ? (d.customStyle || (lang === 'en' ? 'custom style' : '使用者自訂畫風')) : ((SS.styleOf(d.style) || SS.STYLES[0])[lang === 'en' ? 'en' : 'prompt']);
  SS.styleName = (d) => d.style === 'custom' ? '自訂：' + (d.customStyle || '未填寫') : (SS.styleOf(d.style) || SS.STYLES[0]).name;

  SS.charSummary = function (d, lang) {
    const E = lang === 'en';
    const type = d.charType === '自訂角色' ? (d.customType || (E ? 'original character' : '原創角色')) : (E ? en(d.charType) : d.charType);
    const parts = [E ? `Character type: ${type}` : `角色類型：${type}`];
    const f = (k, zh, eng) => { if (d[k]) parts.push(E ? `${eng}: ${en(d[k])}` : `${zh}：${d[k]}`); };
    f('name', '角色名稱', 'Name'); f('appearance', '外貌特徵', 'Appearance'); f('hair', '髮型／毛色', 'Hair / fur'); f('outfit', '服裝', 'Outfit'); f('colors', '主要配色', 'Main colors'); f('personality', '個性', 'Personality');
    return parts;
  };
  /* 文字語言的前綴（例：台語文字、日文文字） */
  const textPrefix = (d, E) => {
    if (!d.textLang || d.textLang === 'zh') return E ? 'Traditional Chinese ' : '';
    return E ? SS.langLabel(d, true) + ' ' : ({ taigi: '台語', kinmen: '金門話', en: '英文', ja: '日文', ko: '韓文' }[d.textLang] || SS.langLabel(d, false));
  };

  /**
   * 產生單張貼圖提示詞
   * d: 角色與畫面設定；opt: { source:'photo'|'character', subject, keepNotes, index, total, series, composition, lang:'zh'|'en' }
   */
  SS.buildPrompt = function (d, opt = {}) {
    if (opt.lang === 'en') return buildPromptEN(d, opt);
    const L = [];
    const head = opt.total > 1 ? `（第 ${opt.index} / ${opt.total} 張${opt.series ? '・' + opt.series : ''}）` : '';
    L.push(`請幫我畫一張聊天用的貼圖${head}。`);
    L.push('');
    if (opt.source === 'photo') {
      L.push('【參考照片使用說明】');
      L.push(`我會上傳一張${opt.subject || '人物'}的照片，請以照片中的主角為角色原型。`);
      L.push('請保留可辨識的特徵：臉型、髮型或毛色花紋、膚色或毛色、配件與整體氣質，再轉換成下方指定的畫風。');
      if (opt.keepNotes) L.push(`特別保留：${opt.keepNotes}`);
      L.push('只參考主角本身，不要沿用照片背景，也不要加入照片中的其他人物。');
      L.push('');
    }
    L.push('【角色設定】');
    SS.charSummary(d).forEach((p) => L.push('・' + p));
    L.push('');
    L.push('【畫風與配色】');
    L.push(`・畫風：${SS.styleText(d)}`);
    if (d.colors) L.push(`・配色以「${d.colors}」為主，色彩和諧、對比清楚，縮小後依然好辨識。`);
    L.push('');
    L.push('【表情與動作】');
    L.push(`・表情：${d.expression || '開心'}`);
    L.push(`・動作：${d.action || '自然站姿'}`);
    if (d.prop && d.prop !== '無') L.push(`・道具：${d.prop}`);
    L.push('・表情與肢體要誇張、一眼看懂情緒。');
    L.push('');
    L.push('【貼圖文字】');
    const pre = textPrefix(d, false);
    const meaning = d.textLang && d.textLang !== 'zh' && d.textZh ? `（意思是：${d.textZh}）` : '';
    if (d.noText || !d.text) {
      L.push('・這張貼圖不放任何文字。');
    } else if (d.aiText) {
      const label = d.textLang === 'taigi' ? '台語漢字（教育部推薦用字）' : (pre ? pre : '繁體中文');
      L.push(`・在畫面中加入${label}文字「${d.text}」${meaning}，字數與字形必須完全正確，不可出現錯字、簡體字或亂碼。`);
      if (d.textLang === 'taigi' || d.textLang === 'kinmen') L.push(`・這是${pre}用字，請逐字照抄，不要改寫成華語用詞、同音字或簡體字。如果無法保證每個字都正確，請改為不畫文字並預留空間。`);
      else if (pre) L.push(`・請照原樣書寫${pre}，不要翻譯成中文，也不要改變拼寫或標點。`);
      L.push('・文字使用粗圓、可愛的手寫字感，搭配白色外框，放在不遮住臉的位置。');
    } else {
      L.push(`・這張貼圖之後會另外加上${pre}文字「${d.text}」，請不要在圖中畫任何文字，並在角色上方或旁邊預留放字的空間。`);
      L.push(`・畫面情境要能表達這句話的意思${meaning}。`);
    }
    if (d.text2 && !d.noText) {
      L.push(d.aiText ? `・另外加一組較小的文字「${d.text2}」，與主要文字分開擺放，同樣必須字形正確。` : `・另外也預留一組小文字「${d.text2}」的位置（不要畫字）。`);
    }
    const dz = SS.designText(d.design);
    if (dz.length) { L.push(''); L.push('【文字與裝飾設計】'); dz.forEach((x) => L.push(x)); }
    L.push('');
    L.push('【構圖與留白】');
    L.push(`・構圖：${opt.composition || '角色置中、全身或半身'}`);
    L.push('・單一角色、單一畫面，不要做成多格漫畫。');
    L.push('・角色與文字四周保留約 10px 以上的留白，不要被裁切到。');
    L.push('・畫面比例接近 370 × 320（橫式略寬）或正方形。');
    L.push('');
    L.push('【背景】');
    L.push(d.transparent ? '・請輸出透明背景 PNG。若無法輸出透明背景，請改用純白色、無陰影、無漸層的單色背景，方便後續去背。' : '・使用乾淨簡單的淺色背景。');
    L.push('');
    L.push('【角色一致性】');
    L.push('・若這是同系列貼圖，角色的臉型、比例、配色、服裝與畫風必須與前面每一張保持一致。');
    L.push('');
    L.push('【原創與避免侵權】');
    L.push('・請設計原創角色與畫面，不要模仿任何知名動漫角色、吉祥物、品牌商標或特定藝術家的作品。');
    return L.join('\n');
  };

  function buildPromptEN(d, opt) {
    const L = [];
    L.push(`Please draw one chat sticker${opt.total > 1 ? ` (sticker ${opt.index} of ${opt.total}${opt.series ? ', series: ' + opt.series : ''})` : ''}.`);
    L.push('');
    if (opt.source === 'photo') {
      L.push('[Reference photo]');
      L.push(`I will upload a photo of ${en(opt.subject) || 'a person'}. Use the main subject as the character model.`);
      L.push('Keep recognizable features — face shape, hairstyle or fur pattern, skin or fur color, accessories and overall vibe — then convert into the art style below.');
      if (opt.keepNotes) L.push(`Be sure to keep: ${opt.keepNotes}`);
      L.push('Use only the main subject; do not copy the photo background or other people.');
      L.push('');
    }
    L.push('[Character]');
    SS.charSummary(d, 'en').forEach((p) => L.push('- ' + p));
    L.push('');
    L.push('[Art style & colors]');
    L.push(`- Style: ${SS.styleText(d, 'en')}`);
    if (d.colors) L.push(`- Main palette: ${en(d.colors)}; harmonious, high contrast, readable when small.`);
    L.push('');
    L.push('[Expression & pose]');
    L.push(`- Expression: ${en(d.expression) || 'happy'}`);
    L.push(`- Pose / action: ${en(d.action) || 'natural standing pose'}`);
    if (d.prop && d.prop !== '無') L.push(`- Prop: ${en(d.prop)}`);
    L.push('- Exaggerated, instantly readable emotion and body language.');
    L.push('');
    L.push('[Sticker text]');
    const lang = SS.langLabel(d, true);
    const meaning = d.textLang && d.textLang !== 'zh' && d.textZh ? ` (meaning: ${d.textZh})` : '';
    if (d.noText || !d.text) L.push('- No text on this sticker.');
    else if (d.aiText) {
      L.push(`- Add the text "${d.text}" in ${lang}${meaning}. Reproduce every character exactly — no typos, no Simplified Chinese, no garbled glyphs, do not translate.`);
      L.push('- Cute bold rounded hand-lettering with a white outline, placed where it does not cover the face.');
    } else {
      L.push(`- Do NOT draw any text. The ${lang} text "${d.text}"${meaning} will be added later; leave clear empty space above or beside the character.`);
      L.push('- The scene should express the meaning of this phrase.');
    }
    if (d.text2 && !d.noText) L.push(d.aiText ? `- Also add a smaller second line "${d.text2}", placed separately, spelled exactly.` : `- Also leave space for a small second line "${d.text2}" (do not draw it).`);
    const dz = SS.designText(d.design, 'en');
    if (dz.length) { L.push(''); L.push('[Text & decoration design]'); dz.forEach((x) => L.push(x)); }
    L.push('');
    L.push('[Composition]');
    L.push(`- Composition: ${en(opt.composition) || 'character centered, full or half body'}`);
    L.push('- One character, one panel — not a comic strip.');
    L.push('- Keep about 10px of empty margin around the character and text; nothing cropped.');
    L.push('- Aspect ratio close to 370 × 320 (slightly landscape) or square.');
    L.push('');
    L.push('[Background]');
    L.push(d.transparent ? '- Transparent PNG background. If transparency is not possible, use a plain flat white background with no shadow or gradient.' : '- Clean, simple light background.');
    L.push('');
    L.push('[Consistency]');
    L.push('- For a series, keep the same face, proportions, colors, outfit and art style in every sticker.');
    L.push('');
    L.push('[Originality]');
    L.push('- Original character and design only; do not imitate famous characters, mascots, brand logos or specific artists.');
    return L.join('\n');
  }

  /* 文字與裝飾設計（給 AI 的提示詞用） */
  SS.DESIGN_FONTS = [['', '不指定'], ['round', '可愛圓體'], ['hand', '手寫字'], ['kid', '童趣手寫'], ['comic', '搞笑漫畫字'], ['bold', '超粗黑體'], ['retro', '復古明體'], ['sans', '標準黑體']];
  SS.DESIGN_COLORS = [['', '不指定'], ['wb', '白字＋咖啡色粗描邊'], ['po', '蜜桃橘字＋白色描邊'], ['wr', '白字＋紅色描邊'], ['bw', '深咖啡字＋白色描邊'], ['yb', '黃字＋咖啡色描邊'], ['blw', '天空藍字＋白色描邊'], ['pkw', '粉紅字＋白色描邊']];
  SS.designText = function (g, lang) {
    if (!g) return [];
    const E = lang === 'en'; const L = [];
    if (g.font) { const f = SS.fontOf ? SS.FONTS.find((x) => x.id === g.font) : null; const z = SS.DESIGN_FONTS.find((x) => x[0] === g.font); if (f || z) L.push(E ? `- Lettering style: ${f ? f.en : g.font}` : `・文字字體風格：${f ? f.prompt : z[1]}`); }
    if (g.color) {
      let name = null, nameEn = null;
      const m = /^p(\d+)$/.exec(g.color); if (m && SS.PALETTE && SS.PALETTE[+m[1]]) { name = SS.PALETTE[+m[1]][2]; nameEn = SS.PALETTE[+m[1]][3]; }
      else { const c = SS.DESIGN_COLORS.find((x) => x[0] === g.color); if (c) { name = c[1]; nameEn = c[1]; } }
      if (name) L.push(E ? `- Text colors: ${nameEn}` : `・文字配色：${name}`);
    }
    if (g.shadow) L.push(E ? '- Soft drop shadow on the text' : '・文字加上柔和陰影');
    if (g.vertical) L.push(E ? '- Vertical text layout' : '・文字直排');
    if (g.pos && SS.TEXT_POS && SS.TEXT_POS[g.pos]) L.push(E ? `- Text position: ${SS.TEXT_POS[g.pos][3]}` : `・文字位置：${SS.TEXT_POS[g.pos][0]}`);
    if (g.decos && g.decos.length) L.push(E ? `- Decorations: ${g.decos.map((id) => (SS.decoById[id] && SS.decoById[id].en) || id).join(', ')} (small accents, never covering the face or text)` : `・裝飾元素：${g.decos.map((id) => SS.decoById[id] ? SS.decoById[id].name : id).join('、')}（小巧點綴，不要遮住角色臉部或文字）`);
    else if (g.decos) L.push(E ? '- No decorations' : '・不要加任何裝飾元素');
    return L;
  };

  /* 宮格合併提示詞（一次畫出多張，之後用切圖工具分割） */
  SS.buildGridPrompt = function (d, items, rows, cols, opt = {}) {
    const E = opt.lang === 'en'; const L = [];
    if (E) {
      L.push(`Please draw a ${rows}×${cols} sticker sheet with ${items.length} cells${opt.series ? ' (' + opt.series + ')' : ''}. Each cell is a separate sticker of the same character, with clear equal gaps between cells for easy slicing.`);
      L.push('');
      if (opt.source === 'photo') { L.push('[Reference photo] I will upload a photo; keep the face shape, hairstyle or fur, and accessories.'); L.push(''); }
      L.push('[Character]'); SS.charSummary(d, 'en').forEach((p) => L.push('- ' + p)); L.push(`- Style: ${SS.styleText(d, 'en')}`); L.push('');
      L.push('[Cells] (left to right, top to bottom)');
      items.forEach((it, i) => {
        const mean = it.lang && it.lang !== 'zh' && it.zh ? ` (meaning: ${it.zh})` : '';
        const txt = it.noText || !it.text ? 'no text' : (d.aiText ? `text "${it.text}"${mean}` : `no text (leave space for "${it.text}"${mean})`);
        L.push(`${i + 1}. ${en(it.expression)} · ${en(it.action)}${it.prop && it.prop !== '無' ? ' · prop: ' + en(it.prop) : ''} · ${txt}`);
      });
      L.push(''); L.push('[Requirements]'); L.push('- Identical character design, proportions, colors and style in every cell.');
      if (d.aiText) L.push(`- Text is ${SS.langLabel(d, true)}; copy every character exactly, add a white outline.`);
      L.push(d.transparent ? '- Plain white background, no shadows, no grid lines.' : '- Clean flat background.');
      L.push('- Character centered in each cell with margin; nothing crosses cell borders.'); L.push('- Original design; do not imitate famous characters or brands.');
      return L.join('\n');
    }
    L.push(`請幫我畫一張 ${rows}×${cols} 宮格的貼圖總表，共 ${items.length} 格${opt.series ? '（' + opt.series + '）' : ''}。`);
    L.push('每一格都是同一個角色的獨立貼圖，格與格之間保留明顯的等寬空白間距，方便之後平均切割。');
    L.push('');
    if (opt.source === 'photo') { L.push('【參考照片】我會上傳主角照片，請保留臉型、髮型或毛色、配件等可辨識特徵。'); L.push(''); }
    L.push('【角色設定】');
    SS.charSummary(d).forEach((p) => L.push('・' + p));
    L.push(`・畫風：${SS.styleText(d)}`);
    L.push('');
    L.push('【各格內容】（由左到右、由上到下）');
    const preName = { taigi: '台語', kinmen: '金門話', en: '英文', ja: '日文', ko: '韓文' };
    items.forEach((it, i) => {
      const tg = it.lang && it.lang !== 'zh' ? `（${preName[it.lang] || SS.langLabel({ textLang: it.lang }, false)}，意思是「${it.zh || ''}」）` : '';
      const txt = it.noText || !it.text ? '無文字' : (d.aiText ? `文字「${it.text}」${tg}` : `不畫字（預留「${it.text}」的空間${tg}）`);
      L.push(`${i + 1}. ${it.expression}・${it.action}${it.prop && it.prop !== '無' ? '・道具：' + it.prop : ''}・${txt}`);
    });
    L.push('');
    L.push('【要求】');
    L.push('・所有格子的角色外貌、比例、配色、畫風完全一致。');
    if (d.aiText) L.push(d.textLang === 'taigi' ? '・文字為台語漢字，請逐字照抄，不可改成華語、同音字或簡體字，加白色外框。' : (d.textLang && d.textLang !== 'zh' ? `・文字為${SS.langLabel(d, false)}，請逐字照抄、不要翻譯，加白色外框。` : '・文字一律使用繁體中文，字形正確、不可亂碼，加白色外框。'));
    L.push(d.transparent ? '・背景使用純白色、無陰影、無格線，方便去背與切割。' : '・背景使用乾淨單色。');
    L.push('・每格角色置中，四周留白，不要超出格子。');
    L.push('・原創設計，不模仿任何知名角色或品牌。');
    return L.join('\n');
  };

  /* ---------- 共用 UI 元件 ---------- */
  SS.selectHTML = (id, list, val) => `<select id="${id}">${list.map((x) => `<option ${x === val ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>`;

  SS.stylePickerHTML = function (cur) {
    const items = SS.STYLES.map((s) => ({ id: s.id, name: s.name, desc: s.desc })).concat([{ id: 'custom', name: '自訂畫風', desc: '輸入你想要的風格' }]);
    return `<div class="style-grid" role="radiogroup" aria-label="畫風">${items.map((s) => `
      <button type="button" class="style-card ${s.id === cur ? 'on' : ''}" data-style="${s.id}" role="radio" aria-checked="${s.id === cur}">
        <span class="style-ic">${SS.STYLE_ICONS[s.id]}</span><b>${s.name}</b><small>${s.desc}</small>
      </button>`).join('')}</div>`;
  };
  SS.bindStylePicker = function (root, onChange) {
    $$('.style-card', root).forEach((b) => b.addEventListener('click', () => {
      $$('.style-card', root).forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
      b.classList.add('on'); b.setAttribute('aria-checked', 'true');
      onChange(b.dataset.style);
    }));
  };

  /* 用語挑選對話框：華語／台語；onPick(text, meta) */
  SS.pickPhrase = function (onPick) {
    const cats = Object.keys(SS.PHRASES);
    const lang = SS.ls.get('pickLang', 'zh');
    SS.modal(`<h3>挑一句生活用語</h3>
      <div class="seg lang-seg" role="radiogroup" aria-label="語言"><label><input type="radio" name="pplang" value="zh" ${lang === 'zh' ? 'checked' : ''}><span>華語</span></label><label><input type="radio" name="pplang" value="taigi" ${lang === 'taigi' ? 'checked' : ''}><span>🧋 台語</span></label></div>
      <div id="pp-zh" ${lang === 'zh' ? '' : 'hidden'}>
        <div class="chips cat-tabs mt">${cats.map((c, i) => `<button class="chip ${i ? '' : 'on'}" data-cat="${c}">${c}</button>`).join('')}</div>
        <div class="chips phrase-list" id="pp-list"></div>
        <div class="row gap mt"><button class="btn ghost" id="pp-rand">🎲 隨機一句</button><button class="btn ghost" id="pp-none">無文字</button></div>
      </div>
      <div id="pp-tg" ${lang === 'taigi' ? '' : 'hidden'}><p class="muted small">載入中…</p></div>`, {
      onOpen(b) {
        const render = (c) => { $('#pp-list', b).innerHTML = SS.PHRASES[c].map((p) => `<button class="chip big" data-p="${esc(p)}">${esc(p)}</button>`).join(''); };
        render(cats[0]);
        let tgReady = false;
        const loadTg = () => {
          if (tgReady || !SS.taigi) return; tgReady = true;
          SS.taigi.load().then((d) => {
            const box = $('#pp-tg', b); box.innerHTML = SS.taigiPickerHTML(d);
            SS.bindTaigiPicker(box, (p) => {
              const m = SS.taigi.mode(); const t = SS.taigi.text(p, m === 'custom' ? 'hanji' : m);
              onPick(t.text, { lang: t.kind === 'zh' ? 'zh' : 'taigi', id: p.id, kind: t.kind }); SS.closeModal();
            });
          }).catch((e) => { $('#pp-tg', b).innerHTML = `<p class="warn">${esc(e.message)}</p>`; });
        };
        if (lang === 'taigi') loadTg();
        b.addEventListener('change', (e) => {
          if (e.target.name !== 'pplang') return;
          const v = e.target.value; SS.ls.set('pickLang', v);
          $('#pp-zh', b).hidden = v !== 'zh'; $('#pp-tg', b).hidden = v !== 'taigi'; if (v === 'taigi') loadTg();
        });
        $('#pp-zh', b).addEventListener('click', (e) => {
          const t = e.target.closest('button'); if (!t) return;
          if (t.dataset.cat) { $$('#pp-zh .cat-tabs .chip', b).forEach((x) => x.classList.toggle('on', x === t)); render(t.dataset.cat); }
          else if (t.dataset.p) { onPick(t.dataset.p, { lang: 'zh' }); SS.closeModal(); }
          else if (t.id === 'pp-rand') { onPick(pick(SS.ALL_PHRASES), { lang: 'zh' }); SS.closeModal(); }
          else if (t.id === 'pp-none') { onPick('', { lang: 'zh' }); SS.closeModal(); }
        });
      }
    });
  };

  /* ---------- 安裝成 App（PWA） ---------- */
  SS.env = () => {
    const ua = navigator.userAgent || '';
    return {
      standalone: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
      ios: /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
      android: /Android/i.test(ua),
      inApp: /FBAN|FBAV|FB_IAB|Instagram|Line\/|MicroMessenger/i.test(ua),
      iosSafari: /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)
    };
  };
  SS.installSteps = function () {
    const e = SS.env();
    if (e.inApp) return `<p class="warn">你現在是在 Facebook／LINE 等 App 內建的瀏覽器裡，這裡<b>無法安裝</b>。</p>
      <ol class="steps"><li>點右上角「⋯」或「⋮」</li><li>選「用瀏覽器開啟」（${e.ios ? 'Safari' : 'Chrome'}）</li><li>回到首頁按「📲 安裝 App」</li></ol>`;
    if (e.ios) return `<ol class="steps"><li>點「分享」按鈕 <span aria-hidden="true">⬆️</span>（${e.iosSafari ? 'Safari 在畫面下方，iPad 在上方' : 'Chrome 在網址列右側'}）</li><li>往下滑，選「<b>加入主畫面</b>」</li><li>按右上角「<b>新增</b>」</li></ol>
      ${e.iosSafari ? '' : '<p class="muted small">找不到這個選項時，請改用 Safari 開啟本網站再試（較舊的 iOS 只支援 Safari）。</p>'}`;
    if (e.android) return `<ol class="steps"><li>點 Chrome 右上角「<b>⋮</b>」</li><li>選「<b>安裝應用程式</b>」或「<b>加到主畫面</b>」</li><li>按「<b>安裝</b>」</li></ol>
      <p class="muted small">剛打開網站時選項可能還沒出現，在頁面上點幾下、稍等幾秒再試。</p>`;
    return `<ol class="steps"><li>Chrome／Edge：點網址列右側的「安裝」圖示 <span aria-hidden="true">⊕</span></li><li>或從瀏覽器選單選「安裝今天貼什麼」</li></ol>`;
  };
  SS.install = async function () {
    if (SS.deferredInstall) {
      const ev = SS.deferredInstall; SS.deferredInstall = null;
      try { ev.prompt(); const r = await ev.userChoice; if (r && r.outcome === 'accepted') SS.toast('安裝中…完成後主畫面會出現圖示'); } catch (err) { SS.modal('<h3>📲 安裝到手機</h3>' + SS.installSteps()); }
      SS.renderInstallCTA(); return;
    }
    SS.modal(`<h3>📲 把「今天貼什麼」裝到手機</h3>${SS.installSteps()}<p class="note small">安裝後會像一般 App 一樣出現在主畫面，全螢幕開啟，加工室與收藏離線也能用。</p><button class="btn primary block" onclick="SS.closeModal()">知道了</button>`);
  };
  SS.renderInstallCTA = function () {
    const box = document.getElementById('install-cta'); if (!box) return;
    if (SS.env().standalone || SS.ls.get('installed', false) && !SS.deferredInstall) { box.innerHTML = ''; return; }
    box.innerHTML = `<button class="install-cta" id="install-btn" type="button"><span class="ic">📲</span><span><b>安裝 App 到手機</b><small>${SS.deferredInstall ? '一鍵安裝，從主畫面開啟' : '加到主畫面・可離線使用'}</small></span><i>安裝</i></button>`;
    $('#install-btn', box).addEventListener('click', SS.install);
  };

  /* 提示詞輸出區塊 */
  SS.promptBoxHTML = (id = 'prompt-out') => `
    <div class="prompt-box">
      <div class="prompt-head"><b>🪄 AI 生圖提示詞</b><span class="muted small" id="${id}-len"></span></div>
      <textarea id="${id}" class="prompt-text" rows="10" aria-label="AI 生圖提示詞"></textarea>
      <div class="btn-row">
        <button class="btn primary" data-act="copy">📋 複製提示詞</button>
        <a class="btn" data-act="gpt" href="https://chatgpt.com/" target="_blank" rel="noopener">複製並開啟 ChatGPT</a>
        <a class="btn" data-act="gemini" href="https://gemini.google.com/app" target="_blank" rel="noopener">複製並開啟 Gemini</a>
        <button class="btn ghost" data-act="dl">⬇️ 下載 TXT</button>
      </div>
      <p class="note">ℹ️ 本 App 不會直接生成圖片。請把提示詞貼到 ChatGPT 或 Gemini（需登入該服務，額度與收費依各服務規定）。生成後可回到「✂️ 貼圖加工室」加工。<br>💡 AI 畫中文字常出錯；若字不對，可改選「之後在加工室加字」。</p>
    </div>`;
  SS.bindPromptBox = function (root, id = 'prompt-out', fname = 'sticker-prompt') {
    const ta = $('#' + id, root);
    const upd = () => { const n = $('#' + id + '-len', root); if (n) n.textContent = ta.value.length + ' 字'; };
    ta.addEventListener('input', upd);
    root.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act]'); if (!b || !b.closest('.prompt-box')) return;
      const a = b.dataset.act;
      if (a === 'copy') SS.copy(ta.value, '提示詞已複製');
      if (a === 'gpt' || a === 'gemini') {
        // 連結本身會開新分頁；這裡只負責同時複製
        SS.copy(ta.value, '已複製，請在新分頁貼上提示詞');
      }
      if (a === 'dl') SS.downloadText(ta.value, `${fname}-${SS.ts()}.txt`);
    });
    return { set(v) { ta.value = v; upd(); }, get: () => ta.value };
  };
})();
