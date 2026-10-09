// 助成金Navi に並べる「お金がもらえる・減る手続き」の選び方。決定的（設計原則2）。
// 手続き（steps）は題名か申請ガイドの有無で見分ける。助成（subsidies）は全部が対象。

import { judgeEligibility, type EligibilityStatus, type Judgement } from "./eligibility";
import type { Preferences } from "./family-state";
import type { Subsidy } from "./money";
import { regionChain, type Family, type Region, type Step } from "./next-actions";

const BENEFIT_TITLE = /給付|助成|手当|免除|一時金|祝金|払い戻し|還付|医療費|応援給付|サポート|ファースト/;

export const isBenefitStep = (s: Pick<Step, "title" | "apply_guide">) => s.apply_guide != null || BENEFIT_TITLE.test(s.title);

/**
 * 助成金Navi に出す手続き: 地域の階層の steps から、下位地域に上書きされたものを除き、
 * お金に関わる題名のもの。家族の状況（requires）に合わないものは出さない。流産・死産のときは loss の手続きだけ。
 * 「今週やること」と違い、段階（妊娠中・産後）や持っている紙では隠さない（先に全体を見られるように）。
 */
export function listBenefitSteps(input: { steps: Step[]; regions: Region[]; family: Family }): Step[] {
  const { steps, regions, family } = input;
  const codes = new Set(regionChain(family.region_code, regions).map((r) => r.code));
  const inScope = steps.filter((s) => codes.has(s.region_code));
  const overridden = new Set(inScope.map((s) => s.overrides_step_id).filter((id): id is string => id != null));
  const flags = new Set(family.flags ?? []);
  const loss = flags.has("loss");
  return inScope
    .filter((s) => !overridden.has(s.id))
    .filter((s) => (loss ? s.requires === "loss" : s.requires !== "loss"))
    .filter((s) => s.requires == null || flags.has(s.requires))
    .filter(isBenefitStep)
    .sort((a, b) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : 1));
}

export type BenefitItem =
  | { kind: "subsidy"; id: string; subsidy: Subsidy; /** 同じ制度の「申請する」手続き（あれば）。ガイドと期限の補いに使う */ step: Step | null; judgement: Judgement; status: EligibilityStatus; order: number }
  | { kind: "step"; id: string; step: Step; judgement: Judgement; status: EligibilityStatus; order: number };

/** 助成の名前から、手続きの題名と突き合わせる芯（「東京都 」「港区 」などの地域名と括弧の中身を落とす） */
export function subsidyKey(name: string): string {
  return name
    .replace(/（[^）]*）|\([^)]*\)/g, "")
    .replace(/^(東京都|[^\s]+?[区市町村])\s*/, "")
    .replace(/^(東京都|[^\s]+?[区市町村])の/, "")
    .replace(/\s+/g, "")
    .trim();
}

/** 助成の名前の括弧の中の語（例: 「1回目」「東京都」）。同じ芯の助成が複数あるとき（1回目・2回目）の見分けに使う */
export function subsidyQualifiers(name: string): string[] {
  return [...name.matchAll(/（([^）]*)）|\(([^)]*)\)/g)].flatMap((m) => (m[1] ?? m[2] ?? "").split(/[・、,，/／]/)).map((t) => t.trim()).filter((t) => t.length > 0);
}

/** 手続きの題名が、その助成のことか（同じ制度を二重に出さないため）。0 = 違う、1 = 芯が一致、2以上 = 括弧の語も一致 */
export function matchScore(step: Pick<Step, "title">, subsidy: Pick<Subsidy, "name">): number {
  const key = subsidyKey(subsidy.name);
  const title = step.title.replace(/\s+/g, "");
  if (key.length < 4 || !title.includes(key)) return 0;
  const quals = subsidyQualifiers(subsidy.name).filter((q) => /回目|第\d/.test(q));
  // 「1回目」「2回目」のような語があるのに題名に無ければ、別の回の手続き
  if (quals.length > 0 && !quals.some((q) => title.includes(q))) return 0;
  return 1 + quals.filter((q) => title.includes(q)).length;
}
export const stepMatchesSubsidy = (step: Pick<Step, "title">, subsidy: Pick<Subsidy, "name">) => matchScore(step, subsidy) > 0;

/** いちばんよく合う手続き（同点なら手続きの順） */
function bestStep(steps: Step[], subsidy: Subsidy, used: Set<string>): Step | null {
  let best: { step: Step; score: number } | null = null;
  for (const st of steps) {
    if (used.has(st.id)) continue;
    const score = matchScore(st, subsidy);
    if (score > 0 && (!best || score > best.score)) best = { step: st, score };
  }
  return best?.step ?? null;
}

/** 助成と手続きを、判定つきで並べる。条件つき（conditional）の助成は、鍵を満たしていても「要確認」にする（金額や対象が人による） */
export function judgeItems(input: { subsidies: Subsidy[]; steps: Step[]; preferences: Preferences }): BenefitItem[] {
  const { subsidies, steps, preferences } = input;
  const used = new Set<string>();
  const subs: BenefitItem[] = subsidies
    // 無痛分娩の助成は「希望しない」人には出さない。ひとり親向けは判定（single_parent の鍵）で対象外になるので、ここでは落とさない
    .filter((s) => s.requires !== "epidural" || preferences.epidural !== "no")
    // 今の制度（一時金）で申請できないもの（新しい制度の説明行）は、申請の一覧には出さない
    .filter((s) => s.scheme_applicable.includes("lumpsum"))
    .map((subsidy) => {
      // 同じ制度の「申請する」手続きがあれば結びつけ、手続きの方は一覧から落とす（二重に出さない）
      const step = bestStep(steps, subsidy, used);
      if (step) used.add(step.id);
      const keys = subsidy.apply_guide?.eligibility ?? step?.apply_guide?.eligibility;
      const judgement = judgeEligibility(keys, preferences);
      const status: EligibilityStatus = judgement.status === "eligible" && subsidy.kind === "conditional" ? "check" : judgement.status;
      return { kind: "subsidy", id: subsidy.id, subsidy, step, judgement, status, order: step?.sort_order ?? 500 };
    });
  // 同じ助成に複数の手続きが当たるとき（例: 018サポートと赤ちゃんファーストの同時申請）は、2つ目以降の助成にも同じ手続きを結びつける
  for (const item of subs) {
    if (item.kind === "subsidy" && !item.step) {
      const st = bestStep(steps, item.subsidy, new Set());
      if (st) { item.step = st; item.order = st.sort_order; }
    }
  }
  const sts: BenefitItem[] = steps
    .filter((s) => !used.has(s.id) && !subs.some((i) => i.kind === "subsidy" && i.step?.id === s.id))
    .map((step) => {
      const judgement = judgeEligibility(step.apply_guide?.eligibility, preferences);
      return { kind: "step", id: step.id, step, judgement, status: judgement.status, order: step.sort_order };
    });
  return [...subs, ...sts].sort((a, b) => a.order - b.order || (a.id < b.id ? -1 : 1));
}
