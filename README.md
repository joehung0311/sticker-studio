# 今天貼什麼？ Sticker Studio v1.2.0

> 生活有百種心情，貼圖不必只有一種。

讓不會畫畫、不懂設計的人，也能輕鬆規劃、生成及加工個人專屬聊天貼圖的繁體中文 Web App。
品牌：白話實驗室／baihua.tw

- 不用註冊、不用登入、不用 API Key、不用付費
- 照片與圖片只在使用者的瀏覽器處理，不會上傳
- 可加入手機主畫面（PWA），本機功能可離線使用

---

## 一、功能一覽

| # | 功能 | 說明 |
|---|------|------|
| 01 | 📸 照片變貼圖 | 上傳照片預覽（僅本機）→ 選畫風、表情、動作、文字 → 產生保留角色特徵的提示詞 |
| 02 | 🎨 創造新角色 | 類型、外貌、髮型、服裝、配色、個性、道具；可儲存角色維持系列一致 |
| 03 | 🖌️ 百變畫風 | 8 種畫風（附原創示意圖）＋自訂畫風 |
| 04 | 💬 生活用語庫 | 8 類 64 句，支援自訂、隨機、無文字模式 |
| 05 | 🎁 貼圖盲盒 | 隨機組合 6 項，可鎖定喜歡的項目 |
| 06 | 🪄 整套貼圖企劃 | 1／4／8／16／24／32／40 張，8 種主題，逐張修改，匯出 TXT／CSV／JSON，宮格合併提示詞 |
| 07 | 🤖 AI 生圖助手 | 組合完整提示詞；複製、複製並開啟 ChatGPT／Gemini、下載 TXT |
| 08 | ✂️ 貼圖加工室 | 圖層（底圖／多組文字／裝飾）、裁切縮放、消除工具、文字編輯（7 字體、直排、旋轉、陰影、字距行距）、裝飾素材、單色去背、隨機設計、還原／重做、PNG 輸出 |
| 09 | 📱 LINE 貼圖工具箱 | 2×2／3×3／4×4／自訂切圖、邊界微調、單張與 ZIP 下載、LINE 尺寸調整、主圖／標籤圖、規格檢查 |
| 10 | 💗 我的貼圖收藏 | IndexedDB 儲存、搜尋、分類、改名、下載、分享、刪除、備份匯出匯入 |
| ★ | 🔤 純文字貼圖 | 不需圖片與 AI，直接用字體、顏色、描邊、陰影與裝飾做文字貼圖 |
| ★ | ⭐ 裝飾素材庫 | 18 種原創 SVG，可移動、縮放、旋轉、變色、刪除，支援隨機添加 0～3 個 |
| ★ | 🎲 隨機設計 | 本機隨機排版＋AI 提示詞模式，可鎖定字體／顏色／位置／裝飾，不改文字內容 |
| ★ | 🧋 台語貼圖專區 | 151 句台語用語、15 種情境；台語正字／趣味諧音／華語／台華混搭／自訂；搜尋、篩選、收藏；9 個台語企劃主題 |

> V1.0 採「外部 AI 生圖模式」：App 本身**不會**直接生成圖片，而是產生提示詞讓你貼到 ChatGPT 或 Gemini。

---

## 字型與授權（v1.2）

