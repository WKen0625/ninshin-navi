// pnpm retention:run … 保存期間（2年）を過ぎた行を消す（本番は月1回の cron が同じことをする）
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL が未設定です（.env.example を参照）。");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const r = await client.query("select * from retention_run()");
    for (const row of r.rows) console.log(`${row.table_name}: ${row.deleted}件 消しました`);
  } finally {
    await client.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
