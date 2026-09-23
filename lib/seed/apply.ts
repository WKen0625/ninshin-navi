// 検証済みの SeedData を Postgres に上書き投入する（1トランザクション）。
// YAMLが正。同じidの行は上書きする。YAMLから消えた行は step_progress 等から参照されうるので
// 自動では消さず、orphans として報告する。

import type { SeedData } from "./load";

export type Db = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

type TableSpec = { table: keyof SeedData; key: string[]; columns: string[] };

// 外部キーの向きに合わせた投入順
const TABLES: TableSpec[] = [
  { table: "regions", key: ["code"], columns: ["code", "level", "name", "parent_code", "status", "verified_at"] },
  {
    table: "documents",
    key: ["id"],
    columns: ["id", "region_code", "name", "aliases", "includes", "phase", "description", "source_url", "verified_at"],
  },
  {
    table: "steps",
    key: ["id"],
    columns: [
      "id", "region_code", "phase", "sort_order", "title", "detail", "trigger_document_id", "produces_document_id",
      "channel", "action_url", "deadline_base", "deadline_offset_days", "deadline_week", "deadline_note",
      "apply_from_base", "apply_from_offset_days", "apply_from_week", "apply_from_note",
      "overrides_step_id", "survey_question_id", "source_url", "verified_at", "needs_review",
    ],
  },
  {
    table: "subsidies",
    key: ["id"],
    columns: [
      "id", "region_code", "name", "kind", "requires", "amount_yen", "amount_is_upper_limit", "amount_formula", "amount_note", "conditions", "apply_via",
      "deadline_base", "deadline_offset_days", "apply_from_base", "apply_from_offset_days", "apply_from_week", "apply_from_note",
      "taxable", "scheme_applicable", "source_url", "verified_at", "needs_review",
    ],
  },
  {
    table: "facilities",
    key: ["id"],
    columns: [
      "id", "region_code", "name", "address", "lat", "lng", "facility_type", "has_epidural", "epidural_24h",
      "tokyo_epidural_subsidy_target", "booking_policy", "booking_deadline_week_official", "booking_source_url", "scheme",
      "birth_navi_url", "website_url", "source_url", "verified_at", "needs_review",
    ],
  },
  {
    table: "facility_costs_public",
    key: ["facility_id", "as_of"],
    columns: [
      "facility_id", "as_of", "period", "total_avg_yen", "total_median_yen", "basic_avg_yen", "basic_median_yen",
      "room_diff_avg_yen", "room_diff_median_yen", "stay_days_avg", "stay_days_median", "source_url", "verified_at",
    ],
  },
];

export type ApplyResult = {
  upserted: Record<string, number>;
  orphans: Record<string, string[]>;
  /** 変更監視で出典ページの変更が見つかっていて、YAMLの確認日がまだ古いため「内容を確認中」のままにした行 */
  kept_in_review: string[];
  /** 出典にしているすべての行の確認日が新しくなったので、確認待ちを外したURL（＝人が承認した） */
  watch_cleared: string[];
};

// 変更に気づいた日（日本時間）
const CHANGED_ON = "(w.changed_at at time zone 'Asia/Tokyo')::date";

export async function applySeed(db: Db, data: SeedData): Promise<ApplyResult> {
  const upserted: Record<string, number> = {};
  const orphans: Record<string, string[]> = {};
  const kept_in_review: string[] = [];
  const watch_cleared: string[] = [];

  await db.query("begin");
  try {
    for (const { table, key, columns } of TABLES) {
      const rows = data[table] as Record<string, unknown>[];
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
      const updates = columns.filter((c) => !key.includes(c)).map((c) => `${c} = excluded.${c}`).join(", ");
      const sql = `insert into ${table} (${columns.join(", ")}) values (${placeholders})
                   on conflict (${key.join(", ")}) do update set ${updates}`;

      // steps は上位地域のステップを overrides_step_id で参照するので、地域の階層順に入れる
      const ordered = table === "steps" ? sortByRegionDepth(rows, data) : rows;
      for (const row of ordered) {
        await db.query(sql, columns.map((c) => row[c] ?? null));
      }
      upserted[table] = rows.length;

      const ids = new Set(rows.map((r) => key.map((k) => r[k]).join("@")));
      const existing = await db.query(`select ${key.map((k) => `${k}::text`).join(" || '@' || ")} as k from ${table}`);
      const extra = existing.rows.map((r) => r.k as string).filter((k) => !ids.has(k));
      if (extra.length > 0) orphans[table] = extra;
    }
    // 変更監視との取り決め（CLAUDE.md §5: 人が承認してからYAMLを更新）:
    // 出典ページの変更が見つかっている行は、YAMLの verified_at がその変更より前なら needs_review を保つ。
    // seed を流しただけで「内容を確認中」が消えてしまわないようにするため。
    for (const [table, column] of [["steps", "source_url"], ["subsidies", "source_url"], ["facilities", "source_url"], ["facilities", "booking_source_url"]]) {
      const kept = await db.query(
        `update ${table} t set needs_review = true from source_watch w
         where w.needs_review and w.url = t.${column} and t.verified_at < ${CHANGED_ON} returning t.id`,
      );
      kept_in_review.push(...kept.rows.map((r) => `${table}:${r.id}`));
    }
    // そのURLを出典にしているすべての行の確認日が変更日以降になったら、確認待ちを外す
    const cleared = await db.query(
      `update source_watch w set needs_review = false, diff_summary = null
       where w.needs_review and not exists (select 1 from v_source_urls u where u.url = w.url and u.verified_at < ${CHANGED_ON})
       returning w.url`,
    );
    watch_cleared.push(...cleared.rows.map((r) => r.url as string));

    await db.query("commit");
  } catch (e) {
    await db.query("rollback");
    throw e;
  }
  return { upserted, orphans, kept_in_review: [...new Set(kept_in_review)].sort(), watch_cleared };
}

function sortByRegionDepth(rows: Record<string, unknown>[], data: SeedData) {
  const order = new Map(data.regions.map((r, i) => [r.code, i])); // regions は親→子の順に並んでいる
  return [...rows].sort((a, b) => order.get(a.region_code as string)! - order.get(b.region_code as string)!);
}
