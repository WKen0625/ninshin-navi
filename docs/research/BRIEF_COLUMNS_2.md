# コラム執筆の指示書（第2弾・15本、2026-10-02）

## 絶対に守ること
1. `docs/ARTICLES.md` のルールに従う。特に: 制度の数字（金額・期限・日数・週数）は、**自分で WebFetch して読んだ公式ページ**だけを出典にし、frontmatter の `sources` に label / url / verified_at: 2026-10-02 を入れる。読めなかった出典は使わない。出典が取れない数字は書かない（「施設・区によって違う。確認を」と書く）。
2. 医療の判断（症状の見方・受診の目安・薬・サプリ）は書かない。「産院に相談」で止める。
3. 施設のおすすめ・評価・ランキングを書かない。製品・アフィリエイトリンクを入れない（`pr: false`）。
4. Markdown は `#` `##` `###` `- ` `1. ` `> ` `**太字**` `[文字](https://…)` `[文字](/navi)` だけ。表（|）は使わない。
5. frontmatter の文字列にコロン（:）や「」が入るときは `"` で囲む。`published: 2026-10-02`。`stage` は指定の値。`tags` は2〜3語。
6. 長さは本文 1,500〜2,500 文字。見出しは3〜6個。最初の段落で「この記事で何がわかるか」を1〜2文で言う。最後に Navi への導線を1行（例: `[Tsugiraku Navi で、あなたの区の手続きと期限を見る](/navi)`）。
7. 文体: ですます。やさしい日本語。専門用語は初出で一言説明。読者は妊婦さんと家族（初めての妊娠が多い）。
8. 書くのは `content/articles/<slug>/ja.md` だけ（英語版は不要）。
9. 作業は短いコマンドで。WebFetch が 403/404 のときは WebSearch で代わりの公式ページを探す（厚労省・こども家庭庁・協会けんぽ・日本年金機構・国税庁・法務省・東京都・各区の .lg.jp / .go.jp を優先）。1本につき出典は2〜5件。
10. 書き終えたら `cd /Users/kenwada/Downloads/files && export PATH=$HOME/.npm-global/bin:$PATH && pnpm vitest run tests/articles.test.ts` を1回だけ実行し、通ることを確かめる。通らなければ直す。git commit はしない。

## 見出し情報の例
```
---
title: 産休はいつから？ 予定日から逆算する計算と、会社に出す紙
description: "出産予定日から産前休業の開始日を計算し、勤務先に出す書類と、出産手当金の手続きの流れを整理します。"
published: 2026-10-02
stage: mid
pr: false
sources:
  - label: 厚生労働省「働く女性の母性健康管理のために」（産前6週間・産後8週間）
    url: https://www.mhlw.go.jp/…
    verified_at: 2026-10-02
tags: [仕事, 産休]
---
```

## 既にある記事（重ねない）
how-tsugiraku-works, hospital-bag, first-two-weeks（妊娠判明から2週間）, postpartum-paperwork-split（産後2週間の分担）, postpartum-cash-calendar（産後の入金）, maternity-leave-dates（産休の計算）
