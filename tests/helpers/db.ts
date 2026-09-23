// テスト用のPostgres（PGlite = プロセス内で動く本物のPostgres）。
// Supabase が用意する auth スキーマとロールだけを代用し、supabase/*.sql は本番と同じものを流す。

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { Db } from "../../lib/seed";
import type { Facility } from "../../lib/facilities";
import type { MoneyFacility, Subsidy } from "../../lib/money";
import type { DocumentDef, Region, Step } from "../../lib/next-actions";

export const ROOT = join(__dirname, "..", "..");

const SUPABASE_STUB = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon;
  create role authenticated;
`;

export async function createTestDb(): Promise<{ pg: PGlite; db: Db }> {
  const pg = new PGlite();
  await pg.exec(SUPABASE_STUB);
  await pg.exec(readFileSync(join(ROOT, "supabase", "schema.sql"), "utf8"));
  await pg.exec(readFileSync(join(ROOT, "supabase", "policies.sql"), "utf8"));
  for (const file of readdirSync(join(ROOT, "supabase", "migrations")).sort()) {
    await pg.exec(readFileSync(join(ROOT, "supabase", "migrations", file), "utf8"));
  }
  return { pg, db: { query: (sql, params) => pg.query(sql, params) as ReturnType<Db["query"]> } };
}

/** 画面と同じく、DBの表から制度データを読む（日付は文字列で） */
export async function readRules(db: Db) {
  const regions = (await db.query("select code, level, name, parent_code, status from regions")).rows as Region[];
  const documents = (await db.query("select id, phase, includes, region_code, name, aliases, description, source_url, verified_at::text as verified_at from documents")).rows as DocumentDef[];
  const steps = (
    await db.query(`
      select id, region_code, phase, sort_order, title, detail, trigger_document_id, produces_document_id, channel, action_url,
             deadline_base, deadline_offset_days, deadline_week, deadline_note, apply_from_base, apply_from_offset_days, apply_from_week, apply_from_note, overrides_step_id,
             survey_question_id, source_url, verified_at::text as verified_at, needs_review
      from steps`)
  ).rows as Step[];
  return { regions, documents, steps };
}

/** 「お金」画面と同じく、DBの表から助成と施設（費用つき）を読む */
export async function readMoney(db: Db, regionCodes: string[], municipality: string) {
  const subsidies = (
    await db.query(
      `select id, region_code, name, kind, requires, amount_yen, amount_is_upper_limit, amount_formula, amount_note, conditions, apply_via,
              deadline_base, deadline_offset_days, apply_from_base, apply_from_offset_days, apply_from_week, apply_from_note,
              taxable, scheme_applicable, source_url, verified_at::text as verified_at, needs_review
       from subsidies where region_code = any($1)`,
      [regionCodes],
    )
  ).rows as Subsidy[];
  const facilities = (
    await db.query(
      `select f.id, f.name, f.scheme, f.has_epidural, f.tokyo_epidural_subsidy_target, f.needs_review,
              coalesce(json_agg(json_build_object('as_of', c.as_of::text, 'period', c.period, 'total_avg_yen', c.total_avg_yen,
                'total_median_yen', c.total_median_yen, 'source_url', c.source_url, 'verified_at', c.verified_at::text))
                filter (where c.facility_id is not null), '[]') as costs
       from facilities f left join facility_costs_public c on c.facility_id = f.id
       where f.region_code = $1 group by f.id`,
      [municipality],
    )
  ).rows as MoneyFacility[];
  return { subsidies, facilities };
}

/** 「病院と締切」画面と同じく、DBの表から施設を読む */
export async function readFacilities(db: Db, municipality: string): Promise<Facility[]> {
  const { rows } = await db.query(
    `select f.id, f.name, f.address, f.lat, f.lng, f.facility_type, f.has_epidural, f.epidural_24h, f.tokyo_epidural_subsidy_target,
            f.booking_policy, f.booking_deadline_week_official, f.booking_source_url, f.scheme, f.birth_navi_url, f.website_url,
            f.source_url, f.verified_at::text as verified_at, f.needs_review,
            (select json_build_object('yen', coalesce(c.total_median_yen, c.total_avg_yen),
                                      'basis', case when c.total_median_yen is null then 'average' else 'median' end, 'period', c.period)
             from facility_costs_public c where c.facility_id = f.id order by c.as_of desc limit 1) as cost
     from facilities f where f.region_code = $1`,
    [municipality],
  );
  return rows as Facility[];
}
