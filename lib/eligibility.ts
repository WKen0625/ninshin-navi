// 「自分はどの項目に当てはまるか」の判定。決定的（設計原則2）。
// 入口の5問（健康保険・働き方・ひとり親・所得制限・既存の双子/里帰り/外国籍/無痛）の答えと、
// 行ごとの eligibility（鍵の配列。全部満たせば対象）を突き合わせ、対象／対象外／要確認 を返す。
// 所得は聞かない。「制限に当たりそうか」だけを聞き、わからなければ「要確認」にする。

import type { Preferences } from "./family-state";

export const ELIGIBILITY_KEYS = [
  "insurance_employer", "insurance_national", "insurance_any",
  "work_employee", "work_self_employed", "pension_national",
  "single_parent", "income_under_limit",
  "multiple", "epidural", "satogaeri", "foreign_parent",
] as const;
export type EligibilityKey = (typeof ELIGIBILITY_KEYS)[number];
export const isEligibilityKey = (v: unknown): v is EligibilityKey => (ELIGIBILITY_KEYS as readonly string[]).includes(v as string);

export const ELIGIBILITY_LABEL: Record<EligibilityKey, string> = {
  insurance_employer: "勤務先の健康保険（健保組合・協会けんぽ・共済）に入っている",
  insurance_national: "国民健康保険に入っている",
  insurance_any: "日本の公的な健康保険に入っている",
  work_employee: "会社員・公務員（雇われて働いている）",
  work_self_employed: "自営業・フリーランス",
  pension_national: "国民年金（第1号）の人（自営業・働いていない人など）",
  single_parent: "ひとり親",
  income_under_limit: "所得が制限の範囲内",
  multiple: "双子以上",
  epidural: "無痛分娩を希望している",
  satogaeri: "里帰り出産の予定がある",
  foreign_parent: "子が日本国籍にならない（両親とも外国籍など）",
};

export type Check = "yes" | "no" | "unknown";
export type EligibilityStatus = "eligible" | "not_eligible" | "check";

/** 答えから、鍵ごとの yes / no / unknown を出す */
export function checkKey(key: EligibilityKey, p: Preferences): Check {
  const ins = p.insurance ?? "unknown";
  const work = p.work ?? "unknown";
  switch (key) {
    case "insurance_employer": return ins === "unknown" ? "unknown" : ins === "employer" ? "yes" : "no";
    case "insurance_national": return ins === "unknown" ? "unknown" : ins === "national" ? "yes" : "no";
    case "insurance_any": return ins === "unknown" ? "unknown" : ins === "none" ? "no" : "yes";
    case "work_employee": return work === "unknown" ? "unknown" : work === "employee" ? "yes" : "no";
    case "work_self_employed": return work === "unknown" ? "unknown" : work === "self_employed" ? "yes" : "no";
    // 国民年金第1号 = 会社員・公務員（厚生年金）でない人。配偶者の扶養（第3号）は本人には分からないことがあるので、働いていない人は要確認
    case "pension_national": return work === "unknown" ? "unknown" : work === "self_employed" ? "yes" : work === "employee" ? "no" : "unknown";
    case "single_parent": return p.single_parent ? "yes" : "no";
    case "income_under_limit": return p.income_limit === "under" ? "yes" : p.income_limit === "over" ? "no" : "unknown";
    case "multiple": return (p.children ?? 1) >= 2 ? "yes" : "no";
    case "epidural": return p.epidural === "yes" || p.epidural === "yes_24h" ? "yes" : p.epidural === "no" ? "no" : "unknown";
    case "satogaeri": return p.satogaeri ? "yes" : "no";
    case "foreign_parent": return p.foreign_parent ? "yes" : "no";
  }
}

export type Judgement = { status: EligibilityStatus; checks: { key: EligibilityKey; label: string; result: Check }[] };

/** 鍵を全部満たせば対象。1つでも no なら対象外。no が無く unknown があれば要確認。鍵が無ければ対象（全員） */
export function judgeEligibility(keys: readonly EligibilityKey[] | null | undefined, p: Preferences): Judgement {
  const checks = (keys ?? []).map((key) => ({ key, label: ELIGIBILITY_LABEL[key], result: checkKey(key, p) }));
  const status: EligibilityStatus = checks.some((c) => c.result === "no") ? "not_eligible" : checks.some((c) => c.result === "unknown") ? "check" : "eligible";
  return { status, checks };
}

export const STATUS_LABEL: Record<EligibilityStatus, string> = { eligible: "あなたは対象", not_eligible: "対象外", check: "要確認" };
