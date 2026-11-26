"""安裝 App 按鈕測試"""
import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
R = []
def check(n, ok, d=''):
    R.append((n, bool(ok))); print(('PASS ' if ok else 'FAIL ') + n + (' — ' + str(d)[:150] if d else ''))
UA = {
 'Android Chrome': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
 'iPhone Safari': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
 'iPhone Chrome': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1',
 'Facebook 內建瀏覽器': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36 [FBAN/EMA;FBLC/zh_TW;FBAV/400.0]',
}
EXPECT = {'Android Chrome': '安裝應用程式', 'iPhone Safari': '加入主畫面', 'iPhone Chrome': 'Chrome 在網址列右側', 'Facebook 內建瀏覽器': '無法安裝'}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for name, ua in UA.items():
        ctx = b.new_context(user_agent=ua, viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
        ctx.add_init_script("localStorage.setItem('ss_welcomed','true')")
        pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(BASE); pg.wait_for_selector('.main-cta')
        check(f'[{name}] 首頁顯示安裝按鈕', pg.is_visible('#install-btn'))
        pg.click('#install-btn'); pg.wait_for_selector('#modal:not([hidden])')
        t = pg.inner_text('#modal-body')
        check(f'[{name}] 顯示對應安裝步驟', EXPECT[name] in t, t[:80])
        w = pg.evaluate('document.documentElement.scrollWidth'); check(f'[{name}] 無水平溢出', w <= 391, w)
        check(f'[{name}] 無錯誤', not errs, errs)
        if name == 'Android Chrome':
            pg.click('.modal-close'); pg.wait_for_timeout(250); pg.screenshot(path='/tmp/install-home.png')
            # 模擬 Chrome 可一鍵安裝
            pg.evaluate("""()=>{const e=new Event('beforeinstallprompt',{cancelable:true});window.__prompted=0;
              e.prompt=()=>{window.__prompted++;};e.userChoice=Promise.resolve({outcome:'accepted'});window.dispatchEvent(e);}""")
            pg.wait_for_timeout(100)
            check('[Android Chrome] 收到安裝事件後顯示一鍵安裝', '一鍵安裝' in pg.inner_text('#install-cta'))
            pg.click('#install-btn'); pg.wait_for_timeout(200)
            check('[Android Chrome] 按下後呼叫系統安裝視窗', pg.evaluate('window.__prompted') == 1)
            pg.evaluate("window.dispatchEvent(new Event('appinstalled'))"); pg.wait_for_timeout(100)
            check('[Android Chrome] 安裝完成後隱藏按鈕', pg.locator('#install-btn').count() == 0)
        ctx.close()
    ctx = b.new_context(viewport={'width': 390, 'height': 844})
    ctx.add_init_script("Object.defineProperty(navigator,'standalone',{get:()=>true});localStorage.setItem('ss_welcomed','true')")
    pg = ctx.new_page(); pg.goto(BASE); pg.wait_for_selector('.main-cta')
    check('[已安裝 App 開啟] 不顯示安裝按鈕', pg.locator('#install-btn').count() == 0)
    b.close()
print(f'\n安裝測試 {len(R)} 項，通過 {sum(o for _, o in R)}')
