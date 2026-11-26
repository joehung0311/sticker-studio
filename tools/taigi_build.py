"""產生 data/taigi.json：逐條比對教育部辭典開放資料，標示查核層級"""
import json, re, sys
sys.path.insert(0, '.')
from phrases import P

d = json.load(open('/home/claude/ref/moedict-data-twblg/dict-twblg.json'))
HEAD = {}
EX = []
for e in d:
    for h in e['heteronyms']:
        HEAD.setdefault(e['title'], []).append(h.get('trs', ''))
        for df in h.get('definitions', []):
            for x in df.get('example', []):
                m = re.match('￹(.*?)￺(.*?)￻(.*)', x)
                if m: EX.append(tuple(s.strip() for s in m.groups()))
PUNCT = set('？，！。、；「」 ')
strip = lambda s: ''.join(c for c in s if c not in PUNCT)

def seg(s):
    s2 = strip(s); n = len(s2); best = [None] * (n + 1); best[0] = []
    for i in range(n):
        if best[i] is None: continue
        for j in range(n, i, -1):
            if s2[i:j] in HEAD and (best[j] is None or len(best[i]) + 1 < len(best[j])): best[j] = best[i] + [s2[i:j]]
    return best[n]

def check(h):
    k = strip(h)
    for t, trs in HEAD.items():
        if strip(t) == k and trs and trs[0]: return 'headword', trs[0]
    for a, b, c in EX:
        if strip(a) == k: return 'example', b
        # 例句中以引號或逗號獨立出現的整句
        for part in re.split('[「」，。；]', a):
            if part and strip(part) == k and len(k) >= 4:
                return 'example', None
    s = seg(h)
    if s: return 'words', None
    return 'manual', None

CAT_META = {
  '日常問候': ('👋', ['甜甜微笑', '開心大笑'], ['揮手打招呼', '鞠躬']),
  '日常回覆': ('💬', ['甜甜微笑', '認真', '眨眼'], ['比讚', '敬禮', '指向前方']),
  '驚訝傻眼': ('😳', ['驚訝', '傻眼', '心虛冒汗'], ['雙手捧臉', '抱頭', '開心跳起來']),
  '搞笑吐槽': ('🤣', ['無言', '得意', '傻眼'], ['指向前方', '雙手叉腰', '拍手']),
  '上班族崩潰': ('💼', ['疲累', '崩潰吶喊', '想睡'], ['趴在地上', '抱頭', '躺平']),
  '生氣不爽': ('😤', ['生氣鼓臉', '無言'], ['雙手叉腰', '舉牌', '轉圈圈']),
  '撒嬌可愛': ('🥺', ['害羞臉紅', '愛心眼', '哭哭'], ['比愛心', '張開雙手抱抱', '雙手捧臉']),
  '鼓勵安慰': ('💪', ['甜甜微笑', '認真', '崇拜發光'], ['比讚', '張開雙手抱抱', '拍手']),
  '感謝道歉': ('🙏', ['感動落淚', '害羞臉紅', '心虛冒汗'], ['鞠躬', '雙手合十']),
  '吃喝玩樂': ('🍜', ['愛心眼', '開心大笑'], ['雙手捧臉', '開心跳起來', '指向前方']),
  '耍廢躺平': ('🛋️', ['想睡', '疲累', '無言'], ['躺平', '趴在地上']),
  '長輩問候': ('🌸', ['甜甜微笑', '開心大笑'], ['揮手打招呼', '雙手合十', '撒花']),
  '節日祝福': ('🧧', ['開心大笑', '甜甜微笑'], ['撒花', '鞠躬', '拍手']),
  '台灣在地流行用語': ('🧋', ['得意', '眨眼', '開心大笑'], ['比讚', '指向前方', '舉牌']),
  '台灣俗語金句': ('📜', ['認真', '得意', '甜甜微笑'], ['舉牌', '指向前方', '雙手叉腰']),
}
cats = [{'id': f'c{i+1:02d}', 'name': n, 'emoji': CAT_META[n][0], 'expressions': CAT_META[n][1], 'actions': CAT_META[n][2]} for i, n in enumerate(P)]
cid = {c['name']: c['id'] for c in cats}
phrases = []; stats = {}
for cat, rows in P.items():
    for h, pun, zh, mix in rows:
        lvl, tl = check(h)
        stats[lvl] = stats.get(lvl, 0) + 1
        item = {'id': f't{len(phrases)+1:03d}', 'cat': cid[cat], 'hanji': h, 'zh': zh, 'check': lvl}
        if pun and pun != h: item['pun'] = pun
        if mix: item['mix'] = mix
        if tl: item['tl'] = tl
        ext = [c for c in h if ord(c) > 0xFFFF]
        if ext: item['rareChars'] = ext
        phrases.append(item)

THEMES = [
  ('阿嬤的日常問候', '溫暖的阿嬤式關心', ['日常問候', '長輩問候']),
  ('台灣上班族崩潰日記', '上班族的日常崩潰', ['上班族崩潰', '耍廢躺平', '生氣不爽']),
  ('台味搞笑吐槽', '朋友間的台味吐槽', ['搞笑吐槽', '驚訝傻眼', '台灣在地流行用語']),
  ('台語撒嬌大全', '撒嬌討拍專用', ['撒嬌可愛', '感謝道歉']),
  ('台灣菜市場人生', '菜市場、小吃與夜市', ['吃喝玩樂']),
  ('台語長輩祝福', '節慶與長輩祝福', ['長輩問候', '節日祝福']),
  ('台灣人聊天必備', '每天都用得到', ['日常回覆', '日常問候', '驚訝傻眼']),
  ('台味厭世人生', '厭世但還是要活下去', ['耍廢躺平', '上班族崩潰', '生氣不爽']),
  ('台語金句系列', '台灣俗語金句', ['台灣俗語金句', '鼓勵安慰']),
]
themes = [{'name': n, 'desc': ds, 'cats': [cid[c] for c in cs]} for n, ds, cs in THEMES]

out = {
  'version': '1.0.0', 'updated': '2026-11-25',
  'about': '台語貼圖專區用語資料。台語正字依教育部《臺灣台語常用詞辭典》推薦用字撰寫；趣味諧音為網路常見寫法，非標準台語。',
  'reference': {'name': '教育部臺灣台語常用詞辭典', 'url': 'https://sutian.moe.edu.tw/',
                'checkedWith': 'g0v/moedict-data-twblg（教育部臺灣閩南語常用詞辭典開放資料，CC BY-ND 3.0 TW）'},
  'checkLevels': {'headword': '整句為辭典詞目或俗諺條目', 'example': '整句見於辭典例句', 'words': '每個詞都是辭典詞目（整句為常用口語組合）', 'manual': '含辭典未收字詞，需人工確認'},
  'modes': {'hanji': '台語正字', 'pun': '趣味諧音', 'zh': '華語', 'mix': '台華混搭'},
  'categories': cats, 'phrases': phrases, 'themes': themes,
}
json.dump(out, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('phrases', len(phrases), stats)
print('manual:', [p['hanji'] for p in phrases if p['check'] == 'manual'])
print('rare:', [p['hanji'] for p in phrases if 'rareChars' in p])
print('with pun', sum('pun' in p for p in phrases), 'with mix', sum('mix' in p for p in phrases), 'with tl', sum('tl' in p for p in phrases))
