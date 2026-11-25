"""今天貼什麼？ 自動化驗收測試（Playwright + Chrome）"""
import sys, io, json, zipfile, time
from playwright.sync_api import sync_playwright
from PIL import Image
import numpy as np, cv2

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
RESULTS = []
def check(name, ok, detail=''):
    RESULTS.append((name, bool(ok), detail)); print(('PASS ' if ok else 'FAIL ') + name + (' — ' + str(detail) if detail else ''))

def run(p, label, viewport, mobile):
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = browser.new_context(viewport=viewport, is_mobile=mobile, has_touch=mobile, accept_downloads=True,
                              permissions=['clipboard-read', 'clipboard-write'], locale='zh-TW')
    page = ctx.new_page()
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    failed_req = []
    page.on('requestfailed', lambda r: failed_req.append(r.url))
    page.on('response', lambda r: failed_req.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    P = f'[{label}] '

    page.goto(BASE); page.wait_for_selector('.home-card')
    check(P + '首頁 8 個入口', page.locator('.home-card').count() == 8)
    page.click('.modal-close') if page.locator('#modal:not([hidden])').count() else None
    page.wait_for_timeout(300)
    # 版面溢出
    def no_overflow(where):
        w = page.evaluate('document.documentElement.scrollWidth'); v = page.evaluate('innerWidth')
        check(P + f'無水平溢出：{where}', w <= v + 1, f'{w} vs {v}')
    no_overflow('首頁')

    # 每一頁渲染
    for r in ['photo', 'character', 'phrases', 'blindbox', 'plan', 'editor', 'line', 'collection', 'guide', 'about', 'privacy', 'share', 'install', 'version']:
        page.goto(BASE + '#/' + r); page.wait_for_timeout(250)
        check(P + f'頁面 {r} 有內容', len(page.inner_text('#view')) > 30)
        no_overflow(r)

    # 角色 → 提示詞反映設定
    page.goto(BASE + '#/character'); page.wait_for_timeout(200)
    page.click('[data-type="兔子"]'); page.fill('#f-name', '測試兔'); page.fill('#f-appearance', '粉紅耳朵')
    page.click('.style-card[data-style="pixel"]'); page.fill('#f-text', '下班啦'); page.fill('#f-expression', '得意')
    pr = page.input_value('#prompt-out')
    check(P + '提示詞反映角色/畫風/文字/表情', all(k in pr for k in ['兔子', '測試兔', '粉紅耳朵', '像素藝術', '下班啦', '得意', '透明背景', '原創']))
    page.check('#f-noText'); pr = page.input_value('#prompt-out')
    check(P + '無文字模式', '不放任何文字' in pr)
    page.uncheck('#f-noText'); page.click('.seg label:nth-child(2)'); pr = page.input_value('#prompt-out')
    check(P + '之後加字模式', '不要在圖中畫任何文字' in pr)
    page.click('#ch-save'); page.wait_for_timeout(200)
    check(P + '角色儲存', page.locator('.char-item').count() >= 1)
    page.click('.prompt-box [data-act="copy"]'); page.wait_for_timeout(200)
    clip = page.evaluate('navigator.clipboard.readText()')
    check(P + '一鍵複製提示詞', '測試兔' in clip)

    # 照片頁
    page.goto(BASE + '#/photo'); page.wait_for_timeout(200)
    reqs = []
    page.on('request', lambda r: reqs.append(r.method + ' ' + r.url))
    page.set_input_files('#ph-file', '/tmp/grid.jpg'); page.wait_for_timeout(400)
    check(P + '照片預覽', page.is_visible('#ph-img'))
    pr = page.input_value('#prompt-out')
    check(P + '照片提示詞含參考照片說明', '參考照片使用說明' in pr and '保留可辨識的特徵' in pr)
    check(P + '照片未上傳（無 POST）', not any(r.startswith('POST') for r in reqs), reqs[:3])

    # 盲盒
    page.goto(BASE + '#/blindbox'); page.wait_for_timeout(200)
    page.click('[data-lock="text"]'); before = page.inner_text('.bb-slot:nth-child(6) b')
    for _ in range(4): page.click('#bb-go'); page.wait_for_timeout(80)
    after = page.inner_text('.bb-slot:nth-child(6) b')
    check(P + '盲盒鎖定項目不變', before == after, before)
    check(P + '盲盒提示詞含用語', before in page.input_value('#prompt-out'))

    # 企劃各張數
    page.goto(BASE + '#/plan'); page.wait_for_timeout(200)
    for n in [1, 4, 8, 16, 24, 32, 40]:
        page.click(f'#pl-count [data-n="{n}"]'); page.click('#pl-gen'); page.wait_for_timeout(150)
        cnt = page.locator('.plan-item').count()
        texts = page.eval_on_selector_all('.plan-item input[data-f="text"]', 'els => els.map(e => e.value)')
        check(P + f'企劃 {n} 張數量正確且文字不重複', cnt == n and len(set(texts)) == n, f'{cnt}, uniq {len(set(texts))}')
    with page.expect_download() as d: page.click('[data-x="csv"]')
    csv = open(d.value.path(), encoding='utf-8-sig').read()
    check(P + 'CSV 匯出 41 行', len(csv.strip().splitlines()) == 41)
    with page.expect_download() as d: page.click('[data-x="json"]')
    js = json.loads(open(d.value.path(), encoding='utf-8-sig').read())
    check(P + 'JSON 匯出 40 張', len(js['items']) == 40)
    with page.expect_download() as d: page.click('[data-x="txt"]')
    txt = open(d.value.path(), encoding='utf-8-sig').read()
    check(P + 'TXT 含 40 段', txt.count('==== 第') == 40)
    page.fill('.plan-item[data-i="0"] input[data-f="text"]', '我改過了')
    page.click('[data-x="one"][data-i="0"]'); page.wait_for_timeout(150)
    check(P + '單張修改後複製', '我改過了' in page.evaluate('navigator.clipboard.readText()'))

    # 加工室
    page.goto(BASE + '#/editor'); page.wait_for_timeout(200)
    page.set_input_files('#ed-file', '/tmp/grid.png'); page.wait_for_timeout(400)
    check(P + '加工室載入圖片', page.is_visible('#ed-main'))
    page.click('[data-tab="text"]'); page.fill('#ed-text', '早安你好')
    page.click('[data-tab="bg"]'); page.click('#ed-rmbg'); page.wait_for_timeout(500)
    page.click('[data-tab="crop"]'); page.click('#ed-rotr'); page.click('#ed-flip'); page.click('#ed-undo'); page.click('#ed-undo')
    page.click('[data-tab="out"]')
    with page.expect_download() as d: page.click('#ed-dl')
    im = Image.open(d.value.path())
    check(P + '輸出 PNG 370×320', im.size == (370, 320) and im.format == 'PNG', im.size)
    a = np.array(im.convert('RGBA'))
    check(P + 'PNG 透明背景保留', (a[:, :, 3] == 0).mean() > 0.2, f'透明比例 {(a[:,:,3]==0).mean():.2f}')
    check(P + '眼睛白色未被挖空（邊緣去背）', (a[:, :, 3] == 255).mean() > 0.2)
    # 加字是否有畫上（圖下方有非底色像素的描邊色）
    bottom = a[int(320 * .75):int(320 * .95), 100:270]
    check(P + '繁中文字已繪製', ((bottom[:, :, 0] < 120) & (bottom[:, :, 3] > 200)).sum() > 200)
    # 比例不變形：以 1:1 原圖 fit → 圓仍為圓
    page.click('[data-tab="text"]'); page.fill('#ed-text', '')
    page.click('[data-tab="crop"]'); page.select_option('#ed-frame', 'sq'); page.click('#ed-fit'); page.click('[data-tab="bg"]'); page.click('#ed-restore'); page.click('[data-tab="out"]')
    with page.expect_download() as d: page.click('#ed-dl')
    im2 = np.array(Image.open(d.value.path()).convert('RGB'))
    mask = (np.abs(im2.astype(int) - [245, 158, 108]).sum(2) < 40).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask)
    big = [s for s in stats[1:] if s[4] > 200]
    ratios = [s[2] / s[3] for s in big]
    check(P + '縮放不變形（圓形寬高比≈1）', big and all(abs(r - 1) < 0.06 for r in ratios), [round(r, 3) for r in ratios])
    page.fill('#ed-name', '測試貼圖'); page.click('#ed-save'); page.wait_for_timeout(400)

    # LINE 切圖
    page.goto(BASE + '#/line'); page.wait_for_timeout(200)
    page.set_input_files('#sp-file', '/tmp/grid.png'); page.wait_for_timeout(400)
    page.check('#sp-rm'); page.click('#sp-go'); page.wait_for_function("document.querySelectorAll('#sp-tiles .tile').length === 9", timeout=15000)
    check(P + '九宮格輸出 9 張', page.locator('#sp-tiles .tile').count() == 9)
    page.check('#sp-extra')
    with page.expect_download() as d: page.click('#sp-zip')
    zf = zipfile.ZipFile(d.value.path()); names = sorted(zf.namelist())
    check(P + 'ZIP 可解壓且含 9 張＋main/tab', zf.testzip() is None and len(names) == 11 and 'main.png' in names and 'tab.png' in names, names)
    t1 = Image.open(io.BytesIO(zf.read('01.png'))); mn = Image.open(io.BytesIO(zf.read('main.png'))); tb = Image.open(io.BytesIO(zf.read('tab.png')))
    check(P + 'LINE 尺寸 370×320／240×240／96×74', t1.size == (370, 320) and mn.size == (240, 240) and tb.size == (96, 74))
    check(P + '切圖透明背景', np.array(t1.convert('RGBA'))[0, 0, 3] == 0)
    for g, n in [('2,2', 4), ('4,4', 16)]:
        page.click(f'[data-g="{g}"]'); page.click('#sp-go'); page.wait_for_function(f"document.querySelectorAll('#sp-tiles .tile').length === {n}", timeout=15000)
        check(P + f'{g} 切圖 {n} 張', page.locator('#sp-tiles .tile').count() == n)
    page.click('[data-g="custom"]'); page.fill('#sp-rows', '2'); page.fill('#sp-cols', '5'); t0 = time.time(); page.click('#sp-go')
    page.wait_for_function("document.querySelectorAll('#sp-tiles .tile').length === 10", timeout=15000); print('  切 10 張耗時', round(time.time() - t0, 2), 's')
    check(P + '自訂 2×5 切圖 10 張', page.locator('#sp-tiles .tile').count() == 10)
    page.click('#sp-tocheck'); page.wait_for_function("document.querySelectorAll('.check-item').length === 10", timeout=15000)
    check(P + '規格檢查列出 10 張', page.locator('.check-item').count() == 10)
    check(P + '張數提示（10 張不可上架）', '上架需' in page.inner_text('#ck-sum'))
    page.set_input_files('#ck-file', '/tmp/grid.jpg'); page.wait_for_timeout(600)
    check(P + 'JPG 檢查出非 PNG／無透明', '不是 PNG' in page.inner_text('.check-item:last-child'))
    page.click('#ck-fix'); page.wait_for_timeout(300); page.wait_for_function("document.querySelectorAll('.check-item').length === 11", timeout=15000)
    page.click('#ck-main'); page.wait_for_function("document.querySelectorAll('.check-item').length === 12", timeout=15000)
    page.click('#ck-tab'); page.wait_for_function("document.querySelectorAll('.check-item').length === 13", timeout=15000)
    check(P + '調整後全部 370×320', page.inner_text('#ck-list').count('370×320') == 11)
    check(P + '調整後含主圖與標籤圖', page.locator('.check-item').count() == 13)

    # 收藏：重新整理後保留
    page.goto(BASE + '#/collection'); page.reload(); page.wait_for_timeout(700)
    names = page.eval_on_selector_all('.coll-item b', 'e => e.map(x => x.textContent)')
    check(P + '收藏重新開啟後保留', '測試貼圖' in names, names)
    page.fill('#co-q', '測試'); page.wait_for_timeout(100)
    check(P + '收藏搜尋', page.locator('.coll-item').count() == 1)
    with page.expect_download() as d: page.click('#co-export')
    bk = json.loads(open(d.value.path(), encoding='utf-8-sig').read())
    check(P + '匯出備份含貼圖與角色', len(bk['stickers']) == 1 and len(bk['characters']) >= 1)
    page.fill('#co-q', ''); page.wait_for_timeout(100)
    page.click('.coll-item .tile'); page.fill('#m-name', '改名貼圖'); page.click('#m-save'); page.wait_for_timeout(500)
    check(P + '收藏改名', '改名貼圖' in page.inner_text('#co-grid'))
    page.on('dialog', lambda dlg: dlg.accept())
    page.click('.coll-item .tile'); page.click('#m-del'); page.click('#cb-ok'); page.wait_for_timeout(500)
    check(P + '收藏刪除', page.locator('.coll-item').count() == 0)
    page.set_input_files('#co-import', d.value.path()); page.wait_for_timeout(800)
    check(P + '匯入備份還原', page.locator('.coll-item').count() == 1)

    # 分享 QR Code 解碼
    page.goto(BASE + '#/share'); page.wait_for_timeout(300)
    png = page.locator('#qr').screenshot()
    img = cv2.imdecode(np.frombuffer(png, np.uint8), cv2.IMREAD_COLOR)
    val, _, _ = cv2.QRCodeDetector().detectAndDecode(cv2.copyMakeBorder(img, 20, 20, 20, 20, cv2.BORDER_CONSTANT, value=(255, 255, 255)))
    check(P + 'QR Code 解碼＝網站網址', val == BASE.split('#')[0], val)

    # API Key / 祕密字串掃描（前端）
    src = page.evaluate("Promise.all(['js/core.js','js/views.js','js/editor.js','js/linetool.js','js/collection.js','js/app.js'].map(u=>fetch(u).then(r=>r.text()))).then(a=>a.join('\\n'))")
    import re
    check(P + '前端無 API Key 樣式字串', not re.search(r'(sk-[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{30,}|api[_-]?key\s*[:=])', src, re.I))

    # Service Worker 與離線
    if BASE.startswith('http'):
        page.goto(BASE); page.wait_for_function('navigator.serviceWorker && navigator.serviceWorker.controller', timeout=15000) if False else None
        page.evaluate('navigator.serviceWorker.ready'); page.reload(); page.wait_for_timeout(1500)
        ctrl = page.evaluate('!!navigator.serviceWorker.controller')
        check(P + 'Service Worker 已控制頁面', ctrl)
        ctx.set_offline(True)
        page.reload(); page.wait_for_selector('.home-card', timeout=8000)
        page.goto(BASE + '#/editor'); page.wait_for_timeout(300)
        page.set_input_files('#ed-file', '/tmp/grid.png'); page.wait_for_timeout(400)
        page.click('[data-tab="out"]')
        with page.expect_download() as d: page.click('#ed-dl')
        check(P + '離線時加工室可用並輸出 PNG', Image.open(d.value.path()).size == (370, 320))
        ctx.set_offline(False)

    real_err = [e for e in errors if 'favicon' not in e]
    check(P + '主控台無錯誤', not real_err, real_err[:5])
    bad = [u for u in failed_req if not u.startswith('blob:') and 'net::ERR_INTERNET_DISCONNECTED' not in u]
    check(P + '無 404／資源載入錯誤', not [u for u in bad if u.startswith('4') or u.startswith('5')], bad[:5])
    if label == '手機':
        page.goto(BASE); page.wait_for_timeout(300); page.screenshot(path='/tmp/shot-mobile-home.png', full_page=True)
        page.goto(BASE + '#/editor'); page.set_input_files('#ed-file', '/tmp/grid.png'); page.wait_for_timeout(300); page.click('[data-tab="text"]'); page.fill('#ed-text', '早安'); page.screenshot(path='/tmp/shot-mobile-editor.png')
        page.goto(BASE + '#/character'); page.wait_for_timeout(300); page.screenshot(path='/tmp/shot-mobile-character.png')
    else:
        page.goto(BASE); page.wait_for_timeout(300); page.screenshot(path='/tmp/shot-desktop-home.png', full_page=True)
    browser.close()

with sync_playwright() as p:
    run(p, '電腦', {'width': 1280, 'height': 860}, False)
    run(p, '手機', {'width': 390, 'height': 844}, True)

fails = [r for r in RESULTS if not r[1]]
print(f'\n總計 {len(RESULTS)} 項，通過 {len(RESULTS) - len(fails)}，失敗 {len(fails)}')
json.dump(RESULTS, open('/tmp/test-results.json', 'w'), ensure_ascii=False)
