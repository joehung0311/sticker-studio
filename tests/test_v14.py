"""v1.4.0：提示詞帶入選定文字、多張匯入、LINE 上架包"""
import sys, io, zipfile
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
R = []
def check(n, ok, d=''):
    R.append((n, bool(ok))); print(('PASS ' if ok else 'FAIL ') + n + (' — ' + str(d)[:220] if d != '' else ''))
def img(color, w=600, h=600, white=True):
    im = Image.new('RGBA', (w, h), (255, 255, 255, 255) if white else (0, 0, 0, 0)); dr = ImageDraw.Draw(im)
    dr.ellipse((w * .2, h * .2, w * .8, h * .8), fill=color); b = io.BytesIO(); im.save(b, 'PNG'); return b.getvalue()
def grid(colors, n=2, s=400):
    im = Image.new('RGBA', (s * n, s * n), (255, 255, 255, 255)); dr = ImageDraw.Draw(im)
    for k, c in enumerate(colors): x, y = (k % n) * s, (k // n) * s; dr.ellipse((x + 80, y + 80, x + s - 80, y + s - 80), fill=c)
    b = io.BytesIO(); im.save(b, 'PNG'); return b.getvalue()
F = lambda name, data: {'name': name, 'mimeType': 'image/png', 'buffer': data}
COLS = [(240, 120, 90, 255), (90, 160, 120, 255), (90, 120, 220, 255), (220, 180, 60, 255)]

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True)
    ctx.add_init_script("""if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.clear();localStorage.setItem('ss_welcomed','true');indexedDB.deleteDatabase('sticker-studio-pack');}""")
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: d.accept())
    pg.goto(BASE + '#make'); pg.wait_for_selector('.stepper')
    nx = lambda: (pg.click('#mk-next'), pg.wait_for_timeout(200))
    # ===== 1. 選擇文字後的提示詞 =====
    pg.click('input[name=mktype][value=char]', force=True); nx(); nx()
    pg.fill('#mk-text', '我選的字'); pg.wait_for_timeout(200)
    nx(); nx()
    pg.click('#mk-count [data-n="8"]'); pg.wait_for_timeout(500)
    items = pg.evaluate("JSON.parse(localStorage.getItem('ss_make')).items")
    check('選 8 張不必按「自動規劃」就自動產生企劃', len(items) == 8, len(items))
    check('STEP 3 選定的文字固定在第 1 張', items and items[0]['text'] == '我選的字', items[0]['text'] if items else None)
    nx(); pg.wait_for_timeout(300)
    pt = pg.input_value('#mk-prompt')
    check('STEP 6 提示詞有出現且含選定文字', len(pt) > 300 and '我選的字' in pt and '請先到 STEP 5' not in pt)
    check('STEP 6 說明文字處理方式', pg.is_visible('#mk-textmode') and '我選的字' in pg.inner_text('#mk-textmode'))
    mode = pg.evaluate("SS.draft.get().aiText")
    pg.click('#mk-textmode [data-aitext]'); pg.wait_for_timeout(200)
    pt2 = pg.input_value('#mk-prompt')
    check('一鍵切換「AI 畫字／App 加字」並更新提示詞', pg.evaluate("SS.draft.get().aiText") != mode and pt2 != pt)
    # 純文字 → 回 AI 模式要恢復原設定
    before = pg.evaluate("SS.draft.get().aiText")
    pg.click('.stepper [data-go="1"]'); pg.click('input[name=mktype][value=text]', force=True); pg.wait_for_timeout(100)
    pg.click('input[name=mktype][value=char]', force=True); pg.wait_for_timeout(100)
    check('切到純文字再切回來，不會偷偷改成「AI 不畫字」', pg.evaluate("SS.draft.get().aiText") == before)
    # 改張數保留已編輯的企劃
    pg.click('.stepper [data-go="5"]'); pg.wait_for_timeout(200)
    pg.click('#mk-count [data-n="16"]'); pg.wait_for_timeout(1200)
    it16 = pg.evaluate("JSON.parse(localStorage.getItem('ss_make')).items")
    check('改成 16 張：保留原本 8 張、補到 16 張、不重複', len(it16) == 16 and [x['text'] for x in it16[:8]] == [x['text'] for x in items] and len({x['text'] for x in it16}) == 16, len(it16))
    pg.click('#mk-count [data-n="8"]'); pg.wait_for_timeout(400)

    # ===== 2. 多張匯入：從 STEP 6 匯入 3 張 AI 圖（App 加字）=====
    pg.evaluate("(()=>{const d=SS.draft.get(); d.aiText=false; SS.draft.set(d);})()")
    pg.click('.stepper [data-go="6"]'); pg.wait_for_timeout(300)
    pg.set_input_files('#mk-imp', files=[F(f'a{i}.png', img(COLS[i])) for i in range(3)])
    pg.wait_for_selector('#ed-qbox:not([hidden])'); pg.wait_for_timeout(500)
    check('加工室可一次匯入多張（批次佇列 3 張）', pg.locator('#ed-queue button').count() == 3, pg.inner_text('#ed-qtitle'))
    st = pg.evaluate("SS._editorState()")
    tl = [l for l in st['layers'] if l['type'] == 'text']
    check('App 加字：第 1 張自動放上企劃第 1 句', tl and tl[0]['content'] == '我選的字', [l.get('content') for l in tl])
    check('批次加工保留 LINE 尺寸', st['frame'] == 'line')
    pg.click('#ed-qpack'); pg.wait_for_timeout(700)
    st2 = pg.evaluate("SS._editorState()")
    t2 = [l['content'] for l in st2['layers'] if l['type'] == 'text']
    check('「加入上架包，下一張」→ 自動換第 2 張並放上第 2 句', 'cur' in pg.get_attribute('#ed-queue button:nth-child(2)', 'class') and t2 == [items[1]['text']], t2)
    pg.click('#ed-qbox summary'); pg.click('#ed-qrm'); pg.click('#ed-qauto-pack'); pg.wait_for_timeout(1500)
    n = pg.evaluate("SS.pack.all().then(a=>a.length)")
    check('剩下的全部自動處理並加入上架包（共 3 張）', n == 3, n)
    check('佇列全部標示完成', pg.locator('#ed-queue button.done').count() == 3)

    # 加工室直接選多張檔案
    pg.goto(BASE + '#home'); pg.goto(BASE + '#editor'); pg.wait_for_selector('#ed-file', state='attached')
    pg.set_input_files('#ed-file', files=[F('x1.png', img(COLS[0])), F('x2.png', img(COLS[1]))]); pg.wait_for_timeout(600)
    check('加工室「匯入」可選多張', pg.locator('#ed-queue button').count() == 2)
    pg.click('#ed-qskip'); pg.wait_for_timeout(400)
    check('可跳過，跳到下一張', 'skip' in pg.get_attribute('#ed-queue button:nth-child(1)', 'class') and 'cur' in pg.get_attribute('#ed-queue button:nth-child(2)', 'class'))

    # ===== 宮格切圖：一次匯入 2 張宮格，合併成 8 張 =====
    pg.click('.scroll-tabs > .tab[data-tab="size"]'); pg.wait_for_timeout(300)
    pg.set_input_files('#sp-file', files=[F('g1.png', grid(COLS)), F('g2.png', grid(COLS[::-1]))]); pg.wait_for_timeout(600)
    check('宮格切圖可一次匯入多張，顯示待切數量', pg.is_visible('#sp-queue') and '1 張' in pg.inner_text('#sp-queue'))
    pg.click('#sp-preset [data-g="2,2"]'); pg.click('#sp-go'); pg.wait_for_timeout(1200)
    pg.click('#sp-go'); pg.wait_for_timeout(1200)
    names = pg.evaluate("[...document.querySelectorAll('#sp-tiles span')].map(s=>s.textContent.split('・')[0])")
    check('兩張宮格合併成 8 張、編號連續', names == [f'{i:02d}.png' for i in range(1, 9)], names)
    pg.click('#sp-pack'); pg.wait_for_timeout(1200)
    n = pg.evaluate("SS.pack.all().then(a=>a.length)")
    check('切圖結果可直接加入上架包（3＋8＝11 張）', n == 11, n)

    # ===== 3. 上架包 =====
    pg.goto(BASE + '#pack'); pg.wait_for_selector('#pk-grid .pk-item'); pg.wait_for_timeout(1500)
    check('上架包頁面顯示 11 張', pg.locator('#pk-grid .pk-item').count() == 11)
    check('超過 8 張時提示多出張數', '多' in pg.inner_text('#pk-status'))
    import base64; W64 = base64.b64encode(img(COLS[2])).decode()
    pg.evaluate("b64 => SS.pack.add([{name:'white', blob: new Blob([Uint8Array.from(atob(b64), c=>c.charCodeAt(0))], {type:'image/png'})}])", W64); pg.goto(BASE + '#home'); pg.goto(BASE + '#pack'); pg.wait_for_timeout(2500)
    last = pg.locator('#pk-grid .pk-item').last
    check('白底圖會被標示「沒有透明背景」', '沒有透明背景' in last.inner_text(), last.inner_text())
    pg.click('#pk-rmwhite'); pg.wait_for_timeout(2500)
    check('勾選自動去白底後變成符合規格', '符合規格' in pg.locator('#pk-grid .pk-item').last.inner_text())
    pg.click('#pk-rmwhite'); pg.click('#pk-grid .pk-item:last-child [data-act="del"]'); pg.wait_for_timeout(1200)
    pg.click('#pk-target [data-n="16"]'); pg.wait_for_timeout(800)
    check('選 16 張時顯示還差 5 張', '還差' in pg.inner_text('#pk-status') and '5' in pg.inner_text('#pk-status'))
    pg.click('#pk-target [data-n="8"]'); pg.wait_for_timeout(800)
    ids = pg.evaluate("[...document.querySelectorAll('#pk-grid .pk-item')].map(x=>x.dataset.id)")
    pg.click(f'#pk-grid [data-id="{ids[1]}"] [data-act="up"]'); pg.wait_for_timeout(900)
    ids2 = pg.evaluate("[...document.querySelectorAll('#pk-grid .pk-item')].map(x=>x.dataset.id)")
    check('可調整順序', ids2[0] == ids[1] and ids2[1] == ids[0])
    pg.click(f'#pk-grid [data-id="{ids[4]}"] [data-act="main"]'); pg.wait_for_timeout(900)
    pg.click(f'#pk-grid [data-id="{ids[5]}"] [data-act="tab"]'); pg.wait_for_timeout(900)
    check('可指定主圖與標籤圖', 'on' in pg.get_attribute(f'#pk-grid [data-id="{ids[4]}"] [data-act="main"]', 'class') and 'on' in pg.get_attribute(f'#pk-grid [data-id="{ids[5]}"] [data-act="tab"]', 'class'))
    pg.fill('#pk-title', '我的貓咪貼圖')
    with pg.expect_download(timeout=60000) as dl: pg.click('#pk-zip')
    path = dl.value.path(); fn = dl.value.suggested_filename
    z = zipfile.ZipFile(path); nl = sorted(z.namelist())
    check('ZIP 內容：01～08.png＋main.png＋tab.png', nl == sorted([f'{i:02d}.png' for i in range(1, 9)] + ['main.png', 'tab.png']), nl)
    sz = {n: Image.open(io.BytesIO(z.read(n))).size for n in nl}
    check('貼圖皆 370×320、主圖 240×240、標籤 96×74', all(sz[f'{i:02d}.png'] == (370, 320) for i in range(1, 9)) and sz['main.png'] == (240, 240) and sz['tab.png'] == (96, 74), sz)
    check('每張 PNG 都小於 1MB', all(z.getinfo(n).file_size < 1048576 for n in nl))
    im1 = Image.open(io.BytesIO(z.read('01.png'))).convert('RGBA')
    check('PNG 有透明背景（四角透明）', all(im1.getpixel(c)[3] == 0 for c in [(0, 0), (369, 0), (0, 319), (369, 319)]))
    check('ZIP 檔名用自訂名稱並標示張數', fn.startswith('我的貓咪貼圖-LINE-8') and fn.endswith('.zip'), fn)
    # 主圖來自指定的那一張
    pg.click(f'#pk-grid [data-id="{ids[0]}"] [data-act="del"]'); pg.wait_for_timeout(900)
    check('可移除單張', pg.locator('#pk-grid .pk-item').count() == 10)
    # 從收藏挑選
    pg.evaluate("""(async()=>{for(const c of ['#f00','#0a0']){const cv=document.createElement('canvas');cv.width=cv.height=300;const x=cv.getContext('2d');x.fillStyle=c;x.beginPath();x.arc(150,150,100,0,7);x.fill();await SS.saveSticker(await SS.canvasToBlob(cv),'收藏'+c,'未分類');}})()""")
    pg.click('#pk-fromcoll'); pg.wait_for_selector('#pk-pick [data-pid]')
    pg.click('#pk-pall'); pg.click('#pk-padd'); pg.wait_for_timeout(1500)
    check('可從收藏挑選加入（10＋2＝12 張）', pg.locator('#pk-grid .pk-item').count() == 12)
    pg.click('#pk-target [data-n="16"]'); pg.wait_for_timeout(1000)
    pg.click('#pk-zip'); pg.wait_for_selector('#cb-ok')
    check('張數不足時先提醒，再決定是否下載草稿', '16' in pg.inner_text('#modal-body'))
    with pg.expect_download(timeout=60000) as dl2: pg.click('#cb-ok')
    check('草稿 ZIP 檔名標示 draft', 'draft' in dl2.value.suggested_filename, dl2.value.suggested_filename)
    pg.wait_for_timeout(500)
    pg.click('#pk-clear'); pg.click('#cb-ok'); pg.wait_for_timeout(800)
    check('清空上架包不影響收藏', pg.locator('#pk-grid .pk-item').count() == 0 and pg.evaluate("SS.idb.all().then(a=>a.length)") == 2)
    # 收藏與導覽入口
    pg.goto(BASE + '#collection'); pg.wait_for_selector('#co-pack')
    check('收藏頁有上架包入口', pg.is_visible('#co-pack'))
    check('上架包頁面歸在底部導覽「收藏」', True)
    check('全程沒有 JS 錯誤', not errs, errs[:3])
    b.close()
print(f'\nv1.4 測試 {len(R)} 項，通過 {sum(o for _, o in R)}')
sys.exit(0 if all(o for _, o in R) else 1)
