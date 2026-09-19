// 制度データの読み取り（サーバー専用）。
// Supabase が設定されていれば表から、未設定（手元の開発）なら data/ のYAMLから読む。
// どちらも同じ検証（lib/seed/load.ts）を通ったデータで、形も同じ。

import "server-only";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { regionChain, type DocumentDef, type Region, type Step } from "./next-actions";
import type { BookingStat, Facility } from "./facilities";
import { latestCost, type MoneyFacility, type Subsidy } from "./money";
import { loadSeedData } from "./seed/load";

export type Rules = { regions: Region[]; documents: DocumentDef[]; steps: Step[] };

const STEP_COLUMNS =
  "id, region_code, phase, sort_order, title, detail, trigger_document_id, produces_document_id, channel, action_url, " +
  "deadline_base, deadline_offset_days, deadline_week, deadline_note, overrides_step_id, survey_question_id, " +
  "source_url, verified_at, needs_review";
const DOCUMENT_COLUMNS = "id, region_code, name, aliases, includes, phase, description, source_url, verified_at";

let yamlCache: Rules | null = null;

function rulesFromYaml(): Rules {
  if (yamlCache && process.env.NODE_ENV === "production") return yamlCache;
  const { data, errors } = loadSeedData(join(process.cwd(), "data"));
  if (errors.length > 0) throw new Error(`data/ に問題があります: ${errors.map((e) => `${e.row} ${e.message}`).join(" / ")}`);
  const nn = <T>(v: T | null | undefined) => v ?? null;
  yamlCache = {
    regions: data.regions.map((r) => ({ code: r.code, level: r.level, name: r.name, parent_code: nn(r.parent_code), status: r.status })),
    documents: data.documents.map((d) => ({
      id: d.id, region_code: d.region_code, name: d.name, aliases: d.aliases, includes: d.includes, phase: d.phase,
      description: nn(d.description), source_url: nn(d.source_url), verified_at: nn(d.verified_at),
    })),
    steps: data.steps.map((s) => ({
      id: s.id, region_code: s.region_code, phase: s.phase, sort_order: s.sort_order, title: s.title, detail: nn(s.detail),
      trigger_document_id: nn(s.trigger_document_id), produces_document_id: nn(s.produces_document_id),
      channel: nn(s.channel), action_url: nn(s.action_url), deadline_base: nn(s.deadline_base),
      deadline_offset_days: nn(s.deadline_offset_days), deadline_week: nn(s.deadline_week), deadline_note: nn(s.deadline_note),
      overrides_step_id: nn(s.overrides_step_id), survey_question_id: nn(s.survey_question_id),
      source_url: s.source_url!, verified_at: s.verified_at!, needs_review: s.needs_review,
    })),
  };
  return yamlCache;
}

async function rulesFromSupabase(regionCode: string): Promise<Rules> {
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const regions = await db.from("regions").select("code, level, name, parent_code, status");
  if (regions.error) throw regions.error;
  const codes = regionChain(regionCode, regions.data as Region[]).map((r) => r.code);
  const [d, s] = await Promise.all([
    db.from("documents").select(DOCUMENT_COLUMNS).in("region_code", codes),
    db.from("steps").select(STEP_COLUMNS).in("region_code", codes),
  ]);
  if (d.error) throw d.error;
  if (s.error) throw s.error;
  return { regions: regions.data as Region[], documents: d.data as unknown as DocumentDef[], steps: s.data as unknown as Step[] };
}

const useSupabase = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** ある市区町村に適用される制度データ（市区町村 → 都府県 → 国）だけを返す。未登録の市区町村でも国＋都府県は返る。 */
export async function getRulesFor(regionCode: string): Promise<Rules> {
  if (useSupabase()) return rulesFromSupabase(regionCode);
  const all = rulesFromYaml();
  const codes = regionChain(regionCode, all.regions).map((r) => r.code);
  return {
    regions: all.regions,
    documents: all.documents.filter((d) => codes.includes(d.region_code!)),
    steps: all.steps.filter((s) => codes.includes(s.region_code)),
  };
}

export type MoneyData = { subsidies: Subsidy[]; facilities: MoneyFacility[] };

const SUBSIDY_COLUMNS =
  "id, region_code, name, kind, requires, amount_yen, amount_is_upper_limit, amount_formula, amount_note, conditions, apply_via, " +
  "deadline_base, deadline_offset_days, taxable, scheme_applicable, source_url, verified_at, needs_review";
const FACILITY_COLUMNS =
  "id, name, scheme, has_epidural, tokyo_epidural_subsidy_target, needs_review, " +
  "costs:facility_costs_public(as_of, period, total_avg_yen, total_median_yen, source_url, verified_at)";

