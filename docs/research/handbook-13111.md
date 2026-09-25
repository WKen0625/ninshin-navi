# 大田区（13111）ハンドブック読み込みメモ　確認日: 2026-09-25

## 冊子
- 「大田区子育てハンドブック」令和8年度版（2026）。発行: 大田区こども未来部こども未来課（問い合わせ先 03-5744-1272）。区のページは「【デジタル版】子育てハンドブック（令和8年度版）」（更新日 2026年7月30日）
- 案内ページ: https://www.city.ota.tokyo.jp/seikatsu/kodomo/shien/kosodate_handbook.html
- デジタルブック（ActiBook One）: https://saas.actibookone.com/content/detail?param=eyJjb250ZW50TnVtIjo1NTA5Mjl9&detailFlg=1&pNo=1 。その「PDF」ボタンの https://files.actibookone.com/contents/5421/550929-20260703122344/original.pdf（署名付きURLのため、直接開くには期限がある。ブックのページから再取得する）
- 本文: docs/research/handbook-13111.txt（94ページ、約242KB。pymupdf で抽出。テキスト層あり）。`#page=N` はPDFのページ番号で、冊子のノンブルと一致
- 照合に使った公式ページ: 妊娠の届出 seikatsu/kodomo/shussan/ninsin.html、妊婦面接 shussan/karugamo.html、出生届 seikatsu/koseki_j/koseki/todoke/shutshou.html、受付時間・窓口 todoke/koseki_todokede.html、児童手当 seikatsu/kodomo/teate/jidouteate/jidou.html、出産育児一時金 seikatsu/kokunen/kokuho/ukerareru/ikuji.html、地域健康課 kuseijoho/soshiki/gyoumu/c_chiikikenkou.html、こども家庭センター seikatsu/kodomo/shien/kateiCenter_kaisetsu.html

## 足した contacts（すべて needs_review: true）
| id | 窓口 | 電話 | 出典 |
|---|---|---|---|
| ota.c_kenko | 健康づくり課 健康づくり担当（管理）（妊娠届・母子手帳・受診票・支援給付金・里帰り助成・産婦健診／1か月児健診の払い戻し） | 03-5744-1661 | PDF p.14 |
| ota.c_chiiki_kenko | 各地域健康課 業務係（妊婦面接・赤ちゃん訪問・出産準備教室・乳幼児健診） | 03-5764-0661（大森。調布・蒲田・糀谷羽田と健康事業係は note） | PDF p.92-93 ＋ 地域健康課ページ |
| ota.c_teate | 子育ち支援課 子育ち支援担当（こども医療）（児童手当・児童医療費助成） | 03-5744-1275 | PDF p.19 ＋ 児童手当ページ |
| ota.c_koseki | 戸籍住民課 戸籍住民担当（戸籍）（出生届。夜間・休日窓口と宿直室） | 03-5744-1183 | PDF p.17 ＋ 出生届ページ |
| ota.c_kokuho | 国保年金課 国保資格係／国保給付係 | 03-5744-1210（給付係 03-5744-1211、国民年金係 03-5744-1214 は note） | PDF p.16 ＋ 一時金ページ |
| ota.c_kodomo_katei | こども家庭センター（大森・調布・蒲田・糀谷・羽田） | 03-6423-0842（大森。ほか3か所は note） | PDF p.72 ＋ センターのページ |

## contact_id を付けた steps
- s03, s05, s05c, s08, s08b, s08d, s08e → c_kenko／s03b, s07c → c_chiiki_kenko／s06d → c_kokuho

## detail を補った steps
- s03: 健康づくり課は本庁舎6階、夜間・休日受付の休み、「大田区おやこ手帳」アプリ（PDF p.14）
- s03b: 面接は40分程度、妊娠届と同時に受けるときは予約時間の10分前（妊娠の届出ページ）
- s06d: 国民年金の免除は国民年金係 03-5744-1214（PDF p.16）
- s07c: 出生通知書の案内は受診票セットの中、訪問は無料（PDF p.17）

## 冊子と既存データの食い違い（データは変えていない）
- 冊子p.17 は出生通知書の電子申請を「できるだけ14日以内」と案内。既存 s07c の deadline_note には日数の記載がない（数字は足していない）。
- 冊子p.16 は出産育児一時金の窓口を「国保給付係 5744-1211」、産前産後免除を「国保資格係 5744-1210」としており、既存 s06d と一致。
- 冊子p.72 に「子ども家庭支援センターは令和8年8月に組織改正により名称が変わります」とある。区の「【デジタル版】子育てハンドブック」ページ（7月30日更新）でも旧名称のまま。名称は要確認。
- 児童手当ページに「令和9年4月1日から窓口受付時間が変わります」、こども家庭センターのページにも同様の予告がある。contacts の hours は現行の時間を入れ、予告があることを書いた。

## 取れなかったもの
- PDFは署名付きURLで、期限が切れると再取得が必要（ブックのページの「PDF」ボタンから）。
- 国保年金課の窓口の階は冊子・公式ページに明記がなく、address は「本庁舎」までにした。
