"""v1.4.1：加工室儲存與離開後恢復"""
import sys, io
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
R = []
def check(n, ok, d=''):
    R.append((n, bool(ok))); print(('PASS ' if ok else 'FAIL ') + n + (' — ' + str(d)[:200] if d != '' else ''))
def img(c, w=640, h=480):
    im = Image.new('RGBA', (w, h), (255, 255, 255, 255)); ImageDraw.Draw(im).ellipse((w*.2, h*.2, w*.8, h*.8), fill=c); b = io.BytesIO(); im.save(b, 'PNG'); return b.getvalue()
F = lambda n, d: {'name': n, 'mimeType': 'image/png', 'buffer': d}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    ctx.add_init_script("""if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.clear();localStorage.setItem('ss_welcomed','true');indexedDB.deleteDatabase('sticker-studio-editor');indexedDB.deleteDatabase('sticker-studio');}""")
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    st = lambda: pg.evaluate("SS._editorState()")
    pg.goto(BASE + '#editor'); pg.wait_for_selector('#ed-file', state='attached')
    pg.set_input_files('#ed-file', files=[F('cat.png', img((240, 120, 90, 255)))]); pg.wait_for_timeout(600)
    check('工具列有明顯的「💾 儲存」按鈕', pg.is_visible('#ed-quicksave'))
    pg.click('.scroll-tabs > .tab[data-tab="text"]'); pg.wait_for_timeout(200)
    pg.evaluate("document.querySelector('#ed-addtext')?.click()"); pg.wait_for_timeout(200)
    pg.fill('#ed-text', '保留我'); pg.wait_for_timeout(200)
    pg.click('.scroll-tabs > .tab[data-tab="crop"]'); pg.select_option('#ed-frame', 'sq'); pg.wait_for_timeout(200)
    pg.click('.scroll-tabs > .tab[data-tab="bg"]'); pg.click('#ed-rmbg'); pg.wait_for_timeout(400)
    pg.click('.scroll-tabs > .tab[data-tab="out"]'); pg.fill('#ed-name', '我的作品'); pg.wait_for_timeout(1300)
    s0 = st()
    check('自動暫存提示出現', '已自動暫存' in pg.inner_text('#ed-autosave'), pg.inner_text('#ed-autosave'))
    # 跳到收藏再回來
    pg.click('#bottom-nav a[data-nav="coll"]'); pg.wait_for_timeout(600)
    pg.click('#bottom-nav a[data-nav="edit"]'); pg.wait_for_timeout(1500)
    s1 = st()
    check('跳到收藏再回加工室：圖片還在', pg.is_visible('#ed-main') and pg.is_hidden('#ed-empty'))
    check('文字圖層、尺寸、縮放都恢復', [l.get('content') for l in s1['layers']] == [l.get('content') for l in s0['layers']] and s1['frame'] == 'sq' and abs(s1['scale'] - s0['scale']) < 1e-6, (s1['frame'], [l.get('content') for l in s1['layers']]))
    check('檔名恢復', pg.input_value('#ed-name') == '我的作品')
    corner = pg.evaluate("(()=>{const c=document.getElementById('ed-cv');const x=document.createElement('canvas');x.width=c.width;x.height=c.height;return null})()")
    # 去背結果也保留：匯出後四角透明
    a = pg.evaluate("""(async()=>{document.getElementById('ed-bg').value='transparent';const b=await new Promise(r=>document.getElementById('ed-cv').toBlob(r));const i=await createImageBitmap(b);const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);return x.getImageData(0,0,1,1).data[3]})()""")
    check('去背結果也保留（角落透明）', a == 0, a)
    # 重新整理頁面
    pg.reload(); pg.wait_for_timeout(2000)
    check('重新整理（或關掉 App 再開）也能恢復', pg.is_visible('#ed-main') and [l.get('content') for l in st()['layers']] == ['保留我'])
    # 儲存到收藏（含可再編輯圖層）
    pg.click('#ed-quicksave'); pg.wait_for_timeout(1200)
    items = pg.evaluate("SS.idb.all().then(a=>a.map(x=>({id:x.id,name:x.name,p:!!x.project})))")
    check('「儲存」存到收藏並保存可再編輯的圖層', len(items) == 1 and items[0]['p'] and items[0]['name'] == '我的作品', items)
    # 從收藏再加工 → 圖層可編輯 → 再儲存會更新同一張
    pg.goto(BASE + '#collection'); pg.wait_for_timeout(800)
    pg.locator('.coll-item .tile, [data-open]').first.click(); pg.wait_for_selector('#m-edit'); pg.click('#m-edit'); pg.wait_for_timeout(1500)
    s2 = st()
    check('從收藏「再加工」：文字仍是可編輯的圖層', [l.get('content') for l in s2['layers']] == ['保留我'] and s2['frame'] == 'sq')
    pg.click('.scroll-tabs > .tab[data-tab="text"]'); pg.fill('#ed-text', '改過了'); pg.wait_for_timeout(300)
    pg.click('#ed-quicksave'); pg.wait_for_timeout(1200)
    items2 = pg.evaluate("SS.idb.all().then(a=>a.map(x=>({id:x.id,c:x.project.S.layers[0].content})))")
    check('再儲存會更新原本那一張，不會多一張', len(items2) == 1 and items2[0]['id'] == items[0]['id'] and items2[0]['c'] == '改過了', items2)
    # 批次佇列也會保留
    pg.click('#ed-new'); pg.wait_for_timeout(1200)
    check('「新作品」清空畫面', pg.is_visible('#ed-empty') and pg.is_hidden('#ed-main'))
    pg.set_input_files('#ed-file', files=[F(f'q{i}.png', img(c)) for i, c in enumerate([(200, 80, 80, 255), (80, 160, 90, 255), (80, 90, 200, 255)])]); pg.wait_for_timeout(800)
    pg.click('#ed-qskip'); pg.wait_for_timeout(1500)
    pg.goto(BASE + '#collection'); pg.wait_for_timeout(500); pg.goto(BASE + '#editor'); pg.wait_for_timeout(2000)
    check('批次佇列（3 張、目前第 2 張、跳過狀態）也會保留', pg.locator('#ed-queue button').count() == 3 and 'cur' in pg.get_attribute('#ed-queue button:nth-child(2)', 'class') and 'skip' in pg.get_attribute('#ed-queue button:nth-child(1)', 'class'))
    # 未存的作品被新內容取代時，可以恢復
    pg.evaluate("(()=>{const c=document.createElement('canvas');c.width=c.height=200;c.getContext('2d').fillRect(50,50,100,100);c.toBlob(b=>{SS.handoffEditor={blob:b,name:'new.png'};location.hash='#home';setTimeout(()=>location.hash='#editor',100);});})()")
    pg.wait_for_timeout(2500)
    check('帶入新圖時，未存的作品放到「上一個作品」', pg.is_visible('#ed-prev'))
    pg.click('#ed-prev-restore'); pg.wait_for_timeout(1500)
    check('按「恢復上一個作品」回到原本的批次佇列', pg.locator('#ed-queue button').count() == 3)
    # 新作品有未存內容時要確認
    pg.click('#ed-new'); pg.wait_for_selector('#cb-ok'); pg.click('#cb-no'); pg.wait_for_timeout(300)
    check('有未存內容時按「新作品」會先確認，取消就保留', pg.locator('#ed-queue button').count() == 3)
    # 純文字貼圖頁獨立暫存
    pg.goto(BASE + '#textsticker'); pg.wait_for_timeout(800)
    pg.fill('#ed-text', '文字頁'); pg.wait_for_timeout(1200)
    pg.goto(BASE + '#home'); pg.goto(BASE + '#textsticker'); pg.wait_for_timeout(1500)
    check('純文字貼圖頁也會保留', '文字頁' in [l.get('content') for l in st()['layers']])
    pg.goto(BASE + '#editor'); pg.wait_for_timeout(1500)
    check('加工室與純文字頁的暫存互不影響', pg.locator('#ed-queue button').count() == 3)
    check('全程沒有 JS 錯誤', not errs, errs[:3])
    b.close()
print(f'\nv1.4.1 測試 {len(R)} 項，通過 {sum(o for _, o in R)}')
sys.exit(0 if all(o for _, o in R) else 1)
