/* 今天貼什麼？ Sticker Studio — 內建資料 (Made by 白話實驗室／baihua.tw) */
window.SS = window.SS || {};

SS.VERSION = '1.3.1';

SS.LINKS = {
  chatgpt: 'https://chatgpt.com/',
  gemini: 'https://gemini.google.com/app',
  lineGuide: 'https://creator.line.me/zh-hant/guideline/sticker/',
  lineHowto: 'https://creator.line.me/zh-hant/howto/'
};

/* LINE Creators Market 靜態貼圖規格（2026-11 查證自官方製作準則頁） */
SS.LINE_SPEC = {
  sticker: { w: 370, h: 320 },
  main: { w: 240, h: 240 },
  tab: { w: 96, h: 74 },
  counts: [8, 16, 24, 32, 40],
  maxFileBytes: 1024 * 1024,
  maxZipBytes: 60 * 1024 * 1024,
  margin: 10
};

SS.CHAR_TYPES = ['人物', '貓咪', '狗狗', '兔子', '幻想生物', '自訂角色'];

SS.STYLES = [
  { id: 'qban', name: '可愛 Q 版', desc: '大頭小身體、圓滾滾，最百搭',
    en: 'cute chibi style, 2–2.5 heads tall, big head and small body, rounded lines, exaggerated cute expressions, clean flat colors', prompt: '可愛 Q 版（chibi）風格，2～2.5 頭身，大頭小身體，圓潤線條，表情誇張可愛，乾淨平塗上色' },
  { id: 'jp', name: '日系手繪', desc: '柔和線條、手帳感插畫',
    en: 'Japanese hand-drawn illustration, soft hand-drawn lines, gentle colors, warm stationery / journal illustration feel', prompt: '日系手繪插畫風格，柔和的手繪線條，淡雅配色，帶有手帳與文具插畫的溫暖質感' },
  { id: 'comic', name: '復古漫畫', desc: '粗黑線、網點、動作線',
    en: 'retro comic style, bold black outlines, halftone shading, speed lines and comic sound effects', prompt: '復古美式／昭和漫畫風格，粗黑描邊，網點陰影，搭配速度線與漫畫效果字' },
  { id: 'water', name: '療癒水彩', desc: '暈染邊緣、溫柔療癒',
    en: 'healing watercolor, soft washes and natural water marks, low-saturation gentle tones, light and airy', prompt: '療癒水彩風格，柔和暈染與自然水痕，低飽和溫柔色調，畫面輕盈透氣' },
  { id: 'line', name: '極簡線條', desc: '少量線條、留白多',
    en: 'minimal line art, one or two colors of fine lines, lots of white space, simple shapes with clear expressions', prompt: '極簡線條插畫，單色或雙色細線勾勒，大量留白，造型簡潔但表情清楚' },
  { id: 'clay', name: '黏土公仔', desc: '立體 3D、軟萌質感',
    en: 'clay figure / soft 3D toy style, rounded volumes, soft lighting, subtle clay texture', prompt: '黏土公仔／3D 軟膠玩具風格，圓潤立體，柔和打光，表面帶有細微黏土質感' },
  { id: 'meme', name: '搞笑迷因', desc: '誇張表情、反差笑點',
    en: 'funny meme sticker style, extremely exaggerated expressions, strong contrast, bold big lettering', prompt: '搞笑迷因貼圖風格，表情極度誇張、反差感強，粗體大字，節奏感強烈' },
  { id: 'pixel', name: '像素藝術', desc: '復古遊戲點陣感',
    en: 'pixel art, retro game look, crisp square pixels, limited palette', prompt: '像素藝術（pixel art）風格，復古遊戲點陣感，清晰方塊像素，有限色盤' }
];

