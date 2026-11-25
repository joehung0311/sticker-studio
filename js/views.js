/* 頁面：首頁、照片變貼圖、角色、用語庫、盲盒、整套企劃、說明頁 */
(function () {
  const { $, $$, esc, pick, shuffle } = SS;
  SS.views = SS.views || {};

  /* ================= 首頁 ================= */
  const HOME_CARDS = [
    ['photo', '📸', '照片變貼圖', '用自己或毛孩的照片', 'peach'],
    ['character', '🎨', '創造新角色', '不用照片也能做', 'sage'],
    ['phrases', '💬', '生活用語庫', '華語＋台語用語', 'lav'],
    ['blindbox', '🎁', '貼圖盲盒', '不知道貼什麼就抽', 'peach'],
    ['plan', '🪄', '整套貼圖企劃', '1～40 張一次規劃', 'sage'],
    ['editor', '✂️', '貼圖加工室', '裁切・加字・去背', 'lav'],
    ['line', '📱', 'LINE 貼圖工具', '切圖・尺寸・檢查', 'peach'],
    ['collection', '💗', '我的貼圖收藏', '存在你的裝置', 'sage']
  ];
  SS.views.home = {
    title: '',
    render(el) {
      el.innerHTML = `
      <section class="hero">
        <img src="assets/icons/icon-192.png" alt="今天貼什麼？App 圖示" class="hero-logo" width="96" height="96">
        <div>
          <h1>今天貼什麼？</h1>
          <p class="hero-en">Sticker Studio</p>
          <p class="slogan">生活有百種心情，貼圖不必只有一種。</p>
        </div>
      </section>
      <div class="flow" aria-label="創作流程">
        <span>① 設計角色</span><i>→</i><span>② 產生提示詞</span><i>→</i><span>③ AI 生圖</span><i>→</i><span>④ 加工下載</span>
      </div>
      <a class="tg-banner" href="#taigi"><span class="tg-b-ic">🧋</span><span><b>台語貼圖專區</b><small>超過 150 句台語生活用語・正字／諧音／華語／台華混搭</small></span><i>→</i></a>
      <nav class="home-grid">
        ${HOME_CARDS.map(([r, ic, t, s, c]) => `<a class="home-card ${c}" href="#${r}"><span class="hc-ic">${ic}</span><b>${t}</b><small>${s}</small></a>`).join('')}
      </nav>
      <section class="more-links">
        <a href="#guide">📘 新手使用教學</a>
        <a href="#share">🔗 分享給朋友</a>
        <a href="#install">📲 安裝至手機主畫面</a>
        <a href="#privacy">🔒 隱私權與使用說明</a>
        <a href="#about">🐾 關於本 App</a>
        <a href="#version">🏷️ 版本資訊 v${SS.VERSION}</a>
      </section>`;
      if (!SS.ls.get('welcomed', false)) {
        SS.ls.set('welcomed', true);
        setTimeout(() => SS.modal(`<h3>歡迎來到「今天貼什麼？」</h3>
          <ol class="steps"><li><b>選角色與畫風</b>：用照片，或直接創造新角色。</li>
          <li><b>複製提示詞</b>：一鍵貼到 ChatGPT 或 Gemini 生圖。</li>
          <li><b>回來加工</b>：裁切、加字、去背、切宮格、下載 PNG。</li></ol>
          <p class="note">不用註冊、不用 API Key。照片只在你的瀏覽器處理，不會上傳。</p>
          <button class="btn primary block" onclick="SS.closeModal()">開始玩 ✨</button>`), 300);
      }
    }
  };

  /* ================= 角色表單（共用） ================= */
  const dl = (id, list) => `<datalist id="${id}">${list.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>`;
  function sceneFieldsHTML(d) {
    return `
      <div class="grid2">
        <label>表情<input id="f-expression" list="dl-exp" value="${esc(d.expression)}" placeholder="例如：開心大笑"></label>
        <label>動作<input id="f-action" list="dl-act" value="${esc(d.action)}" placeholder="例如：揮手打招呼"></label>
        <label>道具<input id="f-prop" list="dl-prop" value="${esc(d.prop)}" placeholder="無"></label>
        <label>配色<input id="f-colors" list="dl-col" value="${esc(d.colors)}" placeholder="例如：奶油白＋蜜桃橘"></label>
      </div>
      ${dl('dl-exp', SS.EXPRESSIONS)}${dl('dl-act', SS.ACTIONS)}${dl('dl-prop', SS.PROPS)}${dl('dl-col', SS.PALETTES)}
      <p class="muted small">可直接輸入，或點欄位從建議清單挑選。</p>
      <label>貼圖文字 ${d.textLang === 'taigi' ? '<i class="tag">🧋 台語</i>' : ''}
        <div class="row gap"><input id="f-text" value="${esc(d.text)}" placeholder="例如：早安" maxlength="20" ${d.noText ? 'disabled' : ''}><button type="button" class="btn ghost nowrap" id="f-pick">💬 挑用語</button><button type="button" class="btn ghost nowrap" id="f-rand" aria-label="隨機用語">🎲</button></div>
      </label>
      <div class="checks">
        <label class="ck"><input type="checkbox" id="f-noText" ${d.noText ? 'checked' : ''}> 無文字模式</label>
        <label class="ck"><input type="checkbox" id="f-transparent" ${d.transparent ? 'checked' : ''}> 要求透明背景</label>
      </div>
      <div class="seg" role="radiogroup" aria-label="文字處理方式">
        <label><input type="radio" name="aitext" value="1" ${d.aiText ? 'checked' : ''}><span>讓 AI 畫上文字</span></label>
        <label><input type="radio" name="aitext" value="0" ${!d.aiText ? 'checked' : ''}><span>之後在加工室加字（中文字最準）</span></label>
      </div>`;
  }
  function charFieldsHTML(d) {
    return `
      <label>角色名稱（選填）<input id="f-name" value="${esc(d.name)}" placeholder="例如：麻糬貓" maxlength="20"></label>
      <div class="field-label">角色類型</div>
      <div class="chips" id="f-types">${SS.CHAR_TYPES.map((t) => `<button type="button" class="chip ${t === d.charType ? 'on' : ''}" data-type="${t}">${t}</button>`).join('')}</div>
      <label id="f-customType-wrap" ${d.charType === '自訂角色' ? '' : 'hidden'}>自訂角色類型<input id="f-customType" value="${esc(d.customType)}" placeholder="例如：會飛的饅頭、恐龍寶寶"></label>
      <label>外貌特徵<input id="f-appearance" value="${esc(d.appearance)}" placeholder="例如：圓臉、大眼睛、腮紅、短短的腳"></label>
      <div class="grid2">
        <label>髮型／毛色<input id="f-hair" value="${esc(d.hair)}" placeholder="例如：黑白賓士貓花紋"></label>
        <label>服裝／配件<input id="f-outfit" value="${esc(d.outfit)}" placeholder="例如：黃色小領巾"></label>
      </div>
      <label>個性<input id="f-personality" list="dl-per" value="${esc(d.personality)}"></label>${dl('dl-per', SS.PERSONALITIES)}`;
  }
  /* 讀取表單值 → 物件 */
  function readForm(root, d) {
    const v = (id) => { const e = $('#f-' + id, root); return e ? e.value.trim() : d[id]; };
    ['name', 'customType', 'appearance', 'hair', 'outfit', 'personality', 'expression', 'action', 'prop', 'colors', 'text'].forEach((k) => { d[k] = v(k); });
    const nt = $('#f-noText', root); if (nt) d.noText = nt.checked;
    const tp = $('#f-transparent', root); if (tp) d.transparent = tp.checked;
    const ai = $('input[name=aitext]:checked', root); if (ai) d.aiText = ai.value === '1';
    return d;
  }
  function bindForm(root, d, onChange) {
    const fire = () => { readForm(root, d); const t = $('#f-text', root); if (t) t.disabled = d.noText; onChange(); };
    root.addEventListener('input', (e) => { if (e.target.closest('.prompt-box')) return; fire(); });
    root.addEventListener('change', (e) => { if (e.target.closest('.prompt-box')) return; fire(); });
    const types = $('#f-types', root);
    if (types) types.addEventListener('click', (e) => {
      const b = e.target.closest('[data-type]'); if (!b) return;
      $$('.chip', types).forEach((x) => x.classList.toggle('on', x === b));
      d.charType = b.dataset.type; $('#f-customType-wrap', root).hidden = d.charType !== '自訂角色'; fire();
    });
    const setText = (p, meta = { lang: 'zh' }) => {
      const t = $('#f-text', root); const n = $('#f-noText', root); t.value = p; n.checked = !p;
      d.textLang = meta.lang || 'zh'; d.textZh = meta.lang === 'taigi' && meta.id && SS.taigi.data ? SS.taigi.data.byId[meta.id].zh : '';
      if (d.textLang === 'taigi') { const r = $('input[name=aitext][value="0"]', root); if (r) r.checked = true; SS.toast('台語字容易被 AI 寫錯，已改為「之後在加工室加字」'); }
      fire();
    };
    $('#f-pick', root).addEventListener('click', () => SS.pickPhrase(setText));
    $('#f-rand', root).addEventListener('click', () => setText(pick(SS.ALL_PHRASES)));
    $('#f-text', root).addEventListener('input', () => { if (!$('#f-text', root).value) { d.textLang = 'zh'; d.textZh = ''; } });
  }
  function styleSectionHTML(d) {
    return `<div class="field-label">畫風</div>${SS.stylePickerHTML(d.style)}
      <label id="f-customStyle-wrap" ${d.style === 'custom' ? '' : 'hidden'}>自訂畫風描述<input id="f-customStyle" value="${esc(d.customStyle)}" placeholder="例如：蠟筆塗鴉風、粉彩色調"></label>`;
  }
  function bindStyle(root, d, onChange) {
    SS.bindStylePicker(root, (s) => { d.style = s; $('#f-customStyle-wrap', root).hidden = s !== 'custom'; onChange(); });
    $('#f-customStyle', root).addEventListener('input', (e) => { d.customStyle = e.target.value.trim(); onChange(); });
  }

  /* ================= 01 照片變貼圖 ================= */
  SS.views.photo = {
    title: '📸 照片變貼圖',
    render(el) {
      const d = SS.draft.get();
      const st = { subject: '我自己', keepNotes: '', url: null };
      el.innerHTML = `
      <div class="card">
        <h2 class="step"><span>1</span>上傳照片</h2>
        <label class="drop" id="ph-drop">
          <input type="file" id="ph-file" accept="image/jpeg,image/png,image/webp,image/*" hidden>
          <div id="ph-empty"><div class="drop-ic">🖼️</div><b>點這裡選擇照片</b><small>支援 JPG、PNG、WebP</small></div>
          <img id="ph-img" alt="照片預覽" hidden>
        </label>
        <div class="row gap" id="ph-actions" hidden><button class="btn ghost" id="ph-change">🔄 更換照片</button><button class="btn ghost" id="ph-clear">🗑️ 移除</button></div>
        <p class="note">🔒 照片只在你的瀏覽器顯示，不會上傳到本 App 的任何伺服器，也不會被儲存。</p>
        <div class="grid2">
          <label>照片主角<select id="ph-subject"><option>我自己</option><option>家人</option><option>朋友</option><option>寵物</option></select></label>
          <label>特別要保留的特徵<input id="ph-keep" placeholder="例如：圓框眼鏡、右耳的白斑"></label>
        </div>
      </div>
      <div class="card"><h2 class="step"><span>2</span>選擇畫風</h2>${styleSectionHTML(d)}</div>
      <div class="card"><h2 class="step"><span>3</span>表情、動作與文字</h2>${sceneFieldsHTML(d)}</div>
      <div class="card"><h2 class="step"><span>4</span>複製提示詞去生圖</h2>
        <div class="warn">⚠️ 到 ChatGPT 或 Gemini 時，請<b>重新上傳同一張照片</b>，再貼上提示詞。本 App 無法替你把照片傳過去。</div>
        ${SS.promptBoxHTML()}
        <a class="btn block soft" href="#editor">✂️ 生成好了？到加工室處理圖片 →</a>
      </div>`;
      const pb = SS.bindPromptBox(el, 'prompt-out', 'photo-sticker-prompt');
      const update = () => {
        st.subject = $('#ph-subject', el).value; st.keepNotes = $('#ph-keep', el).value.trim();
        SS.draft.set(d);
        const dd = Object.assign({}, d, { charType: st.subject === '寵物' ? '照片中的寵物' : '照片中的人物', name: '', appearance: '', hair: '', outfit: '', personality: '' });
        pb.set(SS.buildPrompt(dd, { source: 'photo', subject: st.subject === '我自己' ? '我本人' : st.subject, keepNotes: st.keepNotes }));
      };
      bindForm(el, d, update); bindStyle(el, d, update);
      const file = $('#ph-file', el);
      file.addEventListener('change', async () => {
        const f = file.files[0]; if (!f) return;
        try {
          const { url } = await SS.fileToImage(f);
          if (st.url) URL.revokeObjectURL(st.url);
          st.url = url; $('#ph-img', el).src = url; $('#ph-img', el).hidden = false; $('#ph-empty', el).hidden = true; $('#ph-actions', el).hidden = false;
          SS.toast('照片已載入（僅在本機）');
        } catch (e) { SS.toast(e.message); }
      });
      $('#ph-change', el).addEventListener('click', () => file.click());
      $('#ph-clear', el).addEventListener('click', () => { if (st.url) URL.revokeObjectURL(st.url); st.url = null; file.value = ''; $('#ph-img', el).hidden = true; $('#ph-empty', el).hidden = false; $('#ph-actions', el).hidden = true; });
      update();
      return () => { if (st.url) URL.revokeObjectURL(st.url); };
    }
  };

  /* ================= 02 創造新角色 ================= */
  SS.views.character = {
    title: '🎨 創造新角色',
    render(el) {
      const d = SS.draft.get();
      el.innerHTML = `
      <div class="card" id="saved-chars"></div>
      <div class="card"><h2 class="step"><span>1</span>角色設定</h2>${charFieldsHTML(d)}
        <button class="btn sage block" id="ch-save">💾 儲存這個角色（做同系列用）</button></div>
      <div class="card"><h2 class="step"><span>2</span>畫風</h2>${styleSectionHTML(d)}</div>
      <div class="card"><h2 class="step"><span>3</span>這張貼圖的表情、動作與文字</h2>${sceneFieldsHTML(d)}</div>
      <div class="card"><h2 class="step"><span>4</span>提示詞</h2>${SS.promptBoxHTML()}
        <div class="btn-row"><a class="btn soft" href="#plan">🪄 用這個角色做整套貼圖</a><a class="btn soft" href="#editor">✂️ 到加工室</a></div></div>`;
      const pb = SS.bindPromptBox(el, 'prompt-out', 'character-prompt');
      const update = () => { SS.draft.set(d); pb.set(SS.buildPrompt(d, { source: 'character' })); };
      bindForm(el, d, update); bindStyle(el, d, update);
      const renderSaved = () => {
        const list = SS.chars.list();
        $('#saved-chars', el).innerHTML = `<h2>🗂️ 我的角色 <small class="muted">${list.length} 個</small></h2>` + (list.length ? `<div class="char-list">${list.map((c) => `
          <div class="char-item"><div><b>${esc(c.name || '未命名角色')}</b><small>${esc(c.charType === '自訂角色' ? c.customType : c.charType)}・${esc(SS.styleName(c))}</small></div>
          <div class="row"><button class="btn sm" data-load="${c.id}">套用</button><button class="btn sm ghost" data-del="${c.id}" aria-label="刪除">🗑️</button></div></div>`).join('')}</div>` : '<p class="muted small">還沒有儲存的角色。設定好後按「儲存這個角色」，之後做同系列貼圖就能維持一致。</p>');
      };
      renderSaved();
      $('#saved-chars', el).addEventListener('click', (e) => {
        const l = e.target.closest('[data-load]'), r = e.target.closest('[data-del]');
        if (l) { const c = SS.chars.list().find((x) => x.id === l.dataset.load); if (c) { const keep = { text: d.text, expression: d.expression, action: d.action, prop: d.prop, noText: d.noText }; SS.draft.set(Object.assign({}, c, keep, { charId: c.id })); SS.toast('已套用角色：' + (c.name || '未命名')); SS.router.rerender(); } }
        if (r) SS.confirmBox('確定刪除這個角色設定？').then((ok) => { if (ok) { SS.chars.remove(r.dataset.del); renderSaved(); SS.toast('已刪除'); } });
      });
      $('#ch-save', el).addEventListener('click', () => {
        readForm(el, d);
        const id = d.charId || SS.uid();
        const c = { id, name: d.name, charType: d.charType, customType: d.customType, appearance: d.appearance, hair: d.hair, outfit: d.outfit, colors: d.colors, personality: d.personality, style: d.style, customStyle: d.customStyle, saved: Date.now() };
        SS.chars.save(c); d.charId = id; SS.draft.set(d); renderSaved(); SS.toast('角色已儲存在這台裝置');
      });
      update();
    }
  };

  /* ================= 04 生活用語庫 ================= */
  SS.views.phrases = {
    title: '💬 生活用語庫',
    render(el) {
      el.innerHTML = `
      <a class="tg-banner" href="#taigi"><span class="tg-b-ic">🧋</span><span><b>想講台語？到台語貼圖專區</b><small>正字、趣味諧音、華語、台華混搭一鍵切換</small></span><i>→</i></a>
      <div class="card">
        <div class="row gap wrap"><button class="btn primary" id="pr-rand">🎲 隨機抽一句</button>
        <div class="row gap grow"><input id="pr-custom" placeholder="或輸入自己的句子" maxlength="20"><button class="btn" id="pr-use">使用</button></div></div>
        <div id="pr-picked" class="picked" hidden></div>
      </div>
      ${Object.entries(SS.PHRASES).map(([c, list]) => `<div class="card"><h2>${c}</h2><div class="chips">${list.map((p) => `<button class="chip big" data-p="${esc(p)}">${esc(p)}</button>`).join('')}</div></div>`).join('')}
      <p class="muted small center">共 ${SS.ALL_PHRASES.length} 句，點任一句即可使用</p>`;
      const show = (p) => {
        const box = $('#pr-picked', el); box.hidden = false;
        box.innerHTML = `<div class="picked-text">「${esc(p)}」</div>
          <div class="btn-row"><button class="btn primary" data-go="character">🎨 用這句做貼圖</button><button class="btn" data-go="editor">✂️ 加到圖片上</button><button class="btn ghost" data-go="copy">📋 複製</button></div>`;
        box.dataset.p = p; box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };
      el.addEventListener('click', (e) => {
        const c = e.target.closest('[data-p]'); if (c && !c.classList.contains('picked')) { $$('.chip.on', el).forEach((x) => x.classList.remove('on')); c.classList.add('on'); show(c.dataset.p); return; }
        const g = e.target.closest('[data-go]'); if (!g) return;
        const p = $('#pr-picked', el).dataset.p;
        if (g.dataset.go === 'copy') SS.copy(p);
        if (g.dataset.go === 'character') { SS.draft.set({ text: p, noText: false }); location.hash = '#character'; }
        if (g.dataset.go === 'editor') { SS.ls.set('pendingText', p); location.hash = '#editor'; }
      });
      $('#pr-rand', el).addEventListener('click', () => show(pick(SS.ALL_PHRASES)));
      $('#pr-use', el).addEventListener('click', () => { const v = $('#pr-custom', el).value.trim(); if (v) show(v); else SS.toast('請先輸入句子'); });
    }
  };

  /* ================= 05 貼圖盲盒 ================= */
  SS.views.blindbox = {
    title: '🎁 貼圖盲盒',
    render(el) {
      const slots = [
        ['char', '角色', '🐱'], ['style', '畫風', '🎨'], ['expression', '表情', '😆'],
        ['action', '動作', '🙌'], ['prop', '道具', '☕'], ['text', '生活用語', '💬']
      ];
      const st = SS.ls.get('blindbox', null) || {};
      const locks = SS.ls.get('blindboxLocks', {});
      let lang = SS.ls.get('blindboxLang', 'zh');
      const tgRoll = () => { const d = SS.taigi.data; const p = pick(d.phrases); const m = SS.taigi.mode(); const t = SS.taigi.text(p, m === 'custom' ? 'hanji' : m); return { label: t.text, lang: t.kind === 'zh' ? 'zh' : 'taigi', id: p.id }; };
      const roll = (k) => {
        if (k === 'char') { const saved = SS.chars.list(); if (saved.length && Math.random() < 0.4) { const c = pick(saved); return { label: c.name || '我的角色', data: c }; } const t = pick(SS.CHAR_TYPES.slice(0, 5)); const col = pick(SS.PALETTES); return { label: `${col}的${t}`, data: { charType: t, colors: col, personality: pick(SS.PERSONALITIES) } }; }
        if (k === 'style') { const s = pick(SS.STYLES); return { label: s.name, data: s.id }; }
        if (k === 'expression') return { label: pick(SS.EXPRESSIONS) };
        if (k === 'action') return { label: pick(SS.ACTIONS) };
        if (k === 'prop') return { label: pick(SS.PROPS) };
        if (k === 'text') return lang === 'taigi' && SS.taigi.data ? tgRoll() : { label: pick(SS.ALL_PHRASES), lang: 'zh' };
      };
      slots.forEach(([k]) => { if (!st[k]) st[k] = roll(k); });
      el.innerHTML = `
      <div class="card center">
        <p class="muted">按下按鈕隨機組合一張貼圖點子。<br>喜歡的項目點 🔓 鎖住，再抽只會換其他項目。</p>
        <div class="seg lang-seg narrow" role="radiogroup" aria-label="用語語言"><label><input type="radio" name="bblang" value="zh" ${lang === 'zh' ? 'checked' : ''}><span>華語用語</span></label><label><input type="radio" name="bblang" value="taigi" ${lang === 'taigi' ? 'checked' : ''}><span>🧋 台語用語</span></label></div>
        <button class="btn primary big-btn" id="bb-go">🎁 抽一個！</button>
      </div>
      <div class="bb-grid" id="bb-grid"></div>
      <div class="card"><h2>這次的點子</h2><p class="idea" id="bb-idea"></p>
        <div class="btn-row"><button class="btn sage" id="bb-apply">🎨 套用到角色並微調</button></div>
        ${SS.promptBoxHTML()}</div>`;
      const pb = SS.bindPromptBox(el, 'prompt-out', 'blindbox-prompt');
      const toDraft = () => {
        const base = SS.draft.get();
        const c = st.char.data || {};
        const d = Object.assign({}, base, { name: '', appearance: '', hair: '', outfit: '', customType: '' }, c, {
          style: st.style.data, expression: st.expression.label, action: st.action.label, prop: st.prop.label, text: st.text.label, noText: false,
          textLang: st.text.lang || 'zh', textZh: st.text.lang === 'taigi' && st.text.id && SS.taigi.data ? SS.taigi.data.byId[st.text.id].zh : ''
        });
        if (d.textLang === 'taigi') d.aiText = false;
        delete d.id;
        return d;
      };
      const render = (anim) => {
        $('#bb-grid', el).innerHTML = slots.map(([k, n, ic]) => `
          <div class="bb-slot ${locks[k] ? 'locked' : ''} ${anim && !locks[k] ? 'pop' : ''}">
            <div class="bb-top"><span>${ic} ${n}</span><button class="lock" data-lock="${k}" aria-label="${locks[k] ? '解鎖' : '鎖定'}${n}">${locks[k] ? '🔒' : '🔓'}</button></div>
            <b>${esc(st[k].label)}</b>${k === 'text' && st.text.lang === 'taigi' ? '<i class="tag">🧋 台語</i>' : ''}</div>`).join('');
        const d = toDraft();
        $('#bb-idea', el).textContent = `一隻「${st.char.label}」，用${st.style.label}畫風，${st.expression.label}地${st.action.label}${st.prop.label !== '無' ? '，拿著' + st.prop.label : ''}，說：「${st.text.label}」`;
        pb.set(SS.buildPrompt(d, { source: 'character' }));
        SS.ls.set('blindbox', st); SS.ls.set('blindboxLocks', locks);
      };
      $('#bb-grid', el).addEventListener('click', (e) => { const b = e.target.closest('[data-lock]'); if (!b) return; locks[b.dataset.lock] = !locks[b.dataset.lock]; render(false); });
      $('#bb-go', el).addEventListener('click', () => {
        if (slots.every(([k]) => locks[k])) return SS.toast('全部都鎖住了，先解鎖一些吧');
        slots.forEach(([k]) => { if (!locks[k]) st[k] = roll(k); });
        const btn = $('#bb-go', el); btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake');
        render(true);
      });
      el.addEventListener('change', (e) => {
        if (e.target.name !== 'bblang') return;
        lang = e.target.value; SS.ls.set('blindboxLang', lang);
        if (lang === 'taigi') SS.taigi.load().then(() => { if (!locks.text) { st.text = roll('text'); render(true); } }).catch((er) => SS.toast(er.message));
        else if (!locks.text) { st.text = roll('text'); render(true); }
      });
      if (lang === 'taigi') SS.taigi.load().then(() => render(false)).catch(() => {});
      $('#bb-apply', el).addEventListener('click', () => { SS.draft.set(toDraft()); location.hash = '#character'; });
      render(false);
    }
  };

  /* ================= 06 整套貼圖企劃 ================= */
  function makePlan(theme, count, keywords) {
    let pool = theme === '自訂主題' ? [] : SS.THEMES[theme].map(([text, expression, action, prop]) => ({ text, expression, action, prop }));
    pool = shuffle(pool);
    if (theme === '自訂主題' && keywords) {
      keywords.split(/[,，、\s]+/).filter(Boolean).forEach((k) => pool.push({ text: k, expression: pick(SS.EXPRESSIONS), action: pick(SS.ACTIONS), prop: '無' }));
    }
    const used = new Set(pool.map((p) => p.text));
    const extra = shuffle(SS.ALL_PHRASES.filter((p) => !used.has(p)));
    const exps = shuffle(SS.EXPRESSIONS), acts = shuffle(SS.ACTIONS);
    let ei = 0, ai = 0;
    while (pool.length < count && extra.length) {
      pool.push({ text: extra.shift(), expression: exps[ei++ % exps.length], action: acts[ai++ % acts.length], prop: '無' });
    }
    // 避免相鄰兩張動作相同
    const out = pool.slice(0, count);
    for (let i = 1; i < out.length; i++) if (out[i].action === out[i - 1].action) out[i].action = acts[(ai++) % acts.length];
    return out.map((p, i) => Object.assign(p, { composition: SS.COMPOSITIONS[i % SS.COMPOSITIONS.length] }));
  }
  SS.makePlan = makePlan;

  /* 台語主題企劃：依主題情境抽用語，表情動作依情境搭配，不足張數時從其他情境補齊 */
  function makeTaigiPlan(themeName, count, mode) {
    const d = SS.taigi.data; const th = d.themes.find((t) => t.name === themeName);
    const main = shuffle(d.phrases.filter((p) => th.cats.includes(p.cat)));
    const rest = shuffle(d.phrases.filter((p) => !th.cats.includes(p.cat)));
    const pool = main.concat(rest).slice(0, count);
    const used = {};
    return pool.map((p, i) => {
      const c = d.catById[p.cat]; const t = SS.taigi.text(p, mode);
      const k = c.id; used[k] = (used[k] || 0) + 1;
      return {
        text: t.text, lang: t.kind === 'zh' ? 'zh' : 'taigi', kind: t.kind, taigiId: p.id, hanji: p.hanji, zh: p.zh,
        expression: c.expressions[(used[k] - 1) % c.expressions.length],
        action: c.actions[(used[k] + i) % c.actions.length],
        prop: Math.random() < 0.3 ? pick(SS.PROPS.slice(1)) : '無',
        composition: SS.COMPOSITIONS[i % SS.COMPOSITIONS.length]
      };
    });
  }
  SS.makeTaigiPlan = makeTaigiPlan;

  SS.views.plan = {
    title: '🪄 整套貼圖企劃',
    render(el) {
      const d = SS.draft.get();
      const saved = SS.ls.get('plan', null);
      const st = saved || { theme: '日常聊天系列', count: 8, keywords: '', items: [] };
      const chars = SS.chars.list();
      if (!st.tgMode) st.tgMode = 'hanji';
      const tg = SS.taigi.data;
      if (!tg) { SS.taigi.load().then(() => SS.router.rerender()).catch(() => {}); }
      const tgThemes = tg ? tg.themes : [];
      const isTg = () => tgThemes.some((t) => t.name === st.theme);
      el.innerHTML = `
      <div class="card">
        <h2 class="step"><span>1</span>角色</h2>
        <label>使用角色<select id="pl-char"><option value="">目前編輯中的角色</option>${chars.map((c) => `<option value="${c.id}" ${d.charId === c.id ? 'selected' : ''}>${esc(c.name || '未命名角色')}</option>`).join('')}</select></label>
        <div class="summary" id="pl-sum"></div>
        <a class="btn ghost sm" href="#character">✏️ 修改角色設定</a>
      </div>
      <div class="card">
        <h2 class="step"><span>2</span>主題與張數</h2>
        <label>企劃主題<select id="pl-theme"><optgroup label="華語主題">${SS.THEME_NAMES.map((n) => `<option ${n === st.theme ? 'selected' : ''}>${esc(n)}</option>`).join('')}</optgroup>${tgThemes.length ? `<optgroup label="🧋 台語主題">${tgThemes.map((t) => `<option ${t.name === st.theme ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</optgroup>` : ''}</select></label>
        <div id="pl-tg" ${isTg() ? '' : 'hidden'}>
          <label>台語文字模式<select id="pl-tgmode">${SS.TAIGI_MODES.filter(([k]) => k !== 'custom').map(([k, n]) => `<option value="${k}" ${k === st.tgMode ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="ck"><input type="checkbox" id="pl-tgai" ${st.tgAi ? 'checked' : ''}> 讓 AI 直接畫台語字（容易寫錯，不建議）</label>
          <p class="note small">建議：AI 只畫角色，台語字之後用「✂️ 貼圖加工室」加上，字形最正確。趣味諧音是網路寫法，不是標準台語。</p>
        </div>
        <label id="pl-kw-wrap" ${st.theme === '自訂主題' ? '' : 'hidden'}>自訂主題關鍵字（用逗號分隔，會變成貼圖文字）<input id="pl-kw" value="${esc(st.keywords)}" placeholder="例如：考試加油, 我讀不完, 放榜了"></label>
        <div class="field-label">張數</div>
        <div class="chips" id="pl-count">${SS.PLAN_COUNTS.map((n) => `<button class="chip ${n === st.count ? 'on' : ''}" data-n="${n}">${n === 1 ? '單張' : n + ' 張'}${SS.LINE_SPEC.counts.includes(n) ? '<i class="line-ok">LINE</i>' : ''}</button>`).join('')}</div>
        <p class="note">標示 <i class="line-ok">LINE</i> 的張數符合 LINE Creators Market 靜態貼圖可上架數量（8／16／24／32／40 張）；單張與 4 張適合自用或練習，無法直接上架。</p>
        <button class="btn primary block" id="pl-gen">🪄 自動規劃</button>
      </div>
      <div id="pl-result"></div>`;
      const baseChar = () => {
        const id = $('#pl-char', el).value; const c = id ? chars.find((x) => x.id === id) : null;
        return Object.assign({}, d, c || {});
      };
      const renderSum = () => { const b = baseChar(); $('#pl-sum', el).innerHTML = SS.charSummary(b).concat(['畫風：' + SS.styleName(b)]).map((x) => `<span>${esc(x)}</span>`).join(''); };
      const save = () => SS.ls.set('plan', st);
      const itemD = (it, b) => Object.assign({}, b, { expression: it.expression, action: it.action, prop: it.prop, text: it.text, noText: !it.text, textLang: it.lang || 'zh', textZh: it.zh || '' }, it.lang === 'taigi' ? { aiText: !!st.tgAi } : {});
      const itemPrompt = (i) => {
        const it = st.items[i]; const b = baseChar();
        return SS.buildPrompt(itemD(it, b), { source: 'character', index: i + 1, total: st.items.length, series: st.theme, composition: it.composition });
      };
      const allPrompts = () => {
        const b = baseChar();
        const head = `《${st.theme}》共 ${st.items.length} 張｜角色基準設定（每張都要一致）\n${SS.charSummary(b).join('\n')}\n畫風：${SS.styleText(b)}\n\n建議做法：先用第 1 張確認角色長相，之後每張都在同一個對話裡請 AI「延續同一個角色」。\n`;
        return head + st.items.map((_, i) => `\n==================== 第 ${i + 1} 張 ====================\n` + itemPrompt(i)).join('\n');
      };
      const renderResult = () => {
        if (!st.items.length) { $('#pl-result', el).innerHTML = ''; return; }
        $('#pl-result', el).innerHTML = `
        <div class="card">
          <h2 class="step"><span>3</span>企劃內容（${st.items.length} 張，可逐張修改）</h2>
          <div class="btn-row">
            <button class="btn primary" data-x="all">📋 複製整套提示詞</button>
            <button class="btn" data-x="txt">⬇️ TXT</button><button class="btn" data-x="csv">⬇️ CSV</button><button class="btn" data-x="json">⬇️ JSON</button>
          </div>
          <details class="grid-prompt"><summary>🧩 宮格合併提示詞（一次生成多張，再用 LINE 工具切圖）</summary>
            <div class="row gap"><select id="pl-grid"><option value="2">2×2（每批 4 張）</option><option value="3">3×3（每批 9 張）</option></select><button class="btn" data-x="grid">📋 複製宮格提示詞</button></div>
            <p class="muted small">AI 一次畫多格時，角色一致性較好，但格線位置不一定精準，切圖時可再微調邊界。</p>
          </details>
          <div class="plan-list">${st.items.map((it, i) => `
            <div class="plan-item" data-i="${i}">
              <div class="pi-head"><b>#${i + 1}</b><div class="row"><button class="btn sm" data-x="one" data-i="${i}">📋 複製</button><button class="btn sm ghost" data-x="re" data-i="${i}" aria-label="重抽第 ${i + 1} 張">🎲</button></div></div>
              <div class="grid2 tight">
                <label>文字<input data-f="text" value="${esc(it.text)}" placeholder="空白＝無文字"></label>
                <label>表情<input data-f="expression" list="dl-exp" value="${esc(it.expression)}"></label>
                <label>動作<input data-f="action" list="dl-act" value="${esc(it.action)}"></label>
                <label>道具<input data-f="prop" list="dl-prop" value="${esc(it.prop)}"></label>
              </div>
              ${it.lang === 'taigi' ? `<p class="muted small tg-hint">🧋 正字：${esc(it.hanji)}・華語：${esc(it.zh)}${it.kind === 'pun' ? '・<b>諧音寫法</b>' : ''}</p>` : ''}
              <label>構圖${SS.selectHTML('', SS.COMPOSITIONS, it.composition).replace('<select id=""', '<select data-f="composition"')}</label>
            </div>`).join('')}</div>
          ${dl('dl-exp', SS.EXPRESSIONS)}${dl('dl-act', SS.ACTIONS)}${dl('dl-prop', SS.PROPS)}
        </div>`;
      };
      renderSum(); renderResult();
      $('#pl-char', el).addEventListener('change', renderSum);
      $('#pl-theme', el).addEventListener('change', (e) => { st.theme = e.target.value; $('#pl-kw-wrap', el).hidden = st.theme !== '自訂主題'; $('#pl-tg', el).hidden = !isTg(); save(); });
      $('#pl-tgmode', el) && $('#pl-tgmode', el).addEventListener('change', (e) => { st.tgMode = e.target.value; save(); });
      $('#pl-tgai', el) && $('#pl-tgai', el).addEventListener('change', (e) => { st.tgAi = e.target.checked; save(); });
      $('#pl-kw', el).addEventListener('input', (e) => { st.keywords = e.target.value; save(); });
      $('#pl-count', el).addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (!b) return; st.count = +b.dataset.n; $$('#pl-count .chip', el).forEach((x) => x.classList.toggle('on', x === b)); save(); });
      $('#pl-gen', el).addEventListener('click', () => {
        if (st.theme === '自訂主題' && !st.keywords.trim()) SS.toast('沒有填關鍵字，將以生活用語庫補齊');
        st.items = isTg() ? makeTaigiPlan(st.theme, st.count, st.tgMode) : makePlan(st.theme, st.count, st.keywords); save(); renderResult();
        SS.toast(`已規劃 ${st.items.length} 張`);
        $('#pl-result', el).scrollIntoView({ behavior: 'smooth' });
      });
      el.addEventListener('input', (e) => {
        const f = e.target.dataset.f; const item = e.target.closest('.plan-item'); if (!f || !item) return;
        st.items[+item.dataset.i][f] = e.target.value.trim(); save();
      });
      el.addEventListener('change', (e) => { const f = e.target.dataset.f; const item = e.target.closest('.plan-item'); if (f && item) { st.items[+item.dataset.i][f] = e.target.value; save(); } });
      el.addEventListener('click', (e) => {
        const b = e.target.closest('[data-x]'); if (!b) return;
        const x = b.dataset.x, name = `sticker-plan-${SS.ts()}`;
        if (x === 'one') SS.copy(itemPrompt(+b.dataset.i), `第 ${+b.dataset.i + 1} 張提示詞已複製`);
        if (x === 're') {
          const i = +b.dataset.i; const texts = new Set(st.items.map((t) => t.text));
          const cand = SS.ALL_PHRASES.filter((p) => !texts.has(p));
          if (isTg()) { const one = makeTaigiPlan(st.theme, 40, st.tgMode).find((x) => !texts.has(x.text)); if (one) { st.items[i] = one; save(); renderResult(); } return; }
          st.items[i] = { text: pick(cand.length ? cand : SS.ALL_PHRASES), expression: pick(SS.EXPRESSIONS), action: pick(SS.ACTIONS), prop: pick(SS.PROPS), composition: pick(SS.COMPOSITIONS) };
          save(); renderResult();
        }
        if (x === 'all') SS.copy(allPrompts(), '整套提示詞已複製');
        if (x === 'txt') SS.downloadText(allPrompts(), name + '.txt');
        if (x === 'json') SS.downloadText(JSON.stringify({ app: 'Sticker Studio', version: SS.VERSION, theme: st.theme, character: baseChar(), items: st.items }, null, 2), name + '.json', 'application/json');
        if (x === 'csv') {
          const q = (s) => '"' + String(s ?? '').replace(/"/g, '""') + '"';
          const rows = [['編號', '文字', '語言', '台語正字', '華語意思', '表情', '動作', '道具', '構圖']].concat(st.items.map((it, i) => [i + 1, it.text, it.lang === 'taigi' ? '台語' : '華語', it.hanji || '', it.zh || '', it.expression, it.action, it.prop, it.composition]));
          SS.downloadText(rows.map((r) => r.map(q).join(',')).join('\r\n'), name + '.csv', 'text/csv');
        }
        if (x === 'grid') {
          const n = +$('#pl-grid', el).value, per = n * n, b2 = baseChar(); const parts = [];
          for (let s = 0; s < st.items.length; s += per) {
            const chunk = st.items.slice(s, s + per);
            const gb = isTg() ? Object.assign({}, b2, { textLang: 'taigi', aiText: !!st.tgAi }) : b2;
            parts.push(`==================== 第 ${s / per + 1} 批（第 ${s + 1}～${s + chunk.length} 張）====================\n` + SS.buildGridPrompt(gb, chunk, n, n, { series: st.theme }));
          }
          SS.copy(parts.join('\n\n'), `已複製 ${parts.length} 批宮格提示詞`);
        }
      });
    }
  };

  /* ================= 說明類頁面 ================= */
  SS.views.guide = {
    title: '📘 新手使用教學',
    render(el) {
      el.innerHTML = `<div class="card"><ol class="steps big">
        <li><b>決定角色</b><br>有照片 → 「📸 照片變貼圖」；沒照片 → 「🎨 創造新角色」；沒靈感 → 「🎁 貼圖盲盒」。</li>
        <li><b>選畫風與一句話</b><br>8 種畫風任選，文字可從「💬 生活用語庫」挑。</li>
        <li><b>複製提示詞去生圖</b><br>按「複製並開啟 ChatGPT／Gemini」，貼上後送出。用照片時記得在那邊也上傳照片。</li>
        <li><b>回來加工</b><br>把生成的圖存到手機，再到「✂️ 貼圖加工室」裁切、加字、單色去背，輸出 PNG。</li>
        <li><b>做成一整套</b><br>「🪄 整套貼圖企劃」一次規劃 8～40 張；用宮格提示詞生成後，到「📱 LINE 貼圖工具」切圖並打包 ZIP。</li>
        <li><b>收藏與分享</b><br>完成的貼圖存到「💗 我的貼圖收藏」，可下載或用手機分享。</li></ol></div>
      <div class="card"><h2>常見問題</h2>
        <details><summary>為什麼 App 不直接幫我生圖？</summary><p>直接生圖需要付費 AI API 與金鑰，放在公開網站不安全。V1.0 讓你使用自己已有的 ChatGPT 或 Gemini，所以本 App 完全免費、不用註冊。</p></details>
        <details><summary>AI 畫出來的中文字是錯的？</summary><p>這是生圖模型常見的限制。建議選「之後在加工室加字」，讓 AI 只畫角色，文字由本 App 用電腦字型加上，保證正確。</p></details>
        <details><summary>背景不是透明的？</summary><p>部分工具無法輸出透明背景。提示詞已要求改用純白背景，你可以在加工室用「單色去背」處理。</p></details>
        <details><summary>換手機後收藏不見了？</summary><p>收藏只存在目前這個瀏覽器。換裝置前請到收藏頁「匯出備份」，在新裝置「匯入備份」。</p></details>
      </div>`;
    }
  };
  SS.views.about = {
    title: '🐾 關於本 App',
    render(el) {
      el.innerHTML = `<div class="card center"><img src="assets/icons/icon-192.png" width="120" height="120" alt="App 圖示" class="about-logo">
        <h2>今天貼什麼？<br><small>Sticker Studio v${SS.VERSION}</small></h2>
        <p class="slogan">生活有百種心情，貼圖不必只有一種。</p></div>
      <div class="card"><p>讓不會畫畫、不懂設計的人，也能輕鬆規劃、生成及加工個人專屬聊天貼圖。</p>
        <p>本 App 負責「規劃」與「加工」：幫你把想法整理成清楚的 AI 生圖提示詞，再把生成的圖片裁切、加字、去背、切成 LINE 貼圖尺寸。</p>
        <p>品牌：白話實驗室（baihua.tw）</p>
        <p class="muted small">使用的開源套件：JSZip（MIT 授權）、qrcode-generator（MIT 授權），皆已內建，不需連線外部服務。</p></div>`;
    }
  };
  SS.views.privacy = {
    title: '🔒 隱私權與使用說明',
    render(el) {
      el.innerHTML = `<div class="card"><h2>你的照片與資料</h2><ul class="list">
        <li>照片與圖片都在<b>你的瀏覽器</b>中處理（HTML Canvas），本 App 沒有後端伺服器，不會上傳。</li>
        <li>收藏的貼圖存在瀏覽器的 IndexedDB，角色與設定存在 LocalStorage，只有這台裝置的這個瀏覽器看得到。</li>
        <li>不需要帳號、不收集個人資料、不使用追蹤或廣告程式。</li>
        <li><b>清除瀏覽器資料、使用無痕模式或換裝置，收藏可能會遺失</b>，請定期匯出備份。</li></ul></div>
      <div class="card"><h2>外部 AI 服務</h2><ul class="list">
        <li>「開啟 ChatGPT／Gemini」只是開啟對方網站。你在那裡上傳的照片與提示詞，適用該服務的隱私與使用條款。</li>
        <li>外部服務的登入、額度與收費由各服務決定，不屬於本 App 能控制的範圍。</li></ul></div>
      <div class="card"><h2>使用提醒</h2><ul class="list">
        <li>請使用你有權使用的照片；拍攝他人前請取得同意。</li>
        <li>請勿製作模仿知名角色、品牌商標或侵害他人權益的貼圖。</li>
        <li>LINE 工具只協助準備與初步檢查圖片，<b>不保證</b>通過 LINE 審核。</li></ul></div>`;
    }
  };
  SS.views.version = {
    title: '🏷️ 版本資訊',
    render(el) {
      el.innerHTML = `<div class="card"><h2>v${SS.VERSION}（初次正式版）</h2><ul class="list">
        <li>照片變貼圖、原創角色、8 種畫風＋自訂畫風</li><li>64 句生活用語、貼圖盲盒（可鎖定）</li>
        <li>整套企劃 1～40 張、TXT／CSV／JSON 匯出、宮格提示詞</li><li>貼圖加工室：裁切、縮放、旋轉、翻轉、加字、單色去背、PNG 輸出</li>
        <li>LINE 工具：宮格切圖、ZIP 打包、尺寸調整、主圖與標籤圖、規格檢查</li><li>收藏管理、備份匯出匯入、PWA 離線使用、QR Code 分享</li></ul>
        <p class="muted small">Made by baihua</p></div>`;
    }
  };
  SS.views.share = {
    title: '🔗 分享給朋友',
    render(el) {
      const url = location.href.split('#')[0];
      el.innerHTML = `<div class="card center">
        <p>朋友打開這個網址就能直接使用，不用註冊、不用 API Key。</p>
        <div class="qr-wrap"><canvas id="qr" width="260" height="260" aria-label="網站 QR Code"></canvas></div>
        <div class="url-box"><input id="sh-url" value="${esc(url)}" readonly aria-label="分享網址"></div>
        <div class="btn-row center"><button class="btn primary" id="sh-copy">📋 複製網址</button><button class="btn" id="sh-share">📤 分享</button><button class="btn ghost" id="sh-dl">⬇️ 下載 QR Code</button></div>
        ${/^https?:/.test(url) ? '' : '<p class="warn">目前是本機預覽，QR Code 指向本機檔案，部署到網站後才可給別人掃描。</p>'}
      </div>`;
      const cv = $('#qr', el);
      try {
        const qr = qrcode(0, 'M'); qr.addData(url); qr.make();
        const n = qr.getModuleCount(), cell = Math.floor(260 / (n + 8)), size = cell * (n + 8), off = cell * 4;
        cv.width = cv.height = size; const ctx = cv.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size); ctx.fillStyle = '#3B2A1E';
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(off + c * cell, off + r * cell, cell, cell);
      } catch (e) { SS.toast('QR Code 產生失敗'); }
      $('#sh-copy', el).addEventListener('click', () => SS.copy(url, '網址已複製'));
      $('#sh-share', el).addEventListener('click', async () => {
        if (navigator.share) { try { await navigator.share({ title: '今天貼什麼？AI 貼圖製造機', text: '生活有百種心情，貼圖不必只有一種。', url }); } catch (e) { /* 取消 */ } }
        else SS.copy(url, '此裝置不支援分享選單，已複製網址');
      });
      $('#sh-dl', el).addEventListener('click', () => cv.toBlob((b) => SS.download(b, 'sticker-studio-qrcode.png')));
    }
  };
  SS.views.install = {
    title: '📲 安裝至手機主畫面',
    render(el) {
      const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
      el.innerHTML = `<div class="card">${standalone ? '<p class="ok">✅ 你已經是從主畫面開啟 App 了！</p>' : ''}
        <button class="btn primary block" id="in-btn" ${SS.deferredInstall ? '' : 'hidden'}>📲 立即安裝</button>
        <h2>Android（Chrome）</h2><ol class="steps"><li>用 Chrome 開啟本網站</li><li>點右上角「⋮」</li><li>選「安裝應用程式」或「加到主畫面」</li></ol>
        <h2>iPhone／iPad（Safari）</h2><ol class="steps"><li>用 Safari 開啟本網站</li><li>點下方「分享」按鈕 <span aria-hidden="true">⬆️</span></li><li>選「加入主畫面」→「新增」</li></ol>
        <h2>電腦（Chrome／Edge）</h2><ol class="steps"><li>網址列右側點「安裝」圖示</li></ol>
        <p class="note">安裝後，加工室、切圖、收藏等本機功能可離線使用；ChatGPT／Gemini 需要連線。</p></div>`;
      $('#in-btn', el).addEventListener('click', async () => {
        if (!SS.deferredInstall) return;
        SS.deferredInstall.prompt(); await SS.deferredInstall.userChoice; SS.deferredInstall = null; $('#in-btn', el).hidden = true;
      });
    }
  };
})();
