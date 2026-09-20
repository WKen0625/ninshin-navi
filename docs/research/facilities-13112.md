# 世田谷区（13112）分娩施設の予約ルール調査  2026-09-20

対象は `booking_policy: null` だった6施設だけ（すでに入っていた6施設は触っていない）。公式サイトを `curl` で取得し、本文を読んで確認した。埋めた施設は `needs_review: true`。

## aoki-sanfujinka 青木産婦人科医院 — 見つからず（null のまま）
- 見たページ: https://aoki-sanfujinka.jp , https://aoki-sanfujinka.jp/faq/ , https://aoki-sanfujinka.jp/hospitalization/ , https://aoki-sanfujinka.jp/medicalcare/ , https://aoki-sanfujinka.jp/news/yoyaku/
- 診察の予約方法（「ウェブでのご予約をお願いしております。」電話は「月・火・水・金の14:30～15:00」）は書いてあるが、分娩予約の時期・予約金・里帰りの期限の記載なし。

## tamagawa-hospital 玉川病院 — 埋めた（締切週 なし）
- 出典: https://www.tamagawa-hosp-oag.jp/pregnancy/office-visit/ （分娩予約）, https://www.tamagawa-hosp-oag.jp/faq/ （初診・里帰り）
- 引用（office-visit）: 「分娩予約 胎のう（赤ちゃんが入っている袋）が確認できたら、分娩予約の受付をいたします。」「分娩予約に関するお問い合わせは、産婦人科外来までお願い致します。平日：10：00～16：00 電話：03-3700-1151（代）」
- 引用（faq）: 「初診時のご予約はございません。午前中、午後の受付時間内にお越しください。」「Ｑ：里帰り出産はできますか？ Ａ：はい、お引き受けしております。詳細は産婦人科外来までお問い合わせください。」
- 締切の週数・予約金の記載は見つからず（費用ページ https://www.tamagawa-hosp-oag.jp/guide-for-birth/about-cost/ にも予約金の記載なし）。

## mukaiyachi-josanjo 出張専門 向谷地幸子 — 見つからず（null のまま）
- 見たページ: https://sachi-josanjo-2.jimdosite.com/ （curl では Cloudflare に「Sorry, you have been blocked」と返され、本文を取れなかった）
- 本文を読めていないので何も変えていない。ブラウザで人が見れば読める可能性がある。

## jsdf-chuo-hospital 自衛隊中央病院 — 見つからず（null のまま）
- 見たページ: https://www.mod.go.jp/gsdf/chosp/210-osan.html , https://www.mod.go.jp/gsdf/chosp/ （どちらも curl では「Just a moment... Enable JavaScript and cookies to continue」というボット確認の画面だけが返り、本文を取れなかった）
- 本文を読めていないので何も変えていない。ブラウザで人が見れば読める可能性がある。

## seijo-maternity 成城マタニティクリニック — 埋めた（締切週 なし）
- 出典: https://www.seijo-mc.com/guide2 （受けられない場合・帝王切開既往）, https://www.seijo-mc.com/faq （里帰り）, https://www.seijo-mc.com/gairaiyoyaku （初診の予約方法）
- 引用（faq）: 「Q 当院への里帰り分娩は可能ですか？ A もちろん可能ですが、早めに分娩予約だけはお取り下さい。」
- 引用（gairaiyoyaku）: 「※初診の妊婦さんは、お電話 (03-5727-5335) でご予約をお願いいたします。電話予約は日中の外来診療時間内のみの対応となります。」
- 引用（guide2）: 「当院でのお産をお受けできない場合 以下に該当する方は高次医療施設でのお産を勧めております。…多胎妊娠。妊娠前のBMI…が30以上の方。体重80kg以上の方。…初産婦さんで分娩予定日での年齢が40歳以上の方。初産婦さんで低身長の方(おおむね150cm未満)。」「※前回帝王切開で分娩してしている方は今回も帝王切開となります。分娩予約は個別にご相談下さい。」
- 締切の週数・予約金の記載は見つからず。受けられない条件は一部だけを文章に入れた（全部は guide2 を参照）。

## todoroki-sanfujinka 等々力産婦人科 — 埋めた（締切週 なし）
- 出典: https://todoroki-7.jp/info/index.php?topics_id=TPC_5f9c28c1ad819_20400 （重要 分娩のご予約について）, https://todoroki-7.jp/info/index.php?topics_id=TPC_6400660e45d95_58068 （当院で分娩をご希望の方へ）
- 引用（分娩のご予約について）: 「多くの方より分娩のお申し込みをいただき、妊娠6週前後で分娩枠が埋まってしまう状況となっております。当院で分娩をご希望の方におかれましては、妊娠が判明した時点でお早めに受診していただきますようお願い申し上げます。」「分娩の正式なお申し込み（分娩費用の一部 12万円を予約金としてお預かりさせていただきます）につきましては、2回目の受診（2週間以内）の際にお願い申上げます。」「医学的な理由での転院や、初期流産となってしまった際には予約金の返金をさせていただきますが、ご自身の都合による転院につきましてはご返金いたしかねます」
- 引用（分娩をご希望の方へ）: 「当院での分娩をご希望の初診の患者様におかれましては、月曜日 午後、火・金曜日 午前の院長外来で予約をお取りいただきますようお願い申し上げます。ご希望の日時で予約枠が埋まっている場合は、お電話にてご予約を承ります。予約受付 03-3701-3033」
- 「妊娠6週前後で埋まる」は締切ではないので、週は null のまま。
- 注意: どのお知らせにも日付が出ていない（topics_id から見ると「分娩のご予約について」は2020年ごろの投稿らしい）。今も同じ状況か、12万円が今の金額かは要確認。里帰りの案内（https://todoroki-7.jp/info/index.php?topics_id=TPC_5eb5ee3dddafc_81641）は「妊婦健診のみ当院希望」の人向けで、コロナ時の内容なので採らなかった。
