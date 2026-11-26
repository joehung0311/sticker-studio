/* 開始製作貼圖（v1.3）：集中式六步驟流程 */
(function () {
  const { $, $$, esc, pick, shuffle } = SS;
  const STEPS = [[1, '類型'], [2, '角色畫風'], [3, '文字語言'], [4, '樣式裝飾'], [5, '張數'], [6, '產生結果']];
  const TYPES = [['photo', '📷', '使用照片', '用自己、家人或寵物的照片'], ['char', '🎨', '原創角色', '不用照片，自己設計角色'], ['text', '🔤', '純文字貼圖', '不用 AI，直接做出 PNG']];
  const defMk = () => ({ step: 1, type: 'char', count: 1, theme: '', items: [], promptLang: 'zh', show: 'all', frame: 'line', bg: '', subject: '我自己', keepNotes: '', decoCount: '1', locks: {}, dlocks: {} });
  const FR = { line: [370, 320, 'LINE 貼圖 370×320'], main: [240, 240, 'LINE 主圖 240×240'], sq: [512, 512, '正方形 512×512'] };
  let photoURL = null; // 照片只存在記憶體，不寫入儲存空間

  SS.views.make = {
    title: '🪄 開始製作貼圖',
    render(el) {
      const d = SS.draft.get();
      if (!d.design) d.design = { font: 'round', color: 'p0', pos: 'bottom', decos: [], shadow: false, vertical: false, sizeRatio: 0.24 };
      if (!d.textLang) d.textLang = 'zh';
      const mk = Object.assign(defMk(), SS.ls.get('make', {}));
      const q = new URLSearchParams((location.hash.split('?')[1] || '')); if (q.get('type')) { mk.type = q.get('type'); mk.step = mk.type === 'text' ? 3 : 2; }
      const save = () => { SS.draft.set(d); SS.ls.set('make', mk); };
      const isText = () => mk.type === 'text';
      const isAI = () => !isText();

      el.innerHTML = `
      <ol class="stepper" aria-label="製作步驟">${STEPS.map(([n, t]) => `<li><button type="button" data-go="${n}"><b>${n}</b><span>${t}</span></button></li>`).join('')}</ol>
      <div class="mk-grid">
        <div class="mk-main">
          <section class="card mk-step" data-step="1">
            <h2>STEP 1｜要做哪一種貼圖？</h2>
            <div class="type-pick" role="radiogroup">${TYPES.map(([k, ic, n, s]) => `<label class="type-opt"><input type="radio" name="mktype" value="${k}"><span><i>${ic}</i><b>${n}</b><small>${s}</small></span></label>`).join('')}</div>
            <div id="mk-photo" class="mt">
              <label class="drop small-drop"><input type="file" id="mk-file" accept="image/*" hidden><div id="mk-photo-empty"><div class="drop-ic">🖼️</div><b>選擇照片</b><small>只在你的裝置顯示，不會上傳</small></div><img id="mk-photo-img" alt="照片預覽" hidden></label>
              <div class="grid2"><label>照片主角<select id="mk-subject"><option>我自己</option><option>家人</option><option>朋友</option><option>寵物</option></select></label>
              <label>特別保留的特徵<input id="mk-keep" placeholder="例如：圓框眼鏡、右耳白斑"></label></div>
            </div>
          </section>

          <section class="card mk-step" data-step="2" hidden>
            <h2>STEP 2｜角色與畫風</h2>
            <div id="mk-charbox">
              <div class="field-label">角色類型</div>
              <div class="chips" id="mk-types">${SS.CHAR_TYPES.map((t) => `<button type="button" class="chip" data-ctype="${t}">${t}</button>`).join('')}</div>
              <label id="mk-ctype-wrap" hidden>自訂角色類型<input id="mk-customType" placeholder="例如：會飛的饅頭"></label>
            </div>
            <div class="field-label">畫風</div>${SS.stylePickerHTML(d.style)}
            <label id="mk-cstyle-wrap" hidden>自訂畫風<input id="mk-customStyle" placeholder="例如：蠟筆塗鴉風"></label>
            <div class="grid2">
              <label>表情<input id="mk-expression" list="mk-dl-exp"></label><label>動作<input id="mk-action" list="mk-dl-act"></label>
              <label>道具<input id="mk-prop" list="mk-dl-prop"></label><label>主要配色<input id="mk-colors" list="mk-dl-col"></label>
            </div>
            <datalist id="mk-dl-exp">${SS.EXPRESSIONS.map((x) => `<option value="${x}">`).join('')}</datalist><datalist id="mk-dl-act">${SS.ACTIONS.map((x) => `<option value="${x}">`).join('')}</datalist>
            <datalist id="mk-dl-prop">${SS.PROPS.map((x) => `<option value="${x}">`).join('')}</datalist><datalist id="mk-dl-col">${SS.PALETTES.map((x) => `<option value="${x}">`).join('')}</datalist>
            <details class="design-box" id="mk-adv"><summary>進階角色設定（名稱、外貌、髮型、服裝、個性）</summary>
              <label>角色名稱<input id="mk-name" maxlength="20"></label><label>外貌特徵<input id="mk-appearance" placeholder="例如：圓臉、大眼睛"></label>
              <div class="grid2"><label>髮型／毛色<input id="mk-hair"></label><label>服裝／配件<input id="mk-outfit"></label></div>
              <label>個性<input id="mk-personality" list="mk-dl-per"></label><datalist id="mk-dl-per">${SS.PERSONALITIES.map((x) => `<option value="${x}">`).join('')}</datalist>
              <button type="button" class="btn sm sage" id="mk-savechar">💾 儲存這個角色（做同系列用）</button>
            </details>
            <div class="field-label">🎁 盲盒隨機搭配（鎖住的不會換）</div>
            <div class="lock-row" id="mk-locks">${[['ctype', '角色'], ['style', '畫風'], ['expression', '表情'], ['action', '動作'], ['prop', '道具'], ['colors', '配色']].map(([k, n]) => `<button type="button" class="lock-chip" data-mlock="${k}">🔓 ${n}</button>`).join('')}</div>
            <button type="button" class="btn sage block" id="mk-blind">🎁 隨機搭配角色與畫風</button>
            <p class="muted small">已儲存的角色可到「我的貼圖收藏 › 角色設定」套用。</p>
          </section>

          <section class="card mk-step" data-step="3" hidden>
            <h2>STEP 3｜文字與語言</h2>
            <div class="grid2"><label>貼圖文字的語言<select id="mk-lang">${SS.LANGS.map((l) => `<option value="${l.id}">${l.name}</option>`).join('')}</select></label>
              <label id="mk-langname-wrap" hidden>語言名稱<input id="mk-langname" placeholder="例如：客語、阿美語" maxlength="20"></label></div>
            <p class="muted small" id="mk-langsrc"></p>
            <div id="mk-picker"></div>
            <div id="mk-home-add" hidden class="design-box"><b>＋ 新增我的家鄉話</b>
              <div class="grid2"><label>家鄉話名稱<input id="mk-hname" placeholder="例如：澎湖話" maxlength="20"></label><label>這句話<input id="mk-htext" maxlength="30"></label></div>
              <label>意思（選填）<input id="mk-hmean" maxlength="40"></label><button type="button" class="btn sm" id="mk-hadd">加入家鄉話詞庫</button>
              <p class="muted small">家鄉話由你自行建立，App 不會查證內容。也可以到「我的貼圖收藏 › 我的家鄉話」管理。</p></div>
            <label class="mt">貼圖文字（可換行）<textarea id="mk-text" rows="2" maxlength="40" placeholder="點上方用語，或直接輸入"></textarea></label>
            <label>第二組文字（選填，較小的字）<input id="mk-text2" maxlength="20"></label>
            <div class="checks"><label class="ck"><input type="checkbox" id="mk-notext"> 無文字</label><button type="button" class="btn xs ghost" id="mk-savetext">⭐ 存成常用文字</button></div>
            <div class="seg ai-only" role="radiogroup" aria-label="文字處理方式"><label><input type="radio" name="mkai" value="0"><span>AI 不畫字，之後由 App 加（最準）</span></label><label><input type="radio" name="mkai" value="1"><span>讓 AI 直接畫字</span></label></div>
          </section>

          <section class="card mk-step" data-step="4" hidden>
            <h2>STEP 4｜文字樣式與裝飾</h2>
            <div class="grid2">
              <label>字體風格<select id="mk-font">${SS.FONTS.map((f) => `<option value="${f.id}">${f.name}</option>`).join('')}</select></label>
              <label>文字配色<select id="mk-color">${SS.PALETTE.map((p, i) => `<option value="p${i}">${p[2]}</option>`).join('')}</select></label>
              <label>文字位置<select id="mk-pos">${Object.entries(SS.TEXT_POS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select></label>
              <label>排列<select id="mk-dir"><option value="h">橫排</option><option value="v">直排</option></select></label>
            </div>
            <div class="field-label">裝飾（最多 3 個）</div>
            <div class="chips" id="mk-decos">${SS.DECOS.map((x) => `<button type="button" class="chip deco-chip" data-dd="${x.id}"><img src="${SS.decoURL(x.id)}" alt="">${x.name}</button>`).join('')}</div>
            <details class="design-box" id="mk-sadv"><summary>進階樣式（自訂顏色、描邊、陰影、大小）</summary>
              <div class="grid3"><label>文字顏色<input type="color" id="mk-cc"></label><label>描邊顏色<input type="color" id="mk-cs"></label><label>描邊粗細<input type="range" id="mk-sw" min="0" max="24"></label></div>
              <label class="ck"><input type="checkbox" id="mk-custom-color"> 使用自訂顏色（取代上方配色）</label>
              <label class="ck"><input type="checkbox" id="mk-shadow"> 文字陰影</label>
              <label class="text-only">文字大小<input type="range" id="mk-size" min="12" max="40"></label>
            </details>
            <div class="field-label">🎲 隨機設計（不會改動文字內容）</div>
            <div class="lock-row" id="mk-dlocks">${[['font', '字體'], ['color', '配色'], ['pos', '位置'], ['deco', '裝飾']].map(([k, n]) => `<button type="button" class="lock-chip" data-dlk="${k}">🔓 ${n}</button>`).join('')}</div>
            <div class="row gap wrap"><select id="mk-dcount" aria-label="隨機裝飾數量"><option value="0">裝飾 0 個</option><option value="1">裝飾 1 個（簡約）</option><option value="2">裝飾 2 個（活潑）</option><option value="3">裝飾 3 個（豐富）</option><option value="r">隨機 1～3 個</option></select><button type="button" class="btn primary" id="mk-rdesign">🎲 隨機設計</button></div>
          </section>

          <section class="card mk-step" data-step="5" hidden>
            <h2>STEP 5｜製作張數</h2>
            <div class="chips" id="mk-count">${SS.PLAN_COUNTS.map((n) => `<button type="button" class="chip" data-n="${n}">${n === 1 ? '單張' : n + ' 張'}${SS.LINE_SPEC.counts.includes(n) ? '<i class="line-ok">LINE</i>' : ''}</button>`).join('')}</div>
            <p class="muted small">標 LINE 的張數符合 LINE 靜態貼圖上架數量；1、4 張適合自用。</p>
            <div id="mk-plan" hidden>
              <div class="row gap wrap"><label class="grow">主題／情境<select id="mk-theme"></select></label><button type="button" class="btn primary" id="mk-gen">🪄 自動規劃</button></div>
              <div class="plan-list" id="mk-items"></div>
            </div>
          </section>

          <section class="card mk-step" data-step="6" hidden>
            <h2>STEP 6｜產生結果</h2>
            <p class="muted small" id="mk-sum"></p>
          </section>
        </div>

        <aside class="mk-side card" id="mk-result" aria-label="結果"></aside>
      </div>
      <div class="mk-nav"><button type="button" class="btn" id="mk-prev">← 上一步</button><span id="mk-stepname"></span><button type="button" class="btn primary" id="mk-next">下一步 →</button></div>`;

      /* ---------- 共用：表單值同步 ---------- */
      const F = ['customType', 'customStyle', 'expression', 'action', 'prop', 'colors', 'name', 'appearance', 'hair', 'outfit', 'personality', 'text2'];
      function fill() {
        $$('input[name=mktype]', el).forEach((r) => { r.checked = r.value === mk.type; });
        $('#mk-subject', el).value = mk.subject; $('#mk-keep', el).value = mk.keepNotes;
        F.forEach((k) => { const e = $('#mk-' + k, el); if (e) e.value = d[k] || ''; });
        $$('#mk-types .chip', el).forEach((b) => b.classList.toggle('on', b.dataset.ctype === d.charType));
        $('#mk-ctype-wrap', el).hidden = d.charType !== '自訂角色'; $('#mk-cstyle-wrap', el).hidden = d.style !== 'custom';
        $$('.style-card', el).forEach((b) => b.classList.toggle('on', b.dataset.style === d.style));
        $('#mk-lang', el).value = d.textLang; $('#mk-langname', el).value = d.textLangName || '';
        $('#mk-text', el).value = d.text || ''; $('#mk-notext', el).checked = !!d.noText;
        $$('input[name=mkai]', el).forEach((r) => { r.checked = r.value === (d.aiText ? '1' : '0'); });
        const g = d.design; $('#mk-font', el).value = g.font || 'round'; $('#mk-color', el).value = g.color || 'p0'; $('#mk-pos', el).value = g.pos || 'bottom'; $('#mk-dir', el).value = g.vertical ? 'v' : 'h';
        $$('#mk-decos .chip', el).forEach((b) => b.classList.toggle('on', (g.decos || []).includes(b.dataset.dd)));
        const pal = SS.PALETTE[+(g.color || 'p0').slice(1)] || SS.PALETTE[0];
        $('#mk-cc', el).value = g.cc || pal[0]; $('#mk-cs', el).value = g.cs || pal[1]; $('#mk-sw', el).value = g.sw !== undefined ? g.sw : 7;
        $('#mk-custom-color', el).checked = !!g.custom; $('#mk-shadow', el).checked = !!g.shadow; $('#mk-size', el).value = Math.round((g.sizeRatio || 0.24) * 100);
        $('#mk-dcount', el).value = mk.decoCount;
        paintLocks();
      }
      function paintLocks() {
        $$('[data-mlock]', el).forEach((b) => { const on = !!mk.locks[b.dataset.mlock]; b.classList.toggle('on', on); b.textContent = (on ? '🔒 ' : '🔓 ') + b.textContent.slice(3); });
        $$('[data-dlk]', el).forEach((b) => { const on = !!mk.dlocks[b.dataset.dlk]; b.classList.toggle('on', on); b.textContent = (on ? '🔒 ' : '🔓 ') + b.textContent.slice(3); });
      }
      function read() {
        mk.subject = $('#mk-subject', el).value; mk.keepNotes = $('#mk-keep', el).value.trim();
        F.forEach((k) => { const e = $('#mk-' + k, el); if (e) d[k] = e.value.trim(); });
        d.text = $('#mk-text', el).value.trim(); d.noText = $('#mk-notext', el).checked;
        d.textLangName = $('#mk-langname', el).value.trim();
        const ai = $('input[name=mkai]:checked', el); d.aiText = ai ? ai.value === '1' : false;
        const g = d.design; g.font = $('#mk-font', el).value; g.color = $('#mk-color', el).value; g.pos = $('#mk-pos', el).value; g.vertical = $('#mk-dir', el).value === 'v';
        g.decos = $$('#mk-decos .chip.on', el).map((b) => b.dataset.dd);
        g.custom = $('#mk-custom-color', el).checked; g.cc = $('#mk-cc', el).value; g.cs = $('#mk-cs', el).value; g.sw = +$('#mk-sw', el).value; g.shadow = $('#mk-shadow', el).checked; g.sizeRatio = +$('#mk-size', el).value / 100;
        mk.decoCount = $('#mk-dcount', el).value;
        d.transparent = true;
        save();
      }

      /* ---------- 步驟切換 ---------- */
      const applicable = (n) => !(n === 2 && isText());
      function go(n) {
        read();
        const prev = mk.step; let t = Math.min(6, Math.max(1, n));
        if (!applicable(t)) t += (t < prev ? -1 : 1);
        mk.step = Math.min(6, Math.max(1, t));
        save(); showStep(); window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      function showStep() {
        $$('.mk-step', el).forEach((s) => { s.hidden = +s.dataset.step !== mk.step; });
        $$('.stepper button', el).forEach((b) => { const n = +b.dataset.go; b.classList.toggle('on', n === mk.step); b.classList.toggle('done', n < mk.step && applicable(n)); b.disabled = !applicable(n); b.title = applicable(n) ? '' : '純文字貼圖不需要這一步'; });
        $('#mk-prev', el).disabled = mk.step === 1;
        $('#mk-next', el).hidden = mk.step === 6;
        $('#mk-stepname', el).textContent = `步驟 ${mk.step}／6・${STEPS[mk.step - 1][1]}`;
        el.classList.toggle('at-result', mk.step === 6);
        $('#mk-photo', el).hidden = mk.type !== 'photo';
        $('#mk-charbox', el).hidden = mk.type === 'photo';
        $$('.ai-only', el).forEach((x) => { x.hidden = !isAI(); });
        $$('.text-only', el).forEach((x) => { x.hidden = isAI(); });
        $('#mk-adv', el).hidden = mk.type === 'photo';
        $('#mk-plan', el).hidden = mk.count === 1;
        $$('#mk-count .chip', el).forEach((b) => b.classList.toggle('on', +b.dataset.n === mk.count));
        if (mk.step === 6) $('#mk-sum', el).textContent = summary();
        renderResult();
      }
      function summary() {
        const t = TYPES.find((x) => x[0] === mk.type)[2];
        return `${t}・${SS.langOf(d.textLang).short}文字「${d.noText ? '無文字' : (d.text || '未填')}」・${mk.count === 1 ? '單張' : mk.count + ' 張'}${isAI() ? '・' + SS.styleName(d) : ''}`;
      }
      $('.stepper', el).addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b && !b.disabled) go(+b.dataset.go); });
      $('#mk-prev', el).addEventListener('click', () => go(mk.step - 1));
      $('#mk-next', el).addEventListener('click', () => go(mk.step + 1));

      /* ---------- STEP 1 ---------- */
      $$('input[name=mktype]', el).forEach((r) => r.addEventListener('change', () => { mk.type = r.value; if (isText()) { d.aiText = false; if (d.design.pos === 'bottom') { d.design.pos = 'mid'; fill(); } } save(); showStep(); }));
      const fileIn = $('#mk-file', el);
      const showPhoto = () => { const img = $('#mk-photo-img', el); if (photoURL) { img.src = photoURL; img.hidden = false; $('#mk-photo-empty', el).hidden = true; } };
      fileIn.addEventListener('change', async () => { const f = fileIn.files[0]; if (!f) return; try { const { url } = await SS.fileToImage(f); if (photoURL) URL.revokeObjectURL(photoURL); photoURL = url; showPhoto(); SS.toast('照片已載入（僅在本機）'); } catch (e) { SS.toast(e.message); } });
      showPhoto();

      /* ---------- STEP 2 ---------- */
      $('#mk-types', el).addEventListener('click', (e) => { const b = e.target.closest('[data-ctype]'); if (!b) return; d.charType = b.dataset.ctype; fill(); read(); renderResult(); });
      SS.bindStylePicker(el, (s) => { d.style = s; $('#mk-cstyle-wrap', el).hidden = s !== 'custom'; save(); renderResult(); });
      $('#mk-locks', el).addEventListener('click', (e) => { const b = e.target.closest('[data-mlock]'); if (!b) return; mk.locks[b.dataset.mlock] = !mk.locks[b.dataset.mlock]; save(); paintLocks(); });
      $('#mk-blind', el).addEventListener('click', () => {
        read(); const L = mk.locks;
        if (!L.ctype && mk.type === 'char') d.charType = pick(SS.CHAR_TYPES.slice(0, 5));
        if (!L.style) d.style = pick(SS.STYLES).id;
        if (!L.expression) d.expression = pick(SS.EXPRESSIONS);
        if (!L.action) d.action = pick(SS.ACTIONS);
        if (!L.prop) d.prop = pick(SS.PROPS);
        if (!L.colors) d.colors = pick(SS.PALETTES);
        save(); fill(); renderResult(); SS.toast('已隨機搭配（鎖住的項目沒有換）');
      });

      $('#mk-savechar', el).addEventListener('click', () => {
        read(); const id = d.charId || SS.uid();
        SS.chars.save({ id, name: d.name, charType: d.charType, customType: d.customType, appearance: d.appearance, hair: d.hair, outfit: d.outfit, colors: d.colors, personality: d.personality, style: d.style, customStyle: d.customStyle, saved: Date.now() });
        d.charId = id; save(); SS.toast('角色已儲存，可在「我的貼圖收藏 › 角色」套用');
      });

      /* ---------- STEP 3 ---------- */
      let picker = null;
      function langUI() {
        $('#mk-langname-wrap', el).hidden = d.textLang !== 'custom';
        $('#mk-home-add', el).hidden = d.textLang !== 'hometown';
        $('#mk-langsrc', el).textContent = '詞庫來源：' + SS.langOf(d.textLang).verified + (d.textLang === 'custom' ? '（請直接輸入文字）' : '');
        $('#mk-picker', el).hidden = d.textLang === 'custom';
        if (d.textLang === 'custom') return;
        if (!picker) picker = SS.phrasePicker($('#mk-picker', el), { lang: d.textLang, uid: 'mk', compact: true, onPick: (x, l) => { $('#mk-text', el).value = x.text; $('#mk-notext', el).checked = false; d.textZh = x.meaning && x.meaning !== x.text ? x.meaning : ''; read(); renderResult(); SS.toast('已選用：' + x.text); } });
        else if (picker.lang !== d.textLang) picker.setLang(d.textLang);
      }
      $('#mk-lang', el).addEventListener('change', (e) => { d.textLang = e.target.value; d.textZh = ''; if (['taigi', 'kinmen'].includes(d.textLang)) { d.aiText = false; $$('input[name=mkai]', el).forEach((r) => { r.checked = r.value === '0'; }); } save(); langUI(); renderResult(); if (mk.count > 1) buildThemes(); });
      $('#mk-text', el).addEventListener('input', () => { d.textZh = ''; });
      $('#mk-hadd', el).addEventListener('click', () => {
        const name = $('#mk-hname', el).value.trim(), t = $('#mk-htext', el).value.trim(); if (!t) return SS.toast('請輸入這句話');
        const h = SS.hometown.get(); if (name) { h.name = name; SS.hometown.set(h); }
        SS.hometown.add(t, $('#mk-hmean', el).value.trim()); $('#mk-htext', el).value = ''; $('#mk-hmean', el).value = '';
        if (picker) picker.refresh(); SS.toast('已加入家鄉話詞庫');
      });
      $('#mk-savetext', el).addEventListener('click', () => { const t = $('#mk-text', el).value.trim(); if (!t) return SS.toast('請先輸入文字'); SS.myTexts.add(t, d.textLang); SS.toast('已存到「我的貼圖收藏 › 常用文字」'); });

      /* ---------- STEP 4 ---------- */
      $('#mk-decos', el).addEventListener('click', (e) => {
        const b = e.target.closest('[data-dd]'); if (!b) return;
        if (!b.classList.contains('on') && $$('#mk-decos .chip.on', el).length >= 3) return SS.toast('最多選 3 個裝飾，避免畫面太亂');
        b.classList.toggle('on'); read(); renderResult();
      });
      $('#mk-dlocks', el).addEventListener('click', (e) => { const b = e.target.closest('[data-dlk]'); if (!b) return; mk.dlocks[b.dataset.dlk] = !mk.dlocks[b.dataset.dlk]; save(); paintLocks(); });
      $('#mk-rdesign', el).addEventListener('click', () => {
        read(); const g = d.design, L = mk.dlocks; const before = [d.text, d.text2];
        if (!L.font) g.font = pick(SS.FONTS.filter((f) => f.id !== 'sans')).id;
        if (!L.color) { g.color = 'p' + Math.floor(Math.random() * SS.PALETTE.length); g.custom = false; g.shadow = Math.random() < 0.3; }
        if (!L.pos) g.pos = pick(['top', 'bottom', 'tl', 'tr', 'bl', 'br', 'mid']);
        if (!L.deco) { const n = mk.decoCount === 'r' ? 1 + Math.floor(Math.random() * 3) : +mk.decoCount; g.decos = shuffle(SS.DECOS.map((x) => x.id)).slice(0, n); }
        [d.text, d.text2] = before; // 隨機設計不改動文字
        save(); fill(); renderResult(); SS.toast('已隨機設計（文字內容沒有改變）');
      });

      /* ---------- STEP 5 ---------- */
      function buildThemes() {
        const sel = $('#mk-theme', el); let opts = '';
        if (d.textLang === 'zh') opts = SS.THEME_NAMES.map((n) => `<option value="zh|${n}">${n}</option>`).join('');
        else if (d.textLang === 'taigi') opts = (SS.taigi.data ? SS.taigi.data.themes : []).map((t) => `<option value="taigi|${t.name}">${t.name}</option>`).join('');
        else if (d.textLang === 'custom') opts = '<option value="custom|">自訂語言：請逐張填寫文字</option>';
        if (!['zh', 'custom'].includes(d.textLang)) {
          const cats = (cache[d.textLang] && cache[d.textLang].categories) || [];
          opts += `<option value="${d.textLang}|">${SS.langOf(d.textLang).short}：全部情境</option>` + cats.map((c) => `<option value="${d.textLang}|${c.id}">${SS.langOf(d.textLang).short}：${esc(c.name)}</option>`).join('');
        }
        sel.innerHTML = opts; if ([...sel.options].some((o) => o.value === mk.theme)) sel.value = mk.theme; else mk.theme = sel.value;
      }
      const cache = {};
      async function prepLang() { if (d.textLang === 'taigi') await SS.taigi.load(); if (!['zh', 'custom'].includes(d.textLang)) cache[d.textLang] = await SS.lang.load(d.textLang); buildThemes(); }
      $('#mk-count', el).addEventListener('click', async (e) => { const b = e.target.closest('[data-n]'); if (!b) return; mk.count = +b.dataset.n; save(); showStep(); if (mk.count > 1) { await prepLang().catch((er) => SS.toast(er.message)); } });
      $('#mk-theme', el).addEventListener('change', (e) => { mk.theme = e.target.value; save(); });
      async function genPlan() {
        await prepLang();
        const [lg, th] = (mk.theme || '').split('|'); const n = mk.count;
        let items = [];
        if (lg === 'zh') items = SS.makePlan(th, n, '').map((x) => Object.assign(x, { lang: 'zh' }));
        else if (lg === 'taigi' && SS.taigi.data && SS.taigi.data.themes.some((t) => t.name === th)) items = SS.makeTaigiPlan(th, n, SS.taigi.mode() === 'custom' ? 'hanji' : SS.taigi.mode());
        else if (lg === 'custom') items = Array.from({ length: n }, (_, i) => ({ text: i === 0 ? d.text : '', lang: 'custom' }));
        else {
          const data = cache[lg] || await SS.lang.load(lg); let pool = shuffle(data.items.filter((x) => !th || x.cat === th));
          if (pool.length < n) pool = pool.concat(shuffle(data.items.filter((x) => !pool.includes(x))));
          if (pool.length < n) SS.toast(`這個詞庫只有 ${pool.length} 句，其餘請自行填寫`);
          items = Array.from({ length: n }, (_, i) => { const x = pool[i]; return { text: x ? x.text : '', zh: x ? (x.meaning !== x.text ? x.meaning : '') : '', lang: lg }; });
        }
        const exps = shuffle(SS.EXPRESSIONS), acts = shuffle(SS.ACTIONS);
        items.forEach((it, i) => { it.expression = it.expression || exps[i % exps.length]; it.action = it.action || acts[i % acts.length]; it.prop = it.prop || '無'; it.composition = it.composition || SS.COMPOSITIONS[i % SS.COMPOSITIONS.length]; });
        mk.items = items; save(); renderItems(); renderResult(); SS.toast(`已規劃 ${items.length} 張`);
      }
      $('#mk-gen', el).addEventListener('click', () => genPlan().catch((e) => SS.toast(e.message)));
      function renderItems() {
        $('#mk-items', el).innerHTML = mk.items.map((it, i) => `
          <div class="plan-item" data-i="${i}"><div class="pi-head"><b>#${i + 1}</b>${it.zh ? `<small class="muted">意思：${esc(it.zh)}</small>` : ''}</div>
            <div class="grid2 tight"><label>文字<input data-f="text" value="${esc(it.text)}" placeholder="空白＝無文字"></label>
            ${isAI() ? `<label>表情<input data-f="expression" list="mk-dl-exp" value="${esc(it.expression)}"></label><label>動作<input data-f="action" list="mk-dl-act" value="${esc(it.action)}"></label><label>道具<input data-f="prop" list="mk-dl-prop" value="${esc(it.prop)}"></label>` : ''}</div></div>`).join('');
      }
      $('#mk-items', el).addEventListener('input', (e) => { const f = e.target.dataset.f, it = e.target.closest('.plan-item'); if (!f || !it) return; mk.items[+it.dataset.i][f] = e.target.value; save(); renderResult(); });

      /* ---------- STEP 6：結果 ---------- */
      const itemD = (it) => Object.assign({}, d, { text: it.text, noText: !it.text, textLang: it.lang || d.textLang, textZh: it.zh || '', expression: it.expression, action: it.action, prop: it.prop });
      const baseD = () => mk.type === 'photo' ? Object.assign({}, d, { charType: mk.subject === '寵物' ? '照片中的寵物' : '照片中的人物', name: '', appearance: '', hair: '', outfit: '', personality: '' }) : d;
      const popt = () => ({ source: mk.type === 'photo' ? 'photo' : 'character', subject: mk.subject === '我自己' ? '我本人' : mk.subject, keepNotes: mk.keepNotes, lang: mk.promptLang });
      function promptText() {
        const b = baseD(); const o = popt();
        if (mk.count === 1 || !mk.items.length) return SS.buildPrompt(b, o);
        const tot = mk.items.length;
        if (mk.show === 'grid2' || mk.show === 'grid3') {
          const n = mk.show === 'grid2' ? 2 : 3, per = n * n, parts = [];
          for (let s = 0; s < tot; s += per) parts.push(`==================== ${o.lang === 'en' ? 'Batch' : '第'} ${s / per + 1} ${o.lang === 'en' ? '' : '批'} ====================\n` + SS.buildGridPrompt(Object.assign({}, b, { textLang: d.textLang }), mk.items.slice(s, s + per), n, n, Object.assign({ series: mk.theme.split('|')[1] }, o)));
          return parts.join('\n\n');
        }
        if (/^\d+$/.test(mk.show)) { const i = +mk.show; return SS.buildPrompt(Object.assign(itemD(mk.items[i]), b === d ? {} : { charType: b.charType }), Object.assign({ index: i + 1, total: tot, composition: mk.items[i].composition }, o)); }
        return mk.items.map((it, i) => `==================== ${o.lang === 'en' ? 'Sticker ' + (i + 1) : '第 ' + (i + 1) + ' 張'} ====================\n` + SS.buildPrompt(Object.assign(itemD(it), mk.type === 'photo' ? { charType: b.charType, name: '', appearance: '', hair: '', outfit: '', personality: '' } : {}), Object.assign({ index: i + 1, total: tot, composition: it.composition }, o))).join('\n\n');
      }
      function renderResult() {
        const box = $('#mk-result', el);
        if (isAI()) {
          if (!box.dataset.mode || box.dataset.mode !== 'ai') {
            box.dataset.mode = 'ai';
            box.innerHTML = `<h2>🪄 AI 生圖提示詞</h2>
              <div class="grid2"><label>提示詞語言<select id="mk-plang"><option value="zh">繁體中文</option><option value="en">English</option></select></label>
              <label id="mk-show-wrap">顯示<select id="mk-show"></select></label></div>
              <p class="muted small">提示詞語言只影響給 AI 的說明文字；貼圖上的文字仍是「<span id="mk-tl"></span>」。</p>
              <textarea id="mk-prompt" class="prompt-text" rows="12" aria-label="提示詞"></textarea>
              <div class="btn-row"><button type="button" class="btn primary" data-pa="copy">📋 複製</button>
                <a class="btn" data-pa="gpt" href="https://chatgpt.com/" target="_blank" rel="noopener">複製並開啟 ChatGPT</a>
                <a class="btn" data-pa="gemini" href="https://gemini.google.com/app" target="_blank" rel="noopener">複製並開啟 Gemini</a>
                <button type="button" class="btn ghost" data-pa="dl">⬇️ TXT</button></div>
              <p class="note small" id="mk-photo-tip" hidden>📷 到 ChatGPT／Gemini 時請<b>重新上傳同一張照片</b>，App 不會替你上傳。</p>
              <div class="import-box"><b>生成好了嗎？</b>
                <div class="btn-row"><label class="btn sage">📥 匯入 AI 圖片到加工室<input type="file" id="mk-imp" accept="image/*" hidden></label>
                <label class="btn">🧩 匯入宮格圖去切圖<input type="file" id="mk-impgrid" accept="image/*" hidden></label></div></div>`;
            $('#mk-plang', box).addEventListener('change', (e) => { mk.promptLang = e.target.value; save(); renderResult(); });
            $('#mk-show', box).addEventListener('change', (e) => { mk.show = e.target.value; save(); renderResult(); });
            box.addEventListener('click', (e) => {
              const b = e.target.closest('[data-pa]'); if (!b) return; const t = $('#mk-prompt', box).value;
              if (b.dataset.pa === 'copy') SS.copy(t, '提示詞已複製');
              if (b.dataset.pa === 'gpt' || b.dataset.pa === 'gemini') SS.copy(t, '已複製，請在新分頁貼上提示詞');
              if (b.dataset.pa === 'dl') SS.downloadText(t, `sticker-prompt-${SS.ts()}.txt`);
            });
            $('#mk-imp', box).addEventListener('change', (e) => { const f = e.target.files[0]; if (!f) return; SS.handoffEditor = { blob: f, name: f.name }; location.hash = '#editor'; });
            $('#mk-impgrid', box).addEventListener('change', (e) => { const f = e.target.files[0]; if (!f) return; SS.handoffEditor = { blob: f, name: f.name, then: 'split' }; location.hash = '#editor'; });
          }
          $('#mk-plang', box).value = mk.promptLang;
          const show = $('#mk-show', box); $('#mk-show-wrap', box).hidden = mk.count === 1 || !mk.items.length;
          if (mk.count > 1 && mk.items.length) {
            show.innerHTML = `<option value="all">整套（${mk.items.length} 張逐張）</option><option value="grid2">宮格 2×2（一次 4 張）</option><option value="grid3">宮格 3×3（一次 9 張）</option>` + mk.items.map((_, i) => `<option value="${i}">第 ${i + 1} 張</option>`).join('');
            if (![...show.options].some((o) => o.value === mk.show)) mk.show = 'all'; show.value = mk.show;
          }
          $('#mk-tl', box).textContent = SS.langLabel(d, false);
          $('#mk-photo-tip', box).hidden = mk.type !== 'photo';
          const ta = $('#mk-prompt', box); if (document.activeElement !== ta) ta.value = promptText();
          if (mk.count > 1 && !mk.items.length) ta.value = (mk.promptLang === 'en' ? '(Go to STEP 5 and press 自動規劃 first)\n\n' : '（請先到 STEP 5 按「自動規劃」）\n\n') + SS.buildPrompt(baseD(), popt());
        } else renderText(box);
      }

      /* 純文字貼圖：本機預覽與輸出 */
      let tCtx = null;
      const tOpts = (text, text2) => { const g = d.design; const pal = SS.PALETTE[+(g.color || 'p0').slice(1)] || SS.PALETTE[0]; return { text, text2, font: g.font, color: g.custom ? g.cc : pal[0], stroke: g.custom ? g.cs : pal[1], strokeW: g.custom ? g.sw : undefined, shadow: g.shadow, pos: g.pos, vertical: g.vertical, sizeRatio: g.sizeRatio, decos: g.decos }; };
      const textList = () => (mk.count > 1 && mk.items.length) ? mk.items.map((it) => it.text) : [d.noText ? '' : d.text];
      function layersFor(text, w, h) { if (!tCtx) tCtx = document.createElement('canvas').getContext('2d'); const ls = SS.R.buildTextLayers(tCtx, w, h, tOpts(text, mk.count === 1 ? d.text2 : '')); return ls; }
      async function renderText(box) {
        if (box.dataset.mode !== 'text') {
          box.dataset.mode = 'text';
          box.innerHTML = `<h2>🔤 即時預覽</h2>
            <div class="grid2"><label>尺寸<select id="mk-frame">${Object.entries(FR).map(([k, v]) => `<option value="${k}">${v[2]}</option>`).join('')}</select></label>
            <label>背景<select id="mk-bg"><option value="">透明</option><option value="#FFFFFF">白色</option><option value="#FFF8EE">奶油白</option><option value="#FFE3D2">蜜桃粉</option><option value="#E6F0E2">鼠尾草綠</option></select></label></div>
            <div class="canvas-wrap checker"><canvas id="mk-cv" aria-label="文字貼圖預覽"></canvas></div>
            <div class="btn-row"><button type="button" class="btn primary" id="mk-png">⬇️ 下載 PNG</button><button type="button" class="btn sage" id="mk-toeditor">✂️ 到加工室微調</button><button type="button" class="btn" id="mk-save">💗 存到收藏</button></div>
            <div id="mk-batch" hidden><div class="field-label">整套預覽</div><div class="tiles" id="mk-tiles"></div>
              <label class="ck"><input type="checkbox" id="mk-extra" checked> ZIP 內附主圖 main.png 與標籤圖 tab.png（用第 1 張）</label>
              <div class="btn-row"><button type="button" class="btn primary" id="mk-zip">📦 全部下載 ZIP</button><button type="button" class="btn" id="mk-saveall">💗 全部存到收藏</button></div></div>
            <p class="note small">純文字貼圖完全在你的裝置上產生，不需要外部 AI。</p>`;
          $('#mk-frame', box).addEventListener('change', (e) => { mk.frame = e.target.value; save(); renderResult(); });
          $('#mk-bg', box).addEventListener('change', (e) => { mk.bg = e.target.value; save(); renderResult(); });
          const one = async () => { const [w, h] = FR[mk.frame]; return SS.R.renderToCanvas(w, h, layersFor(textList()[0], w, h), mk.bg); };
          $('#mk-png', box).addEventListener('click', async () => SS.download(await SS.canvasToBlob(await one()), `text-sticker-${SS.ts()}.png`));
          $('#mk-save', box).addEventListener('click', async () => { await SS.saveSticker(await SS.canvasToBlob(await one()), textList()[0] || '文字貼圖', '文字貼圖'); SS.toast('已存到收藏 💗'); });
          $('#mk-toeditor', box).addEventListener('click', () => { const [w, h] = FR[mk.frame]; SS.handoffLayers = { layers: layersFor(textList()[0], w, h), frame: mk.frame, bg: mk.bg, name: 'text-sticker' }; location.hash = '#editor'; });
          const all = async () => { const [w, h] = FR.line; const out = []; for (const [i, t] of textList().entries()) { const cv = await SS.R.renderToCanvas(w, h, layersFor(t, w, h), mk.bg); out.push({ name: String(i + 1).padStart(2, '0') + '.png', blob: await SS.canvasToBlob(cv), cv }); } return out; };
          $('#mk-zip', box).addEventListener('click', async () => {
            if (!window.JSZip) return SS.toast('ZIP 元件載入失敗'); SS.toast('製作中…');
            const files = await all(); const zip = new JSZip(); files.forEach((f) => zip.file(f.name, f.blob));
            if ($('#mk-extra', box).checked && files[0]) { zip.file('main.png', await SS.canvasToBlob(SS.fitInto(files[0].cv, 240, 240, 10).canvas)); zip.file('tab.png', await SS.canvasToBlob(SS.fitInto(files[0].cv, 96, 74, 2).canvas)); }
            const blob = await zip.generateAsync({ type: 'blob' }); SS.download(blob, `text-stickers-${SS.ts()}.zip`); SS.toast(`已下載 ${files.length} 張`);
          });
          $('#mk-saveall', box).addEventListener('click', async () => { const files = await all(); for (const [i, f] of files.entries()) await SS.saveSticker(f.blob, textList()[i] || `文字貼圖 ${i + 1}`, '文字貼圖'); SS.toast(`已存 ${files.length} 張到收藏`); });
        }
        $('#mk-frame', box).value = mk.frame; $('#mk-bg', box).value = mk.bg;
        const [w, h] = FR[mk.frame]; const cv = $('#mk-cv', box);
        const src = await SS.R.renderToCanvas(w, h, layersFor(textList()[0], w, h), mk.bg);
        cv.width = w; cv.height = h; cv.getContext('2d').drawImage(src, 0, 0);
        const multi = mk.count > 1 && mk.items.length; $('#mk-batch', box).hidden = !multi;
        if (multi) {
          const tiles = $('#mk-tiles', box); const [lw, lh] = FR.line; const list = textList(); tiles.innerHTML = list.map((t, i) => `<div class="tile checker"><canvas data-ti="${i}" width="${lw}" height="${lh}"></canvas><span>${String(i + 1).padStart(2, '0')}</span></div>`).join('');
          for (const [i, t] of list.entries()) { const c = await SS.R.renderToCanvas(lw, lh, layersFor(t, lw, lh), mk.bg); const tc = $(`[data-ti="${i}"]`, tiles); if (tc) tc.getContext('2d').drawImage(c, 0, 0); }
        }
      }

      /* 任何欄位變動都即時儲存並更新結果 */
      let tmr = null;
      el.addEventListener('input', (e) => { if (e.target.closest('#mk-result') || e.target.closest('#mk-picker') || e.target.closest('#mk-items')) return; read(); clearTimeout(tmr); tmr = setTimeout(renderResult, 150); });
      el.addEventListener('change', (e) => { if (e.target.closest('#mk-result') || e.target.closest('#mk-picker') || e.target.name === 'mktype') return; read(); renderResult(); });

      fill(); langUI(); if (mk.count > 1) prepLang().then(() => { if (mk.items.length) renderItems(); }).catch(() => {}); showStep();
    }
  };
})();
