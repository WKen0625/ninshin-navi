# 足立区（13121）子育てハンドブック読み込みメモ  確認日: 2026-09-25

## 冊子
- 名称: 令和8年度版あだち子育てガイドブック（足立区 子ども政策課）。発行年: 令和8年度（2026）
- 案内ページ: https://www.city.adachi.tokyo.jp/kodomokate/k-kyoiku/kosodate/ninshin-guidebook.html
- PDF（2分冊）:
  - https://www.city.adachi.tokyo.jp/documents/2950/guide2026_0-77.pdf （表紙〜P.77、PDF 39ページ・見開き）
  - https://www.city.adachi.tokyo.jp/documents/2950/guide2026_78-134.pdf （P.78〜裏表紙、PDF 29ページ・見開き）
  - 電子ブック: https://www.catapoke.com/viewer/?open=9eb9e （未使用）
- 取れた本文: docs/research/handbook-13121.txt（約10.5万字、8,639行、PDF 68ページ分）。一部のコラム（縦組み・特集）は文字化けしている（本文の窓口・電話は読める）。
- 補助に使った公式ページ: 足立保健所一覧 https://www.city.adachi.tokyo.jp/esekanri/fukushi-kenko/kenko/hoken-center-ichiran.html（各保健センターの電話・住所・受付時間）、戸籍関係の届出一覧 https://www.city.adachi.tokyo.jp/koseki/kurashi/todokede/koseki-todokede.html（戸籍届出係の受付時間・時間外受付）、妊娠届出ページ https://www.city.adachi.tokyo.jp/hoken/k-kyoiku/kosodate/ninshin-shussho.html

## 足した contacts（すべて needs_review: true）
| id | 窓口 | 電話 | 出典 |
|---|---|---|---|
| adachi.c_hoken | 保健予防課 保健予防係（南館2階）・各保健センター等 | 03-3880-5892（各センターは note） | PDF1 #page=10（P.18）+ 保健所一覧ページ |
| adachi.c_ninsanpu | 保健予防課 妊産婦支援係（こども家庭センター） | 03-3880-5405 | PDF1 #page=18（P.35） |
| adachi.c_koseki | 戸籍住民課 戸籍届出係（南館1階）／時間外受付は中央館地下1階 | 03-3880-5065 | PDF1 #page=12（P.22）+ 戸籍届出ページ |
| adachi.c_jido | 親子支援課 児童手当係 | 03-3880-6492 | PDF1 #page=19（P.36） |
| adachi.c_iryo | 親子支援課 子ども医療費給付係（子ども医療費助成・出産費助成） | 03-3880-5923 | PDF1 #page=18（P.34） |
| adachi.c_kokuho | 国民健康保険課 資格賦課担当（北館2階）／給付担当は note | 03-3880-5240 | PDF1 #page=20（P.38） |
| adachi.c_kodomo_soudan | こども家庭相談課（こども家庭相談室） | 03-3852-3535 | PDF2 #page=15（P.107） |
| adachi.c_yobou | 保健予防課 予防接種係 | 03-3880-5094 | PDF1 #page=18 |

## contact_id を付けた steps
- adachi.c_hoken: s03（妊娠届）、s03b（スマイルママ面接）、s05（応援給付金1回目）、s05c（妊婦歯科健診）、s08c（新生児聴覚検査）、s07c（こんにちは赤ちゃん訪問）、s08（応援給付金2回目）、s08b（産婦健診）、s08d（1か月児健診）
- adachi.c_kokuho: s06d（産前産後の国保料免除）
- adachi.c_iryo: s07b（出産費助成）

## detail を補った steps
- adachi.s03: 受付時間（平日 8:30〜17:00）、窓口で書くときの準備（出産予定日・医療機関・担当医師名）、午後4時以降は混む旨（PDF1 P.18）
- adachi.s06d: 届出は出産後でもできる旨（PDF1 P.38）

## 冊子と既存データの食い違い・気づき
- 千住保健センターの電話: 冊子 P.42 の自主グループ欄は「3888-4278」、区の保健所一覧ページは「03-3888-4277」。contacts には公式一覧ページの 4277 を採用（要確認）。
- 千住保健センターは千住庁舎改修のため仮移転中（千住仲町18番7号、令和8年3月23日〜令和10年5月予定）。contacts の note には入れていない。
- 冊子 P.8-9 の「子どもが生まれたら必要な手続き」チャートは、出生届の時間外受付を「宿直」とだけ書いている。場所・扱い（中央館地下1階、仮受付）は区の戸籍届出ページから補った。
- 既存 steps の数字（期限・金額）と冊子の記載に食い違いは見つからなかった（出産費助成 上限10万円・出生日から1年以内、産前産後免除 4か月分/6か月分 は一致）。

## 取れなかったもの
- 冊子には各保健センターの住所・受付時間の一覧（P.112-113 は担当町名の一覧のみ）が無いため、公式の保健所一覧ページで補った。
- 児童手当係・子ども医療費給付係・国保課の受付時間は冊子に記載なし（区役所の開庁時間に準じると思われるが、書いていない）。
