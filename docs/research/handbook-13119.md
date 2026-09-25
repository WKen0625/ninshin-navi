# 板橋区（13119）ハンドブック読み込みメモ　確認日: 2026-09-25

## 冊子
- 「令和8年版いたばし子育て情報ブック」令和8年（2026年）6月発行（板橋区 子育て支援課。妊娠届のときに「母と子の保健バッグ」に入れて配られる）
- PDF: https://www.city.itabashi.tokyo.jp/_res/projects/default_project/_page_/001/004/606/r8kosodate.pdf（案内ページ https://www.city.itabashi.tokyo.jp/kosodate/teate/book/1004606.html）
- 本文: docs/research/handbook-13119.txt（PDF 100ページ、約215KB。pymupdf で抽出。`#page=N` はPDFのページ番号で、印刷ページ番号+2）
- 注意: 本文の一部は埋め込みフォントの都合で文字化けして抽出される（見出し・窓口名・電話番号・所在地は読める）。文字化けした段落の内容は、区の公式ページで確かめた。
- 補った公式ページ: 健康福祉センターのご案内 https://www.city.itabashi.tokyo.jp/kenko/soudan/madoguchi/1002459.html、妊婦面接 https://www.city.itabashi.tokyo.jp/kosodate/ninshin/ninshin/1004064.html、新生児等・産婦訪問 https://www.city.itabashi.tokyo.jp/kosodate/ninshin/shusan/1004078.html、出生届 https://www.city.itabashi.tokyo.jp/tetsuduki/koseki/koseki/1001587.html、戸籍届出の休日・夜間受付 https://www.city.itabashi.tokyo.jp/tetsuduki/koseki/koseki/1001586.html、本庁舎休日・夜間サービス https://www.city.itabashi.tokyo.jp/tetsuduki/koseki/madoguchi/kyujitsu/1001718.html、子育て支援課 https://www.city.itabashi.tokyo.jp/kusei/soshiki/kodomokatei/1038541.html、国保年金課 https://www.city.itabashi.tokyo.jp/kusei/soshiki/kenkoikigai/1006927.html、健康推進課 https://www.city.itabashi.tokyo.jp/kusei/soshiki/kenkoikigai/1006929.html

## 足した contacts（すべて needs_review: true）
| id | 窓口 | 電話 | 出典 |
|---|---|---|---|
| itabashi.c_hoken_center | 健康福祉センター（板橋の番号を代表に。上板橋・赤塚・志村・高島平は note） | 03-3579-2333 | PDF p.32（担当地域表）＋ p.30・p.23 |
| itabashi.c_boshi | 健康推進課 母子保健係（南館3階21番窓口） | 03-3579-2313 | PDF p.64（子育てイエローページ） |
| itabashi.c_teate | 子育て支援課 子どもの手当医療係（北館1階6番窓口。赤塚支所住民サービス係 03-3938-5113 は note） | 03-3579-2477 | PDF p.17・p.64 |
| itabashi.c_koseki | 戸籍住民課 戸籍係（夜間・休日は本庁舎1階東口玄関の夜間受付で預かりのみ） | 03-3579-2202 | PDF p.25 ＋ 出生届・夜間受付ページ |
| itabashi.c_kokuho | 国保年金課（国保給付係の番号。国保資格係 03-3579-2406、国民年金係 03-3579-2431 は note） | 03-3579-2404 | PDF p.24 |
| itabashi.c_josei_sodan | 板橋区女性健康支援センター（東京都妊娠相談ほっとライン 03-5339-1133 は note） | 03-3579-2306 | PDF p.63 |

## contact_id を付けた steps
- s03, s03b, s08e → c_hoken_center／s05, s08, s08c, s08b, s08d → c_boshi／s06d → c_kokuho
- s05c（妊婦歯科健診）は付けていない。区のページの担当は健康推進課 健康づくり・女性保健係 03-3579-2727 で、冊子には窓口の記載が見つからなかった（c_boshi の note に番号だけ書いた）

## detail を補った steps
- s03: 双子以上が分かったら新たにおやこ健康手帳を受け取る（p.15）
- s03b: 区民事務所では妊婦面接をしていない（p.15）、同日面接は時間に余裕を
- s06d: 冊子の問い合わせ先（国保資格係 03-3579-2406 自動音声応答）（p.24）
- s08c: できるだけ退院前に出産した病院で受ける、受診票は保健バッグに入っている（p.25）

## 冊子と既存データの食い違い（データは変えていない）
- 大きな食い違いは無し。s05・s08 の問い合わせ先は既存 detail が「つながるITABASHIコールセンター 0120-100-619」（区のページ）で、冊子の担当は健康推進課母子保健係 03-3579-2313。両方を c_boshi に入れた。
- 冊子 p.24 では国民健康保険の産前産後の保険料は「減額」、担当は国保資格係（自動音声応答）。既存 s06d の窓口記述（南館2階22番窓口）と矛盾はない。

## 取れなかったもの
- 冊子の本文（説明文）は文字化けが多く、持ち物・注意書きの細部は区の公式ページで補った。
- 冊子に健康福祉センターの所在地一覧（p.130参照とある）は PDF 100ページの範囲に無く、区の「健康福祉センターのご案内」ページから転記した。
- 冊子の電話番号は市外局番なしの「☎3579-2313」形式（データでは 03- を付けた）。
