// data/ のYAMLを読み、検証して、投入用の行にする。
// 設計原則3: ルール・金額の行（steps / subsidies / facilities）に source_url と verified_at が無ければ拒否する。
// 1件でも拒否があれば seed 全体を止める（一部だけ投入しない）。

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { parseDocument } from "yaml";
import { z } from "zod";
import { formulaError } from "../formula";

const PHASES = ["pre_notification", "notification", "pregnancy", "birth", "postpartum"] as const;
const DEADLINE_BASES = [
  "confirmation_date",
  "notification_date",
  "due_date",
  "birth_date",
  "gestational_week",
  "facility",
] as const;

const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD で書く")
  .refine((s) => {
    // 2026-02-31 のような日付は、Date が黙って 3月3日 に直してしまうので、文字列に戻して同じかどうかで確かめる
    const t = Date.parse(`${s}T00:00:00Z`);
    return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === s;
  }, "存在しない日付");

const regionSchema = z.strictObject({
  code: z.string().regex(/^(JP|\d{2}|\d{5})$/),
  level: z.enum(["national", "prefecture", "municipality"]),
  name: z.string().min(1),
  parent_code: z.string().nullish(),
  status: z.enum(["skeleton_only", "in_progress", "verified"]),
  verified_at: dateStr.nullish(),
});

const documentSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  aliases: z.array(z.string()).default([]),
  includes: z.array(z.string()).default([]),
  phase: z.enum(PHASES),
  description: z.string().nullish(),
  source_url: z.string().nullish(),
  verified_at: dateStr.nullish(),
  needs_review: z.boolean().optional(), // documents 表に列は無い。YAML上のメモとして許可するだけ
});

// source_url / verified_at は「無い行」を自前のメッセージで拒否したいので、ここでは任意にして後段で検査する
const sourced = {
  source_url: z.string().nullish(),
  verified_at: dateStr.nullish(),
  needs_review: z.boolean().default(false),
};

const stepSchema = z.strictObject({
  id: z.string().min(1),
  phase: z.enum(PHASES),
  sort_order: z.number().int(),
  title: z.string().min(1),
  detail: z.string().nullish(),
  trigger_document_id: z.string().nullish(),
  produces_document_id: z.string().nullish(),
  channel: z.string().nullish(),
  action_url: z.string().nullish(),
  deadline_base: z.enum(DEADLINE_BASES).nullish(),
  deadline_offset_days: z.number().int().nullish(),
  deadline_week: z.number().int().nullish(),
  deadline_note: z.string().nullish(),
  apply_from_base: z.enum(DEADLINE_BASES).nullish(),
  apply_from_offset_days: z.number().int().nullish(),
  apply_from_week: z.number().int().nullish(),
  apply_from_note: z.string().nullish(),
  overrides_step_id: z.string().nullish(),
  survey_question_id: z.string().nullish(),
  /** 困ったときの問い合わせ先（contacts の id）。無ければ、その区の代表の窓口を画面が出す */
  contact_id: z.string().nullish(),
  /** 該当する家族にだけ出す: multiple（双子以上）／satogaeri（里帰り出産）／foreign_parent（子が日本国籍にならない） */
  requires: z.enum(["multiple", "satogaeri", "foreign_parent"]).nullish(),
  ...sourced,
});

const subsidySchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(["at_counter", "cash_later", "recurring", "conditional"]),
  requires: z.enum(["epidural"]).nullish(),
  amount_yen: z.number().int().nullish(),
  amount_is_upper_limit: z.boolean().default(false),
  amount_formula: z.string().nullish(),
  amount_note: z.string().nullish(),
  conditions: z.string().nullish(),
  apply_via: z.string().nullish(),
  deadline_base: z.enum(DEADLINE_BASES).nullish(),
  deadline_offset_days: z.number().int().nullish(),
  apply_from_base: z.enum(DEADLINE_BASES).nullish(),
  apply_from_offset_days: z.number().int().nullish(),
  apply_from_week: z.number().int().nullish(),
  apply_from_note: z.string().nullish(),
  taxable: z.boolean().nullish(),
  scheme_applicable: z.array(z.enum(["lumpsum", "new_scheme"])).default(["lumpsum", "new_scheme"]),
  ...sourced,
});

