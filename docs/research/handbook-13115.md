# 杉並区（13115）ハンドブック読み込みメモ　確認日: 2026-09-25

## 冊子
- 「令和8年度版 子育て便利帳」（杉並区。令和8年4月1日現在の内容。妊娠届のときに配布）
- 案内ページ: https://www.city.suginami.tokyo.jp/s053/1024.html（2026年4月1日更新）。全体版 PDF は https://www.city.suginami.tokyo.jp/documents/1024/r8kosodatebenricho_all.pdf（11.7MB）。今回は分割PDFのうち、表紙〜3ページ（r8kosodatebenricho_h1_3.pdf）、妊娠中のページ 4〜21（r8kosodatebenricho_4_21.pdf）、赤ちゃんのページ 22〜31（r8kosodatebenricho_22_31.pdf）、区内関係施設テレホンガイド 128〜133（r8kosodatebenricho_128_133.pdf）を読んだ
- 本文: docs/research/handbook-13115.txt（4ファイル・39ページ、約67KB。pymupdf で抽出。`#page=N` は各分割PDFのページ番号。例: r8kosodatebenricho_4_21.pdf#page=1 = 印刷 p.4、r8kosodatebenricho_22_31.pdf#page=1 = 印刷 p.22）
- 補った公式ページ: 出生届 https://www.city.suginami.tokyo.jp/s018/1002.html、戸籍の届出の注意点 https://www.city.suginami.tokyo.jp/s018/10739.html

## 足した contacts（すべて needs_review: true）
| id | 窓口 | 電話 | 出典 |
|---|---|---|---|
| suginami.c_hoken_center | 保健センター5か所（妊娠届・ゆりかご面接・赤ちゃん訪問・産婦健診・妊娠高血圧等助成） | 03-3391-0015（荻窪。他4か所は note） | 4_21.pdf p.1, 17；22_31.pdf p.2-3；128_133.pdf p.1 |
| suginami.c_boshi | 地域子育て支援課 母子保健係（歯科健診・里帰り助成・産後ケア申請） | 03-3312-2111（代表。内線は note） | 4_21.pdf p.4, 12；22_31.pdf p.7-8 |
| suginami.c_shien | 地域子育て支援課 子育て支援係（妊婦支援給付金・子育て応援券） | 03-5307-0786 | 4_21.pdf p.18；22_31.pdf p.4 |
| suginami.c_teate | 子ども家庭部管理課 子ども医療・手当係（医療証。児童手当専用ダイヤル 03-5913-9389 は note） | 03-5307-0785 | 22_31.pdf p.1-2 |
| suginami.c_koseki | 区民課 戸籍係（区役所1階3番）。休日・夜間は区役所地下1階で預かりのみ | 03-5307-0624 | 22_31.pdf p.1 ＋ 公式ページ s018/1002 |
| suginami.c_kokuho | 国保年金課 国保資格係・国保給付係（電話は冊子に無い） | （url・住所のみ） | 22_31.pdf p.1 |

## contact_id を付けた steps
- s03, s03b, s08b, s08c, s08d → c_hoken_center／s05c, s08e → c_boshi／s05, s08 → c_shien／s06d → c_kokuho

## detail を補った steps
- s03: 保健センター5か所の電話、妊娠届のときにRSウイルス予防接種の予診票も交付（4_21.pdf p.1, 3）
- s05c: 案内は保健バッグの「妊婦歯科健康診査のご案内」、母子健康手帳に記録（4_21.pdf p.12）
- s08: すこやか赤ちゃん連絡票の出し方（電子申請・はがき）、訪問前に日程調整の電話（22_31.pdf p.2-3）

## 冊子と既存データの食い違い（データは変えていない）
- 大きな食い違いは見つからなかった。冊子の産婦健康診査・1か月児健康診査の受診票は「R8.10.1〜」と書かれており、既存データと一致。
- 児童手当の請求期限「出生日の翌日から数えて15日以内」（22_31.pdf p.2）は既存の steps に児童手当の行が無いため、c_teate の note にだけ入れた。

## 取れなかったもの
- 冊子に夜間・休日の出生届受付の記載は無い（p.22 は窓口名と電話のみ）→ 公式ページで補った。
- 国保年金課の電話番号は冊子に無い（c_kokuho は url・住所のみ）。
- 相談ページ（p.66〜79）と乳幼児のページ（32〜107）は今回読んでいない（区の妊娠・子育て相談電話があれば、そこに載っている可能性がある）。
- 冊子の電話番号は市外局番なし・全角ハイフン（データでは 03- を付けて半角にした）。
