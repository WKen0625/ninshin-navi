// pnpm db:apply … DATABASE_URL のDBへスキーマを適用する。何度流してもよい。
//   1. public.regions が無ければ、supabase/schema.sql → supabase/policies.sql（初回のみ）
//   2. supabase/migrations/*.sql のうち、まだ適用していないものを名前順に（schema_migrations 表に記録）
// それぞれ1トランザクションなので、途中で失敗したら何も残らない。

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const dir = join(process.cwd(), "supabase");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL が未設定です（.env.example を参照）。");
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  const inTransaction = async (work: () => Promise<void>) => {
    await client.query("begin");
    try {
      await work();
      await client.query("commit");
    } catch (e) {
      await client.query("rollback").catch(() => {});
      throw e;
    }
  };

  try {
    const { rows } = await client.query("select to_regclass('public.regions') as t");
    if (rows[0].t) {
      console.log("初回のスキーマは適用済みです。");
    } else {
      await inTransaction(async () => {
        for (const file of ["schema.sql", "policies.sql"]) {
          await client.query(readFileSync(join(dir, file), "utf8"));
          console.log(`適用: supabase/${file}`);
        }
      });
    }

    await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
    await client.query("alter table schema_migrations enable row level security");
    const done = new Set((await client.query("select name from schema_migrations")).rows.map((r) => r.name as string));
    const files = readdirSync(join(dir, "migrations")).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      if (done.has(file)) continue;
      await inTransaction(async () => {
        await client.query(readFileSync(join(dir, "migrations", file), "utf8"));
        await client.query("insert into schema_migrations (name) values ($1)", [file]);
      });
      console.log(`適用: supabase/migrations/${file}`);
    }
    if (files.every((f) => done.has(f))) console.log("未適用の migration はありません。");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
