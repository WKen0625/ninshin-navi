// 「わからない」の理由（選択式）。画面と API と集計で共通。値は supabase/migrations/0007 の check と同じ。

export const STUCK_REASONS = [
  { value: "where", label: "どこ（窓口・ページ）に行けばよいかわからない" },
  { value: "documents", label: "必要な紙・持ち物がわからない" },
  { value: "deadline", label: "いつまでにやればよいかわからない" },
  { value: "eligibility", label: "自分が対象かどうかわからない" },
  { value: "wording", label: "言葉の意味がわからない" },
  { value: "other", label: "その他" },
] as const;

export type StuckReason = (typeof STUCK_REASONS)[number]["value"];
export const isStuckReason = (v: unknown): v is StuckReason => STUCK_REASONS.some((r) => r.value === v);
export const stuckLabel = (v: StuckReason) => STUCK_REASONS.find((r) => r.value === v)?.label ?? v;

/** 「自分は該当しない」の理由（選択式）。値は supabase/migrations/0013 の check と同じ */
export const NA_REASONS = [
  { value: "na_not_employee", label: "会社員・公務員ではない（勤務先・健康保険の手続きがない）" },
  { value: "na_single", label: "配偶者・パートナーがいない（ひとり親）" },
  { value: "na_already", label: "別の方法ですでに済ませた" },
  { value: "na_not_eligible", label: "窓口や案内で「対象外」と確認した" },
  { value: "na_unsure", label: "たぶん違うと思う（確認はしていない）" },
  { value: "na_other", label: "その他" },
] as const;
export type NaReason = (typeof NA_REASONS)[number]["value"];
export const isNaReason = (v: unknown): v is NaReason => NA_REASONS.some((r) => r.value === v);
export const naLabel = (v: NaReason) => NA_REASONS.find((r) => r.value === v)?.label ?? v;