/* 畫風示意圖：全部為原創簡易 SVG */
SS.STYLE_ICONS = {
  qban: '<svg viewBox="0 0 64 64"><circle cx="32" cy="28" r="20" fill="#FFE1C7" stroke="#5A3E2B" stroke-width="3"/><circle cx="25" cy="27" r="3" fill="#5A3E2B"/><circle cx="39" cy="27" r="3" fill="#5A3E2B"/><path d="M27 35q5 5 10 0" stroke="#5A3E2B" stroke-width="2.5" fill="none" stroke-linecap="round"/><ellipse cx="20" cy="33" rx="3.5" ry="2" fill="#F7A39B"/><ellipse cx="44" cy="33" rx="3.5" ry="2" fill="#F7A39B"/><rect x="24" y="47" width="16" height="11" rx="6" fill="#F59E6C" stroke="#5A3E2B" stroke-width="3"/></svg>',
  jp: '<svg viewBox="0 0 64 64"><path d="M14 34c0-12 8-20 18-20s18 8 18 20-8 18-18 18-18-6-18-18z" fill="#FFF3E4" stroke="#8B6A55" stroke-width="1.6" stroke-dasharray="40 2 30 3"/><path d="M24 31q2-2 4 0M36 31q2-2 4 0" stroke="#8B6A55" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M29 39q3 2 6 0" stroke="#8B6A55" stroke-width="1.6" fill="none" stroke-linecap="round"/><path d="M50 14l2 4 4 1-4 2-1 4-2-4-4-1 4-2z" fill="#E9B949"/></svg>',
  comic: '<svg viewBox="0 0 64 64"><defs><pattern id="dt" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.2" fill="#E8735A"/></pattern></defs><circle cx="30" cy="34" r="18" fill="url(#dt)" stroke="#222" stroke-width="4"/><circle cx="24" cy="31" r="3" fill="#222"/><circle cx="36" cy="31" r="3" fill="#222"/><path d="M24 40h12" stroke="#222" stroke-width="3"/><path d="M52 10l-6 10M58 18l-9 6M56 30l-7-1" stroke="#222" stroke-width="3" stroke-linecap="round"/></svg>',
  water: '<svg viewBox="0 0 64 64"><circle cx="30" cy="32" r="19" fill="#BFD8C2" opacity=".7"/><circle cx="36" cy="28" r="15" fill="#F5C2A8" opacity=".6"/><circle cx="26" cy="36" r="10" fill="#D6C7EE" opacity=".6"/><circle cx="26" cy="30" r="2.2" fill="#6B5545"/><circle cx="37" cy="30" r="2.2" fill="#6B5545"/><path d="M28 37q3 3 6 0" stroke="#6B5545" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  line: '<svg viewBox="0 0 64 64"><path d="M12 40c4-18 16-26 26-22s14 16 8 24-22 10-28 4" stroke="#5A3E2B" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="27" cy="31" r="1.8" fill="#5A3E2B"/><circle cx="38" cy="31" r="1.8" fill="#5A3E2B"/><path d="M30 37q2.5 2 5 0" stroke="#5A3E2B" stroke-width="2" fill="none" stroke-linecap="round"/></svg>',
  clay: '<svg viewBox="0 0 64 64"><defs><radialGradient id="cg" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#FFE6D3"/><stop offset=".6" stop-color="#F7B68E"/><stop offset="1" stop-color="#D98A5F"/></radialGradient></defs><ellipse cx="32" cy="35" rx="21" ry="19" fill="url(#cg)"/><ellipse cx="24" cy="23" rx="5" ry="3" fill="#fff" opacity=".6"/><circle cx="25" cy="34" r="3" fill="#4A3426"/><circle cx="39" cy="34" r="3" fill="#4A3426"/><ellipse cx="32" cy="42" rx="3" ry="2" fill="#4A3426"/></svg>',
  meme: '<svg viewBox="0 0 64 64"><circle cx="32" cy="36" r="18" fill="#FFE07A" stroke="#5A3E2B" stroke-width="3"/><path d="M21 31l7 3M43 31l-7 3" stroke="#5A3E2B" stroke-width="3" stroke-linecap="round"/><ellipse cx="32" cy="44" rx="7" ry="5" fill="#5A3E2B"/><rect x="6" y="4" width="34" height="14" rx="3" fill="#fff" stroke="#5A3E2B" stroke-width="2"/><text x="23" y="15" font-size="10" font-weight="900" text-anchor="middle" fill="#E8735A">?!</text></svg>',
  pixel: '<svg viewBox="0 0 64 64" shape-rendering="crispEdges"><g fill="#8FB58A"><rect x="16" y="16" width="32" height="32"/></g><g fill="#5A3E2B"><rect x="16" y="12" width="32" height="4"/><rect x="12" y="16" width="4" height="32"/><rect x="48" y="16" width="4" height="32"/><rect x="16" y="48" width="32" height="4"/><rect x="24" y="26" width="4" height="6"/><rect x="36" y="26" width="4" height="6"/><rect x="26" y="38" width="12" height="4"/></g><rect x="20" y="20" width="4" height="4" fill="#C9E2C3"/></svg>',
  custom: '<svg viewBox="0 0 64 64"><rect x="10" y="10" width="44" height="44" rx="12" fill="#F3EDFB" stroke="#B49BDB" stroke-width="2.5" stroke-dasharray="5 4"/><path d="M32 22v20M22 32h20" stroke="#8D6FC4" stroke-width="4" stroke-linecap="round"/></svg>'
};

