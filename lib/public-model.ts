// 公開ページ（検索から来た人が読む、ログイン・入力なしのページ）の組み立て。決定的（設計原則2）。
//   /tokyo                       東京23区の一覧と、区どうしの比較の入口
//   /tokyo/<区>                  区の手続き一覧（時期の順）
//   /tokyo/<区>/<話題>           区の手続き1件（区のデータにある手続き）
//   /tokyo/common/<話題>         国・東京都の手続き1件（23区共通。区ごとに同じページを作らない＝重複を作らない）
//   /tokyo/compare/<話題>        区どうしの比較（妊娠届・面談・給付金・お祝いなど）
// 中身は data/（Supabase）と同じ制度データ。ここでは並べ方と URL だけを決める。

import { applyWindowOf } from "./apply-window";
import { matchScore } from "./benefit";
import { amountOf, type Subsidy } from "./money";
import { regionChain, type Contact, type DocumentDef, type Family, type Region, type Step } from "./next-actions";
import { topicOf, TOPICS, type Topic } from "./topics";
import { WARDS, type Ward } from "./wards";

export type PublicFacility = { id: string; region_code: string; name: string; has_epidural: boolean | null };

export type AllData = {
  regions: Region[];
  documents: DocumentDef[];
  steps: Step[];
  contacts: Contact[];
  subsidies: Subsidy[];
  facilities: PublicFacility[];
};

export type PublicStep = {
  step: Step;
  /** 区のデータの手続きなら区。国・東京都の手続き（23区共通）なら null */
  ward: Ward | null;
  topic: Topic | null;
  slug: string;
  url: string;
};

export type PublicModel = {
  data: AllData;
  wards: Ward[];
  /** 区のデータにある手続き（区ごと） */
  wardSteps: Map<string, PublicStep[]>;
  /** 国・東京都の手続きで、少なくとも1つの区で上書きされていないもの */
  sharedSteps: PublicStep[];
  /** 区に当てはまるすべての手続き（区＋共通。区が上書きした共通の手続きは除く）。時期の順 */
  chainOf: (wardCode: string) => PublicStep[];
  byUrl: Map<string, PublicStep>;
  /** 比較ページ: 話題ごとの区の手続き（区の並び順） */
  compare: { topic: Topic; items: PublicStep[] }[];
};

const byOrder = (a: Step, b: Step) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : 1);

/**
 * URL の最後の部分を決める。話題があれば話題の英字、無ければ fallback。同じ区の中で重なれば -2, -3 …。
 * id の順に割り当てる（並び順の変更で URL が変わらないように）。
 */
export function assignSlugs(steps: Step[], fallback: (s: Step) => string): Map<string, { slug: string; topic: Topic | null }> {
  const used = new Set<string>();
  const out = new Map<string, { slug: string; topic: Topic | null }>();
  for (const s of [...steps].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const topic = topicOf(s.title);
    const base = topic?.slug ?? fallback(s);
    let slug = base;
    for (let i = 2; used.has(slug); i++) slug = `${base}-${i}`;
    used.add(slug);
    out.set(s.id, { slug, topic });
  }
  return out;
}

