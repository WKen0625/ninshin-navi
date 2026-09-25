# 区のハンドブックを読み込んで、問い合わせ先と手続きの詳細を Navi に入れる（作業指示）

目的: 各区の「子育てハンドブック／ガイドブック」（区が毎年出す冊子）を読み、
(1) 「困ったらどこに聞くか」＝ `contacts` を区ごとに入れる、(2) 手続き（steps）の `detail` を冊子の内容で補う、(3) 手続きに `contact_id` を付ける。

守ること（CLAUDE.md の設計原則）
- 数字・電話番号・時間は、冊子または公式ページの文字をそのまま写す。推測しない。覚えている番号を書かない。
- すべての行に `source_url`（冊子のURL。電子ブックなら `#page=N`、PDFなら `#page=N`）と `verified_at: 2026-09-25`。
- 新しく足す contacts は `needs_review: true`（人が承認してから外す）。steps の既存の数字（期限・金額）は変えない。冊子と食い違う点は、研究メモに書くだけ。
- 医療的な判断は書かない。
- 触るのは `data/municipalities/<code>.yaml` と `docs/research/handbook-<code>.md` / `.txt` だけ。ほかのファイルは触らない。

## 手順（区ごと。1区終わるごとに書き込む）

1. 冊子を探す。検索: 「<区名> 子育て ガイドブック 2026」「<区名> 子育てハンドブック PDF」「<区名> 妊娠 出産 ガイド」。区の公式サイトのPDFが第一候補。電子ブック（Flipper／ActiBook／ebook5）は、`<ブックのURL>/search.xml` や `text/` に本文があることが多い（世田谷区の例: https://webbook-sample.com/setagaya_kosodate_2026/search.xml）。
2. 本文を取り出して `docs/research/handbook-<code>.txt` に保存する。PDF: `python3 -c "import fitz; d=fitz.open('x.pdf'); print('\n'.join(f'===== page {i+1} =====\n'+p.get_text() for i,p in enumerate(d)))"`（pymupdf は入っている）。curl は `-A "Mozilla/5.0"` を付ける。取れない場合は、区の「妊娠・出産」のページ群（HTML）を代わりに読む。
3. `data/municipalities/<code>.yaml` の `steps:` の直前に `contacts:` を足す（既にあれば追記）。4〜8件。id は既存の接頭辞（例 `minato.`）＋ `c_` ＋ 英字（例 `minato.c_hoken`）。
   必ず入れる窓口: ①母子保健の窓口（妊娠届・母子手帳・面接・赤ちゃん訪問。保健所／保健センター／保健相談所など）、②児童手当・子ども医療証の窓口、③戸籍（出生届）の窓口と夜間・休日の受付、④国民健康保険の窓口、⑤区の妊娠・子育ての相談電話（あれば）。
   形:
   ```yaml
   contacts:
     - id: minato.c_hoken
       name: みなと保健所 健康推進課 地域保健係
       topics: 妊娠届・母子健康手帳・プレママ面談・妊婦健診の受診票・赤ちゃん訪問
       phone: "03-6400-0084"
       hours: 平日 8:30〜17:00
       address: 港区三田1-4-10
       url: https://www.city.minato.tokyo.jp/...
       note: 各総合支所区民課保健福祉係でも受け付け（芝 03-xxxx-xxxx／麻布 …）
       source_url: https://www.city.minato.tokyo.jp/.../handbook.pdf#page=12
       verified_at: 2026-09-25
       needs_review: true
   ```
   `phone` は `03-1234-5678` か `#8000` の形だけ（それ以外は `note` に書く）。電話・URL・住所のどれか1つは必須。
4. steps に `contact_id` を付ける（該当する行だけ）: 妊娠届・面接・健診・訪問 → 母子保健の窓口、出生届 → 戸籍、児童手当・医療証 → 手当の窓口、国保の免除・一時金 → 国保、など。行の `source_url:` の直前に `    contact_id: minato.c_hoken` を入れる。
5. steps の `detail` を補う: 冊子に「持ち物」「窓口の場所」「受付時間」「注意」があって、いまの detail に無ければ、文末に1〜2文足す。数字（期限・金額・週数）は足さない・変えない。
6. `pnpm seed:check` を実行して「検証OK」を確かめる（エラーが出たら直してから次の区へ）。
7. `docs/research/handbook-<code>.md` を書く: 冊子のURLと発行年、取れた本文の量、足した contacts の一覧、contact_id を付けた steps、detail を補った steps、冊子と既存データの食い違い（あれば）、取れなかったもの。

## 区コードと接頭辞
13101 千代田 chiyoda／13102 中央 chuo／13103 港 minato／13104 新宿 shinjuku／13105 文京 bunkyo／13106 台東 taito／13107 墨田 sumida／13108 江東 koto／13109 品川 shinagawa／13110 目黒 meguro／13111 大田 ota／13112 世田谷 setagaya（contacts は一部入っている）／13113 渋谷 shibuya／13114 中野 nakano／13115 杉並 suginami／13116 豊島 toshima／13117 北 kita／13118 荒川 arakawa／13119 板橋 itabashi／13120 練馬 nerima／13121 足立 adachi／13122 葛飾 katsushika／13123 江戸川 edogawa
