"""v1.2 文字編輯與貼圖裝飾強化版：驗收測試"""
import sys, json, io
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
R = []
def check(n, ok, d=''):
    R.append((n, bool(ok), str(d)[:200])); print(('PASS ' if ok else 'FAIL ') + n + (' — ' + str(d)[:200] if (not isinstance(d, str) or d) else ''))

def png(pg):
    with pg.expect_download() as dl:
        pg.click('[data-tab="out"]'); pg.click('#ed-dl')
    return np.array(Image.open(dl.value.path()).convert('RGBA')).astype(int)

def st(pg): return pg.evaluate('SS._editorState()')
def to_page(pg, x, y):
    r = pg.evaluate("(()=>{const c=document.getElementById('ed-cv');const b=c.getBoundingClientRect();return [b.x,b.y,b.width/c.width,b.height/c.height]})()")
    return r[0] + x * r[2], r[1] + y * r[3]
def drag(pg, a, b, steps=12):
    if not pg.evaluate("document.getElementById('ed-wrap').classList.contains('zoomed')"):
        pg.evaluate("document.getElementById('ed-cv').scrollIntoView({block:'center'})"); pg.wait_for_timeout(80)
    pg.mouse.move(*to_page(pg, *a)); pg.mouse.down(); pg.mouse.move(*to_page(pg, *b), steps=steps); pg.mouse.up(); pg.wait_for_timeout(80)
