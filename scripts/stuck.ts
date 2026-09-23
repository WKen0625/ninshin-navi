// pnpm stuck:report … 「わからない」の集計（どの手続きの、どこでつまずくか）。運営が案内の書き方を直す材料にする。

import { Client } from "pg";

const LABEL: Record<string, string> = { where: "窓口・ページがわからない", documents: "紙・持ち物がわからない", deadline: "期限がわからない", eligibility: "対象かわからない", wording: "言葉がわからない", other: "その他" };

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL が未設定です（.env.example を参照）。");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const rows = await client.query(
      `select v.step_id, v.region_code, r.name as region_name, s.title, v.reason, v.reports::int as reports,
              sum(v.reports) over (partition by v.step_id, v.region_code)::int as total
       from v_stuck_stats v join steps s on s.id = v.step_id join regions r on r.code = v.region_code
       order by total desc, v.step_id, v.reports desc`,
    );
    console.log(`■ 「わからない」の集計（${rows.rowCount}行）`);
    let last = "";
    for (const r of rows.rows) {
      const key = `${r.step_id}@${r.region_code}`;
      if (key !== last) console.log(`\n  ${r.region_name} ${r.step_id}「${r.title}」 合計${r.total}件`);
      console.log(`     ${LABEL[r.reason] ?? r.reason}: ${r.reports}件`);
      last = key;
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
