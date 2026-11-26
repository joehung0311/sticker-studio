/* 語言與用語庫整合（v1.3）：華語、台語、金門話、英日韓、我的家鄉話、自訂語言 */
(function () {
  const { $, $$, esc, pick } = SS;

  SS.LANGS = [
    { id: 'zh', name: '繁體中文', short: '中文', verified: '內建生活用語' },
    { id: 'taigi', name: '台語', short: '台語', verified: '教育部辭典比對' },
    { id: 'kinmen', name: '金門話', short: '金門話', verified: '教育部詞彙方言差（金門點）' },
    { id: 'en', name: 'English 英文', short: '英文', verified: '本專案編寫校對' },
    { id: 'ja', name: '日本語 日文', short: '日文', verified: '本專案編寫校對' },
    { id: 'ko', name: '한국어 韓文', short: '韓文', verified: '本專案編寫校對' },
    { id: 'hometown', name: '我的家鄉話', short: '家鄉話', verified: '使用者自建・未經查證' },
    { id: 'custom', name: '自訂語言', short: '自訂', verified: '自行輸入' }
  ];
  SS.langOf = (id) => SS.LANGS.find((l) => l.id === id) || SS.LANGS[0];
  /* 提示詞裡用的語言名稱 */
  SS.langLabel = (d, en) => {
    if (d.textLang === 'custom') return d.textLangName || (en ? 'custom language' : '自訂語言');
    if (d.textLang === 'hometown') return SS.hometown.get().name || (en ? 'local dialect' : '家鄉話');
    return en ? ({ zh: 'Traditional Chinese', taigi: 'Taiwanese Hokkien (Han characters)', kinmen: 'Kinmen Hokkien (Han characters)', en: 'English', ja: 'Japanese', ko: 'Korean' }[d.textLang] || 'Traditional Chinese')
      : ({ zh: '繁體中文', taigi: '台語漢字', kinmen: '金門話漢字', en: '英文', ja: '日文', ko: '韓文' }[d.textLang] || '繁體中文');
  };

  /* ---------- 我的家鄉話（使用者自建） ---------- */
  SS.hometown = {
    get: () => SS.ls.get('hometown', { name: '', items: [] }),
    set: (v) => SS.ls.set('hometown', v),
    add(text, meaning = '', note = '') { const h = SS.hometown.get(); const it = { id: 'h' + SS.uid(), text, meaning, note }; h.items.unshift(it); SS.hometown.set(h); return it; },
    remove(id) { const h = SS.hometown.get(); h.items = h.items.filter((x) => x.id !== id); SS.hometown.set(h); }
  };
  /* ---------- 常用文字（自訂） ---------- */
  SS.myTexts = {
    get: () => SS.ls.get('myTexts', []),
    add(text, lang = 'zh') { const l = SS.myTexts.get(); if (l.some((x) => x.text === text)) return; l.unshift({ id: 'm' + SS.uid(), text, lang }); SS.ls.set('myTexts', l); },
    remove(id) { SS.ls.set('myTexts', SS.myTexts.get().filter((x) => x.id !== id)); }
  };
  /* ---------- 收藏（各語言） ---------- */
  SS.favs = {
    all() { const f = SS.ls.get('favPhrases', {}); f.taigi = SS.ls.get('taigiFav', []); return f; },
    has(lang, id) { return (SS.favs.all()[lang] || []).includes(id); },
    toggle(lang, id) {
      if (lang === 'taigi') return SS.taigi.toggleFav(id);
      const f = SS.ls.get('favPhrases', {}); const l = f[lang] || []; const i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1); else l.unshift(id); f[lang] = l; SS.ls.set('favPhrases', f); return i < 0;
    }
  };

  /* ---------- 載入各語言用語（統一格式） ---------- */
  const cache = {};
  const fetchJSON = (u) => fetch(u, { cache: 'no-cache' }).then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  /* item: { id, cat, text, sub, meaning, tl, badge, check } */
  SS.lang = {
    async load(id) {
      if (id === 'zh') {
        if (!cache.zh) { const cats = Object.keys(SS.PHRASES); cache.zh = { categories: cats.map((c, i) => ({ id: 'z' + i, name: c, emoji: '' })), items: cats.flatMap((c, i) => SS.PHRASES[c].map((t) => ({ id: 'zh:' + t, cat: 'z' + i, text: t }))) }; }
        return cache.zh;
      }
      if (id === 'taigi') {
        const d = await SS.taigi.load(); const m = SS.taigi.mode() === 'custom' ? 'hanji' : SS.taigi.mode();
        return { categories: d.categories, items: d.phrases.map((p) => { const t = SS.taigi.text(p, m); return { id: p.id, cat: p.cat, text: t.text, kind: t.kind, sub: t.kind !== 'hanji' ? '正字：' + p.hanji : '', meaning: p.zh, tl: p.tl, badge: t.kind === 'pun' ? '諧音・非標準台語' : '', check: p.check, note: p.note, hanji: p.hanji }; }), about: d.about };
      }
      if (id === 'kinmen' || id === 'en' || id === 'ja' || id === 'ko') {
        if (!cache[id]) {
          const d = await fetchJSON(`data/${id}.json`);
          cache[id] = { categories: d.categories, about: d.about, items: d.phrases.map((p) => id === 'kinmen'
            ? { id: p.id, cat: p.cat, text: p.hanji, meaning: p.zh, tl: p.tl, sub: '臺北說法：' + p.taipei.join('／'), badge: p.differs ? '與臺北說法不同' : '', check: 'kinmen' }
            : { id: p.id, cat: p.cat, text: p.text, meaning: p.zh }) };
        }
        return cache[id];
      }
      if (id === 'hometown') {
        const h = SS.hometown.get();
        return { categories: [], about: `「${h.name || '我的家鄉話'}」是你自己建立的詞庫，App 沒有查證內容。`, items: h.items.map((x) => ({ id: x.id, cat: '', text: x.text, meaning: x.meaning, sub: x.note, badge: '自建' })) };
      }
      return { categories: [], items: [] };
    }
  };

  const CHECK = { headword: '✓ 辭典詞目', example: '✓ 辭典例句', words: '✓ 逐詞查核', manual: '⚠ 人工確認', kinmen: '✓ 教育部方言差' };
  /* ---------- 通用用語挑選器 ---------- */
  SS.phrasePicker = function (box, opts) {
    // opts: { lang, onPick(item, lang), compact }
    let lang = opts.lang || 'zh', cat = '', data = null;
    box.innerHTML = `<div class="pp-top"><div class="pp-mode" hidden></div>
      <div class="row gap"><input type="search" class="pp-q grow" placeholder="🔍 搜尋文字或意思" aria-label="搜尋用語"><button type="button" class="btn ghost nowrap pp-rand">🎲 隨機</button></div>
      <div class="chips pp-cats mt"></div><p class="muted small pp-about"></p></div><div class="tg-list pp-list ${opts.compact ? 'compact' : ''}"></div>`;
    const render = () => {
      if (!data) return;
      const q = $('.pp-q', box).value.trim().toLowerCase();
      const fav = SS.favs.all()[lang] || [];
      let items = data.items;
      if (cat === 'fav') items = items.filter((x) => fav.includes(x.id)); else if (cat) items = items.filter((x) => x.cat === cat);
      if (q) items = items.filter((x) => [x.text, x.meaning, x.sub, x.tl].some((v) => v && v.toLowerCase().includes(q)));
      $('.pp-list', box).innerHTML = items.length ? items.map((x) => `
        <div class="tg-item" data-id="${esc(x.id)}" role="button" tabindex="0">
          <div class="tg-main"><b>${esc(x.text)}</b>${x.badge ? `<i class="tag ${x.kind === 'pun' ? 'pun' : ''}">${esc(x.badge)}</i>` : ''}</div>
          <div class="tg-sub">${x.meaning && x.meaning !== x.text ? `<span>意思：${esc(x.meaning)}</span>` : ''}${x.sub ? `<span>${esc(x.sub)}</span>` : ''}${x.tl ? `<span class="tl">${esc(x.tl.trim())}</span>` : ''}</div>
          ${CHECK[x.check] ? `<div class="tg-foot"><small class="ck-${x.check}">${CHECK[x.check]}</small>${x.note ? `<small class="muted">${esc(x.note)}</small>` : ''}</div>` : ''}
          ${lang === 'hometown' ? '' : `<button type="button" class="star" data-fav="${esc(x.id)}" aria-label="收藏">${fav.includes(x.id) ? '⭐' : '☆'}</button>`}
        </div>`).join('') : `<div class="empty">${cat === 'fav' ? '還沒有收藏，點 ☆ 收藏常用語' : (lang === 'hometown' ? '還沒有家鄉話，請在下方新增' : '找不到符合的用語')}</div>`;
    };
    async function setLang(l) {
      lang = l; cat = ''; data = null;
      $('.pp-list', box).innerHTML = '<p class="muted small">載入中…</p>';
      const modeBox = $('.pp-mode', box); modeBox.hidden = lang !== 'taigi';
      if (lang === 'taigi') modeBox.innerHTML = `<div class="seg mode-seg" role="radiogroup" aria-label="台語文字模式">${SS.TAIGI_MODES.filter(([k]) => k !== 'custom').map(([k, n]) => `<label><input type="radio" name="ppmode-${opts.uid}" value="${k}" ${k === SS.taigi.mode() ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>`;
      try { data = await SS.lang.load(lang); }
      catch (e) { $('.pp-list', box).innerHTML = `<p class="warn small">${esc(e.message)}</p>`; return; }
      $('.pp-cats', box).innerHTML = (lang === 'hometown' ? '' : `<button type="button" class="chip on" data-cat="">全部</button><button type="button" class="chip" data-cat="fav">⭐ 收藏</button>`) + data.categories.map((c) => `<button type="button" class="chip" data-cat="${c.id}">${c.emoji || ''} ${esc(c.name)}</button>`).join('');
      $('.pp-about', box).textContent = data.about || '';
      render();
    }
    const itemById = (id) => data && data.items.find((x) => x.id === id);
    box.addEventListener('click', (e) => {
      const f = e.target.closest('[data-fav]'); if (f) { e.stopPropagation(); const on = SS.favs.toggle(lang, f.dataset.fav); SS.toast(on ? '已加入收藏' : '已取消收藏'); render(); return; }
      const c = e.target.closest('.pp-cats [data-cat]'); if (c) { cat = c.dataset.cat; $$('.pp-cats .chip', box).forEach((x) => x.classList.toggle('on', x === c)); render(); return; }
      if (e.target.closest('.pp-rand')) { if (data && data.items.length) opts.onPick(pick(data.items), lang); return; }
      const it = e.target.closest('.tg-item'); if (it) { const x = itemById(it.dataset.id); if (x) opts.onPick(x, lang); }
    });
    box.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('tg-item')) { const x = itemById(e.target.dataset.id); if (x) opts.onPick(x, lang); } });
    $('.pp-q', box).addEventListener('input', render);
    box.addEventListener('change', (e) => { if (e.target.name && e.target.name.startsWith('ppmode')) { SS.taigi.setMode(e.target.value); setLang('taigi'); } });
    setLang(lang);
    return { setLang, refresh: () => setLang(lang), get lang() { return lang; } };
  };

  /* 對話框版挑選器：onPick(text, meta) —— 舊頁面與加工室共用 */
  SS.pickPhrase = function (onPick, startLang) {
    const lang = startLang || SS.ls.get('pickLang', 'zh');
    SS.modal(`<h3>挑一句用語</h3>
      <label>語言<select id="pp-lang">${SS.LANGS.filter((l) => l.id !== 'custom').map((l) => `<option value="${l.id}" ${l.id === lang ? 'selected' : ''}>${l.name}</option>`).join('')}</select></label>
      <div id="pp-box" class="mt"></div>
      <div class="row gap mt"><button class="btn ghost" id="pp-none">無文字</button></div>`, {
      onOpen(b) {
        const pk = SS.phrasePicker($('#pp-box', b), {
          lang, uid: 'modal', compact: true,
          onPick: (x, l) => { onPick(x.text, { lang: l, id: x.id, kind: x.kind || (l === 'taigi' ? 'hanji' : l), meaning: x.meaning || '' }); SS.closeModal(); }
        });
        $('#pp-lang', b).addEventListener('change', (e) => { SS.ls.set('pickLang', e.target.value); pk.setLang(e.target.value); });
        $('#pp-none', b).addEventListener('click', () => { onPick('', { lang: 'zh' }); SS.closeModal(); });
      }
    });
  };
})();
