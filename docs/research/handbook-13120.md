# 練馬区（13120）ハンドブック読み込みメモ　確認日: 2026-09-25

## 冊子
- 「ねりま子育て応援ハンドブック」令和8年度版（区のページの更新日 2026年4月1日。母子健康手帳と一緒に配られる）
- 案内ページ: https://www.city.nerima.tokyo.jp/hokenfukushi/hoken/sukoyaka/kosodatehandbook.html（章ごとのPDF。`kosodatehandbook.files/<章>.pdf`）
  - 使った章: もくじ mokuji.pdf、子育てはじめの一歩 hajimenoioop.pdf、赤ちゃんがやってきた akaytanngayattekita.pdf、赤ちゃんの健康を願って kennkouwonegatte.pdf、困ったときはこちらへ komattatoki.pdf、ダイヤルガイド daiyarugaido.pdf
- 本文: docs/research/handbook-13120.txt（6章・77ページ分、約189KB。pymupdf で抽出。`#page=N` は各章PDFのページ番号）
- 注意: 埋め込みフォントの都合で、見出しの多くと電話番号の数字（「TEL 5984-4621」が「5&- 5921」のように）が欠けて抽出される。**冊子のPDFから電話番号は写していない**。窓口名と構成だけ冊子から取り、電話番号・所在地・受付時間はすべて区の公式ページの文字を写した。
- 補った公式ページ: 妊娠届（母子健康手帳の交付）https://www.city.nerima.tokyo.jp/hokenfukushi/hoken/sukoyaka/boshitecho.html、こんにちは赤ちゃん訪問 https://www.city.nerima.tokyo.jp/hokenfukushi/hoken/sukoyaka/homon.html、妊娠・子育て相談 https://www.city.nerima.tokyo.jp/hokenfukushi/hoken/sukoyaka/20161102.html、出生届 https://www.city.nerima.tokyo.jp/kurashi/koseki/todokede/shussei25.html、時間外の戸籍届出 https://www.city.nerima.tokyo.jp/kurashi/yakandonichi/koseki/todokede.html、子ども医療費の助成 https://www.city.nerima.tokyo.jp/kosodatekyoiku/kodomo/teateiryo/josei.html、児童手当 https://www.city.nerima.tokyo.jp/kosodatekyoiku/kodomo/teateiryo/jidouteate20120401.html、出産育児一時金 https://www.city.nerima.tokyo.jp/kurashi/nenkinhoken/kokuminkenkohoken/hoken_kyufu/shussan_shikyu.html、夜間の国保申請 https://www.city.nerima.tokyo.jp/kurashi/yakandonichi/kenkohoken/shinsei.html、健康推進課 https://www.city.nerima.tokyo.jp/kusei/soshiki/kenko/kenkosuishin.html、国保年金課 https://www.city.nerima.tokyo.jp/kusei/soshiki/kuminkumin/kokuhonenkin.html、子育て支援課 https://www.city.nerima.tokyo.jp/kusei/soshiki/kodomokatei/kosodate.html

## 足した contacts（すべて needs_review: true）
| id | 窓口 | 電話 | 出典 |
|---|---|---|---|
| nerima.c_hoken_sodan | 保健相談所（豊玉の番号を代表に。北・光が丘・石神井・大泉・関は note） | 03-3992-1188 | 赤ちゃんがやってきた p.1、困ったときは p.4、ダイヤルガイド p.2 ＋ 妊娠届ページ |
| nerima.c_boshi | 健康推進課 母子保健係（東庁舎6階。出産・子育て応援担当係 03-5984-1336 は note） | 03-5984-4621 | 赤ちゃんがやってきた p.1・p.6 ＋ 健康推進課ページ |
| nerima.c_teate | 子育て支援課 児童手当係（本庁舎10階。福祉事務係3か所は note） | 03-5984-5824 | 赤ちゃんがやってきた p.6・p.8 ＋ 児童手当・医療証ページ |
| nerima.c_koseki | 戸籍住民課 戸籍第一係（本庁舎2階。夜間休日は西庁舎1階で預かり、母子手帳も預かり） | 03-5984-4530 | 赤ちゃんがやってきた p.6 ＋ 出生届ページ |
| nerima.c_kokuho | 国保年金課 こくほ給付係（本庁舎3階。こくほ資格係 03-5984-4554 は note） | 03-5984-4553 | 赤ちゃんがやってきた p.3 ＋ 出産育児一時金ページ |

## contact_id を付けた steps
- s03, s03b → c_hoken_sodan／s05, s08, s08c, s08b, s08d, s08e → c_boshi／s06d → c_kokuho／s07c（第3子誕生祝金）→ c_teate（児童手当係の業務案内に「第3子誕生祝金に関すること」がある）
- s05c（妊産婦歯科健診）は付けていない（区ページの担当係を確かめていない。健康推進課には歯科保健担当係 03-5984-4682 がある）

## detail を補った steps
- s03: 保健相談所の17時〜18時30分は前日までに電話予約、地域子ども家庭支援センターには相談員がいない
- s08: 赤ちゃん訪問連絡票のはがきの送付先は母子保健係、急ぐときや里帰り先での訪問は担当の保健相談所へ

## 冊子と既存データの食い違い（データは変えていない）
- 大きな食い違いは無し。冊子 p.6（赤ちゃんが生まれたら）の出生届の記述は区ページと同じ（14日以内・母子健康手帳を持参・夜間休日は預かり）。
- 冊子 p.6 は乳幼児医療証の申請を「出生届を提出後、交付申請」としているが、区ページでは原則 LoGoフォームの電子申請（用紙は送られてこない）。contacts の note に区ページの記述を入れた。

## 取れなかったもの
- 冊子の電話番号（数字欠け）。区ページで確認できたものだけ入れた。
- 冊子に休日・夜間の出生届窓口の場所（西庁舎1階）の記載は無く、区ページから補った。
- 国保年金課の平日の受付時間は区ページに明記が無かったので hours は空にし、夜間（17:15〜19:30、当日17時までに電話予約）だけ note に書いた。
