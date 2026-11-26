"""v1.3.1 補回六步驟流程漏掉的功能：驗收測試"""
import sys, json, io
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
R = []
def check(n, ok, d=''):
    R.append((n, bool(ok))); print(('PASS ' if ok else 'FAIL ') + n + (' — ' + str(d)[:200] if d != '' else ''))
PNG = bytes.fromhex('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082')
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True)
    ctx.add_init_script("""if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.clear();
      localStorage.setItem('ss_welcomed','true');
      localStorage.setItem('ss_characters', JSON.stringify([{id:'c1',name:'麻糬',charType:'貓咪',appearance:'圓臉',colors:'灰白',personality:'愛睡',style:'qban'}]));}""")
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#make'); pg.wait_for_selector('.stepper')
    # STEP 1 照片：更換／移除
    pg.click('input[name=mktype][value=photo]', force=True)
    pg.set_input_files('#mk-file', files=[{'name': 'a.png', 'mimeType': 'image/png', 'buffer': PNG}]); pg.wait_for_timeout(200)
    check('STEP1 上傳後出現「更換／移除照片」', pg.is_visible('#mk-photo-clear') and pg.is_visible('#mk-photo-change') and pg.is_visible('#mk-photo-img'))
    pg.click('#mk-photo-clear'); pg.wait_for_timeout(100)
    check('STEP1 移除照片後回到空白狀態', pg.is_hidden('#mk-photo-img') and pg.is_visible('#mk-photo-empty') and pg.is_hidden('#mk-photo-acts'))
    # STEP 2 套用已存角色
    pg.click('input[name=mktype][value=char]', force=True); pg.click('#mk-next'); pg.wait_for_timeout(150)
    check('STEP2 有「套用已儲存的角色」選單', pg.is_visible('#mk-saved') and pg.locator('#mk-saved option').count() == 2)
    pg.select_option('#mk-saved', 'c1'); pg.wait_for_timeout(150)
    d = pg.evaluate("SS.draft.get()")
    check('STEP2 套用後角色設定帶入', d.get('name') == '麻糬' and d.get('charType') == '貓咪' and d.get('colors') == '灰白', {k: d.get(k) for k in ['name', 'charType', 'colors']})
    # STEP 3 → STEP 4 透明背景
    pg.click('#mk-next'); pg.wait_for_timeout(150); pg.click('#mk-next'); pg.wait_for_timeout(150)
    check('STEP4 AI 模式有透明背景開關（預設勾選）', pg.is_visible('#mk-transparent') and pg.is_checked('#mk-transparent'))
    pg.uncheck('#mk-transparent'); pg.wait_for_timeout(100)
    pg.click('#mk-next'); pg.wait_for_timeout(150)
    # STEP 5 自訂主題、重抽、構圖、匯出
    pg.click('#mk-count [data-n="8"]'); pg.wait_for_timeout(150)
    check('STEP5 一般主題時不顯示關鍵字欄', pg.is_hidden('#mk-kw-wrap'))
    pg.select_option('#mk-theme', 'zh|自訂主題'); pg.wait_for_timeout(100)
    check('STEP5 選「自訂主題」顯示關鍵字欄', pg.is_visible('#mk-kw'))
    pg.fill('#mk-kw', '考試加油, 我讀不完, 放榜了')
    pg.click('#mk-gen'); pg.wait_for_timeout(300)
    texts = pg.evaluate("[...document.querySelectorAll('#mk-items [data-f=text]')].map(x=>x.value)")
    check('STEP5 自訂關鍵字變成貼圖文字', all(k in texts for k in ['考試加油', '我讀不完', '放榜了']), texts)
    check('STEP5 每張有「重抽」與「構圖」', pg.locator('#mk-items [data-reroll]').count() == len(texts) and pg.locator('#mk-items select[data-f=composition]').count() == len(texts))
    before = pg.evaluate("JSON.parse(localStorage.getItem('ss_make')).items")
    pg.click('#mk-items [data-reroll="6"]'); pg.wait_for_timeout(200)
    after = pg.evaluate("JSON.parse(localStorage.getItem('ss_make')).items")
    others_same = all(before[i]['text'] == after[i]['text'] for i in range(len(before)) if i != 6)
    check('STEP5 重抽只換那一張、不重複', after[6]['text'] != before[6]['text'] and others_same and len({x['text'] for x in after}) == len(after), (before[6]['text'], after[6]['text']))
    comp = pg.evaluate("SS.COMPOSITIONS")[-1]
    pg.select_option('#mk-items .plan-item[data-i="0"] select[data-f=composition]', comp); pg.wait_for_timeout(150)
    check('STEP5 構圖修改會儲存', pg.evaluate("JSON.parse(localStorage.getItem('ss_make')).items[0].composition") == comp)
    got = {}
    for ex in ['txt', 'csv', 'json']:
        with pg.expect_download() as dl: pg.click(f'#mk-exports [data-ex="{ex}"]')
        got[ex] = open(dl.value.path(), encoding='utf-8-sig').read()
    check('STEP5 匯出 TXT（完整提示詞）', '考試加油' in got['txt'] and len(got['txt']) > 300, got['txt'][:300])
    check('STEP5 匯出 CSV 含構圖欄', got['csv'].splitlines()[0].startswith('"編號"') and '構圖' in got['csv'].splitlines()[0] and comp in got['csv'])
    j = json.loads(got['json'])
    check('STEP5 匯出 JSON 含角色與企劃', j['character']['name'] == '麻糬' and len(j['items']) == len(texts))
    # STEP 6 提示詞：透明背景關閉後不再要求透明
    pg.click('#mk-next'); pg.wait_for_timeout(250)
    pt = pg.evaluate("document.querySelector('#mk-result textarea, #mk-result pre')?.value || document.querySelector('#mk-result textarea, #mk-result pre')?.textContent || ''")
    check('STEP6 關閉透明背景時提示詞不要求透明背景', pt and '透明背景' not in pt, pt[:120])
    check('STEP6 提示詞帶入修改後的構圖', comp in pt)
    # 純文字模式：標籤圖尺寸
    pg.click('.stepper [data-go="1"]'); pg.click('input[name=mktype][value=text]', force=True)
    for _ in range(4): pg.click('#mk-next'); pg.wait_for_timeout(150)
    html = pg.inner_html('#mk-result')
    check('純文字結果可選 LINE 標籤圖 96×74', '96×74' in html, '')
    # 台語用語卡顯示查核層級
    pg.click('.stepper [data-go="3"]'); pg.select_option('#mk-lang', 'taigi') if pg.locator('#mk-lang').count() else None; pg.wait_for_timeout(500)
    check('台語用語卡顯示查核層級', pg.locator('.tg-foot').count() > 0, pg.locator('.tg-foot').count())
    check('全程沒有 JS 錯誤', not errs, errs[:3])
    b.close()
print(f'\n{sum(o for _, o in R)}/{len(R)} 通過')
sys.exit(0 if all(o for _, o in R) else 1)
