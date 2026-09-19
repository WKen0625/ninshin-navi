// pnpm db:check-rls … 公開の鍵（anon）で、RLS が方針どおりに効いているかを確かめる。
//   制度データ: 読める・書けない ／ 記録と利用者データ: 読めない・書けない ／ 集計ビュー: 読める
// 何も書き換えない（書き込みは拒否されることを確かめるだけ）。

import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false },
});

let failed = 0;
const check = (name: string, ok: boolean, detail: string) => {
  if (!ok) failed++;
  console.log(`${ok ? "OK  " : "NG  "} ${name} … ${detail}`);
};

async function main() {
  for (const table of ["regions", "documents", "steps", "subsidies", "facilities", "facility_costs_public"]) {
    const { data, error } = await db.from(table).select("*").limit(1);
    check(`${table} を読める`, !error && (data?.length ?? 0) > 0, error?.message ?? `${data?.length}行`);
  }

  const ins = await db.from("steps").insert({
    id: "rls.check", region_code: "JP", phase: "pregnancy", sort_order: 0, title: "x", source_url: "https://example.com", verified_at: "2026-01-01",
  });
  check("steps に書けない", ins.error != null, ins.error?.message ?? "書けてしまった");
  const upd = await db.from("steps").update({ title: "x" }).eq("id", "jp.s01").select();
  check("steps を書き換えられない", upd.error != null || (upd.data?.length ?? 0) === 0, upd.error?.message ?? `${upd.data?.length}行を更新`);
  const del = await db.from("facilities").delete().eq("id", "ncchd").select();
  check("facilities を消せない", del.error != null || (del.data?.length ?? 0) === 0, del.error?.message ?? `${del.data?.length}行を削除`);

  for (const table of ["profiles", "held_documents", "step_progress", "booking_reports", "cost_reports", "product_reports", "document_suggestions", "source_watch", "notification_subscriptions"]) {
    const { data, error } = await db.from(table).select("*").limit(1);
    check(`${table} を読めない`, error != null || (data?.length ?? 0) === 0, error?.message ?? `${data?.length}行`);
  }

  const rep = await db.from("booking_reports").insert({ facility_id: "ncchd", due_month: "2027-05-01", contacted_week: 8, result: "booked", reporter_hash: "rls-check" });
  check("booking_reports にログインなしで書けない", rep.error != null, rep.error?.message ?? "書けてしまった");
  const sug = await db.from("document_suggestions").insert({ region_code: "13112", free_text: "rls-check" });
  check("document_suggestions に公開の鍵で直接は書けない（サーバー経由のみ）", sug.error != null, sug.error?.message ?? "書けてしまった");

  for (const view of ["v_booking_stats", "v_cost_stats", "v_source_urls"]) {
    const { error } = await db.from(view).select("*").limit(1);
    check(`${view} を読める`, !error, error?.message ?? "OK");
  }

  console.log(failed === 0 ? "\nすべて方針どおりです。" : `\n${failed}件が方針と違います。`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