const facilityCostSchema = z.strictObject({
  as_of: dateStr,
  period: z.string().nullish(),
  total_avg_yen: z.number().int().nullish(),
  total_median_yen: z.number().int().nullish(),
  basic_avg_yen: z.number().int().nullish(),
  basic_median_yen: z.number().int().nullish(),
  room_diff_avg_yen: z.number().int().nullish(),
  room_diff_median_yen: z.number().int().nullish(),
  stay_days_avg: z.number().nullish(),
  stay_days_median: z.number().nullish(),
  source_url: z.string().nullish(),
  verified_at: dateStr.nullish(),
});

const facilitySchema = z.strictObject({
  id: z.string().min(1),
  region_code: z.string().regex(/^\d{5}$/),
  name: z.string().min(1),
  address: z.string().nullish(),
  lat: z.number().nullish(),
  lng: z.number().nullish(),
  facility_type: z.string().nullish(),
  has_epidural: z.boolean().nullish(),
  epidural_24h: z.boolean().nullish(),
  tokyo_epidural_subsidy_target: z.boolean().nullish(),
  booking_policy: z.string().nullish(),
  booking_deadline_week_official: z.number().int().nullish(),
  booking_source_url: z.string().nullish(),
  scheme: z.enum(["lumpsum", "new_scheme", "both"]).default("lumpsum"),
  birth_navi_url: z.string().nullish(),
  website_url: z.string().nullish(),
  costs: z.array(facilityCostSchema).default([]), // → facility_costs_public
  ...sourced,
});

/** 困ったときの問い合わせ先（窓口）。区のハンドブック・公式ページから。電話は「03-1234-5678」の形。 */
const contactSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  /** 何を聞ける窓口か（例: 妊娠届・母子手帳・ネウボラ面接） */
  topics: z.string().nullish(),
  phone: z.string().regex(/^[#0-9-]+$/, "電話は 03-1234-5678 か #8000 の形").nullish(),
  hours: z.string().nullish(),
  address: z.string().nullish(),
  url: z.string().nullish(),
  note: z.string().nullish(),
  ...sourced,
});

const regionFileSchema = z.strictObject({
  region: regionSchema,
  notes: z.array(z.unknown()).optional(), // 人が読むメモ。投入しない
  documents: z.array(documentSchema).nullish(),
  contacts: z.array(contactSchema).nullish(),
  steps: z.array(stepSchema).nullish(),
  subsidies: z.array(subsidySchema).nullish(),
});

const facilityFileSchema = z.strictObject({ facilities: z.array(facilitySchema).nullish() });

const surveyFileSchema = z.object({
  surveys: z.array(z.looseObject({ id: z.string().min(1) })),
});

export type RegionRow = z.infer<typeof regionSchema>;
export type DocumentRow = z.infer<typeof documentSchema> & { region_code: string };
export type StepRow = z.infer<typeof stepSchema> & { region_code: string };
export type ContactRow = z.infer<typeof contactSchema> & { region_code: string };
export type SubsidyRow = z.infer<typeof subsidySchema> & { region_code: string };
export type FacilityRow = Omit<z.infer<typeof facilitySchema>, "costs">;
export type FacilityCostRow = z.infer<typeof facilityCostSchema> & { facility_id: string };

export type SeedData = {
  regions: RegionRow[];
  documents: DocumentRow[];
  contacts: ContactRow[];
  steps: StepRow[];
  subsidies: SubsidyRow[];
  facilities: FacilityRow[];
  facility_costs_public: FacilityCostRow[];
};

export type SeedIssue = { file: string; row: string; message: string };

export type LoadResult = { data: SeedData; errors: SeedIssue[]; warnings: SeedIssue[] };

const isUrl = (s: string) => /^https?:\/\/\S+$/.test(s);

/** 設計原則3の検査。拒否理由を返す（問題なければ null）。 */
export function checkSource(row: { source_url?: string | null; verified_at?: string | null; needs_review?: boolean }): string | null {
  const url = row.source_url?.trim();
  if (!url) return "source_url が無い";
  if (!row.verified_at) return "verified_at が無い";
  if (isUrl(url)) return null;
  // national.yaml 冒頭の取り決め: 一次資料が未確定の行は "TODO..." と書き、needs_review: true にする。画面は「確認中」を出す。
  if (url.startsWith("TODO")) {
    return row.needs_review ? null : 'source_url が "TODO" なのに needs_review: true が無い';
  }
  return `source_url がURLではない: ${url}`;
}

