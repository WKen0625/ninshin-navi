# 港区（13103）ハンドブック読み込みメモ　確認日: 2026-09-25

## 冊子
- 港区子育てハンドブック「みんなとKIDS」日本語版、令和7年（2025年）3月発行（編集・発行: 港区子ども家庭支援部 子ども家庭支援センター）。案内ページは2026年4月10日更新だが、日本語版は令和7年3月版が最新（令和8年版は未掲載）
- PDF（日本語版全文）: https://www.city.minato.tokyo.jp/documents/8400/20250526134548.pdf（案内ページ https://www.city.minato.tokyo.jp/kodomo/kodomo/kodomo/shien/handbook.html。章ごとの分割PDFもある）
- 本文: docs/research/handbook-13103.txt（PDF 76ページ、約177KB。pymupdf で抽出。`#page=N` はPDFのページ番号で、印刷ページ番号+2。裏表紙 p.76 が「各総合支所窓口一覧」）
- 補った公式ページ: 各総合支所（受付時間・住所） https://www.city.minato.tokyo.jp/kouhou/kuse/gaiyo/shisho.html、戸籍の届出 https://www.city.minato.tokyo.jp/shibakoseki/kurashi/todokede/todokede/kosekitodokede.html、よくある質問「休日・夜間に戸籍の届け出をしたい」 https://www.city.minato.tokyo.jp/shibakoseki/kuse/kocho/faq/todokede/025.html、みなとプレママ応援事業（保健所の住所） https://www.city.minato.tokyo.jp/chiikihoken/puremama.html、国民健康保険料（産前産後免除） https://www.city.minato.tokyo.jp/shikaku/kurashi/hoken/kenkohoken/hokenryo.html

## 足した contacts（すべて needs_review: true）
| id | 窓口 | 電話 | 出典 |
|---|---|---|---|
| minato.c_hoken | みなと保健所 健康推進課 地域保健係（受診票・プレママ面接・支援給付・出生通知書・赤ちゃん訪問・産後ケア・里帰り助成。プレママ直通 03-3455-4464、母子保健相談窓口 03-3455-4431、歯科 健康づくり係 03-6400-0083 は note） | 03-6400-0084 | PDF p.7 ＋ puremama ページ（住所） |
| minato.c_shisho_hoken | 各地区総合支所 区民課 保健福祉係（妊娠届・母子手帳・バス乗車券・手当や助成の持参申請。5支所＋台場分室の電話と住所は note） | 03-3578-3161（芝） | PDF p.76 ＋ 各総合支所ページ（時間） |
| minato.c_teate | 子ども若者支援課 子ども給付係（児童手当 2431・子ども医療費助成 2430・出産費用の助成 2433） | 03-3578-2431 | PDF p.18 |
| minato.c_koseki | 各地区総合支所 区民課 窓口サービス係／芝地区は戸籍係（出生届。夜間休日は本庁舎宿直室で預かりのみ） | 03-3578-3153（芝） | PDF p.13 ＋ 戸籍の届出ページ・FAQ |
| minato.c_kokuho_kyufu | 国保年金課 給付係（出産育児一時金） | 03-3578-2640 | PDF p.11 |
| minato.c_kokuho_shikaku | 国保年金課 資格保険料係（産前産後の国保免除。冊子に記載なし） | 03-3578-2574 | 公式ページ hokenryo.html |
| minato.c_kodomo_sodan | 港区子ども家庭相談ダイヤル（子ども家庭支援センター。専門相談 7202・家事育児支援 7201・入院助産 7214・都の妊娠相談ほっとライン 03-5339-1133 は note） | 03-5962-7215 | PDF p.45 |

## contact_id を付けた steps
- s03, s03c → c_shisho_hoken／s03b, s05, s05c, s08, s08b, s08c, s07c, s07d, s08d, s08e → c_hoken／s07b → c_teate／s06d → c_kokuho_shikaku

## detail を補った steps
- s03: 台場分室でも届け出できる。「港区妊娠・子育て情報ファイル」も受け取る
- s07b: 出産育児一時金付加金・高額療養費の支給決定通知書（写）が必要な場合もある

## 冊子と既存データの食い違い（データは変えていない）
- s03b（プレママ面接）: 既存 detail は「子ども商品券（1万円分）を受け取る」（区ページ）、冊子 p.7 は「育児パッケージをプレゼント」。冊子は令和7年3月版なので古い可能性がある。detail は足していない。要確認。
- 児童手当・子ども医療証の申請期限: 冊子 p.17〜18 は「出生・転入日（の翌日）から15日以内」。既存 steps に児童手当の行は無い（jp の共通 step に任せている）。
- 妊娠届の窓口: 冊子 p.4 は「各総合支所、台場分室」。既存 s03 は総合支所の区民課保健福祉係のみ → 台場分室を detail に足した。

## 取れなかったもの
- 冊子に、みなと保健所や区役所本庁舎の住所・受付時間、夜間・休日の出生届の受付は無い → 区の公式ページで補った。保健所の受付時間は公式ページにも見当たらず、hours は入れていない（母子保健相談窓口の相談時間 平日 9:00〜17:00 は冊子 p.15 から note に）。
- 国民健康保険の産前産後免除は冊子に無い（国民年金の免除 p.10 のみ）→ 既存 s06d の出典ページから contacts を作った。
- 本庁舎（国保年金課・子ども給付係）の住所は冊子・確認した公式ページに明記が無いので address は入れていない。
- 冊子の電話は「6400-0084」のように市外局番なし。データでは 03- を付けた。