SS.EXPRESSIONS = ['開心大笑', '甜甜微笑', '害羞臉紅', '傻眼', '生氣鼓臉', '哭哭', '感動落淚', '愛心眼', '驚訝', '得意', '疲累', '無言', '眨眼', '認真', '想睡', '崇拜發光', '心虛冒汗', '崩潰吶喊'];
SS.ACTIONS = ['揮手打招呼', '比讚', '鞠躬', '躺平', '奔跑', '張開雙手抱抱', '比愛心', '雙手捧臉', '雙手叉腰', '開心跳起來', '撒花', '敬禮', '從牆邊探頭', '趴在地上', '雙手合十', '拍手', '指向前方', '抱頭', '舉牌', '轉圈圈'];
SS.PROPS = ['無', '愛心', '咖啡杯', '手機', '便當', '枕頭', '花束', '氣球', '筆電', '雨傘', '錢包', '生日蛋糕', '紅包', '珍珠奶茶', '小旗子', '星星'];
SS.PERSONALITIES = ['元氣滿滿', '溫柔體貼', '傲嬌', '慵懶', '搞笑', '認真負責', '天然呆', '愛撒嬌'];
SS.PALETTES = ['奶油白＋蜜桃橘', '粉紅＋白', '天空藍＋白', '黑白配色', '橘虎斑', '灰白', '抹茶綠＋米色', '淡紫＋奶油'];
SS.COMPOSITIONS = ['全身・置中', '半身・大頭特寫', '側身回頭', '從畫面邊緣探出頭', '坐姿', '動態傾斜構圖', '搭配大型道具', '雙手舉牌'];

SS.PHRASES = {
  '日常問候': ['早安', '午安', '晚安', '哈囉', '好久不見', '在嗎', '掰掰', '好夢'],
  '工作職場': ['收到', '辛苦了', '下班啦', '馬上處理', '開會中', '了解', '加油', '我再確認'],
  '家庭生活': ['吃飯囉', '到家了', '路上小心', '出門了', '記得帶傘', '早點睡', '想你了', '等你回家'],
  '情緒反應': ['傻眼', '笑死', '累了', '崩潰', '好煩', '太好了', '嚇死', '無言'],
  '朋友聊天': ['真的假的', '好喔', '等等我', '走啊', '我也是', '沒問題', '哈哈哈', '再說'],
  '感謝祝福': ['謝謝', '生日快樂', '恭喜', '感恩', '辛苦你了', '祝順利', '你最棒', '抱抱'],
  '搞笑用語': ['我先躺平', '錢包在哭', '今天不想努力', '已讀不回', '想放假', '肚子餓', '讓我靜靜', '不要問'],
  '節日祝福': ['新年快樂', '中秋快樂', '聖誕快樂', '端午安康', '情人節快樂', '母親節快樂', '父親節快樂', '恭喜發財']
};
SS.ALL_PHRASES = Object.values(SS.PHRASES).flat();