def load(pg, path, frame='orig'):
    pg.goto(BASE + '#home'); pg.wait_for_selector('.main-cta'); pg.goto(BASE + '#editor'); pg.wait_for_selector('#ed-file', state='attached')
    pg.set_input_files('#ed-file', path); pg.wait_for_selector('#ed-main:not([hidden])')
    pg.click('[data-tab="crop"]'); pg.select_option('#ed-frame', frame); pg.click('#ed-fit'); pg.wait_for_timeout(100)

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True, permissions=['clipboard-read', 'clipboard-write'])
    ctx.add_init_script("localStorage.setItem('ss_welcomed','true')")
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)

    # ===== 1. 原圖文字手動消除 =====
    load(pg, '/tmp/v12_text_white.png')
    pg.click('[data-tab="erase"]')
    check('1. 消除工具有重疊提醒且標示非 AI', '重疊' in pg.inner_text('[data-panel="erase"]') and '不是 AI' in pg.inner_text('[data-panel="erase"]'))
    pg.fill('#ed-brush', '70'); pg.dispatch_event('#ed-brush', 'input')
    drag(pg, (320, 200), (580, 200), 20)
    a = png(pg)
    check('1. 橡皮擦：文字處變透明', a[200, 350, 3] == 0 and a[200, 520, 3] == 0, a[200, 350])
    check('1. 橡皮擦：角色未受影響', a[220, 160, 3] == 255 and abs(a[220, 160, 0] - 245) < 10)
    pg.click('#ed-undo'); a = png(pg)
    check('1. 還原：文字回來', a[200, 350, 3] == 255 and a[200, 350, 0] < 60)
    pg.click('#ed-redo'); a = png(pg)
    check('1. 重做：再次消除', a[200, 350, 3] == 0)
    pg.click('#ed-undo'); pg.click('[data-tab="erase"]')
    pg.click('input[name=emode][value=rect]'); pg.click('input[name=rfill][value=clear]')
    drag(pg, (318, 160), (575, 240)); a = png(pg)
    check('1. 框選消除：框內全透明、框外保留', (a[172:228, 335:555, 3] == 0).all() and a[100, 300, 3] == 255)
    pg.click('#ed-undo'); pg.click('[data-tab="erase"]'); pg.click('input[name=emode][value=paint]')
    drag(pg, (320, 200), (580, 200), 20); a = png(pg)
    check('1. 填色筆刷：以白色蓋掉文字', (a[200, 350, :3] > 240).all() and a[200, 350, 3] == 255, a[200, 350])
    # 周圍延伸填補（漸層底）
    load(pg, '/tmp/v12_text_grad.png'); pg.click('[data-tab="erase"]')
    pg.click('input[name=emode][value=rect]'); pg.click('input[name=rfill][value=heal]')
    drag(pg, (188, 158), (392, 242)); a = png(pg)
    reg = a[170:230, 200:380, :3]
    exp = np.array([200 + 215 // 12, 150 + 200 // 8, 120])
    check('1. 周圍延伸填補：字消失、顏色接近背景', reg.min() > 100 and np.abs(a[200, 215, :3] - exp).max() < 30, (reg.min(), a[200, 215, :3], exp))
    # 放大後細部消除
    load(pg, '/tmp/v12_text_white.png'); pg.click('[data-zoom="2"]'); pg.click('[data-tab="erase"]')
    w = pg.evaluate("document.getElementById('ed-cv').getBoundingClientRect().width")
    check('1. 放大 2× 檢視', w > 1000, w)
    pg.fill('#ed-brush', '20'); pg.dispatch_event('#ed-brush', 'input')
    pg.evaluate("document.getElementById('ed-wrap').scrollTo(0,0)"); pg.evaluate("document.getElementById('ed-wrap').scrollIntoView({block:'start'})"); pg.wait_for_timeout(300)
    drag(pg, (40, 40), (120, 40), 10); pg.click('[data-zoom="1"]'); a = png(pg)
    check('1. 放大時消除位置正確', a[40, 80, 3] == 0 and a[80, 80, 3] == 255, (a[40, 80], a[80, 80]))
    # 透明背景保留
    load(pg, '/tmp/v12_trans.png'); pg.click('[data-tab="erase"]'); pg.click('input[name=emode][value=rect]'); pg.click('input[name=rfill][value=clear]')
    drag(pg, (220, 310), (390, 380)); a = png(pg)
    check('10. 消除後透明背景保留、角色保留', a[5, 5, 3] == 0 and a[180, 300, 3] == 255 and (a[322:368, 232:358, 3] == 0).all())

    # ===== 2. 消除後重新加字 =====
    pg.click('[data-tab="erase"]'); pg.click('#ed-after-erase'); pg.fill('#ed-text', '正確文字'); pg.wait_for_timeout(100)
    s = st(pg); texts = [l for l in s['layers'] if l['type'] == 'text']
    check('2. 消除後可加正確文字', len(texts) == 1 and texts[0]['content'] == '正確文字')
    a = png(pg); check('2. 文字有畫進輸出圖', (a[:, :, 3] > 0).sum() > (a[:, :, 3] > 0).sum() * 0 + 20000)

    # ===== 3. 多組文字 =====
    pg.click('[data-tab="text"]'); pg.click('#ed-addtext'); pg.fill('#ed-text', '第二組'); pg.click('#ed-addtext'); pg.fill('#ed-text', '第三組'); pg.wait_for_timeout(100)
    s = st(pg); ids = [l['id'] for l in s['layers'] if l['type'] == 'text']
    check('3. 三組獨立文字', [l['content'] for l in s['layers'] if l['type'] == 'text'] == ['正確文字', '第二組', '第三組'])
    pg.click(f'.layer-chip[data-layer="{ids[1]}"]'); pg.fill('#ed-text', '第二組改'); pg.wait_for_timeout(80)
    pg.click(f'.layer-chip[data-layer="{ids[0]}"]'); pg.click('#ed-del'); pg.wait_for_timeout(80)
    s = st(pg)
    check('3. 個別修改與刪除', [l['content'] for l in s['layers'] if l['type'] == 'text'] == ['第二組改', '第三組'])
    pg.click('#ed-undo'); s = st(pg)
    check('3. 刪除後可還原', len([l for l in s['layers'] if l['type'] == 'text']) == 3)
    check('3. 圖層清單顯示底圖與文字', pg.locator('.layer-chip').count() == 4)

    # ===== 4. 語言與特殊漢字 =====
    pg.evaluate("Promise.all(SS.FONTS.map(f=>document.fonts.load(f.weight+' 40px '+f.family,'今天食飽未袂䆀𪜶')))")
    pg.wait_for_timeout(500)
    samples = {'華語': '今天貼什麼？謝謝', '台語': '食飽未？袂䆀𪜶媠', '金門話': '金門 食飽未', 'English': 'Good morning!', '日本語': 'おはようございます', '한국어': '안녕하세요'}
    res = pg.evaluate("(s)=>SS.FONTS.map(f=>[f.id, Object.fromEntries(Object.entries(s).map(([k,v])=>[k, SS.findMissingGlyphs(v, f.weight+' 40px '+f.family)]))])", samples)
    bad = [(f, k, m) for f, d in res for k, m in d.items() if m]
    check('4. 七種字體 × 六種語言無缺字（含台語特殊字）', not bad, bad[:6])
    loaded = pg.evaluate("['SS Huninn','SS LXGW WenKai TC','SS Iansui','SS Chiron GoRound TC','SS Noto Sans TC Black','SS Cactus Classical Serif'].map(f=>document.fonts.check('40px \"'+f+'\"','食飽未'))")
    check('4. 開源字型實際載入', all(loaded), loaded)

    # ===== 5. 字體、顏色、描邊、大小、樣式 =====
    pg.goto(BASE + '#home'); pg.wait_for_selector('.main-cta'); pg.goto(BASE + '#textsticker'); pg.wait_for_selector('#ed-main:not([hidden])'); pg.wait_for_timeout(300)
    pg.fill('#ed-text', '早安測試'); pg.fill('#ed-tc', '#ff0000'); pg.fill('#ed-sw', '0'); pg.dispatch_event('#ed-sw', 'input'); pg.wait_for_timeout(200)
    base = png(pg)
    red = ((base[:, :, 0] > 200) & (base[:, :, 1] < 60) & (base[:, :, 2] < 60) & (base[:, :, 3] > 200)).sum()
    check('5. 文字顏色', red > 500, red)
    pg.click('[data-tab="text"]'); pg.fill('#ed-sw', '14'); pg.dispatch_event('#ed-sw', 'input'); a1 = png(pg)
    check('5. 描邊粗細', (a1[:, :, 3] > 0).sum() > (base[:, :, 3] > 0).sum() * 1.2)
    pg.click('[data-tab="text"]'); pg.fill('#ed-sc', '#0000ff'); a2 = png(pg)
    blue = ((a2[:, :, 2] > 200) & (a2[:, :, 0] < 60) & (a2[:, :, 3] > 200)).sum(); check('5. 描邊顏色', blue > 500, blue)
    def bbox(a):
        ys, xs = np.where(a[:, :, 3] > 0); return xs.max() - xs.min(), ys.max() - ys.min()
    pg.click('[data-tab="text"]'); pg.fill('#ed-ts', '40'); pg.dispatch_event('#ed-ts', 'input'); s1 = bbox(png(pg))
    pg.click('[data-tab="text"]'); pg.fill('#ed-ts', '70'); pg.dispatch_event('#ed-ts', 'input'); s2 = bbox(png(pg))
    check('5. 文字大小', s2[0] > s1[0] * 1.4, (s1, s2))
    f0 = png(pg); pg.click('[data-tab="text"]'); pg.select_option('#ed-font', 'retro'); pg.wait_for_timeout(600); f1 = png(pg)
    check('5. 字體切換改變外觀', np.abs(f0 - f1).sum() > 100000)
    pg.click('[data-tab="text"]'); pg.click('input[name=tdir][value=v]'); pg.wait_for_timeout(200); v = bbox(png(pg))
    check('5. 直排', v[1] > v[0] * 1.8, v)
    pg.click('[data-tab="text"]'); pg.click('input[name=tdir][value=h]'); h0 = bbox(png(pg))
    pg.click('[data-tab="text"]'); pg.fill('#ed-ls', '20'); pg.dispatch_event('#ed-ls', 'input'); h1 = bbox(png(pg))
    check('5. 字距', h1[0] > h0[0] + 40, (h0, h1))
    pg.click('[data-tab="text"]'); pg.fill('#ed-ls', '0'); pg.dispatch_event('#ed-ls', 'input'); pg.fill('#ed-text', '第一行\n第二行'); pg.fill('#ed-lh', '100'); pg.dispatch_event('#ed-lh', 'input'); l0 = bbox(png(pg))
    pg.click('[data-tab="text"]'); pg.fill('#ed-lh', '180'); pg.dispatch_event('#ed-lh', 'input'); l1 = bbox(png(pg))
    check('5. 多行與行距', l1[1] > l0[1] + 30, (l0, l1))
    r0 = png(pg); pg.click('[data-tab="text"]'); pg.fill('#ed-tr', '30'); pg.dispatch_event('#ed-tr', 'input'); r1 = png(pg)
    check('5. 文字旋轉', np.abs(r0 - r1).sum() > 100000 and st(pg)['layers'][0]['rot'] == 30)
    pg.click('[data-tab="text"]'); pg.check('#ed-shadow'); sh = png(pg)
    check('5. 文字陰影', np.abs(sh - r1).sum() > 50000)
    pg.click('[data-tab="text"]'); pg.click('[data-pos="tr"]'); s = st(pg)['layers'][0]
    check('5. 快速定位（右上角）', s['x'] > 0.5 and s['y'] < 0.5, (s['x'], s['y']))

    # ===== 6. 純文字貼圖 =====
    pg.goto(BASE + '#home'); pg.wait_for_selector('.main-cta'); pg.goto(BASE + '#textsticker'); pg.wait_for_selector('#ed-main:not([hidden])'); pg.wait_for_timeout(300)
    check('6. 純文字貼圖不需圖片即可編輯', len(st(pg)['layers']) == 1 and pg.is_hidden('#ed-empty'))
    pg.select_option('#ed-lang', 'taigi'); pg.click('#ed-pick'); pg.wait_for_selector('#pp-box .tg-item'); pg.fill('#pp-box .pp-q', '好膽'); pg.click('#pp-box .tg-item'); pg.wait_for_timeout(150)
    check('6. 純文字貼圖可用台語用語庫', st(pg)['layers'][0]['content'] == '好膽莫走')
    a = png(pg)
    check('6. 純文字貼圖 PNG 370×320、透明背景', a.shape[:2] == (320, 370) and a[2, 2, 3] == 0)
    pg.select_option('#ed-bg', 'color'); pg.fill('#ed-bgc', '#ffe3d2'); a = png(pg)
    check('6. 自訂背景色', tuple(a[2, 2]) == (255, 227, 210, 255), a[2, 2])
    pg.click('[data-tab="crop"]'); pg.select_option('#ed-frame', 'main'); a = png(pg)
    check('6. 可切換 LINE 主圖尺寸', a.shape[:2] == (240, 240))
    pg.click('[data-tab="text"]'); pg.select_option('#ed-lang', 'kinmen')
    check('6. 金門話說明（教育部詞彙方言差）', '金門' in pg.inner_text('#ed-langnote') and '教育部' in pg.inner_text('#ed-langnote'))

    # ===== 7. 裝飾 =====
    pg.click('[data-tab="crop"]'); pg.select_option('#ed-frame', 'line')
    pg.click('[data-tab="deco"]')
    check('7. 裝飾素材 18 種', pg.locator('.deco-btn').count() == 18)
    pg.click('[data-deco="star"]'); s = st(pg); d = [l for l in s['layers'] if l['type'] == 'deco'][0]
    x0, y0 = d['x'] * 370, d['y'] * 320
    tx, ty = 185, 160
    drag(pg, (x0, y0), (tx, ty), 10); d2 = [l for l in st(pg)['layers'] if l['type'] == 'deco'][0]
    check('7. 裝飾可拖曳移動', abs(d2['x'] * 370 - tx) < 30 and abs(d2['y'] * 320 - ty) < 30, (d2['x'] * 370, d2['y'] * 320))
    pg.fill('#ed-ds', '120'); pg.dispatch_event('#ed-ds', 'input'); pg.fill('#ed-dr', '45'); pg.dispatch_event('#ed-dr', 'input'); pg.fill('#ed-dc', '#00aaff')
    d3 = [l for l in st(pg)['layers'] if l['type'] == 'deco'][0]
    check('7. 裝飾大小、旋轉、顏色', d3['size'] == 120 and d3['rot'] == 45 and d3['color'] == '#00aaff', d3)
    a = png(pg); blue = ((a[:, :, 2] > 200) & (a[:, :, 1] > 140) & (a[:, :, 0] < 40)).sum()
    check('7. 變色後實際輸出', blue > 300, blue)
    pg.click('[data-tab="deco"]'); pg.click('#ed-del'); pg.wait_for_timeout(80)
    check('7. 裝飾可個別刪除', not [l for l in st(pg)['layers'] if l['type'] == 'deco'])

    # ===== 8. 隨機裝飾數量 =====
    pg.click('[data-tab="deco"]')
    ok = True; detail = []
    for v, rng in [('0', {0}), ('1', {1}), ('2', {2}), ('3', {3}), ('r', {1, 2, 3})]:
        pg.click(f'input[name=dcount][value="{v}"]'); seen = set()
        for _ in range(8 if v == 'r' else 2):
            pg.click('#ed-randdeco'); pg.wait_for_timeout(30); seen.add(len([l for l in st(pg)['layers'] if l['type'] == 'deco']))
        detail.append((v, sorted(seen))); ok &= seen <= rng and (v != 'r' or len(seen) >= 2)
    check('8. 隨機裝飾數量符合設定（0/1/2/3/隨機 1～3）', ok, detail)
    pg.click('input[name=dcount][value="1"]')
    check('8. 預設裝飾數量為 1（簡約）', pg.evaluate("localStorage.getItem('ss_decoCount')") == '"1"')

    # ===== 9. 隨機設計保留文字 =====
    pg.click('[data-tab="text"]'); pg.click('#ed-addtext'); pg.fill('#ed-text', '不能被改'); pg.wait_for_timeout(50)
    before = [l['content'] for l in st(pg)['layers'] if l['type'] == 'text']
    pg.click('[data-tab="text"]'); pg.evaluate("document.getElementById('ed-randbox').open = true"); same = True; fonts = set()
    for _ in range(6):
        pg.click('#ed-random'); pg.wait_for_timeout(40); s = st(pg)
        same &= [l['content'] for l in s['layers'] if l['type'] == 'text'] == before; fonts.add(s['layers'][0]['font'] if s['layers'][0]['type'] == 'text' else '')
    check('9. 隨機設計 6 次，文字內容完全不變', same, before)
    check('9. 隨機設計確實改變字體', len(fonts) >= 2, fonts)
    pg.click('[data-dlock="font"]'); pg.click('[data-dlock="pos"]'); s0 = st(pg)
    for _ in range(4): pg.click('#ed-random'); pg.wait_for_timeout(30)
    s1 = st(pg); t0 = [(l['font'], round(l['x'], 3), round(l['y'], 3)) for l in s0['layers'] if l['type'] == 'text']; t1 = [(l['font'], round(l['x'], 3), round(l['y'], 3)) for l in s1['layers'] if l['type'] == 'text']
    check('9. 鎖定字體與位置後不被隨機', t0 == t1, (t0, t1))
    pg.click('[data-dlock="font"]'); pg.click('[data-dlock="pos"]')

    # ===== 文字與裝飾限制在輸出範圍內 =====
    pg.goto(BASE + '#home'); pg.wait_for_selector('.main-cta'); pg.evaluate("SS.edSession.del('text')")  # v1.4.1 起會恢復上次作品，這裡要從新畫布開始
    pg.goto(BASE + '#textsticker'); pg.wait_for_selector('#ed-main:not([hidden])'); pg.wait_for_timeout(300)
    l = st(pg)['layers'][0]; drag(pg, (l['x'] * 370, l['y'] * 320), (369, 319), 10)
    a = png(pg)
    check('6. 拖到邊緣仍完整留在輸出範圍內', a[:, -1, 3].max() == 0 and a[-1, :, 3].max() == 0, (a[:, -1, 3].max(), a[-1, :, 3].max()))

    # ===== 模式 A：提示詞 =====
    pg.goto(BASE + '#character'); pg.wait_for_selector('#prompt-out')
    pg.fill('#f-text', '早安\n大家好'); pg.fill('#f-text2', '今天也辛苦了'); pg.click('.design-box summary')
    pg.click('#f-drand'); pr = pg.input_value('#prompt-out')
    check('模式 A：隨機設計寫進提示詞', '【文字與裝飾設計】' in pr and '文字字體風格' in pr and '文字位置' in pr, pr[pr.find('【文字與裝飾設計】'):][:150])
    check('模式 A：不改動文字、含多行與第二組文字', pg.input_value('#f-text') == '早安\n大家好' and '早安\n大家好' in pr and '今天也辛苦了' in pr)
    f1 = pg.input_value('#f-dfont'); pg.click('[data-pl="font"]')
    for _ in range(4): pg.click('#f-drand')
    check('模式 A：鎖定字體後不被隨機', pg.input_value('#f-dfont') == f1)
    pg.click('#f-dclear'); check('模式 A：清除設計', '【文字與裝飾設計】' not in pg.input_value('#prompt-out'))

    # ===== 13. 收藏與本機資料保留 =====
    pg.goto(BASE + '#home'); pg.wait_for_selector('.main-cta'); pg.goto(BASE + '#textsticker'); pg.wait_for_selector('#ed-main:not([hidden])'); pg.click('[data-tab="out"]'); pg.fill('#ed-name', 'v12收藏測試'); pg.click('#ed-save'); pg.wait_for_timeout(400)
    pg.goto(BASE + '#collection'); pg.reload(); pg.wait_for_selector('#co-grid'); pg.wait_for_timeout(600)
    check('13. 收藏寫入並在重新整理後保留', 'v12收藏測試' in pg.inner_text('#co-grid'))
    check('無主控台錯誤（電腦）', not errs, errs[:3])
    ctx.close()

    # ===== 11. 手機觸控 =====
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True)
    ctx.add_init_script("localStorage.setItem('ss_welcomed','true')")
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE + '#home'); pg.wait_for_selector('.main-cta'); pg.goto(BASE + '#textsticker'); pg.wait_for_selector('#ed-main:not([hidden])'); pg.wait_for_timeout(300)
    w = pg.evaluate('document.documentElement.scrollWidth'); check('11. 手機版無水平溢出', w <= 391, w)
    cdp = ctx.new_cdp_session(pg)
    def touch(kind, points):
        cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': [{'x': x, 'y': y, 'id': i} for i, (x, y) in enumerate(points)]})
    l = st(pg)['layers'][0]; sx, sy = to_page(pg, l['x'] * 370, l['y'] * 320); ex, ey = to_page(pg, 185, 80)
    pg.evaluate("document.getElementById('ed-cv').scrollIntoView({block:'center'})"); pg.wait_for_timeout(150)
    l = st(pg)['layers'][0]; sx, sy = to_page(pg, l['x'] * 370, l['y'] * 320); ex, ey = to_page(pg, 185, 80)
    touch('touchStart', [(sx, sy)])
    for i in range(1, 11): touch('touchMove', [(sx + (ex - sx) * i / 10, sy + (ey - sy) * i / 10)])
    touch('touchEnd', []); pg.wait_for_timeout(100)
    l2 = st(pg)['layers'][0]
    check('11. 手指拖曳文字', abs(l2['y'] * 320 - 80) < 25, l2['y'] * 320)
    size0 = l2['size']; cx, cy = to_page(pg, l2['x'] * 370, l2['y'] * 320)
    touch('touchStart', [(cx - 20, cy), (cx + 20, cy)])
    for i in range(1, 11): touch('touchMove', [(cx - 20 - 4 * i, cy), (cx + 20 + 4 * i, cy)])
    touch('touchEnd', []); pg.wait_for_timeout(100)
    size1 = st(pg)['layers'][0]['size']
    check('11. 雙指縮放文字', size1 > size0 * 1.3, (size0, size1))
    pg.click('[data-tab="deco"]'); pg.click('[data-deco="heart"]'); d = [l for l in st(pg)['layers'] if l['type'] == 'deco'][0]
    cx, cy = to_page(pg, d['x'] * 370, d['y'] * 320)
    touch('touchStart', [(cx - 15, cy - 15), (cx + 15, cy + 15)])
    for i in range(1, 11): touch('touchMove', [(cx - 15 - 2 * i, cy - 15), (cx + 15 + 2 * i, cy + 15)])
    touch('touchEnd', []); pg.wait_for_timeout(100)
    d2 = [l for l in st(pg)['layers'] if l['type'] == 'deco'][0]
    check('11. 雙指縮放／旋轉裝飾', d2['size'] != d['size'] and d2['rot'] != d['rot'], (d['size'], d2['size'], d2['rot']))
    tabs_w = pg.evaluate("document.querySelector('.scroll-tabs').scrollWidth > document.querySelector('.scroll-tabs').clientWidth")
    check('11. 手機版 7 個分頁可橫向捲動', tabs_w and pg.locator('.scroll-tabs > .tab').count() == 7)
    pg.screenshot(path='/tmp/v12-mobile.png')
    check('無主控台錯誤（手機）', not errs, errs[:3])
    b.close()

fails = [r for r in R if not r[1]]
print(f'\nv1.2 測試 {len(R)} 項，通過 {len(R) - len(fails)}，失敗 {len(fails)}')
json.dump(R, open('/tmp/v12-results.json', 'w'), ensure_ascii=False)
