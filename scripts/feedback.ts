// pnpm feedback:list            … 「まちがいを知らせる」で届いたもの（未対応）と、「その他の紙」の自由記述（未対応）を表示する
// pnpm feedback:list --done 12  … 12番を対応済みにする（feedback）

import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL が未設定です（.env.example を参照）。");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const i = process.argv.indexOf("--done");
    if (i > 0) {
      const { rowCount } = await client.query("update feedback set status = 'done', resolved_at = now() where id = $1", [Number(process.argv[i + 1])]);
      console.log(rowCount ? "対応済みにしました。" : "その番号は見つかりません。");
      return;
    }
    const fb = await client.query("select id, created_at::date::text as day, region_code, target, message from feedback where status = 'new' order by id");
    console.log(`■ まちがいの知らせ（未対応 ${fb.rowCount}件）`);
    for (const r of fb.rows) console.log(`  #${r.id} ${r.day} [${r.region_code ?? "-"}] ${r.target}\n     ${String(r.message).replaceAll("\n", "\n     ")}`);
    const sg = await client.query("select id, created_at::date::text as day, region_code, free_text from document_suggestions where status = 'pending' order by id");
    console.log(`\n■ 一覧にない紙（未対応 ${sg.rowCount}件）`);
    for (const r of sg.rows) console.log(`  #${r.id} ${r.day} [${r.region_code ?? "-"}] ${r.free_text}`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
