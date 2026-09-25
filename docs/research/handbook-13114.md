# 中野区（13114）ハンドブック読み込みメモ　確認日: 2026-09-25

## 冊子
- 「子育て支援ハンドブック おひるね」2025-2026年度版（中野区。案内ページ https://www.city.tokyo-nakano.lg.jp/kosodate/kosodatesite_ohirune/nenreibetsu/ninshin/tool/ohirune.html、2026年4月8日更新）
- PDF（全項）: https://www.city.tokyo-nakano.lg.jp/kosodate/kosodatesite_ohirune/nenreibetsu/ninshin/tool/ohirune.files/zennkou.pdf（22MB、44ページの見開きPDF。1ページに印刷ページ2面。例: #page=16 = 印刷 p.28-29、#page=18 = 印刷 p.32-33）。項目別PDF（08_ninshinsyussan.pdf など）も同じ場所にある
- 本文: docs/research/handbook-13114.txt（44ページ、約6,700行。pymupdf で抽出。先頭に出典URLを追記した）
- 補った公式ページ: 出生届 https://www.city.tokyo-nakano.lg.jp/kurashi/koseki/koseki/syussyotodoke.html、戸籍の届出（受付時間と受付窓口） https://www.city.tokyo-nakano.lg.jp/kurashi/koseki/koseki/todokede.html

## 足した contacts（すべて needs_review: true）
| id | 窓口 | 電話 | 出典 |
|---|---|---|---|
| nakano.c_sukoyaka | すこやか福祉センター（中部・北部・南部・鷺宮。妊娠届・かんがるー面接・赤ちゃん訪問・産後ケア） | 03-3367-7788（中部。他3か所は note） | #page=6, 16, 17 |
| nakano.c_kodomo_sogo | 区役所3階 子ども総合窓口（子ども医療助成係。妊婦健診・歯科健診・聴覚検査・里帰り助成・医療証） | 03-3228-3253（代表 03-3228-5484、子ども医療助成係 03-3228-5623 は note） | #page=16, 18, 42 |
| nakano.c_teate | 子ども総合窓口 児童手当係 | 03-3228-8952 | #page=18 |
| nakano.c_koseki | 戸籍住民課 戸籍係（区役所2階5番）。夜間・休日は区役所1階宿直窓口で預かりのみ | 03-3228-5503（地域事務所5か所は note） | #page=17, 42 ＋ 公式ページ |
| nakano.c_kokuho | 保険医療課 国保給付係（一時金）。免除は資格賦課係 03-3228-5511 | 03-3228-5508 | #page=18 |
| nakano.c_sodan | 子ども・若者支援センター 総合相談係（#8000 は note） | 03-5937-3257 | #page=42, 7 |

## contact_id を付けた steps
- s03, s03b, s07c, s08b → c_sukoyaka／s05c, s08c, s08e → c_kodomo_sogo／s06d → c_kokuho
- s05・s08（妊婦のための支援給付）は問い合わせ先が企画調整係 03-3228-8809（区ページ）で、冊子に窓口の記載が無いため付けていない

## detail を補った steps
- s03: 妊娠届のときに支援給付（産前）の案内、保健バッグの受診票の種類（#page=16）
- s05c: 保健バッグの案内から指定医療機関に電話予約、受診票は医療機関にある（#page=16）
- s07c: 出生届の受付場所、訪問日の調整と訪問の内容（#page=17）

## 冊子と既存データの食い違い（データは変えていない）
- 北部すこやか福祉センターの電話: 既存 s03b の detail は 03-3388-0240（区ページ）、冊子 #page=6 は 03-3389-4321。c_sukoyaka の note には冊子の番号を入れた。要確認。
- 児童手当・子ども医療費助成の問い合わせ先（#page=18）は表の抽出で列がずれており、児童手当係 03-3228-8952／子ども総合窓口 03-3228-3253・03-3228-5484 のどれがどの制度かは PDF を目で確認してほしい。

## 取れなかったもの
- 冊子に夜間・休日の出生届受付、戸籍係の受付時間の記載は無い → 公式ページで補った。
- 区役所の所在地は冊子に無い（c_kodomo_sogo・c_teate・c_koseki・c_kokuho は address なし）。
- 冊子の電話番号は市外局番なし・全角数字（データでは 03- を付けて半角にした）。
