# 葛飾区（13122）ハンドブック読み込みメモ　確認日: 2026-09-25

## 冊子
- 「育児支援ガイドブック」2026年版（母子健康手帳交付時などに配られる。案内ページ https://www.city.katsushika.lg.jp/kenkou/1000050/1001803/1002084.html）
- PDF: 10分割（https://www.city.katsushika.lg.jp/_res/projects/default_project/_page_/001/002/084/2026.1.pdf 〜 2026.10.pdf、計76ページ）
- **本文は取れなかった**: 10ファイルすべて画像だけのPDFで文字レイヤーが無い（pymupdf の get_text が全ページ空。指示どおり OCR はしていない）。
- 代わりに区の公式ページ（妊娠・出産のページ群）を読み、本文を docs/research/handbook-13122.txt に保存した（約111KB）。
  - 妊娠届出と母子健康手帳の交付 https://www.city.katsushika.lg.jp/kenkou/1000050/1001803/1002071.html
  - ゆりかご葛飾 https://www.city.katsushika.lg.jp/kenkou/1000050/1001803/1014924.html
  - 9. 出産と子育て（外国人向け生活ガイド。窓口と電話の一覧）https://www.city.katsushika.lg.jp/information/1000087/1038058/1038630.html
  - 戸籍の届出について https://www.city.katsushika.lg.jp/kurashi/1000046/1001400/1001415.html、夜間・休日窓口 https://www.city.katsushika.lg.jp/kurashi/1000046/1001406/1001458.html、休日開庁窓口 https://www.city.katsushika.lg.jp/kurashi/1000046/1001406/1001459.html
  - 子どもの医療費助成 https://www.city.katsushika.lg.jp/kosodate/1000056/1002336/1002421.html、児童手当 https://www.city.katsushika.lg.jp/kosodate/1000056/1002336/1002411.html
  - 国保年金課 担当業務別お問い合わせ先 https://www.city.katsushika.lg.jp/kurashi/1000049/1001696.html、出産育児一時金 https://www.city.katsushika.lg.jp/kurashi/1000049/1001690/1001740.html
  - こんにちは赤ちゃん訪問 https://www.city.katsushika.lg.jp/kenkou/1000050/1001803/1024614.html、保健所の問い合わせ先 https://www.city.katsushika.lg.jp/kurashi/1000061/1003788/1039088.html、子ども総合センターの相談 https://www.city.katsushika.lg.jp/kurashi/1000061/1003783/1003810.html

## 足した contacts（すべて needs_review: true。出典はすべて区の公式ページ）
| id | 窓口 | 電話 |
|---|---|---|
| katsushika.c_boshi | 子ども総合センター 母子保健係（青戸保健センター内）。妊娠届・手帳・赤ちゃん訪問 | 03-3602-1387 |
| katsushika.c_hoken_center | 保健センター（青戸の番号を代表に。金町・新小岩・水元と担当区域は note）。ゆりかご面接・産後ケア・産婦健診 | 03-3602-1284 |
| katsushika.c_teate | 子育て応援課 児童手当係（4階401番）。児童手当・医療証・かつしか出産応援給付金 | 03-5654-8294 |
| katsushika.c_koseki | 戸籍住民課 戸籍届出係（2階217番）。夜間・休日は1階の夜間・休日窓口で預かり | 03-5654-8190 |
| katsushika.c_kokuho | 国保年金課 給付係（3階315番。資格係 03-5654-8210 は note） | 03-5654-8212 |
| katsushika.c_sodan | 健康ホットラインかつしか（子ども総合センター 03-3602-1386、はなしょうぶコール 03-6758-2222 は note） | 03-3602-1244 |

## contact_id を付けた steps
- s03, s08c, s07c, s08 → c_boshi／s03b, s05, s08b, s08d → c_hoken_center／s06d → c_kokuho／s07b（かつしか出産応援給付金）→ c_teate
- s05c（妊婦歯科健診）は付けていない（担当窓口を区ページで確かめていない）

## detail を補った steps（区の公式ページから）
- s03: 夜間・休日窓口での手帳交付は令和6年9月30日で終了、再交付は母子保健係・各保健センター
- s07c: 申し込みから訪問まで最短3週間程度、窓口相談の希望は母子保健係か保健センターへ

## 冊子と既存データの食い違い
- 冊子の本文が読めないので比較できていない。区ページと既存 detail の間に食い違いは見つからなかった。

## 取れなかったもの
- 育児支援ガイドブック本体の本文（画像PDF）。人が冊子を見て contacts の source_url を `2026.N.pdf#page=` に差し替えるとよい。
- 健康ホットラインかつしかの受付時間（区ページに記載なし）。
