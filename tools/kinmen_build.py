"""從教育部辭典開放資料「詞彙方言差」的金門點，建立金門話詞庫"""
import csv, re, json
rows = {r['詞目']: r for r in csv.DictReader(open('/home/claude/ref/moedict-data-twblg/raw/詞彙方言差.csv', encoding='utf-8'))}
def split(s): return [w.strip() for w in re.split(r'[,，]\s*', s or '') if w.strip() and '暫無資料' not in w]
CATS = [
  ('k1', '問候禮貌', '🙏', ['謝謝', '不好意思']),
  ('k2', '回應語氣', '💬', ['不要', '不會', '可以', '不可以', '不是', '要', '有', '很', '會']),
  ('k3', '情緒反應', '😤', ['生氣', '哭', '笑', '吵架', '打架', '說謊', '吹牛、亂說', '聊天']),
  ('k4', '吃喝日常', '🍚', ['吃', '喝', '肚子餓', '飯', '冷飯', '開水', '茶葉', '吃素', '高粱酒', '啤酒', '水果', '裝飯', '倒茶']),
  ('k5', '生活動作', '🛁', ['休息', '洗澡', '打瞌睡', '打哈欠', '打噴嚏', '打嗝', '穿衣服', '晾衣服', '工作', '存錢', '找錢', '做生意', '一起', '帶小孩']),
  ('k6', '時間地點', '🕒', ['早上', '中午', '晚上', '昨天', '哪裡', '這裡', '太陽', '月亮', '下雨', '打雷']),
  ('k7', '家人稱呼', '👨‍👩‍👧', ['姊姊', '兒子', '女兒', '小孩子', '小叔' if False else '丈夫的弟弟']),
  ('k8', '冷熱感覺', '🌡️', ['熱', '不冷不熱', '發冷顫']),
]
out = []; miss = []
for cid, cname, emo, terms in CATS:
    for t in terms:
        r = rows.get(t)
        if not r: miss.append(t); continue
        km = split(r['金門']); tp = [w.split('　')[0] for w in split(r['臺北'])]
        if not km: miss.append(t); continue
        for w in km:
            parts = w.split('　', 1)
            hanji = parts[0].strip(); tl = parts[1].strip() if len(parts) > 1 else ''
            if '(' in tl: tl = tl.split('(')[0].strip()
            out.append({'id': f'km{len(out)+1:03d}', 'cat': cid, 'hanji': hanji, 'tl': tl, 'zh': t, 'taipei': tp,
                        'differs': hanji not in tp, 'code': r['方言差編碼']})
data = {
  'version': '1.0.0', 'updated': '2026-11-26',
  'about': '金門話詞庫：全部取自教育部《臺灣台語常用詞辭典》「詞彙方言差」調查資料中「金門」點的說法。這是調查詞彙（單詞），不是整句；臺羅為金門腔讀音。',
  'reference': {'name': '教育部臺灣台語常用詞辭典・詞彙方言差', 'url': 'https://sutian.moe.edu.tw/', 'checkedWith': 'g0v/moedict-data-twblg raw/詞彙方言差.csv（CC BY-ND 3.0 TW）'},
  'categories': [{'id': c, 'name': n, 'emoji': e} for c, n, e, _ in CATS],
  'phrases': out
}
json.dump(data, open('/home/claude/sticker-studio/data/kinmen.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('entries', len(out), 'differs', sum(p['differs'] for p in out), 'missing terms', miss)
for p in out[:12]: print(p['zh'], p['hanji'], p['tl'], '臺北:', '／'.join(p['taipei']), '★' if p['differs'] else '')
rare = sorted({c for p in out for c in p['hanji'] if ord(c) > 0xFFFF}); print('Ext-B chars', rare)
