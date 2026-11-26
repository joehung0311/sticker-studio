# 今天貼什麼？ Sticker Studio v1.4.0

> 生活有百種心情，貼圖不必只有一種。

讓不會畫畫、不懂設計的人，也能輕鬆規劃、生成及加工個人專屬聊天貼圖的繁體中文 Web App。
品牌：白話實驗室／baihua.tw

- 不用註冊、不用登入、不用 API Key、不用付費
- 照片與圖片只在使用者的瀏覽器處理，不會上傳
- 可加入手機主畫面（PWA），本機功能可離線使用

---

## 一、使用流程（v1.3）

首頁只有三個入口，底部導覽列：🏠 首頁／🪄 製作／✂️ 加工／💗 收藏

**01｜開始製作貼圖**（六步驟，資料自動保存）

| 步驟 | 內容 |
|---|---|
| 1 類型 | 📷 使用照片／🎨 原創角色／🔤 純文字貼圖 |
| 2 角色與畫風 | 角色類型、8 種畫風、表情、動作、道具、配色；進階外貌收合；盲盒隨機搭配（可鎖定）；純文字自動略過 |
| 3 文字與語言 | 繁中、台語、金門話、英日韓、我的家鄉話、自訂語言；分類、搜尋、收藏、隨機、無文字 |
| 4 樣式與裝飾 | 7 字體、10 配色、9 位置、直排、陰影、0～3 裝飾；隨機設計（可鎖定，不改文字） |
| 5 張數 | 單張、4、8、16、24、32、40 張（多張自動企劃） |
| 6 產生結果 | 照片／角色：提示詞（繁中或英文）、複製、下載、開 ChatGPT／Gemini、匯入 AI 圖片進加工室；純文字：即時預覽、PNG、整套 ZIP |

**02｜貼圖加工室**：裁切縮放、消除工具、文字編輯（含隨機設計）、裝飾素材、去除背景、切圖與尺寸（LINE 工具）、輸出下載；可一次匯入多張圖逐張加工（批次佇列），宮格切圖也可一次匯入多張宮格合併成一套

**📦 LINE 上架包**（`#pack`，收藏頁與各輸出按鈕進入）：選張數（8／16／24／32／40）→ 加入貼圖（加工室、切圖、純文字、收藏、裝置檔案）→ 調整順序、指定主圖與標籤圖 → 自動轉成 370×320／240×240／96×74 透明 PNG，打包成可直接上傳的 ZIP

**03｜我的貼圖收藏**：作品、角色設定、常用文字、我的家鄉話；備份匯出匯入

> App 本身**不會**直接生成 AI 圖片；照片／角色模式產生提示詞，讓你貼到 ChatGPT 或 Gemini。純文字貼圖完全在本機產生。

### 語言資料

| 語言 | 檔案 | 來源與查核 |
|---|---|---|
| 繁體中文 | `js/data.js` | 內建 64 句生活用語 |
| 台語 | `data/taigi.json` | 151 句，依教育部辭典逐條比對 |
| 金門話 | `data/kinmen.json` | 81 筆，全部取自教育部辭典「詞彙方言差」金門點（單詞、金門腔臺羅） |
| 英文／日文／韓文 | `data/en.json`、`ja.json`、`ko.json` | 各 42 句，本專案編寫校對（非官方詞典） |
| 我的家鄉話 | 使用者瀏覽器 | 使用者自建，標示「未經查證」 |

維護方式見 [`data/README.md`](data/README.md)。

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
│  ├─ taigi.json           # 台語用語
│  ├─ kinmen.json          # 金門話詞庫
│  ├─ en.json / ja.json / ko.json  # 英日韓短句
│  └─ README.md            # 台語資料維護說明
├─ js/
│  ├─ data.js              # 畫風、用語、主題、LINE 規格
│  ├─ core.js              # 儲存、剪貼簿、下載、提示詞產生器
│  ├─ taigi.js             # 台語貼圖專區
│  ├─ views.js             # 首頁、照片、角色、用語、盲盒、企劃、說明頁
│  ├─ decos.js             # 裝飾素材（原創 SVG）
│  ├─ lang.js              # 語言整合、用語挑選器、家鄉話、常用文字
│  ├─ render.js            # 共用繪製引擎（字型、文字排版、裝飾）
│  ├─ make.js              # 開始製作貼圖（六步驟流程）
│  ├─ editor.js            # 貼圖加工室（圖層、消除、隨機設計、切圖與尺寸）
│  ├─ linetool.js          # LINE 貼圖工具箱
│  ├─ pack.js              # LINE 上架包（獨立 IndexedDB：sticker-studio-pack）
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
2. **修改 `sw.js` 第 2 行的 `VERSION`**（例如 `v1.3.0` → `v1.3.1`），否則使用者可能一直看到舊版快取
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
