// 「お金」の計算。CLAUDE.md §4:
//   出産なびの費用 − 一時金 − 都府県・市区町村の助成 = 実負担。scheme 別。申請期限つき。
// 設計原則2: データ表から決定的に計算する。設計原則9: 制度（scheme）を必ず区別する。
// 設計原則1: どの助成をどこで引くかは subsidies.kind が決める。助成の名前やidをコードに書かない。

import { evaluateFormula, formulaVariables, type FormulaVars } from "./formula";
import { applyWindowOf, type ApplyWindow } from "./apply-window";
import { type DeadlineBase, type DocumentDef, type Family } from "./next-actions";

export type Scheme = "lumpsum" | "new_scheme";

export type Subsidy = {
  id: string;
  region_code: string;
  name: string;
  kind: "at_counter" | "cash_later" | "recurring" | "conditional";
  requires: "epidural" | null;
  amount_yen: number | null;
  amount_is_upper_limit: boolean;
  amount_formula: string | null;
  amount_note: string | null;
  conditions: string | null;
  apply_via: string | null;
  deadline_base: DeadlineBase | null;
  deadline_offset_days: number | null;
  apply_from_base?: DeadlineBase | null;
  apply_from_offset_days?: number | null;
  apply_from_week?: number | null;
  apply_from_note?: string | null;
  taxable: boolean | null;
  scheme_applicable: Scheme[];
  source_url: string;
  verified_at: string;
  needs_review: boolean;
};

export type FacilityCost = {
  as_of: string;
  period: string | null;
  total_avg_yen: number | null;
  total_median_yen: number | null;
  source_url: string;
  verified_at: string;
};

export type MoneyFacility = {
  id: string;
  name: string;
  scheme: "lumpsum" | "new_scheme" | "both";
  has_epidural: boolean | null;
  tokyo_epidural_subsidy_target: boolean | null;
  needs_review: boolean;
  costs: FacilityCost[];
};

export type MoneyLine = {
  subsidy: Subsidy;
  /** この家族の場合の金額。recurring / conditional で金額が決まらないものは null */
  amount_yen: number | null;
  /** 金額が施設の費用で決まる式なのに、まだ施設を選んでいない（選ぶと計算できる） */
  needs_facility: boolean;
  deadline: string | null;
  deadline_estimated: boolean;
  /** 申請期間（申請できる日と期限） */
  window: ApplyWindow;
};

export type MoneyResult = {
  scheme: Scheme;
  /** 出産なびの費用（一時金を引く前）。中央値を優先し、公表されていなければ平均値 */
  cost: { yen: number; basis: "median" | "average"; source: FacilityCost } | null;
  /** 窓口の支払いから差し引かれるもの（一時金など） */
  at_counter: MoneyLine[];
  /** 窓口で払う目安 = 費用 − at_counter（0円未満にはしない） */
  pay_at_counter_yen: number | null;
  /** あとから申請して受け取るもの */
  cash_later: MoneyLine[];
  cash_later_total_yen: number;
  /** 実負担の目安 = 窓口で払う目安 − あとから受け取る合計 */
  net_yen: number | null;
  /** 計算に入れないもの（毎月の給付、条件つき・金額未定） */
  not_counted: MoneyLine[];
};

/** 定額（amount_yen）か、計算式（amount_formula。lib/formula.ts）で金額を出す */
export function amountOf(s: Pick<Subsidy, "amount_yen" | "amount_formula">, vars: FormulaVars): number | null {
  if (s.amount_yen != null) return s.amount_yen;
  return s.amount_formula ? evaluateFormula(s.amount_formula, vars) : null;
}

export function latestCost(facility: MoneyFacility): MoneyResult["cost"] {
  const source = [...facility.costs].sort((a, b) => (a.as_of < b.as_of ? 1 : -1))[0];
  if (!source) return null;
  if (source.total_median_yen != null) return { yen: source.total_median_yen, basis: "median", source };
  if (source.total_avg_yen != null) return { yen: source.total_avg_yen, basis: "average", source };
  return null;
}

/** その施設で選べる制度。both の施設は両方を計算して並べる。 */
export const schemesOf = (facility: MoneyFacility | null): Scheme[] =>
  !facility ? ["lumpsum"] : facility.scheme === "both" ? ["lumpsum", "new_scheme"] : [facility.scheme];

export function calculateMoney(input: {
  scheme: Scheme;
  facility: MoneyFacility | null;
  /** 地域の階層（市区町村 → 都府県 → 国）の助成 */
  subsidies: Subsidy[];
  family: Family;
  documents: DocumentDef[];
  children: number;
  wantsEpidural: boolean;
}): MoneyResult {
  const { scheme, facility, subsidies, family, documents, children, wantsEpidural } = input;

  // 新しい制度は金額がまだ決まっていないので、出産なびの費用（今の制度での請求額）から引き算をしない
  const cost = facility && scheme === "lumpsum" ? latestCost(facility) : null;

  const applicable = subsidies
    .filter((s) => s.scheme_applicable.includes(scheme))
    .filter((s) => s.requires == null || (s.requires === "epidural" && wantsEpidural))
    // 無痛分娩の助成は、対象医療機関の一覧に載っていないとわかっている施設では数えない（未確認 null なら数える）
    .filter((s) => !(s.requires === "epidural" && facility?.tokyo_epidural_subsidy_target === false))
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  const line = (subsidy: Subsidy, vars: FormulaVars): MoneyLine => {
    const window = applyWindowOf(subsidy, family, documents);
    const d = { date: window.until?.date ?? null, estimated: window.until?.estimated ?? false };
    const amount_yen = amountOf(subsidy, vars);
    const usesCost = subsidy.amount_formula != null && formulaVariables(subsidy.amount_formula).includes("cost");
    return { subsidy, amount_yen, needs_facility: amount_yen == null && usesCost && cost == null, deadline: d.date, deadline_estimated: d.estimated, window };
  };
  // 窓口で差し引かれるもの（一時金）を先に出し、その合計を「lumpsum」として、ほかの助成の式で使えるようにする
  const base: FormulaVars = { children, cost: cost?.yen ?? null };
  const counterLines = applicable.filter((s) => s.kind === "at_counter").map((s) => line(s, base));
  const lumpsum = counterLines.reduce((n, l) => n + (l.amount_yen ?? 0), 0);
  const lines = [...counterLines, ...applicable.filter((s) => s.kind !== "at_counter").map((s) => line(s, { ...base, lumpsum }))];

  const at_counter = lines.filter((l) => l.subsidy.kind === "at_counter");
  const cash_later = lines.filter((l) => l.subsidy.kind === "cash_later");
  const not_counted = lines.filter((l) => l.subsidy.kind === "recurring" || l.subsidy.kind === "conditional");
  const sum = (ls: MoneyLine[]) => ls.reduce((n, l) => n + (l.amount_yen ?? 0), 0);

  const pay_at_counter_yen = cost ? Math.max(0, cost.yen - sum(at_counter)) : null;
  const cash_later_total_yen = sum(cash_later);

  return {
    scheme,
    cost,
    at_counter,
    pay_at_counter_yen,
    cash_later,
    cash_later_total_yen,
    net_yen: pay_at_counter_yen != null ? pay_at_counter_yen - cash_later_total_yen : null,
    not_counted,
  };
}
