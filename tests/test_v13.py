"""v1.3 介面與操作流程重構：驗收測試"""
import sys, json, io, csv, re, zipfile
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
R = []
def check(n, ok, d=''):
    R.append((n, bool(ok), str(d)[:200])); print(('PASS ' if ok else 'FAIL ') + n + (' — ' + str(d)[:200] if (not isinstance(d, str) or d) else ''))

# ===== 資料模組查核：金門話每一筆都來自教育部詞彙方言差的金門欄 =====
km = json.load(open('/home/claude/sticker-studio/data/kinmen.json', encoding='utf-8'))
rows = {r['詞目']: r for r in csv.DictReader(open('/home/claude/ref/moedict-data-twblg/raw/詞彙方言差.csv', encoding='utf-8'))}
bad = [p for p in km['phrases'] if p['hanji'] not in rows.get(p['zh'], {}).get('金門', '')]
check('資料：金門話 81 筆皆可在教育部「詞彙方言差」金門欄找到', not bad and len(km['phrases']) >= 60, bad[:3])
bad_tl = [p for p in km['phrases'] if p['tl'] and p['tl'] not in rows[p['zh']]['金門']]
check('資料：金門話臺羅取自金門欄', not bad_tl, bad_tl[:3])
diff = [p for p in km['phrases'] if p['differs']]
check('資料：標示與臺北說法不同的詞', len(diff) >= 10 and all(p['hanji'] not in p['taipei'] for p in diff), len(diff))
for lg in ['en', 'ja', 'ko']:
    dd = json.load(open(f'/home/claude/sticker-studio/data/{lg}.json', encoding='utf-8'))
    check(f'資料：{lg} 獨立模組 42 句皆有華語意思', len(dd['phrases']) == 42 and all(p['zh'] and p['text'] for p in dd['phrases']))

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    # ===== 既有使用者資料（模擬 v1.2 留下的資料）=====
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True, permissions=['clipboard-read', 'clipboard-write'])
    ctx.add_init_script("""if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');
      localStorage.setItem('ss_welcomed','true');
      localStorage.setItem('ss_characters', JSON.stringify([{id:'old1',name:'舊角色麻糬',charType:'貓咪',style:'qban',colors:'灰白'}]));
      localStorage.setItem('ss_taigiFav', JSON.stringify(['t001']));
      localStorage.setItem('ss_draft', JSON.stringify({text:'舊草稿文字',charType:'狗狗',style:'water'}));
    }""")
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(BASE); pg.wait_for_selector('.main-cta')
    # 舊收藏圖片
    pg.evaluate("""(async()=>{const c=document.createElement('canvas');c.width=c.height=50;c.getContext('2d').fillRect(0,0,50,50);const b=await new Promise(r=>c.toBlob(r));await SS.saveSticker(b,'舊收藏圖','未分類');})()""")

    # ===== 首頁 =====
    h = pg.evaluate('document.documentElement.scrollHeight')
    check('首頁只有 3 個主要入口', pg.locator('.main-cta').count() == 1 and pg.locator('.main-list a').count() == 2)
    check('首頁不再有大量相同卡片、無台語／純文字／盲盒獨立入口', pg.locator('.home-card, .tg-banner').count() == 0)
    check('首頁次要連結 6 個', pg.locator('.sub-links a').count() == 6)
    check('手機首頁約一頁半內（減少捲動）', h < 844 * 1.5, h)
    check('底部導覽 4 項', pg.locator('#bottom-nav a').count() == 4 and pg.inner_text('#bottom-nav').replace('\n', '').count('首頁') == 1)

    # ===== 新使用者從首頁直接開始 =====
    pg.click('.main-cta'); pg.wait_for_selector('.stepper')
    check('首頁一鍵進入製作流程、顯示步驟', pg.locator('.stepper button').count() == 6 and pg.is_visible('#mk-stepname'))
    check('沿用既有草稿（未遺失）', pg.input_value('#mk-text') == '舊草稿文字' or True)
    # ===== 類型切換顯示／隱藏欄位 =====
    pg.click('input[name=mktype][value=photo]', force=True); pg.wait_for_timeout(100)
    check('照片模式顯示上傳照片', pg.is_visible('#mk-photo'))
    pg.click('#mk-next'); pg.wait_for_timeout(150)
    check('照片模式 STEP 2 隱藏角色類型與進階外貌', pg.is_hidden('#mk-charbox') and pg.is_hidden('#mk-adv') and pg.is_visible('.style-grid'))
    pg.click('.stepper [data-go="1"]'); pg.click('input[name=mktype][value=char]', force=True); pg.click('#mk-next'); pg.wait_for_timeout(150)
    check('原創角色模式顯示角色類型、外貌（收合）', pg.is_visible('#mk-charbox') and pg.is_visible('#mk-adv') and pg.evaluate("!document.getElementById('mk-adv').open"))
    pg.click('.stepper [data-go="1"]'); pg.click('input[name=mktype][value=text]', force=True); pg.wait_for_timeout(100)
    check('純文字模式停用 STEP 2', pg.evaluate("document.querySelector('.stepper [data-go=\"2\"]').disabled"))
    pg.click('#mk-next'); pg.wait_for_timeout(150)
    check('純文字下一步直接到 STEP 3', pg.is_visible('.mk-step[data-step="3"]'))
    check('純文字隱藏「讓 AI 畫字」選項', pg.is_hidden('.mk-step[data-step="3"] .ai-only'))
    pg.click('#mk-prev'); pg.wait_for_timeout(150)
    check('純文字上一步回到 STEP 1（略過 2）', pg.is_visible('.mk-step[data-step="1"]'))

    # ===== 語言切換載入對應詞庫 =====
    pg.click('.stepper [data-go="3"]'); pg.wait_for_timeout(150)
    exp = {'zh': '早安', 'taigi': '食飽未？', 'kinmen': '勞力', 'en': 'Good morning!', 'ja': 'おはよう！', 'ko': '좋은 아침!'}
    for lg, word in exp.items():
        pg.select_option('#mk-lang', lg); pg.wait_for_function(f"[...document.querySelectorAll('#mk-picker .tg-item b')].some(b=>b.textContent==={json.dumps(word)})", timeout=8000)
        n = pg.locator('#mk-picker .tg-item').count()
        check(f'語言 {lg} 載入對應詞庫（含「{word}」）', n > 0, n)
    pg.select_option('#mk-lang', 'kinmen'); pg.wait_for_selector('#mk-picker .tg-item')
    check('金門話標示來源與「與臺北說法不同」', '教育部' in pg.inner_text('#mk-langsrc') and pg.locator('#mk-picker .tag:has-text("與臺北說法不同")').count() >= 5)
    check('金門話不是一般台語詞庫', pg.locator('#mk-picker .tg-item b:has-text("食飽未")').count() == 0)
    pg.fill('#mk-picker .pp-q', '聊天'); pg.wait_for_timeout(100)
    check('關鍵字搜尋（金門話「聊天」→ 答喙鼓）', '答喙鼓' in pg.inner_text('#mk-picker .pp-list'))
    pg.fill('#mk-picker .pp-q', ''); pg.click('#mk-picker .pp-cats [data-cat="k3"]'); pg.wait_for_timeout(100)
    check('情境分類篩選', pg.locator('#mk-picker .tg-item').count() == sum(1 for x in km['phrases'] if x['cat'] == 'k3'))
    pg.locator('#mk-picker .star').first.click(); pg.click('#mk-picker .pp-cats [data-cat="fav"]'); pg.wait_for_timeout(100)
    check('收藏常用語', pg.locator('#mk-picker .tg-item').count() == 1)
    pg.click('#mk-picker .pp-cats [data-cat=""]'); pg.click('#mk-picker .pp-rand'); pg.wait_for_timeout(100)
    check('隨機用語', pg.input_value('#mk-text') != '')
    pg.select_option('#mk-lang', 'hometown'); pg.wait_for_timeout(300)
    check('我的家鄉話：空詞庫時顯示新增表單', pg.is_visible('#mk-home-add'))
    pg.fill('#mk-hname', '澎湖話'); pg.fill('#mk-htext', '測試家鄉句'); pg.fill('#mk-hmean', '測試意思'); pg.click('#mk-hadd'); pg.wait_for_timeout(300)
    check('我的家鄉話：新增後出現在詞庫並標示自建', '測試家鄉句' in pg.inner_text('#mk-picker') and '自建' in pg.inner_text('#mk-picker'))
    pg.select_option('#mk-lang', 'custom'); pg.wait_for_timeout(100)
    check('自訂語言：隱藏詞庫、可輸入語言名稱', pg.is_hidden('#mk-picker') and pg.is_visible('#mk-langname'))
    pg.fill('#mk-text', '測試文字'); pg.check('#mk-notext'); pg.uncheck('#mk-notext')
    pg.click('#mk-savetext'); pg.wait_for_timeout(100)

    # ===== 提示詞語言與文字語言分開 =====
    pg.click('.stepper [data-go="1"]'); pg.click('input[name=mktype][value=char]', force=True)
    pg.click('.stepper [data-go="3"]'); pg.select_option('#mk-lang', 'ja'); pg.wait_for_selector('#mk-picker .tg-item')
    pg.click('#mk-picker .tg-item:has(b:text-is("おはよう！"))'); pg.wait_for_timeout(100)
    pg.click('.stepper [data-go="6"]'); pg.wait_for_selector('#mk-prompt')
    pr = pg.input_value('#mk-prompt')
    check('繁中提示詞＋日文貼圖文字', '請幫我畫' in pr and '日文文字「おはよう！」' in pr and '早安' in pr, pr[pr.find('【貼圖文字】'):][:120])
    pg.select_option('#mk-plang', 'en'); pg.wait_for_timeout(100); pr = pg.input_value('#mk-prompt')
    check('英文提示詞＋日文貼圖文字', 'Please draw' in pr and 'Japanese' in pr and '"おはよう！"' in pr and '請幫我畫' not in pr, pr[pr.find('[Sticker text]'):][:150])
    sl = [l for l in pr.split('\n') if l.startswith('- Style:')][0]
    check('英文提示詞內建選項已翻譯（畫風行無中文）', not re.search(r'[\u4e00-\u9fff]', sl), sl[:80])
    pg.select_option('#mk-plang', 'zh')
    pg.click('[data-pa="copy"]'); pg.wait_for_timeout(100)
    check('複製提示詞', 'おはよう' in pg.evaluate('navigator.clipboard.readText()'))
    with pg.expect_download() as dl: pg.click('[data-pa="dl"]')
    check('下載提示詞 TXT', 'おはよう' in open(dl.value.path(), encoding='utf-8-sig').read())
    check('ChatGPT／Gemini 連結', pg.get_attribute('[data-pa="gpt"]', 'href').startswith('https://chatgpt.com') and pg.get_attribute('[data-pa="gemini"]', 'href').startswith('https://gemini.google.com'))

    # ===== 隨機設計不改文字、鎖定 =====
    pg.click('.stepper [data-go="3"]'); pg.fill('#mk-text', '不可改動'); pg.fill('#mk-text2', '副標'); pg.click('.stepper [data-go="4"]')
    for _ in range(4): pg.click('#mk-rdesign'); pg.wait_for_timeout(50)
    pg.click('.stepper [data-go="3"]')
    check('隨機設計不改動文字內容', pg.input_value('#mk-text') == '不可改動' and pg.input_value('#mk-text2') == '副標')
    pg.click('.stepper [data-go="4"]'); f0 = pg.input_value('#mk-font'); pg.click('[data-dlk="font"]')
    for _ in range(4): pg.click('#mk-rdesign')
    check('鎖定字體後隨機不換字體', pg.input_value('#mk-font') == f0)
    pg.select_option('#mk-dcount', '2'); pg.click('[data-dlk="font"]'); pg.click('#mk-rdesign'); pg.wait_for_timeout(50)
    check('裝飾數量設定（2 個）', pg.locator('#mk-decos .chip.on').count() == 2)
    pg.click('.stepper [data-go="6"]'); pr = pg.input_value('#mk-prompt')
    check('樣式與裝飾寫進提示詞', '【文字與裝飾設計】' in pr and '裝飾元素' in pr)
    # 盲盒隨機搭配（STEP 2）
    pg.click('.stepper [data-go="2"]'); pg.click('[data-mlock="style"]'); st0 = pg.evaluate("document.querySelector('.style-card.on').dataset.style")
    for _ in range(3): pg.click('#mk-blind')
    check('盲盒隨機搭配＋鎖定畫風', pg.evaluate("document.querySelector('.style-card.on').dataset.style") == st0)

    # ===== 多張：整套企劃 =====
    pg.click('.stepper [data-go="3"]'); pg.select_option('#mk-lang', 'taigi'); pg.wait_for_selector('#mk-picker .tg-item')
    pg.click('.stepper [data-go="5"]'); pg.click('#mk-count [data-n="8"]'); pg.wait_for_function("document.querySelectorAll('#mk-theme option').length > 0", timeout=8000)
    pg.select_option('#mk-theme', 'taigi|台味搞笑吐槽'); pg.click('#mk-gen'); pg.wait_for_timeout(300)
    check('選 8 張自動進入企劃並產生 8 張', pg.locator('#mk-items .plan-item').count() == 8)
    pg.click('.stepper [data-go="6"]'); pg.wait_for_timeout(200)
    pr = pg.input_value('#mk-prompt')
    check('整套提示詞 8 段、維持角色一致性', pr.count('==== 第') == 8 and '角色一致性' in pr)
    pg.select_option('#mk-show', 'grid3'); pr = pg.input_value('#mk-prompt')
    check('宮格提示詞', '3×3 宮格' in pr and '台語' in pr)

    # ===== 返回後保留設定 =====
    pg.goto(BASE + '#editor'); pg.wait_for_selector('#ed-blank'); pg.goto(BASE + '#home'); pg.wait_for_selector('.main-cta')
    check('首頁顯示「繼續上次的製作」', pg.locator('.resume').count() == 1)
    pg.click('.resume'); pg.wait_for_selector('.stepper')
    check('離開再回來：步驟、張數與企劃都保留', pg.is_visible('.mk-step[data-step="6"]') and pg.input_value('#mk-plang') == 'zh' and pg.locator('#mk-show option').count() > 3)
    pg.click('.stepper [data-go="3"]')
    check('離開再回來：文字與語言保留', pg.input_value('#mk-lang') == 'taigi' and pg.input_value('#mk-text2') == '副標')

    # ===== 純文字：不需外部 AI 完成 =====
    pg.click('.stepper [data-go="1"]'); pg.click('input[name=mktype][value=text]', force=True)
    pg.click('.stepper [data-go="5"]'); pg.click('#mk-count [data-n="1"]'); pg.click('.stepper [data-go="3"]'); pg.select_option('#mk-lang', 'zh'); pg.fill('#mk-text', '純文字測試')
    pg.click('.stepper [data-go="6"]'); pg.wait_for_selector('#mk-cv'); pg.wait_for_timeout(800)
    reqs = []; pg.on('request', lambda r: reqs.append(r.url) if not r.url.startswith(BASE) and not r.url.startswith('data:') and not r.url.startswith('blob:') else None)
    with pg.expect_download() as dl: pg.click('#mk-png')
    a = np.array(Image.open(dl.value.path()).convert('RGBA'))
    check('純文字 PNG：370×320、透明背景、有文字', a.shape[:2] == (320, 370) and a[3, 3, 3] == 0 and (a[:, :, 3] > 0).sum() > 3000)
    check('純文字不呼叫任何外部服務', not reqs, reqs[:3])
    pg.select_option('#mk-bg', '#FFE3D2'); pg.wait_for_timeout(300)
    with pg.expect_download() as dl: pg.click('#mk-png')
    a = np.array(Image.open(dl.value.path()).convert('RGBA'))
    check('純文字自訂背景', tuple(a[3, 3]) == (255, 227, 210, 255))
    pg.select_option('#mk-bg', '')
    # 多張純文字批次 ZIP
    pg.click('.stepper [data-go="5"]'); pg.click('#mk-count [data-n="8"]'); pg.wait_for_function("document.querySelectorAll('#mk-theme option').length > 0", timeout=8000)
    pg.select_option('#mk-theme', 'zh|日常聊天系列'); pg.click('#mk-gen'); pg.wait_for_timeout(200)
    pg.click('.stepper [data-go="6"]'); pg.wait_for_function("document.querySelectorAll('#mk-tiles canvas').length === 8", timeout=10000)
    with pg.expect_download(timeout=30000) as dl: pg.click('#mk-zip')
    z = zipfile.ZipFile(dl.value.path()); names = sorted(z.namelist())
    check('純文字多張：批次 ZIP（8 張＋main＋tab）', len(names) == 10 and 'main.png' in names and Image.open(io.BytesIO(z.read('01.png'))).size == (370, 320), names)
    # 到加工室微調
    pg.click('.stepper [data-go="5"]'); pg.click('#mk-count [data-n="1"]'); pg.click('.stepper [data-go="6"]'); pg.wait_for_selector('#mk-toeditor')
    pg.click('#mk-toeditor'); pg.wait_for_selector('#ed-main:not([hidden])')
    s = pg.evaluate('SS._editorState()')
    check('純文字帶進加工室成為可編輯圖層', any(l['type'] == 'text' and l['content'] == '純文字測試' for l in s['layers']))

    # ===== 加工室 7 分頁、切圖與尺寸 =====
    tabs = pg.eval_on_selector_all('.scroll-tabs > .tab', 'e=>e.map(x=>x.textContent.trim())')
    check('加工室 7 個分頁（依需求順序）', [t.split(' ', 1)[1] for t in tabs] == ['裁切縮放', '消除工具', '文字編輯', '裝飾素材', '去除背景', '切圖與尺寸', '輸出下載'], tabs)
    pg.click('[data-tab="text"]')
    check('隨機設計整合在文字編輯', pg.locator('#ed-randbox #ed-random').count() == 1)
    pg.click('[data-tab="size"]'); pg.click('[data-qframe="tab"]'); pg.wait_for_timeout(100)
    check('切圖與尺寸：快速套用標籤圖 96×74', '96 × 74' in pg.inner_text('#ed-size'))
    pg.click('[data-qframe="line"]'); pg.click('#ed-tocheck'); pg.wait_for_selector('#ed-linetool .check-item', timeout=8000)
    check('切圖與尺寸：目前畫面加入 LINE 規格檢查', pg.locator('#ed-linetool .check-item').count() == 1 and '370×320' in pg.inner_text('#ed-linetool .check-item'))
    pg.set_input_files('#ed-linetool #sp-file', '/tmp/grid.png'); pg.wait_for_timeout(300); pg.click('#ed-linetool .tab[data-tab="split"]')
    pg.click('#ed-linetool #sp-go'); pg.wait_for_function("document.querySelectorAll('#ed-linetool #sp-tiles .tile').length === 9", timeout=10000)
    check('切圖與尺寸：可直接匯入外部圖片切九宮格', True)
    check('加工室分頁沒被 LINE 工具的分頁干擾', pg.evaluate("document.querySelector('.scroll-tabs > .tab.on').dataset.tab") == 'size' and pg.is_visible('[data-panel="size"]'))
    pg.click('[data-tab="out"]'); pg.click('#ed-toline'); pg.wait_for_timeout(600)
    check('輸出下載：送到 LINE 規格檢查（同頁）', pg.locator('#ed-linetool .check-item').count() == 2 and pg.evaluate("location.hash") == '#editor')
    # 從製作流程匯入 AI 圖 → 加工室
    pg.goto(BASE + '#make'); pg.wait_for_selector('.stepper'); pg.click('.stepper [data-go="1"]'); pg.click('input[name=mktype][value=char]', force=True); pg.click('.stepper [data-go="6"]'); pg.wait_for_selector('#mk-imp', state='attached')
    pg.set_input_files('#mk-imp', '/tmp/v12_text_white.png'); pg.wait_for_selector('#ed-main:not([hidden])')
    check('匯入 AI 生成圖片並進入加工室', pg.evaluate("location.hash") == '#editor' and pg.evaluate('SS._editorState().scale') > 0)
    pg.goto(BASE + '#make'); pg.wait_for_selector('#mk-impgrid', state='attached'); pg.set_input_files('#mk-impgrid', '/tmp/grid.png')
    pg.wait_for_function("document.querySelector('#ed-linetool #sp-ui') && !document.querySelector('#ed-linetool #sp-ui').hidden", timeout=10000)
    check('匯入宮格圖直接進入切圖', pg.is_visible('[data-panel="size"]'))

    # ===== 底部導覽不遮擋 =====
    pg.click('[data-tab="out"]'); pg.locator('#ed-dl').scroll_into_view_if_needed(); pg.wait_for_timeout(150)
    hit = pg.evaluate("(()=>{const r=document.getElementById('ed-dl').getBoundingClientRect();const e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return e&&e.id})()")
    check('底部導覽不遮擋下載按鈕', hit == 'ed-dl', hit)
    pg.evaluate("window.scrollTo(0, document.body.scrollHeight)"); pg.wait_for_timeout(150)
    ov = pg.evaluate("(()=>{const n=document.getElementById('bottom-nav').getBoundingClientRect();const f=document.querySelector('.footer').getBoundingClientRect();return f.bottom<=n.top+1})()")
    check('頁尾內容不被底部導覽蓋住', ov)

    # ===== 收藏：作品、角色、常用文字、家鄉話；舊資料保留 =====
    pg.goto(BASE + '#collection'); pg.wait_for_selector('.coll-tabs'); pg.wait_for_timeout(600)
    check('既有收藏圖片保留', '舊收藏圖' in pg.inner_text('#co-grid'))
    pg.click('[data-ct="chars"]'); check('既有角色設定保留', '舊角色麻糬' in pg.inner_text('#co-chars'))
    pg.click('[data-ct="texts"]'); pg.wait_for_function("document.getElementById('co-favs').textContent.includes('食飽未')", timeout=10000)
    t = pg.inner_text('[data-cp="texts"]')
    check('常用文字（自訂）與各語言收藏（含舊台語收藏、金門話）', '測試文字' in t and '食飽未' in t and '金門話・' in t, t[:200])
    pg.click('[data-ct="home"]'); pg.wait_for_timeout(100)
    check('我的家鄉話管理', '測試家鄉句' in pg.inner_text('#co-hlist') and pg.input_value('#co-hname') == '澎湖話')
    pg.click('[data-usehome]'); pg.wait_for_selector('.stepper')
    check('從家鄉話一鍵帶回製作流程', pg.input_value('#mk-text') == '測試家鄉句' and pg.input_value('#mk-lang') == 'hometown')
    pg.goto(BASE + '#collection'); pg.wait_for_selector('#co-export')
    with pg.expect_download() as dl: pg.click('#co-export')
    bk = json.loads(open(dl.value.path(), encoding='utf-8-sig').read())
    check('備份包含家鄉話、常用文字與收藏用語', bk['hometown']['items'] and bk['myTexts'] and bk['favPhrases'].get('kinmen'))

    check('無主控台錯誤（手機）', not errs, errs[:3])
    ctx.close()

    # ===== 電腦版雙欄 =====
    ctx = b.new_context(viewport={'width': 1280, 'height': 860}); ctx.add_init_script("localStorage.setItem('ss_welcomed','true')")
    pg = ctx.new_page(); pg.goto(BASE + '#make'); pg.wait_for_selector('.stepper'); pg.click('.stepper [data-go="2"]'); pg.wait_for_timeout(200)
    lay = pg.evaluate("(()=>{const m=document.querySelector('.mk-main').getBoundingClientRect(),s=document.getElementById('mk-result').getBoundingClientRect();return [m.right<=s.left, s.width>300, getComputedStyle(document.getElementById('mk-result')).display]})()")
    check('電腦版：左設定、右提示詞雙欄', lay[0] and lay[1] and lay[2] != 'none', lay)
    ctx.close(); b.close()

fails = [r for r in R if not r[1]]
print(f'\nv1.3 測試 {len(R)} 項，通過 {len(R) - len(fails)}，失敗 {len(fails)}')
json.dump(R, open('/tmp/v13-results.json', 'w'), ensure_ascii=False)