/* 整套企劃主題：[文字, 表情, 動作, 道具] */
SS.THEMES = {
  '日常聊天系列': [
    ['早安', '甜甜微笑', '揮手打招呼', '無'], ['晚安', '想睡', '趴在地上', '枕頭'], ['好喔', '甜甜微笑', '比讚', '無'],
    ['真的假的', '驚訝', '雙手捧臉', '無'], ['笑死', '開心大笑', '轉圈圈', '無'], ['謝謝', '害羞臉紅', '鞠躬', '無'],
    ['等等我', '心虛冒汗', '奔跑', '無'], ['在嗎', '認真', '從牆邊探頭', '無'], ['沒問題', '得意', '雙手叉腰', '無'],
    ['掰掰', '開心大笑', '揮手打招呼', '無'], ['走啊', '元氣', '指向前方', '小旗子'], ['我也是', '愛心眼', '比愛心', '愛心'],
    ['哈哈哈', '開心大笑', '拍手', '無'], ['再說', '無言', '雙手合十', '無'], ['收到', '認真', '敬禮', '無'], ['抱抱', '感動落淚', '張開雙手抱抱', '無']
  ],
  '上班族崩潰系列': [
    ['收到', '認真', '敬禮', '無'], ['馬上處理', '心虛冒汗', '奔跑', '筆電'], ['開會中', '想睡', '雙手合十', '筆電'],
    ['辛苦了', '感動落淚', '鞠躬', '咖啡杯'], ['下班啦', '開心大笑', '開心跳起來', '無'], ['我再確認', '認真', '指向前方', '手機'],
    ['崩潰', '崩潰吶喊', '抱頭', '無'], ['今天不想努力', '疲累', '躺平', '無'], ['錢包在哭', '哭哭', '雙手捧臉', '錢包'],
    ['需要咖啡', '想睡', '趴在地上', '咖啡杯'], ['已讀', '無言', '舉牌', '手機'], ['加班中', '疲累', '趴在地上', '筆電'],
    ['想放假', '崇拜發光', '雙手合十', '無'], ['了解', '甜甜微笑', '比讚', '無'], ['我不行了', '崩潰吶喊', '躺平', '無'], ['老闆好', '心虛冒汗', '鞠躬', '無']
  ],
  '家庭生活系列': [
    ['吃飯囉', '開心大笑', '揮手打招呼', '便當'], ['到家了', '甜甜微笑', '張開雙手抱抱', '無'], ['路上小心', '甜甜微笑', '揮手打招呼', '雨傘'],
    ['出門了', '元氣滿滿', '奔跑', '無'], ['記得帶傘', '認真', '指向前方', '雨傘'], ['早點睡', '想睡', '趴在地上', '枕頭'],
    ['想你了', '害羞臉紅', '比愛心', '愛心'], ['等你回家', '甜甜微笑', '從牆邊探頭', '無'], ['幫我買', '眨眼', '雙手合十', '錢包'],
    ['好吃', '愛心眼', '雙手捧臉', '便當'], ['寫完功課了嗎', '認真', '雙手叉腰', '無'], ['愛你', '害羞臉紅', '比愛心', '愛心'],
    ['快回來', '哭哭', '舉牌', '無'], ['我回來了', '開心大笑', '開心跳起來', '無'], ['洗澡了', '認真', '指向前方', '無'], ['晚餐吃什麼', '驚訝', '雙手捧臉', '無']
  ],
  '長輩問候系列': [
    ['早安', '甜甜微笑', '揮手打招呼', '花束'], ['平安喜樂', '甜甜微笑', '雙手合十', '花束'], ['身體健康', '元氣滿滿', '比讚', '無'],
    ['天冷多穿衣', '認真', '指向前方', '無'], ['午安', '甜甜微笑', '鞠躬', '咖啡杯'], ['晚安好夢', '想睡', '趴在地上', '星星'],
    ['感恩', '感動落淚', '雙手合十', '無'], ['讚', '開心大笑', '比讚', '無'], ['多喝水', '認真', '舉牌', '無'],
    ['心想事成', '崇拜發光', '撒花', '星星'], ['好久不見', '開心大笑', '張開雙手抱抱', '無'], ['祝福你', '甜甜微笑', '撒花', '花束'],
    ['吃飽沒', '甜甜微笑', '揮手打招呼', '便當'], ['出門平安', '甜甜微笑', '揮手打招呼', '雨傘'], ['週末愉快', '開心大笑', '開心跳起來', '氣球'], ['謝謝', '害羞臉紅', '鞠躬', '無']
  ],
  '寵物搞笑系列': [
    ['肚子餓', '哭哭', '趴在地上', '便當'], ['罐罐呢', '生氣鼓臉', '雙手叉腰', '無'], ['我先躺平', '疲累', '躺平', '無'],
    ['不要問', '無言', '從牆邊探頭', '無'], ['摸我', '愛心眼', '轉圈圈', '無'], ['不是我做的', '心虛冒汗', '從牆邊探頭', '無'],
    ['陪我玩', '元氣滿滿', '開心跳起來', '氣球'], ['哼', '生氣鼓臉', '雙手叉腰', '無'], ['好睏', '想睡', '趴在地上', '枕頭'],
    ['驚', '驚訝', '開心跳起來', '無'], ['讚啦', '得意', '比讚', '無'], ['讓我靜靜', '無言', '雙手合十', '無'],
    ['你回來了', '開心大笑', '奔跑', '無'], ['零食', '崇拜發光', '雙手捧臉', '無'], ['散步嗎', '眨眼', '指向前方', '小旗子'], ['抱抱', '愛心眼', '張開雙手抱抱', '愛心']
  ],
  '情侶互動系列': [
    ['想你', '害羞臉紅', '雙手捧臉', '愛心'], ['愛你', '愛心眼', '比愛心', '愛心'], ['抱抱', '甜甜微笑', '張開雙手抱抱', '無'],
    ['晚安寶貝', '想睡', '趴在地上', '枕頭'], ['哼不理你', '生氣鼓臉', '雙手叉腰', '無'], ['對不起', '哭哭', '鞠躬', '花束'],
    ['你最棒', '崇拜發光', '比讚', '星星'], ['約會嗎', '眨眼', '指向前方', '氣球'], ['要親親', '害羞臉紅', '雙手合十', '愛心'],
    ['在幹嘛', '認真', '從牆邊探頭', '手機'], ['等我', '心虛冒汗', '奔跑', '無'], ['好啦好啦', '甜甜微笑', '揮手打招呼', '無'],
    ['吃醋了', '生氣鼓臉', '雙手捧臉', '無'], ['謝謝你', '感動落淚', '鞠躬', '花束'], ['一起吃飯', '開心大笑', '揮手打招呼', '珍珠奶茶'], ['早安寶貝', '甜甜微笑', '揮手打招呼', '咖啡杯']
  ],
  '節日祝福系列': [
    ['新年快樂', '開心大笑', '撒花', '紅包'], ['恭喜發財', '得意', '雙手合十', '紅包'], ['中秋快樂', '甜甜微笑', '雙手捧臉', '無'],
    ['聖誕快樂', '開心大笑', '揮手打招呼', '星星'], ['端午安康', '元氣滿滿', '比讚', '無'], ['情人節快樂', '害羞臉紅', '比愛心', '愛心'],
    ['母親節快樂', '感動落淚', '張開雙手抱抱', '花束'], ['父親節快樂', '崇拜發光', '比讚', '無'], ['生日快樂', '開心大笑', '撒花', '生日蛋糕'],
    ['新春恭喜', '甜甜微笑', '鞠躬', '紅包'], ['元宵快樂', '甜甜微笑', '舉牌', '無'], ['教師節快樂', '崇拜發光', '鞠躬', '花束'],
    ['跨年快樂', '開心大笑', '開心跳起來', '氣球'], ['兒童節快樂', '元氣滿滿', '轉圈圈', '氣球'], ['佳節愉快', '甜甜微笑', '撒花', '星星'], ['恭喜', '開心大笑', '拍手', '無']
  ]
};
SS.THEME_NAMES = Object.keys(SS.THEMES).concat(['自訂主題']);
SS.PLAN_COUNTS = [1, 4, 8, 16, 24, 32, 40];
