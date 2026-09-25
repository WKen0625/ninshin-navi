# 中央区（13102）ハンドブック読み込みメモ　確認日: 2026-09-25

## 冊子
- 「子育てガイドブック」令和8年3月発行（編集・発行: 中央区福祉保健部子ども子育て支援課）。内容は令和8年4月1日現在
- 案内ページ: https://www.city.chuo.lg.jp/a0020/kosodate/kosodate/shien/sasshi/kosodateguidebook.html（全ページPDF /documents/4889/allpage_2.pdf 62MB のほか、章ごとの分割PDF /documents/4889/1_.pdf〜24_.pdf）
- 本文: docs/research/handbook-13102.txt（分割PDFのうち 2,3,7,9,10,11,12,15,22,23,24 の本文、約125KB。区切りは `===== file N_.pdf page M =====`。`source_url` の `#page=` は各分割PDF内のページ番号。冊子の印刷ページは 9_.pdf=P13〜20、10_.pdf=P21〜24、7_.pdf=P8〜11）
- 補った公式ページ: 出生届の提出方法 https://www.city.chuo.lg.jp/a0012/kurashi/touroku/koseki/syusseitodoke/index.html、区役所の開庁時間 https://www.city.chuo.lg.jp/a0006/kusei/gaiyou/kuyakusho/ku.html、日曜日の区役所開庁 https://www.city.chuo.lg.jp/a0006/kusei/gaiyou/soshiki/madoguchi/nichiyoubikaichiyou.html、窓口の時間延長（水曜19時まで） https://www.city.chuo.lg.jp/a0006/kusei/gaiyou/soshiki/madoguchi/madoguti.html、児童手当 https://www.city.chuo.lg.jp/a0020/kosodate/kosodate/teatejosei/202409jidouteate.html、子ども医療費助成 https://www.city.chuo.lg.jp/a0020/kosodate/kosodate/teatejosei/iryouhijosei/akimoto.html、出産育児一時金 https://www.city.chuo.lg.jp/a0024/kurashi/hokennenkin/kokuho/kokuhonitsuite/kyuufu/syussannikujiitijikin.html、中央区保健所 https://www.city.chuo.lg.jp/a0030/kenkouiryou/kenkou/hokenjo/hokennjyo.html

## 足した contacts（すべて needs_review: true）
| id | 窓口 | 電話 | 出典 |
|---|---|---|---|
| chuo.c_hoken | 中央区保健所 健康推進課 健康係（妊娠届・保健バッグ・受診票・妊婦面談・産後ケア・新生児訪問・里帰り助成。保健センター3か所と区民生活課住民記録係・特別出張所区民係の電話は note） | 03-3541-5930 | 9_.pdf p.1 |
| chuo.c_hoken_kyufu | 健康推進課 給付係（妊婦のための支援給付・江戸バス無料乗車券・妊娠高血圧症候群等医療費助成・流産死産の手続き） | 03-3541-5930 | 9_.pdf p.3 |
| chuo.c_teate | 子ども子育て支援課 子育て給付係（児童手当・子ども医療費助成・新生児誕生祝品・出産支援祝品） | 03-3546-5350（5351 は note） | 10_.pdf p.3 ＋ 時間延長ページ |
| chuo.c_koseki | 区民生活課 戸籍係（出生届。夜間休日は本庁舎1階宿直室で預かりのみ） | 03-3546-5317 | 10_.pdf p.1 ＋ 出生届の提出方法ページ |
| chuo.c_kokuho_kyufu | 保険年金課 給付係（出産育児一時金） | 03-3546-5360 | 10_.pdf p.1 ＋ 公式ページ |
| chuo.c_kokuho_shikaku | 保険年金課 資格係（産前産後の国保保険料軽減・国保加入） | 03-3546-5362 | 9_.pdf p.4 ＋ 日曜開庁ページ |
| chuo.c_kirara | 子ども家庭支援センター「きらら中央」総合相談（育児支援ヘルパー・子どもほっとライン・都の夜間休日相談は note） | 03-3542-6322 | 7_.pdf p.1 |

## contact_id を付けた steps
- s03, s03b, s05b, s05c, s08c, s07c, s07e, s08b, s08d → c_hoken／s05, s08 → c_hoken_kyufu／s03c, s07d → c_teate／s06d → c_kokuho_shikaku

## detail を補った steps
- s03: 母子保健コーディネーター・保健師に相談できること
- s06d: 最高限度額・期間制限のときは免除できないことがある
- s07d: 同居の保護者・親族以外は委任状

## 冊子と既存データの食い違い（データは変えていない）
- s06d の detail の電話 03-3546-5363（区ページ由来）と、冊子 9_.pdf p.4 の保険年金課資格係 03-3546-5362 で末尾が違う。contacts には冊子の 5362 を入れ、note に書いた。要確認。
- 冊子（P13）は妊娠届の窓口として「区民生活課住民記録係」と「特別出張所区民係」を挙げる。既存 s03 の「区役所、特別出張所」と矛盾はしない。
- 児童手当の窓口は冊子・区ページとも「特別出張所地域活動係」、出生届は「特別出張所区民係」と係名が違う（両方そのまま書いた）。

## 取れなかったもの
- 中央区保健所・保健センターの窓口の受付時間は冊子にも保健所ページにも無い（冊子 P19 に「相談時間: 平日 午前9時〜午後5時」があるので、その旨を hours に書いた）。
- 冊子の電話は「☎（3541）5930」の形（市外局番なし・全角括弧）。データでは 03-3541-5930 の形に直した。
- 冊子に夜間・休日の出生届の受付場所・時間は無い → 区の「出生届の提出方法」ページで補った。
- 出産育児一時金の申請の持ち物は冊子に無い → 区ページの内容は contacts の note に要点だけ（既存 steps に国保の一時金の行は無いので detail は足していない）。
