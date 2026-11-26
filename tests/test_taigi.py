"""台語貼圖專區驗收測試"""
import sys, json
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8765/'
R = []
def check(n, ok, d=''):
    R.append((n, bool(ok), str(d)[:200])); print(('PASS ' if ok else 'FAIL ') + n + (' — ' + str(d)[:200] if d else ''))

data = json.load(open('/home/claude/sticker-studio/data/taigi.json', encoding='utf-8'))
need = ['日常問候', '日常回覆', '驚訝傻眼', '搞笑吐槽', '上班族崩潰', '生氣不爽', '撒嬌可愛', '鼓勵安慰', '感謝道歉', '吃喝玩樂', '耍廢躺平', '長輩問候', '節日祝福', '台灣在地流行用語']
names = [c['name'] for c in data['categories']]
check('資料：至少 120 句', len(data['phrases']) >= 120, len(data['phrases']))
check('資料：14 個指定情境都有', all(n in names for n in need))
check('資料：9 個台語企劃主題', [t['name'] for t in data['themes']] == ['阿嬤的日常問候', '台灣上班族崩潰日記', '台味搞笑吐槽', '台語撒嬌大全', '台灣菜市場人生', '台語長輩祝福', '台灣人聊天必備', '台味厭世人生', '台語金句系列'])
check('資料：正字不重複', len({p['hanji'] for p in data['phrases']}) == len(data['phrases']))
check('資料：每句都有華語', all(p.get('zh') for p in data['phrases']))
check('資料：諧音與正字分開欄位', all(p.get('pun') != p['hanji'] for p in data['phrases']))
check('資料：每句有查核層級', all(p['check'] in ('headword', 'example', 'words', 'manual') for p in data['phrases']))

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for label, vp, mob in [('電腦', {'width': 1280, 'height': 860}, False), ('手機', {'width': 390, 'height': 844}, True)]:
        P = f'[{label}] '
        ctx = b.new_context(viewport=vp, is_mobile=mob, has_touch=mob, accept_downloads=True, permissions=['clipboard-read', 'clipboard-write'])
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.goto(BASE); pg.wait_for_selector('.home-card')
        pg.wait_for_selector('#modal:not([hidden])', timeout=5000); pg.wait_for_timeout(250); pg.click('.modal-close'); pg.wait_for_timeout(250)
        check(P + '首頁有台語專區入口', pg.locator('a.tg-banner[href="#taigi"]').count() == 1)
        pg.click('a.tg-banner'); pg.wait_for_selector('.tg-item')
        check(P + '專區列出全部用語', pg.locator('.tg-item').count() == len(data['phrases']))
        w = pg.evaluate('document.documentElement.scrollWidth'); check(P + '專區無水平溢出', w <= vp['width'] + 1, w)
        def first_text(): return pg.inner_text('.tg-item .tg-main b')
        pg.fill('#tg-q', '古錐'); pg.wait_for_timeout(100)
        check(P + '關鍵字搜尋', pg.locator('.tg-item').count() >= 1 and '古錐' in first_text(), first_text())
        for mode, exp in [('pun', '金勾錐'), ('zh', '好可愛'), ('mix', '真的足古錐'), ('hanji', '足古錐')]:
            pg.click(f'.mode-seg input[value="{mode}"]'); pg.wait_for_timeout(80)
            check(P + f'模式切換 {mode}', first_text() == exp, first_text())
        pg.click('.mode-seg input[value="pun"]'); pg.fill('#tg-q', '問題')
        check(P + '諧音標示「諧音」', pg.locator('.tg-item .tag.pun').count() >= 1)
        pg.fill('#tg-q', '早安')
        check(P + '無諧音時退回正字', first_text() == '早安')
        pg.click('.mode-seg input[value="hanji"]'); pg.fill('#tg-q', '')
        cats = pg.locator('#tg-cats [data-cat^="c"]')
        pg.click('#tg-cats [data-cat="c05"]'); pg.wait_for_timeout(80)
        n5 = sum(1 for x in data['phrases'] if x['cat'] == 'c05')
        check(P + '情境篩選', pg.locator('.tg-item').count() == n5, n5)
        pg.locator('.tg-item .star').first.click(); pg.click('#tg-cats [data-cat="fav"]'); pg.wait_for_timeout(80)
        check(P + '收藏常用語', pg.locator('.tg-item').count() == 1)
        pg.reload(); pg.wait_for_selector('.tg-item'); pg.click('#tg-cats [data-cat="fav"]')
        check(P + '收藏重新整理後保留', pg.locator('.tg-item').count() == 1)
        pg.click('#tg-cats [data-cat=""]'); pg.click('#tg-rand'); pg.wait_for_timeout(100)
        check(P + '隨機抽取', pg.is_visible('#tg-sheet'))
        # 套用到角色 → 提示詞
        pg.fill('#tg-q', '食飽未'); pg.click('.tg-item'); pg.click('#tg-sheet [data-go="character"]'); pg.wait_for_selector('#prompt-out')
        pr = pg.input_value('#prompt-out')
        check(P + '套用到原創角色＋提示詞', '食飽未？' in pr and '台語文字' in pr and '不要在圖中畫任何文字' in pr and '吃飽了嗎' in pr, pr[pr.find('【貼圖文字】'):][:160])
        check(P + '角色頁顯示台語標籤', pg.locator('label:has-text("貼圖文字") .tag').count() == 1)
        # 讓 AI 畫字時的台語提醒
        pg.click('.seg label:nth-child(1)'); pr = pg.input_value('#prompt-out')
        check(P + 'AI 畫台語字的逐字照抄提醒', '台語漢字（教育部推薦用字）' in pr and '逐字照抄' in pr)
        # 角色頁挑用語對話框台語分頁
        pg.click('#f-pick'); pg.click('.lang-seg input[value="taigi"]'); pg.wait_for_selector('#pp-tg .tg-item')
        pg.fill('#pp-tg #tg-q', '歹勢'); pg.click('#pp-tg .tg-item'); pg.wait_for_timeout(150)
        check(P + '挑用語對話框可選台語', pg.input_value('#f-text') == '歹勢啦', pg.input_value('#f-text'))
        # 照片變貼圖
        pg.goto(BASE + '#taigi'); pg.wait_for_selector('.tg-item'); pg.fill('#tg-q', '足感心'); pg.click('.tg-item'); pg.click('#tg-sheet [data-go="photo"]'); pg.wait_for_selector('#prompt-out')
        check(P + '套用到照片變貼圖', '足感心' in pg.input_value('#prompt-out'))
        # 加工室
        pg.goto(BASE + '#taigi'); pg.wait_for_selector('.tg-item'); pg.fill('#tg-q', '戲棚'); pg.click('.tg-item'); pg.click('#tg-sheet [data-go="editor"]')
        pg.wait_for_selector('#ed-blank'); pg.click('#ed-blank'); pg.wait_for_timeout(200)
        check(P + '加工室帶入台語文字', pg.input_value('#ed-text') == '戲棚跤徛久就是你的。')
        check(P + '台語文字無缺字警告', pg.is_hidden('#ed-textwarn'))
        pg.fill('#ed-text', '我们'); pg.wait_for_timeout(100)
        check(P + '簡體字警告', pg.is_visible('#ed-textwarn') and '们' in pg.inner_text('#ed-textwarn'))
        pg.fill('#ed-text', '起毛䆀'); pg.click('[data-tab="out"]')
        with pg.expect_download() as dl: pg.click('#ed-dl')
        check(P + '台語字 PNG 輸出', dl.value.path() is not None)
        # 全部用語在此瀏覽器不缺字
        miss = pg.evaluate("fetch('data/taigi.json').then(r=>r.json()).then(d=>SS.findMissingGlyphs(d.phrases.map(p=>p.hanji+(p.pun||'')+(p.mix||'')).join(''), '900 40px sans-serif'))")
        check(P + '全部台語用字在 Chrome 可顯示', not miss, miss)
        # 盲盒
        pg.goto(BASE + '#taigi'); pg.wait_for_selector('.tg-item'); pg.fill('#tg-q', '好膽'); pg.click('.tg-item'); pg.click('#tg-sheet [data-go="blindbox"]'); pg.wait_for_selector('#bb-go')
        pg.wait_for_timeout(300)
        check(P + '放進盲盒並鎖定', '好膽莫走' in pg.inner_text('.bb-slot:nth-child(6)') and '🔒' in pg.inner_text('.bb-slot:nth-child(6)'))
        pg.click('[data-lock="text"]'); pg.click('#bb-go'); pg.wait_for_timeout(200)
        t = pg.inner_text('.bb-slot:nth-child(6) b'); all_tg = {x['hanji'] for x in data['phrases']}
        check(P + '盲盒台語模式抽台語', t in all_tg, t)
        check(P + '盲盒提示詞含台語', t in pg.input_value('#prompt-out'))
        # 整套企劃 9 個台語主題
        pg.goto(BASE + '#plan'); pg.wait_for_selector('#pl-theme optgroup[label="🧋 台語主題"]', state='attached')
        for th in data['themes']:
            pg.select_option('#pl-theme', th['name']); pg.click('#pl-count [data-n="40"]'); pg.click('#pl-gen'); pg.wait_for_timeout(120)
            texts = pg.eval_on_selector_all('.plan-item input[data-f="text"]', 'e=>e.map(x=>x.value)')
            cat_ok = sum(1 for x in texts if any(p['hanji'] == x and p['cat'] in th['cats'] for p in data['phrases']))
            check(P + f'企劃「{th["name"]}」40 張不重複、以主題情境為主', len(texts) == 40 and len(set(texts)) == 40 and cat_ok >= min(8, sum(1 for p in data['phrases'] if p['cat'] in th['cats'])), f'{len(set(texts))} 主題句 {cat_ok}')
        pg.select_option('#pl-theme', '台味搞笑吐槽'); pg.select_option('#pl-tgmode', 'pun'); pg.click('#pl-count [data-n="8"]'); pg.click('#pl-gen'); pg.wait_for_timeout(150)
        check(P + '企劃諧音模式標示', pg.locator('.tg-hint').count() == 8)
        pg.click('[data-x="one"][data-i="0"]'); pg.wait_for_timeout(100)
        clip = pg.evaluate('navigator.clipboard.readText()')
        check(P + '台語企劃單張提示詞', '台語' in clip and '不要在圖中畫任何文字' in clip)
        with pg.expect_download() as dl: pg.click('[data-x="csv"]')
        csv = open(dl.value.path(), encoding='utf-8-sig').read()
        check(P + 'CSV 含台語正字與華語欄', '台語正字' in csv and '華語意思' in csv and csv.count('台語') >= 9)
        pg.click('.grid-prompt summary'); pg.click('[data-x="grid"]'); pg.wait_for_timeout(100)
        check(P + '宮格提示詞含台語', '台語漢字' in pg.evaluate('navigator.clipboard.readText()') or '台語' in pg.evaluate('navigator.clipboard.readText()'))
        # 原有華語主題仍正常
        pg.select_option('#pl-theme', '日常聊天系列'); pg.click('#pl-gen'); pg.wait_for_timeout(100)
        check(P + '原有華語主題仍可用', pg.locator('.plan-item').count() == 8 and pg.is_hidden('#pl-tg'))
        check(P + '主控台無錯誤', not errs, errs[:3])
        ctx.close()
    b.close()
fails = [r for r in R if not r[1]]
print(f'\n台語測試 {len(R)} 項，通過 {len(R) - len(fails)}，失敗 {len(fails)}')
json.dump(R, open('/tmp/taigi-results.json', 'w'), ensure_ascii=False)