`fonts/` 內 6 套字型皆為 **SIL Open Font License 1.1**（可免費商用、可隨網站散布），來源 [Fontsource](https://fontsource.org/)，授權全文在各字型資料夾的 `LICENSE.txt`：

| 加工室名稱 | 字型 |
|---|---|
| 可愛圓體 | 粉圓 Huninn（justfont） |
| 手寫字體 | 霞鶩文楷 LXGW WenKai TC |
| 童趣手寫 | 芫荽 Iansui |
| 搞笑漫畫 | Chiron GoRound TC（Black） |
| 粗體字 | 思源黑體 Noto Sans TC（Black） |
| 復古字體 | 仙人掌明體 Cactus Classical Serif |
| 標準黑體 | 裝置系統字型 |

字型檔依字元範圍切成小檔，使用者只會下載實際用到的字；已用過的字會被 Service Worker 快取，離線也能使用。經程式檢查，台語資料的 333 個字在 5 套字型皆可顯示（思源黑體缺「䆀」，缺字時自動改用粉圓）。

## 消除工具說明

- **App 加上的文字**：在圖層清單選取後直接刪除或修改
- **AI 圖片裡原本的字**：用「消除工具」—— 橡皮擦（變透明）、填色筆刷、框選消除（變透明／指定色／周圍延伸填補）
- 這些是**手動工具，不是 AI 智慧修復**；字和角色重疊時會一起被擦掉，請放大後細部處理

## 台語貼圖專區（v1.1）

- 用語資料獨立放在 `data/taigi.json`，修正或新增**不必改程式碼**，維護規則見 [`data/README.md`](data/README.md)
- **台語正字**依教育部《臺灣台語常用詞辭典》推薦用字；**趣味諧音**是網路寫法，畫面上一律標示「諧音・非標準台語」
- 每句都以辭典開放資料比對，標示查核層級：辭典詞目／辭典例句／逐詞查核／人工確認
- 台語字預設採「AI 先畫無字圖，再由加工室加上正確文字」，避免 AI 寫錯字
- 加工室會偵測**裝置缺字**與**疑似簡體字**並提醒
- 台語用語可直接套用到：照片變貼圖、原創角色、貼圖盲盒、整套企劃、提示詞、加工室加字

> 注意：台語資料用 `fetch` 讀取，**直接雙擊 index.html 開啟時無法載入台語專區**，請用網站或 `python3 -m http.server`。

## 二、本機預覽

**方法 A（最簡單）**：直接用瀏覽器開啟 `index.html`。
（此模式下 Service Worker／離線功能不會啟用，其餘功能可用。）

**方法 B（完整功能，建議）**：在專案資料夾執行

```bash
python3 -m http.server 8000
```

再開啟 <http://localhost:8000/>。

---

## 三、專案結構

```
sticker-studio/
├─ index.html              # 入口頁
├─ manifest.webmanifest    # PWA 設定
├─ sw.js                   # Service Worker（離線快取）
├─ .nojekyll               # 讓 GitHub Pages 原樣提供檔案
├─ css/style.css、css/fonts.css
├─ fonts/                 # 開源字型（OFL）
├─ data/
│  ├─ taigi.json           # 台語用語資料（獨立維護）
│  └─ README.md            # 台語資料維護說明
├─ js/
│  ├─ data.js              # 畫風、用語、主題、LINE 規格
│  ├─ core.js              # 儲存、剪貼簿、下載、提示詞產生器
│  ├─ taigi.js             # 台語貼圖專區
│  ├─ views.js             # 首頁、照片、角色、用語、盲盒、企劃、說明頁
│  ├─ decos.js             # 裝飾素材（原創 SVG）
│  ├─ editor.js            # 貼圖加工室（圖層、消除、隨機設計、純文字貼圖）
│  ├─ linetool.js          # LINE 貼圖工具箱
│  ├─ collection.js        # 收藏
│  └─ app.js               # 路由、PWA 註冊
├─ vendor/                 # JSZip、qrcode-generator（MIT）
├─ assets/icons/           # App Icon
├─ docs/                   # 測試報告、課堂簡介
└─ tests/test_app.py       # 自動化驗收測試
```

所有路徑皆為**相對路徑**，可直接部署在 `https://帳號.github.io/sticker-studio/` 子路徑。

---

## 四、GitHub Pages 部署與更新維護

### 第一次部署
1. 在 GitHub 建立公開 Repository：`sticker-studio`
2. 把整個資料夾的檔案推上 `main` 分支
3. Repository → **Settings → Pages** → Source 選 **Deploy from a branch**，Branch 選 `main`、資料夾 `/ (root)` → Save
4. 等 1～3 分鐘，網址為 `https://你的帳號.github.io/sticker-studio/`

### 每次更新（重要）
1. 修改程式碼
2. **修改 `sw.js` 第 2 行的 `VERSION`**（例如 `v1.1.0` → `v1.1.1`），否則使用者可能一直看到舊版快取
3. 同步修改 `js/data.js` 的 `SS.VERSION`、`index.html` 頁尾版本號
4. 在 `CHANGELOG.md` 記錄修改內容
5. 本機測試：`python3 -m http.server 8000`，重點確認手機版、加工室、下載功能
6. `git add . && git commit -m "v1.0.1: 修改內容" && git push`
7. 部署完成後用**無痕視窗**開啟公開網址確認；已開過的使用者會看到「有新版本 🎉 立即更新」

### 維護原則
- 不隨意修改已穩定運作的功能
- 不影響 GitHub 帳號內其他 Repository
- 不得把任何 API Key、密碼、Token 寫進程式碼

---

## 五、PWA 手機安裝教學

- **Android（Chrome）**：開啟網站 → 右上角「⋮」→「安裝應用程式」或「加到主畫面」
- **iPhone／iPad（Safari）**：開啟網站 → 下方「分享」→「加入主畫面」→「新增」
- **電腦（Chrome／Edge）**：網址列右側「安裝」圖示

安裝後加工室、切圖、收藏等本機功能可離線使用；ChatGPT／Gemini 需連線。

---

## 六、隱私設計

- 無後端伺服器、無資料庫伺服器、無帳號、無追蹤程式
- 照片用 `URL.createObjectURL` 與 Canvas 在本機處理
- 收藏：IndexedDB（圖片）＋ LocalStorage（角色與設定），只存在該瀏覽器
- 清除瀏覽器資料可能遺失收藏，請使用「匯出備份」

## 七、第三方套件

| 套件 | 版本 | 授權 | 用途 |
|------|------|------|------|
| [JSZip](https://github.com/Stuk/jszip) | 3.10.2 | MIT（或 GPL-3.0，擇一） | ZIP 打包 |
| [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) | 1.5.2 | MIT | QR Code |

兩者皆內建於 `vendor/`，執行時不連線外部 CDN。

## 八、台語資料來源

教育部《臺灣台語常用詞辭典》<https://sutian.moe.edu.tw/>。建立資料時以 [g0v/moedict-data-twblg](https://github.com/g0v/moedict-data-twblg)（教育部臺灣閩南語常用詞辭典開放資料，CC BY-ND 3.0 TW）逐條比對；辭典內容著作權屬教育部，本專案未重製辭典釋義。

## 九、LINE 規格來源

LINE Creators Market 官方製作準則：<https://creator.line.me/zh-hant/guideline/sticker/>（2026-11 查證）。規格可能更新，上架前請以官方頁面為準；本工具不保證通過審核。
