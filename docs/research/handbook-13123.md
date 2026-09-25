# 江戸川区（13123）ハンドブック読み込みメモ　確認日: 2026-09-25

## 冊子
- 「令和8年度 えどがわ子育てガイド」令和8年5月発行（データは令和8年4月現在。子育てひろば・共育プラザ・健康サポートセンター・区役所の窓口で配布）
- PDF: https://www.city.edogawa.tokyo.jp/documents/7206/guide.pdf（案内ページ https://www.city.edogawa.tokyo.jp/e047/kosodate/kosodate/gaido.html。章ごとの分割PDFもある）
- 本文: docs/research/handbook-13123.txt（PDF 41ページ、約210KB。pymupdf で抽出。`#page=N` はPDFのページ番号で、印刷ページ番号+2。表の列が分かれて並ぶので読みにくい箇所がある）
- 補った公式ページ: 妊娠届・親子健康手帳 https://www.city.edogawa.tokyo.jp/e052/kosodate/ninshin/boshitecho.html、戸籍の届出受付窓口 https://www.city.edogawa.tokyo.jp/e031/kurashi/todoke/koseki/madoguchi.html、出生届 https://www.city.edogawa.tokyo.jp/e031/kurashi/todoke/koseki/shussei.html、区民課 https://www.city.edogawa.tokyo.jp/e031/kuseijoho/gaiyo/shisetsuguide/bunya/kuyakusho/kuminka.html、出産育児一時金 https://www.city.edogawa.tokyo.jp/e053/kurashi/iryohoken/kokuho/kyuhu/sinsei/childbirth.html、医療保険年金課 https://www.city.edogawa.tokyo.jp/e053/kuseijoho/gaiyo/soshiki/kenko/iryohoken.html、健康サービス課 https://www.city.edogawa.tokyo.jp/e052/kuseijoho/gaiyo/soshiki/kenko/service.html、子ども医療費助成 https://www.city.edogawa.tokyo.jp/e049/kosodate/kosodate/teateshien/iryoujosei.html、児童手当 https://www.city.edogawa.tokyo.jp/e049/kosodate/kosodate/teateshien/kodomoteate.html

## 足した contacts（すべて needs_review: true）
| id | 窓口 | 電話 | 出典 |
|---|---|---|---|
| edogawa.c_support_center | 健康サポートセンター（中央の番号を代表に。ほか7か所は note） | 03-5661-2467 | PDF p.39（各種連絡先）＋ 健康サービス課ページ |
| edogawa.c_boshi | 健康サービス課 母子保健係（江戸川保健所内） | 03-5661-2466 | PDF p.7 |
| edogawa.c_teate | 児童家庭課 手当助成係（東棟2階4番窓口。医療費助成係 03-5662-8578 は note） | 03-5662-0082 | PDF p.9 |
| edogawa.c_koseki | 区民課 戸籍住民係（南棟1階。夜間休日は警備室・各区民館で預かり） | 03-5662-0591 | PDF p.7 ＋ 戸籍の届出受付窓口ページ |
| edogawa.c_kokuho | 医療保険年金課 国民健康保険給付係（資格係 03-5662-0560、国民年金係 03-5662-0574 は note） | 03-5662-8053 | PDF p.7 ＋ 出産育児一時金ページ |
| edogawa.c_kyufu_call | 妊婦のための支援給付 コールセンター | 03-4446-4327 | PDF p.6 |

## contact_id を付けた steps
- s03, s03b → c_support_center／s05, s08 → c_kyufu_call／s06d → c_kokuho／s08c, s07c, s08b, s08d → c_boshi
- s05c（妊婦歯科健診）は付けていない（冊子は「区内指定医療機関に電話で予約」とだけ書いてあり、区の担当係の記載が無い）

## detail を補った steps
- s03: 郵送申請のしかた、郵送・電子申請だけではぴよママギフトは渡されない
- s07c: 冊子の対象（生後4か月未満）と申し込み方法（ぴよナビえどがわ）

## 冊子と既存データの食い違い（データは変えていない）
- 冊子 p.39 の「各種連絡先」は表の列がばらけて抽出され、小岩健康サポートセンターの番号として 03-3658-3171 と 03-3658-3177 の2つが近くに並ぶ。区の健康サービス課ページの 03-3658-3171 を採用した（3177 は別施設の番号の可能性）。要確認。
- 冊子 p.7 の出生届の届出先は「区役所区民課・各事務所の戸籍住民係」で区ページと同じ。夜間休日の窓口（警備室・区民館）は冊子に無く区ページから。

## 取れなかったもの
- 母子保健係と国民健康保険給付係の受付時間（区ページに明記が無い）。hours は空にした。
- 冊子に「妊婦のための支援給付 コールセンター」の受付時間は無い。hours は区ページ（既存 s08 の detail）に合わせた。
