# 分娩施設の「予約ルール」を調べる作業の指示書（調査エージェント向け）

作業フォルダ: `/Users/kenwada/Downloads/files`。担当の区の `data/facilities/<5桁コード>.yaml` にある施設のうち、`booking_policy: null` のものについて、**施設の公式サイト**で分娩予約のルールを調べて埋める。

## 最初に読むもの

- `CLAUDE.md` §3（設計原則）
- `data/facilities/13112.yaml` の `ncchd`・`seijo-kinoshita`・`shiseikai-daini`・`kugayama-hospital`（埋め方の手本）

## 埋める項目（施設ごと。ほかのキーは変えない）

```yaml
    booking_policy: 受診して予約するか、電話で予約する。妊娠13週0日までに分娩予約金50,000円を支払う（窓口で現金・クレジット、または銀行振込）。
    booking_deadline_week_official: 13          # 施設が「妊娠◯週までに」とはっきり書いている場合だけ。書いていなければ null のまま
    booking_source_url: https://…               # そのルールが書いてある、施設の公式サイトのページ
    needs_review: true                          # 変えた施設には必ず付ける（人の承認待ち）。verified_at は 2026-09-20 に
```

- `booking_policy` に書くこと: いつまでに（週数）、どうやって（初診・電話・Web）、分娩予約金、受け入れの制限（件数制限・満枠で断る場合がある等）、里帰り出産の期限。**書いてあることだけ**を、やさしい日本語で1〜3文に。
- `booking_deadline_week_official` は、施設が自分の言葉で「妊娠◯週までに分娩予約（または初診）」と**はっきり書いている**場合だけ数字を入れる。「早めに」「◯週ごろ埋まることがある」「里帰りは34週までに」は締切ではないので null のまま、`booking_policy` の文章に書く。幅があるとき（例: 12〜16週）は入れない。
- `website_url` が null の施設は、公式サイトが見つかれば入れてよい（都や区の公的な一覧など、確かな出所から）。

## 絶対に守ること

- **推測で埋めない。** 施設の公式サイト（`website_url` のドメイン、またはその法人の公式ドメイン）で読めた内容だけ。口コミサイト・まとめサイト・検索結果の抜粋・記憶は使わない。見つからなければ null のまま、何も変えない（needs_review も付けない）。
- ページの取得は、できれば `curl -sL <URL>` でHTMLを取り、本文を自分で読む（WebFetch は要約モデルが言い換えるため）。WebFetch を使うときは「原文のまま引用して。無ければ記載なしと答えて」と頼む。
- 1施設あたり、トップページ → 「産科」「分娩」「お産」「分娩予約」「初診の方へ」「費用」あたりのページを数枚見て、見つからなければ次へ進む。深追いしない。
- 触ってよいのは、担当の `data/facilities/<コード>.yaml` と、報告の `docs/research/facilities-<コード>.md` だけ。`pnpm seed`・git は実行しない。
- 医療的な評価・おすすめは書かない。

## 検証

```bash
export PATH="$HOME/.npm-global/bin:$PATH"; cd /Users/kenwada/Downloads/files; pnpm seed:check
```

`booking_policy` を書いたのに `booking_source_url` が無いと拒否される。自分の担当ファイルのエラーだけ直す。

## 報告（区ごとに `docs/research/facilities-<5桁コード>.md`）

施設の id ごとに、出典URLと、根拠にした**原文の引用**。見つからなかった施設は「見つからず（見たページのURL）」と書く。最後の返事には、区ごとに「埋めた施設数／全体」「締切週を入れた施設と週数」「確認してほしい点」を短く。

## 進め方（重要。前回、調べ終えてからまとめて書こうとした担当が、途中で止まって成果を失った）

- **1施設調べるごとに、すぐ** `data/facilities/<コード>.yaml` と `docs/research/facilities-<コード>.md` に書き込む。まとめて最後に書かない。
- ページの取得は必ず `curl -sL --max-time 20 -A "Mozilla/5.0" <URL>`。応答が無い・文字化けする・本文が取れないサイトは、その施設を「見つからず」として次へ進む。1施設に使うのは最大で5ページまで。
- 既に `booking_policy` が入っている施設は触らない。
