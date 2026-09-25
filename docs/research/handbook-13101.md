# 千代田区（13101）ハンドブック読み込みメモ　確認日: 2026-09-25

## 冊子
- 「2026 千代田区子育て応援!! ガイドブック」令和8年8月発行（編集・発行: 千代田区立児童・家庭支援センター）
- PDF: https://www.city.chiyoda.lg.jp/documents/1250/guidebook2026.pdf（案内ページ https://www.city.chiyoda.lg.jp/koho/kosodate/kosodate/guidebook.html）
- 本文: docs/research/handbook-13101.txt（PDF 90ページ、約246KB。pymupdf で抽出。`#page=N` はPDFのページ番号で、印刷ページ番号+2）
- 補った公式ページ: 戸籍の届出 https://www.city.chiyoda.lg.jp/koho/kurashi/koseki/koseki/todokede.html、総合窓口課の開庁時間 https://www.city.chiyoda.lg.jp/koho/kuse/gaiyo/madoguchi/kaichojikan.html、出産育児一時金 https://www.city.chiyoda.lg.jp/koho/kurashi/hoken/kenkohoken/kyuhu/syussanichijikin.html、千代田保健所 https://www.city.chiyoda.lg.jp/shisetsu/hokenjo/chiyoda-hokenjo.html

## 足した contacts（すべて needs_review: true）
| id | 窓口 | 電話 | 出典 |
|---|---|---|---|
| chiyoda.c_hoken_service | 千代田保健所 保健サービス課 保健サービス係（妊娠届・保健バッグ・受診票・里帰り健診助成） | 03-6256-8477 | PDF p.6 |
| chiyoda.c_hoken_sodan | 保健サービス課 保健相談係（ままぱぱ面談・支援給付・産後ケア・赤ちゃん訪問・乳幼児健診） | 03-5211-8175（母子保健係 03-6380-8552 は note） | PDF p.7 |
| chiyoda.c_teate | 子育て推進課 手当・医療係（児童手当・こども医療費助成・出産費用助成） | 03-5211-4230 | PDF p.58 |
| chiyoda.c_koseki | 総合窓口課 戸籍係（出生届。夜間休日は1階夜間休日窓口で預かりのみ） | 03-5211-4198 | PDF p.10 ＋ 戸籍の届出ページ |
| chiyoda.c_kokuho | 保険年金課 国民健康保険係（産前産後免除・出産育児一時金） | 03-5211-4204 | 公式ページ（冊子に国保の記載なし） |
| chiyoda.c_kodomo_sodan | 児童・家庭支援センター 子ども相談窓口（千代田っこホットライン 03-3256-8150 は note） | 03-5211-4116 | PDF p.14 |

## contact_id を付けた steps
- s03 → c_hoken_service／s03b, s05, s08c, s07d, s08, s08b, s08d → c_hoken_sodan／s05c, s07c → c_hoken_service／s06d → c_kokuho／s07b → c_teate

## detail を補った steps
- s03: 保健バッグの中身（受診票の種類）
- s03b: 平日は予約不要
- s07b: 冊子の必要書類
- s07d: 出生通知票はポータルサイトからも提出可、訪問の内容

## 冊子と既存データの食い違い（データは変えていない）
- s03b ままぱぱ面談の受付時間: 既存 detail は「平日 9:00〜12:00 と 13:00〜16:15」（区ページ chiyomama.html）、冊子 p.7 は「平日 9:00〜16:30、土曜は保健所のみ事前予約制」。contacts の hours には冊子の値を入れた。要確認。
- s05c 歯科健診の電話 03-5211-8178 は冊子に無く、区の保健所ページから（冊子 p.8 は「ポータルサイト」の案内のみ）。

## 取れなかったもの
- 冊子に国民健康保険（出産育児一時金・産前産後免除）の案内、夜間・休日の出生届受付の記載は無い → 公式ページで補った。
- 冊子の電話番号の一部は「03‐6380‐8552」のように全角ハイフンで書かれている（データでは半角に直した）。