/** 「お金」画面用: 地域の階層の助成と、その市区町村の分娩施設（出産なびの費用つき）。 */
export async function getMoneyFor(regionCode: string): Promise<MoneyData> {
  if (useSupabase()) {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const regions = await db.from("regions").select("code, level, name, parent_code, status");
    if (regions.error) throw regions.error;
    const codes = regionChain(regionCode, regions.data as Region[]).map((r) => r.code);
    const [s, f] = await Promise.all([
      db.from("subsidies").select(SUBSIDY_COLUMNS).in("region_code", codes),
      db.from("facilities").select(FACILITY_COLUMNS).eq("region_code", regionCode).order("name"),
    ]);
    if (s.error) throw s.error;
    if (f.error) throw f.error;
    return { subsidies: s.data as unknown as Subsidy[], facilities: f.data as unknown as MoneyFacility[] };
  }

  const { data, errors } = loadSeedData(join(process.cwd(), "data"));
  if (errors.length > 0) throw new Error("data/ に問題があります");
  const regions = rulesFromYaml().regions;
  const codes = regionChain(regionCode, regions).map((r) => r.code);
  const nn = <T>(v: T | null | undefined) => v ?? null;
  return {
    subsidies: data.subsidies
      .filter((s) => codes.includes(s.region_code))
      .map((s) => ({
        id: s.id, region_code: s.region_code, name: s.name, kind: s.kind, requires: nn(s.requires),
        amount_yen: nn(s.amount_yen), amount_is_upper_limit: s.amount_is_upper_limit, amount_formula: nn(s.amount_formula), amount_note: nn(s.amount_note),
        conditions: nn(s.conditions), apply_via: nn(s.apply_via), deadline_base: nn(s.deadline_base),
        deadline_offset_days: nn(s.deadline_offset_days), taxable: nn(s.taxable), scheme_applicable: s.scheme_applicable,
        source_url: s.source_url!, verified_at: s.verified_at!, needs_review: s.needs_review,
      })),
    facilities: data.facilities
      .filter((f) => f.region_code === regionCode)
      .sort((a, b) => a.name.localeCompare(b.name, "ja"))
      .map((f) => ({
        id: f.id, name: f.name, scheme: f.scheme, has_epidural: nn(f.has_epidural),
        tokyo_epidural_subsidy_target: nn(f.tokyo_epidural_subsidy_target), needs_review: f.needs_review,
        costs: data.facility_costs_public
          .filter((c) => c.facility_id === f.id)
          .map((c) => ({
            as_of: c.as_of, period: nn(c.period), total_avg_yen: nn(c.total_avg_yen), total_median_yen: nn(c.total_median_yen),
            source_url: c.source_url!, verified_at: c.verified_at!,
          })),
      })),
  };
}

export type HospitalData = { facilities: Facility[]; stats: BookingStat[] };

const HOSPITAL_COLUMNS =
  "id, name, address, lat, lng, facility_type, has_epidural, epidural_24h, tokyo_epidural_subsidy_target, booking_policy, " +
  "booking_deadline_week_official, booking_source_url, scheme, birth_navi_url, website_url, source_url, verified_at, needs_review, " +
  "costs:facility_costs_public(as_of, period, total_avg_yen, total_median_yen, source_url, verified_at)";

type WithCosts = Omit<Facility, "cost"> & { costs: MoneyFacility["costs"] };
const withCost = ({ costs, ...f }: WithCosts): Facility => {
  const c = latestCost({ costs } as MoneyFacility);
  return { ...f, cost: c ? { yen: c.yen, basis: c.basis, period: c.source.period } : null };
};

/** 「病院と締切」画面用: その市区町村の分娩施設と、記録の集計（集計ビューだけを読む）。 */
export async function getHospitalsFor(regionCode: string): Promise<HospitalData> {
  if (useSupabase()) {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const f = await db.from("facilities").select(HOSPITAL_COLUMNS).eq("region_code", regionCode);
    if (f.error) throw f.error;
    const facilities = (f.data as unknown as WithCosts[]).map(withCost);
    const st = await db.from("v_booking_stats").select("*").in("facility_id", facilities.map((x) => x.id));
    if (st.error) throw st.error;
    return { facilities, stats: st.data as BookingStat[] };
  }

  const { data, errors } = loadSeedData(join(process.cwd(), "data"));
  if (errors.length > 0) throw new Error("data/ に問題があります");
  const nn = <T>(v: T | null | undefined) => v ?? null;
  return {
    stats: [], // 記録は Supabase にだけある
    facilities: data.facilities
      .filter((f) => f.region_code === regionCode)
      .map((f) =>
        withCost({
          id: f.id, name: f.name, address: nn(f.address), lat: nn(f.lat), lng: nn(f.lng), facility_type: nn(f.facility_type),
          has_epidural: nn(f.has_epidural), epidural_24h: nn(f.epidural_24h),
          tokyo_epidural_subsidy_target: nn(f.tokyo_epidural_subsidy_target), booking_policy: nn(f.booking_policy),
          booking_deadline_week_official: nn(f.booking_deadline_week_official), booking_source_url: nn(f.booking_source_url),
          scheme: f.scheme, birth_navi_url: nn(f.birth_navi_url), website_url: nn(f.website_url),
          source_url: f.source_url!, verified_at: f.verified_at!, needs_review: f.needs_review,
          costs: data.facility_costs_public
            .filter((c) => c.facility_id === f.id)
            .map((c) => ({
              as_of: c.as_of, period: nn(c.period), total_avg_yen: nn(c.total_avg_yen), total_median_yen: nn(c.total_median_yen),
              source_url: c.source_url!, verified_at: c.verified_at!,
            })),
        }),
      ),
  };
}
