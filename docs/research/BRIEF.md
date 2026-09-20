# 区の制度データを足す作業の指示書（調査エージェント向け）

作業フォルダ: `/Users/kenwada/Downloads/files`。担当の区それぞれについて、区の公式サイトを調べ、`data/municipalities/<5桁コード>.yaml` を**書き換える**（いまは region だけの骨格が入っている）。

## 最初に読むもの

1. `CLAUDE.md` の §3（設計原則）、§9（地域を追加する手順と書き方の決まり）
2. `data/municipalities/13103.yaml`（港区。**これを型としてまねる**）と `data/municipalities/13112.yaml`（世田谷区。より網羅的）
3. `data/national.yaml` と `data/prefectures/13.yaml`（国と東京都のステップ。区が上書きする相手）

## 絶対に守ること

- **推測で埋めない。** 区の公式サイト（`city.<区>.lg.jp` / `city.<区>.tokyo.jp` など区の公式ドメイン）で実際に読めた内容だけを書く。まとめサイト・民間サイト・記憶は使わない。書かれていない項目は、キーごと省くか、「区のページに記載なし」と書く。金額・期限・回数・電話番号を作らない。
- WebFetch は要約モデルを通るので、**必ず「原文のまま引用して」「書かれていなければ記載なしと答えて」と頼む。** あいまいなら同じページをもう一度、質問を変えて読む。
- すべての行に `source_url`（その内容が書いてある**そのページ**のURL）、`verified_at: 2026-09-20`、`needs_review: true` を付ける（人の承認待ちのため）。documents には needs_review を付けない（列が無い）。
- ほかのファイルは触らない（`data/facilities/` も触らない）。`pnpm seed` は実行しない（本番DBに入る）。git の操作もしない。
- 言葉は「大学生でもわかる」やさしい日本語。専門用語は初出で説明。医療的な判断・おすすめを書かない。

## 調べる項目（区ごと）

1. 妊娠届と母子健康手帳: 窓口の名前、持ち物、オンライン届出の可否、受け取れるもの（袋の名前と中身の受診票）
2. 妊婦健康診査受診票: 回数（健診・超音波・子宮頸がん）、都外や助産所で受けたときの払い戻しと期限
3. 妊婦面接（ゆりかご面接など。区ごとに名前が違う）: 対象、場所、予約、面接でもらえるもの（商品券・ギフトなど）、いつまでに
4. 妊婦のための支援給付（妊婦支援給付金）1回目・2回目: 金額、対象、申請のしかた、申請期限、問い合わせ先
5. 区独自の出産費用の助成・出産祝い金など: 金額（計算式）、条件、申請方法、申請期限、課税かどうか。**無い区は無いでよい**
6. 妊婦（妊産婦）歯科健診
7. 産婦健康診査、新生児聴覚検査、1か月児健康診査: 回数、助成額、時期、受診票の入手方法
8. 赤ちゃん訪問（新生児訪問・こんにちは赤ちゃん訪問）: 2回目の支援給付の案内がここで出るか
9. 国民健康保険料の産前産後期間の免除（区の国保のページ）
10. 妊娠高血圧症候群等の医療費助成

全部が見つからなくてよい。見つかったものだけを、正確に入れる。

## YAML の決まり（キーは厳密。ここに無いキーを書くと検証で拒否される）

```yaml
region: { code, level: municipality, name, parent_code: "13", status: in_progress, verified_at: 2026-09-20 }

documents:   # 手元にある紙
  - id, name, aliases: [..], includes: [..], phase, description, source_url, verified_at
steps:       # 次にやること
  - id, overrides_step_id, phase, sort_order, title, detail, trigger_document_id, produces_document_id,
    channel, action_url, deadline_base, deadline_offset_days, deadline_week, deadline_note,
    survey_question_id, source_url, verified_at, needs_review
subsidies:   # お金
  - id, name, kind, requires, amount_yen, amount_is_upper_limit, amount_formula, amount_note, conditions,
    apply_via, deadline_base, deadline_offset_days, taxable, scheme_applicable, source_url, verified_at, needs_review
```

- `phase`: `pre_notification` / `notification` / `pregnancy` / `birth` / `postpartum`
- `deadline_base`: `confirmation_date`（心拍確認日）/ `notification_date` / `due_date`（予定日）/ `birth_date`（出生日）/ `gestational_week`（＋`deadline_week`）/ `facility`。日付にできない期限は `deadline_note` に文章で書く
- `kind`: `at_counter`（窓口で差し引き）/ `cash_later`（あとから現金で受け取る。金額が必須）/ `recurring`（くり返し）/ `conditional`（条件つき・金額が人による・未定）
- 商品券・ギフト・ポイントなど**現金でないものは subsidies に入れず**、ステップの detail に書く
- `amount_formula` で使えるのは 数字・`+ - *`・かっこ・`min()`・`max()` と、変数 `children`（人数）・`cost`（出産費用）・`lumpsum`（出産育児一時金の合計）。例: `"50000 * children"`
- id は指示された接頭辞で始める（例: `shinjuku.s03`、`shinjuku.hoken_bag`）。id はファイルをまたいで重複不可
- 上書き: 区の妊娠届は `overrides_step_id: jp.s03`、支援給付1回目は `jp.s05`、2回目は `jp.s08`
- 母子手帳と一緒にもらう袋（保健バッグなど）は documents に入れ、`includes` に **`jp.boshi_techo` と `jp.kenshin_ticket` を必ず**入れ、区の受診票の id も入れる（国のステップがそれを条件にしているため）
- `trigger_document_id` / `produces_document_id` / `includes` に書く id は、documents に存在すること（国の id: `jp.none_yet` `jp.heartbeat_confirmed` `jp.boshi_techo` `jp.kenshin_ticket` `jp.hospital_receipt` `jp.other`）
- 区の出産費用助成の申請ステップには `survey_question_id: cost_paid` を付けてよい。ほかのステップには付けない
- `sort_order` は港区の値にならう（妊娠届30、面接35、支援給付1回目50、歯科57、出産費用助成72、支援給付2回目80、産婦健診82 など）
- 文字列に `: ` や `#` が入るときは、値全体を `"…"` で囲む。計算式も `"…"` で囲む

## 検証

```bash
export PATH="$HOME/.npm-global/bin:$PATH"; cd /Users/kenwada/Downloads/files; pnpm seed:check
```

「拒否」の行に**自分の担当ファイル**が出たら直す（ほかの区のファイルは、別の担当が作業中なので無視する）。

## 報告（区ごとに `docs/research/<5桁コード>.md`）

行の id ごとに、出典URLと、根拠にした**原文の引用**を表にする。見つからなかった項目と、あいまいで入れなかった項目も書く。最後の返事には、区ごとに「入れた行の数」「見つからなかった項目」「人に確認してほしい点」を短く書く。