function readYaml(path: string): unknown {
  const doc = parseDocument(readFileSync(path, "utf8"));
  if (doc.errors.length > 0) throw new Error(doc.errors.map((e) => e.message).join("\n"));
  return doc.toJS();
}

function yamlFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => join(dir, f));
}

const LEVEL_ORDER = { national: 0, prefecture: 1, municipality: 2 } as const;

export function loadSeedData(dataDir: string): LoadResult {
  const data: SeedData = { regions: [], documents: [], contacts: [], steps: [], subsidies: [], facilities: [], facility_costs_public: [] };
  const errors: SeedIssue[] = [];
  const warnings: SeedIssue[] = [];
  const rel = (p: string) => relative(dataDir, p);

  const parse = <T>(path: string, schema: z.ZodType<T>): T | null => {
    try {
      const result = schema.safeParse(readYaml(path));
      if (result.success) return result.data;
      for (const issue of result.error.issues) {
        errors.push({ file: rel(path), row: issue.path.join("."), message: issue.message });
      }
    } catch (e) {
      errors.push({ file: rel(path), row: "-", message: `YAMLを読めない: ${(e as Error).message}` });
    }
    return null;
  };

  // 地域ファイル: 場所で種類を決める。地域が増えてもコードは変わらない（設計原則1）。
  const regionFiles = [
    ...(existsSync(join(dataDir, "national.yaml")) ? [join(dataDir, "national.yaml")] : []),
    ...yamlFiles(join(dataDir, "prefectures")),
    ...yamlFiles(join(dataDir, "municipalities")),
  ];
  const fileOf = new Map<string, string>(); // 行id → ファイル（エラー表示用）

  for (const path of regionFiles) {
    const file = parse(path, regionFileSchema);
    if (!file) continue;
    const code = file.region.code;
    data.regions.push(file.region);
    for (const d of file.documents ?? []) {
      data.documents.push({ ...d, region_code: code });
      fileOf.set(`documents:${d.id}`, rel(path));
    }
    for (const c of file.contacts ?? []) {
      data.contacts.push({ ...c, region_code: code });
      fileOf.set(`contacts:${c.id}`, rel(path));
    }
    for (const s of file.steps ?? []) {
      data.steps.push({ ...s, region_code: code });
      fileOf.set(`steps:${s.id}`, rel(path));
    }
    for (const s of file.subsidies ?? []) {
      data.subsidies.push({ ...s, region_code: code });
      fileOf.set(`subsidies:${s.id}`, rel(path));
    }
  }

  for (const path of yamlFiles(join(dataDir, "facilities"))) {
    const file = parse(path, facilityFileSchema);
    for (const { costs, ...f } of file?.facilities ?? []) {
      data.facilities.push(f);
      fileOf.set(`facilities:${f.id}`, rel(path));
      for (const c of costs) {
        data.facility_costs_public.push({ ...c, facility_id: f.id });
        fileOf.set(`facility_costs_public:${f.id}@${c.as_of}`, rel(path));
      }
    }
  }

  const surveyPath = join(dataDir, "surveys.yaml");
  const surveyIds = new Set<string>();
  if (existsSync(surveyPath)) {
    for (const s of parse(surveyPath, surveyFileSchema)?.surveys ?? []) surveyIds.add(s.id);
  }

  // 親 → 子の順に投入できるよう並べる
  data.regions.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);

  const err = (table: string, id: string, message: string) =>
    errors.push({ file: fileOf.get(`${table}:${id}`) ?? "-", row: `${table}:${id}`, message });

  // 重複id
  type AnyRow = { id?: string; code?: string; facility_id?: string; as_of?: string };
  for (const [table, rows] of Object.entries(data) as [string, AnyRow[]][]) {
    const seen = new Set<string>();
    for (const r of rows) {
      const id = r.id ?? r.code ?? `${r.facility_id}@${r.as_of}`;
      if (seen.has(id)) err(table, id, "id が重複している");
      seen.add(id);
    }
  }

  // 地域の親子
  const regionByCode = new Map(data.regions.map((r) => [r.code, r]));
  for (const r of data.regions) {
    if (r.level === "national") continue;
    if (!r.parent_code || !regionByCode.has(r.parent_code)) {
      errors.push({ file: "-", row: `regions:${r.code}`, message: `parent_code ${r.parent_code ?? "(なし)"} の地域ファイルが無い` });
    }
  }
  const ancestorsOf = (code: string): string[] => {
    const out: string[] = [];
    let cur = regionByCode.get(code)?.parent_code;
    while (cur && !out.includes(cur)) {
      out.push(cur);
      cur = regionByCode.get(cur)?.parent_code;
    }
    return out;
  };

  // 設計原則3: 出典と確認日
  for (const s of data.steps) {
    const m = checkSource(s);
    if (m) err("steps", s.id, m);
  }
  const contactIds = new Set(data.contacts.map((c) => c.id));
  for (const c of data.contacts) {
    const m = checkSource(c);
    if (m) err("contacts", c.id, m);
    if (!c.phone && !c.url && !c.address) err("contacts", c.id, "電話・URL・住所のどれも無い（問い合わせ先にならない）");
  }
  for (const s of data.steps) {
    if (s.contact_id && !contactIds.has(s.contact_id)) err("steps", s.id, `contact_id "${s.contact_id}" が contacts に無い`);
  }
  for (const s of data.subsidies) {
    const m = checkSource(s);
    if (m) err("subsidies", s.id, m);
    // 実負担の計算に入れる行は、金額が決まっていなければならない
    if (s.kind === "at_counter" || s.kind === "cash_later") {
      if (s.amount_yen == null && !s.amount_formula) err("subsidies", s.id, `kind: ${s.kind} なのに amount_yen も amount_formula も無い`);
      const bad = s.amount_formula ? formulaError(s.amount_formula) : null;
      if (bad) err("subsidies", s.id, `amount_formula を読めない（${bad}）: ${s.amount_formula}`);
    }
  }
  for (const f of data.facilities) {
    const m = checkSource(f);
    if (m) err("facilities", f.id, m);
    // 予約ルールは施設HPが出典。ルールを書いたら出典も必須
    if ((f.booking_policy || f.booking_deadline_week_official != null) && !isUrl(f.booking_source_url?.trim() ?? "")) {
      err("facilities", f.id, "booking_policy があるのに booking_source_url が無い");
    }
  }
  for (const c of data.facility_costs_public) {
    // 金額の行。needs_review の列が無いので "TODO" は通らない（URLと確認日が必須）
    const m = checkSource(c);
    if (m) err("facility_costs_public", `${c.facility_id}@${c.as_of}`, m);
  }
  // documents は「紙の名前」の選択肢で、ルール・金額ではない（「まだ紙がない」「その他」等）。表の列も null 可。
  // 片方だけ書いてある行は書き忘れなので拒否し、両方無い行は警告にとどめる。
  for (const d of data.documents) {
    if (d.source_url || d.verified_at) {
      const m = checkSource({ ...d, needs_review: d.needs_review ?? false });
      if (m) err("documents", d.id, m);
    } else {
      warnings.push({ file: fileOf.get(`documents:${d.id}`) ?? "-", row: `documents:${d.id}`, message: "出典なしの書類（画面に出典を表示できない）" });
    }
  }

  // 参照
  const docIds = new Set(data.documents.map((d) => d.id));
  for (const d of data.documents) {
    for (const inc of d.includes) {
      if (!docIds.has(inc)) err("documents", d.id, `includes "${inc}" が documents に無い`);
      if (inc === d.id) err("documents", d.id, "includes に自分自身がある");
    }
  }
  const stepById = new Map(data.steps.map((s) => [s.id, s]));
  for (const s of data.steps) {
    for (const key of ["trigger_document_id", "produces_document_id"] as const) {
      if (s[key] && !docIds.has(s[key]!)) err("steps", s.id, `${key} "${s[key]}" が documents に無い`);
    }
    if (s.overrides_step_id) {
      const target = stepById.get(s.overrides_step_id);
      if (!target) err("steps", s.id, `overrides_step_id "${s.overrides_step_id}" が steps に無い`);
      else if (!ancestorsOf(s.region_code).includes(target.region_code)) {
        err("steps", s.id, `overrides_step_id "${s.overrides_step_id}" は上位地域のステップではない`);
      }
    }
    if (s.survey_question_id && !surveyIds.has(s.survey_question_id)) {
      err("steps", s.id, `survey_question_id "${s.survey_question_id}" が surveys.yaml に無い`);
    }
  }
  for (const f of data.facilities) {
    if (!regionByCode.has(f.region_code)) err("facilities", f.id, `region_code "${f.region_code}" の地域ファイルが無い`);
  }

  return { data, errors, warnings };
}
