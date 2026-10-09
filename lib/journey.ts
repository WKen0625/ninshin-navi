// 妊娠〜産後の「全体マップ」: いまどの段階にいて、各段階に手続きが何件あり、いくつ済んだか。決定的（設計原則2）。
// 「今週やること」は段階（出産前は産後の手続きを隠す）で絞るが、マップは全段階を数える＝とりこぼしを防ぐ。

import type { IconName } from "../components/Icon";
import { regionChain, type Family, type NextAction, type Region, type Step } from "./next-actions";

export const PHASES = ["pre_notification", "notification", "pregnancy", "birth", "postpartum"] as const;
export type Phase = (typeof PHASES)[number];

export const PHASE_INFO: Record<Phase, { name: string; short: string; hint: string; icon: IconName }> = {
  pre_notification: { name: "妊娠がわかった", short: "判明", hint: "受診・心拍の確認・分娩予約", icon: "heart" },
  notification: { name: "妊娠届と母子手帳", short: "届出", hint: "区役所で届を出し、紙を受け取る", icon: "document" },
  pregnancy: { name: "妊娠中", short: "妊娠中", hint: "健診・面接・職場・里帰り", icon: "calendar" },
  birth: { name: "出産", short: "出産", hint: "入院・出生届の準備", icon: "baby" },
  postpartum: { name: "産後", short: "産後", hint: "出生届・児童手当・保険・助成", icon: "home" },
};

export type PhaseSummary = {
  phase: Phase;
  total: number;
  done: number;
  overdue: number;
  soon: number;
  /** まだ終わっていない件数（total − done） */
  remaining: number;
  state: "past" | "current" | "future";
};

export type Journey = { phases: PhaseSummary[]; current: Phase; totalRemaining: number; totalDone: number };

/**
 * 全段階の手続きを数える。地域の階層・上書き・家族の状況（requires）は「今週やること」と同じ扱い。
 * 「いま」は、次にやること（current）の段階。出産後で次が無ければ産後、出産前で次が無ければ妊娠中。
 */
export function journeyOf(input: {
  steps: Step[];
  regions: Region[];
  family: Family;
  progress: { step_id: string; status: "done" | "not_applicable" }[];
  actions: NextAction[];
  current: NextAction | null;
}): Journey {
  const { steps, regions, family, progress, actions, current } = input;
  const codes = new Set(regionChain(family.region_code, regions).map((r) => r.code));
  const inScope = steps.filter((s) => codes.has(s.region_code));
  const overridden = new Set(inScope.map((s) => s.overrides_step_id).filter((id): id is string => id != null));
  const flags = new Set(family.flags ?? []);
  const loss = flags.has("loss");
  const all = inScope
    .filter((s) => !overridden.has(s.id))
    .filter((s) => (loss ? s.requires === "loss" : s.requires !== "loss"))
    .filter((s) => s.requires == null || flags.has(s.requires));
  const doneIds = new Set(progress.map((p) => p.step_id));
  const reason = new Map(actions.map((a) => [a.step.id, a.reason]));
  const cur = (current?.step.phase as Phase | undefined) ?? (family.birth_date ? "postpartum" : "pregnancy");
  const curIdx = PHASES.indexOf(cur);
  const phases = PHASES.map((phase, i): PhaseSummary => {
    const list = all.filter((s) => s.phase === phase);
    const done = list.filter((s) => doneIds.has(s.id)).length;
    return {
      phase,
      total: list.length,
      done,
      overdue: list.filter((s) => reason.get(s.id) === "overdue").length,
      soon: list.filter((s) => reason.get(s.id) === "deadline_soon").length,
      remaining: list.length - done,
      state: i < curIdx ? "past" : i === curIdx ? "current" : "future",
    };
  });
  return { phases, current: cur, totalRemaining: phases.reduce((n, p) => n + p.remaining, 0), totalDone: phases.reduce((n, p) => n + p.done, 0) };
}
