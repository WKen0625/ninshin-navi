// pnpm seed         … data/ のYAMLを検証し、DATABASE_URL のDBへ上書き投入する
// pnpm seed:check   … 検証だけ（DBに触らない）
//
// 設計原則3: source_url と verified_at が無い行が1件でもあれば、何も投入せずに終了コード1で止まる。

import { join } from "node:path";
import { Client } from "pg";
import { loadSeedData, seed, SeedRejectedError } from "../lib/seed";

const dataDir = join(process.cwd(), "data");

async function main() {
  if (process.argv.includes("--check")) {
    const { data, errors, warnings } = loadSeedData(dataDir);
    for (const w of warnings) console.warn(`注意  ${w.file}  ${w.row}  ${w.message}`);
    if (errors.length > 0) throw new SeedRejectedError(errors);
    const review = [...data.steps, ...data.subsidies, ...data.facilities].filter((r) => r.needs_review);
    console.log(
      `検証OK: regions ${data.regions.length} / documents ${data.documents.length} / steps ${data.steps.length}` +
        ` / subsidies ${data.subsidies.length} / facilities ${data.facilities.length}（needs_review: ${review.length}件）`,
    );
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL が未設定です（.env.example を参照）。");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const { upserted, orphans, warnings, kept_in_review, watch_cleared } = await seed(client, dataDir);
    for (const w of warnings) console.warn(`注意  ${w.file}  ${w.row}  ${w.message}`);
    console.log("投入しました:", upserted);
    if (watch_cleared.length > 0) console.log(`変更監視: 確認日が新しくなったので、確認待ちを外しました: ${watch_cleared.join(", ")}`);
    if (kept_in_review.length > 0) {
      console.warn(`注意  変更監視: 出典ページの変更がまだ確認されていないため、「内容を確認中」のままにした行: ${kept_in_review.join(", ")}`);
      console.warn("      pnpm watch:report で内容を見て、YAMLを直し（変更が無ければ verified_at だけ新しくして）もう一度 pnpm seed を流してください。");
    }
    for (const [table, ids] of Object.entries(orphans)) {
      console.warn(`注意  ${table} にYAMLに無い行が残っています（自動では消しません）: ${ids.join(", ")}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  if (e instanceof SeedRejectedError) {
    for (const i of e.issues) console.error(`拒否  ${i.file}  ${i.row}  ${i.message}`);
    console.error(`\n${e.message}`);
  } else {
    console.error(e);
  }
  process.exit(1);
});
