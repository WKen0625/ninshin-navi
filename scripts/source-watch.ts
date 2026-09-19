// pnpm watch:run         … 出典ページを取りに行き、前回から変わったものを「確認待ち」にする（初回は基準を覚えるだけ）
// pnpm watch:run --dry   … 取りに行くが、何も書き込まない（要約のAPIも呼ばない）
// pnpm watch:report      … いま確認待ちのもの・取得できていないものを表示する
//
// 承認のしかた: ページを開いて確かめる → data/ のYAMLを直す（変更が無ければ verified_at だけ新しくする）→ pnpm seed。
// そのURLを出典にしているすべての行の verified_at が変更日以降になると、確認待ちが外れる。

import { runSourceWatch, sourceWatchReport } from "../lib/source-watch/server";

async function main() {
  if (process.argv.includes("--report")) {
    const report = await sourceWatchReport();
    console.log(`監視中: ${report.watched}件 ／ 確認待ち: ${report.needs_review.length}件 ／ 取得できていない: ${report.trouble.length}件`);
    for (const r of report.needs_review) {
      console.log(`\n■ 確認待ち  ${r.url}\n  変更に気づいた日時: ${r.changed_at}`);
      for (const ref of r.refs) console.log(`  ・${ref.table_name}:${ref.row_id}「${ref.label}」（確認日 ${ref.verified_at}）`);
      console.log((r.diff_summary ?? "").split("\n").map((l) => `  ${l}`).join("\n"));
    }
    for (const t of report.trouble) console.log(`\n▲ 取得できていない  ${t.url}\n  ${t.last_error}${t.consecutive_failures > 0 ? `（連続${t.consecutive_failures}回）` : ""}`);
    return;
  }

  const { items, ...counts } = await runSourceWatch({ dryRun: process.argv.includes("--dry") });
  console.log(counts);
  for (const i of items) {
    console.log(`\n[${i.outcome}] ${i.url}`);
    for (const ref of i.refs) console.log(`  ・${ref.table_name}:${ref.row_id}「${ref.label}」`);
    if (i.detail) console.log(i.detail.split("\n").map((l) => `  ${l}`).join("\n"));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