export function buildPublicModel(data: AllData, wards: Ward[] = WARDS): PublicModel {
  const wardSteps = new Map<string, PublicStep[]>();
  const byUrl = new Map<string, PublicStep>();
  for (const w of wards) {
    const own = data.steps.filter((s) => s.region_code === w.code);
    const slugs = assignSlugs(own, (s) => s.id.split(".").slice(1).join("-") || s.id);
    const list = own.sort(byOrder).map((step): PublicStep => {
      const { slug, topic } = slugs.get(step.id)!;
      return { step, ward: w, topic, slug, url: `/tokyo/${w.slug}/${slug}` };
    });
    wardSteps.set(w.code, list);
    for (const p of list) byUrl.set(p.url, p);
  }

  // 区ごとに、上書きされた共通の手続き
  const overriddenIn = new Map<string, Set<string>>();
  for (const w of wards) {
    overriddenIn.set(w.code, new Set((wardSteps.get(w.code) ?? []).map((p) => p.step.overrides_step_id).filter((id): id is string => id != null)));
  }
  const sharedRaw = data.steps.filter((s) => (s.region_code === "JP" || s.region_code === "13") && wards.some((w) => !overriddenIn.get(w.code)!.has(s.id)));
  const sharedSlugs = assignSlugs(sharedRaw, (s) => s.id.replace(/\./g, "-"));
  const sharedSteps = sharedRaw.sort(byOrder).map((step): PublicStep => {
    const { slug, topic } = sharedSlugs.get(step.id)!;
    return { step, ward: null, topic, slug, url: `/tokyo/common/${slug}` };
  });
  for (const p of sharedSteps) byUrl.set(p.url, p);
  const sharedById = new Map(sharedSteps.map((p) => [p.step.id, p]));

  const chainOf = (wardCode: string): PublicStep[] => {
    const over = overriddenIn.get(wardCode) ?? new Set<string>();
    const shared = sharedSteps.filter((p) => !over.has(p.step.id));
    return [...(wardSteps.get(wardCode) ?? []), ...shared].sort((a, b) => byOrder(a.step, b.step));
  };
  void sharedById;

  const compare = TOPICS.filter((t) => t.compare)
    .map((topic) => ({
      topic,
      items: wards.flatMap((w) => (wardSteps.get(w.code) ?? []).filter((p) => p.topic?.slug === topic.slug)),
    }))
    .filter((c) => new Set(c.items.map((p) => p.ward!.code)).size >= 5);

  return { data, wards, wardSteps, sharedSteps, chainOf, byUrl, compare };
}

/** 個人の日付に頼らない「いつから・いつまで」の文章（公開ページは予定日を知らない） */
const PLACEHOLDER: Family = { region_code: "13103", due_date: "2027-01-01", confirmation_date: null, birth_date: null, held_documents: [], completed_step_ids: [], not_applicable_step_ids: [] };
export function windowText(rule: Step | Subsidy, documents: DocumentDef[]): { from: string | null; until: string | null } {
  const w = applyWindowOf(rule as Step, PLACEHOLDER, documents);
  return { from: w.from?.text || null, until: w.until?.text || null };
}

/** 区に当てはまる助成の中から、この手続きのことを指すもの（名前で照合。lib/benefit.ts と同じ決まり） */
export function subsidyForStep(step: Step, wardCode: string | null, data: AllData): Subsidy | null {
  const codes = new Set(wardCode ? regionChain(wardCode, data.regions).map((r) => r.code) : ["JP", "13"]);
  let best: { s: Subsidy; score: number } | null = null;
  for (const s of data.subsidies) {
    if (!codes.has(s.region_code) || !s.scheme_applicable.includes("lumpsum")) continue;
    const score = matchScore(step, s);
    if (score > 0 && (!best || score > best.score)) best = { s, score };
  }
  return best?.s ?? null;
}

const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;

/** 助成の金額の短い文章。計算できないもの（費用で決まる・人による）は null（amount_note を出す） */
export function amountText(s: Subsidy): string | null {
  if (s.amount_yen != null) return `${s.amount_is_upper_limit ? "最大" : ""}${yen(s.amount_yen)}${s.kind === "recurring" ? "（毎月）" : ""}`;
  const v = amountOf(s, { children: 1, cost: null, lumpsum: 500000 });
  return v != null ? `${yen(v)}（子ども1人のとき）` : null;
}

/** 区の代表の問い合わせ先（手続きに contact_id が無いとき） */
export function contactForStep(step: Step, wardCode: string | null, data: AllData): Contact | null {
  if (step.contact_id) {
    const c = data.contacts.find((x) => x.id === step.contact_id);
    if (c) return c;
  }
  return wardCode ? (data.contacts.find((c) => c.region_code === wardCode) ?? null) : null;
}

/** いちばん新しい確認日 */
export const latestVerified = (rows: { verified_at: string }[]): string | null =>
  rows.reduce<string | null>((m, r) => (m == null || r.verified_at > m ? r.verified_at : m), null);

/** 「2026年9月」 */
export const ym = (d: string | null) => {
  if (!d) return "";
  const [y, m] = d.split("-").map(Number);
  return `${y}年${m}月`;
};
