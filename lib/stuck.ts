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
