import { Icon, type IconName } from "./Icon";

/**
 * 状態の記号を全画面で同じにする: 形（アイコン）＋言葉＋色。色だけに頼らない。
 *  done 済／na 該当しない／overdue 期限切れ／soon 30日以内／eligible 対象／check 要確認／not_eligible 対象外／open まだ余裕／this_week 今週
 */
export type Status = "done" | "na" | "overdue" | "soon" | "eligible" | "check" | "not_eligible" | "open" | "this_week" | "unknown";

const DEF: Record<Status, { icon: IconName; label: string; cls: string }> = {
  done: { icon: "checkCircle", label: "完了", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  na: { icon: "next", label: "該当しない", cls: "border-slate-300 bg-slate-100 text-slate-600" },
  overdue: { icon: "alert", label: "期限を過ぎています", cls: "border-amber-300 bg-amber-50 text-amber-900" },
  soon: { icon: "clock", label: "期限が30日以内", cls: "border-amber-200 bg-amber-50 text-amber-800" },
  eligible: { icon: "checkCircle", label: "あなたは対象", cls: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  check: { icon: "help", label: "要確認", cls: "border-amber-200 bg-amber-50 text-amber-800" },
  not_eligible: { icon: "next", label: "対象外", cls: "border-slate-300 bg-slate-100 text-slate-600" },
  open: { icon: "calendar", label: "まだ余裕", cls: "border-blue-200 bg-blue-50 text-blue-800" },
  this_week: { icon: "clock", label: "今週が目安", cls: "border-amber-200 bg-amber-50 text-amber-800" },
  unknown: { icon: "help", label: "未確認", cls: "border-slate-300 bg-slate-100 text-slate-600" },
};

export function StatusBadge({ status, label, className = "" }: { status: Status; /** 言葉を変えたいとき */ label?: string; className?: string }) {
  const d = DEF[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-base font-bold ${d.cls} ${className}`}>
      <Icon name={d.icon} className="size-5 shrink-0" />
      {label ?? d.label}
    </span>
  );
}
