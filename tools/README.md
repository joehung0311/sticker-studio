# 資料建置腳本

這些腳本用來產生 `data/*.json`，網站執行時不需要它們。

| 腳本 | 產生 | 需要 |
|---|---|---|
| `taigi_build.py`（＋`taigi_phrases.py` 原稿） | `data/taigi.json` | g0v/moedict-data-twblg 的 `dict-twblg.json` |
| `kinmen_build.py` | `data/kinmen.json` | g0v/moedict-data-twblg 的 `raw/詞彙方言差.csv` |
| `intl_build.py` | `data/en.json`、`ja.json`、`ko.json` | 無 |

使用前請把腳本內的資料路徑改成你下載 [g0v/moedict-data-twblg](https://github.com/g0v/moedict-data-twblg) 的位置。
