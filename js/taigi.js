/* 台語貼圖專區：資料載入（data/taigi.json）、文字模式、搜尋、收藏、整合 */
(function () {
  const { $, $$, esc, pick, shuffle } = SS;

  SS.TAIGI_MODES = [
    ['hanji', '台語正字'], ['pun', '趣味諧音'], ['zh', '華語'], ['mix', '台華混搭'], ['custom', '自訂文字']
  ];
  SS.views = SS.views || {};
  const CHECK_LABEL = { headword: '✓ 辭典詞目', example: '✓ 辭典例句', words: '✓ 逐詞查核', manual: '⚠ 人工確認' };

  /* ---------- 資料 ---------- */
  let cache = null, pending = null;
  SS.taigi = {
    load() {
      if (cache) return Promise.resolve(cache);
      if (!pending) {
        pending = fetch('data/taigi.json', { cache: 'no-cache' })
          .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then((d) => {
            d.catById = Object.fromEntries(d.categories.map((c) => [c.id, c]));
            d.byId = Object.fromEntries(d.phrases.map((p) => [p.id, p]));
            cache = d; return d;
          })
          .catch((e) => { pending = null; throw new Error('台語用語資料載入失敗（' + e.message + '）。若是直接開啟本機檔案，請改用網站或本機伺服器開啟。'); });
      }
      return pending;
    },
    get data() { return cache; },
    mode: () => SS.ls.get('taigiMode', 'hanji'),
    setMode: (m) => SS.ls.set('taigiMode', m),
    favs: () => SS.ls.get('taigiFav', []),
    toggleFav(id) { const f = SS.taigi.favs(); const i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.unshift(id); SS.ls.set('taigiFav', f); return i < 0; },
    /* 依模式取文字；沒有對應寫法時退回正字並註明 */
    text(p, mode = SS.taigi.mode()) {
      if (mode === 'pun') return p.pun ? { text: p.pun, kind: 'pun' } : { text: p.hanji, kind: 'hanji', fallback: '此句沒有常見諧音寫法，顯示台語正字' };
      if (mode === 'zh') return { text: p.zh.split('；')[0], kind: 'zh' };
      if (mode === 'mix') return p.mix ? { text: p.mix, kind: 'mix' } : { text: p.hanji, kind: 'hanji', fallback: '此句沒有台華混搭版本，顯示台語正字' };
      return { text: p.hanji, kind: 'hanji' };
    },
    random(pool) { const d = cache; return pick(pool || d.phrases); },
    search(q, catId) {
      const d = cache; const k = (q || '').trim().toLowerCase();
      let list = d.phrases;
      if (catId === 'fav') { const f = SS.taigi.favs(); list = f.map((id) => d.byId[id]).filter(Boolean); }
      else if (catId) list = list.filter((p) => p.cat === catId);
      if (k) list = list.filter((p) => [p.hanji, p.pun, p.zh, p.mix, p.tl].some((v) => v && v.toLowerCase().includes(k)));
      return list;
    }
  };
  const KIND_LABEL = { hanji: '台語正字', pun: '趣味諧音・非標準台語', zh: '華語', mix: '台華混搭', custom: '自訂文字' };
  SS.taigiKindLabel = (k) => KIND_LABEL[k] || '';

  /* 把一句台語用語寫進目前草稿（之後在加工室加字最準） */
  SS.applyTaigiToDraft = function (p, text, kind) {
    SS.draft.set({ text, noText: false, textLang: kind === 'zh' ? 'zh' : 'taigi', textKind: kind, taigiId: p ? p.id : null, textZh: p ? p.zh : '', aiText: false });
  };

  /* ---------- 可疑簡體字與裝置缺字檢查 ---------- */
  const SIMP = '们这个说话时对吗么来会为见门东车钱谢欢爱乐处号单发气头买卖钟边过还进远运样无从众优伤伦体佣侠俭债倾偿储儿关兴养兽内册写军农决况冻净凉减凤凭击凿刘则刚创删别刮制剂剑剧劝办务动励劳势勋区医华协单卢卫厂厅历压厌县参双变叙叠叶号叹吓吕吗启吴呐员呜咏咙哑响哗唤啰啸喷嘱团园围图圆圣场坏块坚坛坝坞坟坠垒垦垫埘墙壮声壳处备复够头夹夺奋奥妆妇妈妩娄娱婴宁宝实宠审宪宫宽宾对寻导寿将尔尘尝层属岁岂岗岛岭峡币师帐帘带帮库应庙庞废开异弃张弥弯归当录彻径忆忧怀态怂怜总恋恳恶恼悦悬惊惧惨惭惯愤愿戏战户扑执扩扫扬扰抚抛抢护报担拟拥择挂挡挣挤挥损捡换捣据掳掷揽搀摄摆摇摊撑撵擞攒敌数斋斩断无旧时旷昼显晋晒晓晕暂术机杀杂权条来杨极构枪柜栋栏树样档桥梦检棂椭楼标栈欧欢歼残殴毁毕毙毡气汇汉污汤沟没沥沦沧沪泪泼泽洁洒浅浆浇浊测济浏浑浓涛涝涡涣润涩涨渊渐渔渗温湾湿溃满滥滨滩滞潇潜灭灯灵灾灿炉炖炮点炼烁烂烦烧烫热焕爱爷牍牵牺犹狈狞独狭狮猎猪猫献环现玛琐电画畅疗疮疯痒痴瘾癫盏盐监盘码础硕碍碱礼祸离种积称稳穷窃窍窜竞笔笋笼筑筛签简箩粮紧纠红纤约级纪纫纬纯纱纲纳纵纷纸纹纺线练组细织终绍经绑结绕绘给络绝统绢绣继绩续绳维绵综绿缓编缘缩缴网罗罚罢羡翘耻聋职联聪肃肠肤肾肿胀胁胆胜胶脏脑脚脱脸腻舆舰舱艰艳艺节芜芦苇苍苏苹茎茧荆荐荡荣药莱莲获莹营萝萧蓝蔼蕴虏虑虚虫虽蚀蚁蚂蛮补衬袄袜装裤见观规视览觉触誉计订认讨让训议讯记讲许论设访证评识诈诉诊词译试诗诚话诞询该详语误诱说请诸诺读课谁调谈谊谋谎谐谜谢谣谦谨谱贝负贡财责贤败账货质贩贪贫购贯贱贴贵贷贸费贺贼贾资赋赌赏赐赔赖赚赛赞赠赶趋跃践踪轨轩转轮软轰轻载较辆辈辉辑输辩边辽达迁过迈运还进远违连迟选逊递逻遗邓邮邻郑酱酿释针钓钝钞钢钥钱钻铁铃铅铜铭铺链销锁锅锋错锡锤锦键锻镇镜长门闪闭问闯闲间闷闹闻阅阔队阳阴阵阶际陆陈陕险随隐隶难雾静页顶顷项顺须顽顾顿颁预领颇频颈题颜额风飘飞饥饭饮饰饱饲饶饼馆馈首驱驳驻驾骂验骑骗骚骤鱼鲁鲜鸟鸡鸣鸭鹅鹰麦黄齐齿龄龙龟';
  SS.findSimplified = (s) => Array.from(new Set(Array.from(s || '').filter((c) => SIMP.includes(c))));
  /* 以 Canvas 比對「缺字方塊」，找出這台裝置字型畫不出來的字 */
  SS.findMissingGlyphs = function (s, font = '40px sans-serif') {
    const chars = Array.from(new Set(Array.from(s || '').filter((c) => /\S/.test(c) && c.charCodeAt(0) > 0x2E7F)));
    if (!chars.length) return [];
    const cv = document.createElement('canvas'); cv.width = cv.height = 48; const c = cv.getContext('2d', { willReadFrequently: true });
    const sig = (ch) => { c.clearRect(0, 0, 48, 48); c.font = font; c.textBaseline = 'top'; c.fillStyle = '#000'; c.fillText(ch, 2, 2); return c.getImageData(0, 0, 48, 48).data.join(''); };
    const tofu = [sig('\u{10FFFD}'), sig('\u{E01EF}'), sig('￿')];
    return chars.filter((ch) => tofu.includes(sig(ch)));
  };

  /* ---------- 台語用語挑選器（共用元件） ---------- */
  SS.taigiPickerHTML = function (d) {
    const m = SS.taigi.mode();
    return `
      <div class="seg mode-seg" role="radiogroup" aria-label="文字模式">${SS.TAIGI_MODES.map(([k, n]) => `<label><input type="radio" name="tgmode" value="${k}" ${k === m ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div>
      <div class="row gap mt"><input type="search" id="tg-q" placeholder="🔍 搜尋台語、華語或諧音" class="grow"><button class="btn ghost nowrap" id="tg-rand">🎲 隨機</button></div>
      <div class="chips cat-tabs mt" id="tg-cats"><button class="chip on" data-cat="">全部</button><button class="chip" data-cat="fav">⭐ 收藏</button>${d.categories.map((c) => `<button class="chip" data-cat="${c.id}">${c.emoji} ${esc(c.name)}</button>`).join('')}</div>
      <p class="muted small" id="tg-count"></p>
      <div class="tg-list" id="tg-list"></div>`;
  };
  SS.bindTaigiPicker = function (root, onPick) {
    const d = SS.taigi.data; let cat = '';
    const render = () => {
      const m = SS.taigi.mode(); const list = SS.taigi.search($('#tg-q', root).value, cat); const fav = SS.taigi.favs();
      $('#tg-count', root).textContent = `共 ${list.length} 句`;
      $('#tg-list', root).innerHTML = list.length ? list.map((p) => {
        const t = SS.taigi.text(p, m === 'custom' ? 'hanji' : m);
        return `<div class="tg-item" data-id="${p.id}" role="button" tabindex="0">
          <div class="tg-main"><b>${esc(t.text)}</b>${t.kind === 'pun' ? '<i class="tag pun">諧音</i>' : ''}</div>
          <div class="tg-sub">${t.kind !== 'hanji' ? `<span>正字：${esc(p.hanji)}</span>` : ''}<span>華語：${esc(p.zh)}</span>${p.tl ? `<span class="tl">${esc(p.tl.trim())}</span>` : ''}</div>
          <div class="tg-foot"><small class="ck-${p.check}">${CHECK_LABEL[p.check]}</small><small class="muted">${d.catById[p.cat].emoji} ${esc(d.catById[p.cat].name)}</small>
          <button class="star" data-fav="${p.id}" aria-label="收藏">${fav.includes(p.id) ? '⭐' : '☆'}</button></div></div>`;
      }).join('') : `<div class="empty">${cat === 'fav' ? '還沒有收藏，點 ☆ 收藏常用語' : '找不到符合的用語'}</div>`;
    };
    root.addEventListener('click', (e) => {
      const f = e.target.closest('[data-fav]'); if (f) { e.stopPropagation(); const on = SS.taigi.toggleFav(f.dataset.fav); SS.toast(on ? '已加入收藏' : '已取消收藏'); render(); return; }
      const c = e.target.closest('#tg-cats [data-cat]'); if (c) { cat = c.dataset.cat; $$('#tg-cats .chip', root).forEach((x) => x.classList.toggle('on', x === c)); render(); return; }
      const it = e.target.closest('.tg-item'); if (it) { onPick(d.byId[it.dataset.id]); return; }
      if (e.target.closest('#tg-rand')) { const l = SS.taigi.search($('#tg-q', root).value, cat); onPick(pick(l.length ? l : d.phrases)); }
    });
    root.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('tg-item')) onPick(d.byId[e.target.dataset.id]); });
    $('#tg-q', root).addEventListener('input', render);
    root.addEventListener('change', (e) => { if (e.target.name === 'tgmode') { SS.taigi.setMode(e.target.value); render(); } });
    render();
    return { render };
  };

  /* ---------- 頁面：台語貼圖專區 ---------- */
  SS.views.taigi = {
    title: '🧋 台語貼圖專區',
    render(el) {
      el.innerHTML = `<div class="card"><p class="muted">載入台語用語中…</p></div>`;
      SS.taigi.load().then((d) => {
        el.innerHTML = `
        <div class="card tg-hero">
          <h2>講台語嘛會通！</h2>
          <p class="small">共 <b>${d.phrases.length}</b> 句台語生活用語、${d.categories.length} 種情境。台語正字參考<a href="${d.reference.url}" target="_blank" rel="noopener">教育部《臺灣台語常用詞辭典》</a>，並以辭典開放資料逐條比對。</p>
          <p class="note small">📌 <b>台語正字</b>＝教育部推薦用字；<b>趣味諧音</b>＝網路常見寫法（如「母湯」），<b>不是標準台語</b>，兩者分開標示。</p>
        </div>
        <div class="card">${SS.taigiPickerHTML(d)}</div>
        <div id="tg-sheet" class="tg-sheet" hidden></div>`;
        const sheet = $('#tg-sheet', el);
        const show = (p) => {
          const m = SS.taigi.mode(); const t = m === 'custom' ? { text: p.hanji, kind: 'custom' } : SS.taigi.text(p, m);
          sheet.hidden = false;
          sheet.innerHTML = `
            <div class="sheet-head"><span class="tag">${esc(SS.taigiKindLabel(t.kind))}</span><button class="modal-close" id="sh-x" aria-label="關閉">✕</button></div>
            ${m === 'custom' ? `<input id="sh-text" value="${esc(t.text)}" maxlength="20" aria-label="自訂文字">` : `<div class="picked-text">${esc(t.text)}</div>`}
            ${t.fallback ? `<p class="muted small">${esc(t.fallback)}</p>` : ''}
            <p class="muted small">正字：${esc(p.hanji)}　華語：${esc(p.zh)}${p.tl ? '　臺羅：' + esc(p.tl.trim()) : ''}</p>
            ${p.note ? `<p class="muted small">${esc(p.note)}</p>` : ''}
            <div class="btn-row">
              <button class="btn primary" data-go="character">🎨 做成角色貼圖</button>
              <button class="btn" data-go="photo">📸 照片變貼圖</button>
              <button class="btn" data-go="editor">✂️ 加工室加字</button>
              <button class="btn" data-go="blindbox">🎁 放進盲盒</button>
              <button class="btn ghost" data-go="copy">📋 複製</button>
            </div>`;
          sheet.dataset.id = p.id; sheet.dataset.kind = t.kind;
          sheet.classList.remove('pop'); void sheet.offsetWidth; sheet.classList.add('pop');
        };
        SS.bindTaigiPicker(el, show);
        sheet.addEventListener('click', (e) => {
          if (e.target.closest('#sh-x')) { sheet.hidden = true; return; }
          const g = e.target.closest('[data-go]'); if (!g) return;
          const p = d.byId[sheet.dataset.id]; const kind = sheet.dataset.kind;
          const text = $('#sh-text', sheet) ? $('#sh-text', sheet).value.trim() : $('.picked-text', sheet).textContent;
          if (!text) return SS.toast('請輸入文字');
          if (g.dataset.go === 'copy') return SS.copy(text);
          if (g.dataset.go === 'editor') { SS.ls.set('pendingText', text); location.hash = '#editor'; return; }
          if (g.dataset.go === 'blindbox') {
            const st = SS.ls.get('blindbox', {}) || {}; st.text = { label: text, lang: 'taigi', id: p.id };
            const locks = SS.ls.get('blindboxLocks', {}); locks.text = true;
            SS.ls.set('blindbox', st); SS.ls.set('blindboxLocks', locks); SS.ls.set('blindboxLang', 'taigi');
            SS.toast('已放進盲盒並鎖定這句話；想換句子時點綠色卡片解鎖', 3500);
            location.hash = '#blindbox'; return;
          }
          SS.applyTaigiToDraft(p, text, kind);
          SS.toast('已套用。台語字由加工室加上最準確');
          location.hash = '#' + g.dataset.go;
        });
      }).catch((e) => { el.innerHTML = `<div class="card"><p class="warn">${esc(e.message)}</p></div>`; });
    }
  };
})();
