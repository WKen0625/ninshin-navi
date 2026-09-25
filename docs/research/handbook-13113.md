# 渋谷区（13113）ハンドブック読み込みメモ　作業日: 2026-09-25

## 冊子
- 名称: 渋谷区「令和8年度ネウボラ子育てハンドブック」（Neuvola Childcare Handbook）。令和8年4月1日発行（最終ページ）。妊娠届出時に「母と子の保健バッグ」で配布。
- 案内ページ: https://www.city.shibuya.tokyo.jp/kodomo/ninshin/kosodate-shien/neuvola_childcare_handbook.html
- PDF: https://files.city.shibuya.tokyo.jp/assets/12995aba8b194961be709ba879857f70/71273d2bb29940ce87f4f7b6d1a8bf31/neuvola_childcare_handbook8.pdf（2,463KB、34ページ）
- 本文: pymupdf で全34ページを抽出 → `docs/research/handbook-13113.txt`（約57KB）。`#page=N` はPDFのページ番号（冊子の印刷ページ + 2）。
- 補助に読んだ公式ページ（受付時間・夜間休日受付は冊子に無いため）:
  - 出生届: https://www.city.shibuya.tokyo.jp/kurashi/koseki/koseki-todokede/shussho_todoke.html（更新日 2025年11月11日）
  - 中央保健相談所 施設案内: https://www.city.shibuya.tokyo.jp/shisetsu/iryo-fukushi-shisetsu/iryo-shisetsu/hks_cyuo.html

## 足した contacts（全件 needs_review: true）
| id | 窓口 | 電話 | 出典 |
|---|---|---|---|
| shibuya.c_boshi | 中央保健相談所 母子保健係 | 03-3463-2409 | PDF p.10（時間は施設案内ページ） |
| shibuya.c_hokensodan | 保健相談所（中央 03-3463-2439／恵比寿 03-3443-6251／幡ヶ谷 03-3374-7591）地区担当保健師 | note に3所 | PDF p.31 |
| shibuya.c_koseki | 住民戸籍課 戸籍係 | 03-3463-1801 | PDF p.18（受付時間・夜間休日は出生届ページ） |
| shibuya.c_kyufu | 子ども青少年課 子育て給付係（児童手当・子ども医療費助成） | 03-3463-2558 | PDF p.19 |
| shibuya.c_kokuho_shikaku | 国民健康保険課 資格賦課係 | 03-3463-1781 | PDF p.17 |
| shibuya.c_kokuho_kyufu | 国民健康保険課 給付係（ハッピーマザー） | 03-3463-1776 | PDF p.21 |
| shibuya.c_callcenter | 妊婦支援給付金コールセンター | 03-3463-3589 | PDF p.14 |
| shibuya.c_yobou | 地域保健課 予防接種係 | 03-3463-1412 | PDF p.13 |

- 区の「妊娠・子育ての相談電話」専用番号は冊子に無い。冊子p.31「健診や育児のことで困ったら」は、お住まいを管轄する保健相談所の地区担当保健師に相談、とあるので c_hokensodan がその役。
- 中央保健相談所の代表番号は施設案内ページでは 03-3463-1211（区役所代表と同じ）、問い合わせ欄は 03-3463-2439。冊子p.31 の 03-3463-2439 を採用。

## contact_id を付けた steps
- s03（妊娠届）→ c_boshi／s03b（妊婦面接）→ c_hokensodan／s05・s08（支援給付金）→ c_callcenter／s05c（歯科健診）→ c_boshi／s06d（国保免除）→ c_kokuho_shikaku／s07b（ハッピーマザー）→ c_kokuho_kyufu／s07c（出生通知票・訪問）→ c_boshi／s08b（産婦健診）→ c_boshi／s08e（里帰り助成）→ c_boshi
- 出生届・児童手当・子ども医療証は区独自 step が無い（国の共通 step）ので付けていない。c_koseki・c_kyufu は画面の「困ったら」用。

## detail を補った steps
- s03: 保健バッグの中身（p.5）。s05c: 冊子の「無料歯科健診」表記と歯科医院一覧。s07b: LINE申請ならセブン銀行ATM受取可。s07c: 低体重児届を兼ねる・区外滞在中の訪問。s08b: 都外受診者向け案内が保健バッグにある。s08e: 転出後は分娩前でも申請可・振込まで時間がかかる。
- 数字（期限・金額・週数）は足していない・変えていない。

## 冊子と既存データの食い違い（データは変えていない）
- s05c 妊婦歯科健診: 既存 detail「費用は区のページに記載なし」。冊子p.10 は「無料歯科健診」。
- s07c 出生通知票: 既存 deadline_note「期限は区のページに記載なし」。冊子p.22 は「出生後おおむね1か月以内に提出」。訪問対象は既存「生後4か月まで」、冊子は「出生後5か月未満」（訪問日時は生後2か月上旬に手紙）。
- s08e 里帰り等助成: 冊子は「振込まで2〜3か月程度」。令和8年10月1日以降は都外での産婦健診・1か月児健診も対象になる場合あり（区ページ更新予定）。
- 保健バッグ（documents shibuya.hoken_bag）: 冊子p.5 では新生児聴覚検査受診票・RSウイルスワクチン受診票・1か月児健康診査受診票も同封。documents には shibuya.shinseiji_choukaku などの行が無い（追加は今回の作業範囲外）。
- 産後ケア: 冊子p.15 は「妊娠28週からLINEで申請」「宿泊型 1日3,500円／訪問型 1回1,000円／デイ 1回2,000円」。既存 steps に産後ケアの行は無い。
- 1か月児健康診査（冊子p.20）: 令和8年10月1日から助成開始、生後41日までに受診票で受診。既存 YAML 冒頭コメント「確かなページが見つからなかった」→ 冊子には載っている（step 追加は範囲外）。

## 取れなかったもの
- 母子保健係・保健相談所の受付時間は冊子に無い（施設案内ページの「8時30分〜17時」を hours に使い、その旨を書いた）。
- 児童手当・子ども医療費助成の窓口の場所（階数）は冊子に無い。
