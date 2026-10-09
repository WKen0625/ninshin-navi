import type { MoneyResult } from "@/lib/money";
import { Icon } from "./Icon";

const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;

/**
 * お金の引き算の図: 費用 → 一時金で減る → 窓口で払う → あとから受け取る助成 → 実負担。
 * 棒の長さで「どれだけ減るか」を見せる（色だけに頼らず、棒の長さと印で読める）。
 */
export function MoneyChart({ result }: { result: MoneyResult }) {
  if (!result.cost) return null;
  const cost = result.cost.yen;
  const counter = result.at_counter.reduce((n, l) => n + (l.amount_yen ?? 0), 0);
  const pay = result.pay_at_counter_yen ?? Math.max(0, cost - counter);
  const later = result.cash_later_total_yen;
  const net = result.net_yen != null ? Math.max(0, result.net_yen) : null;
  const w = (n: number) => `${Math.max(2, Math.min(100, (n / cost) * 100))}%`;
  const rows: { label: string; value: number; cls: string; icon: "money" | "check" | "building" | "download" | "flag"; sign?: string }[] = [
    { label: "出産にかかる費用（出産なびの目安）", value: cost, cls: "bg-slate-300", icon: "money" },
    { label: "一時金で減る（窓口で差し引かれる）", value: counter, cls: "bg-emerald-500", icon: "check", sign: "−" },
    { label: "退院のとき窓口で払う", value: pay, cls: "bg-amber-400", icon: "building" },
    { label: "あとから申請して受け取る", value: later, cls: "bg-sky-500", icon: "download", sign: "−" },
    ...(net != null ? [{ label: "実際の負担の目安", value: net, cls: "bg-gradient-to-r from-indigo-600 to-violet-600", icon: "flag" as const }] : []),
  ];
  return (
    <figure className="card space-y-3">
      <figcaption className="text-base font-bold text-ink">お金の引き算（棒の長さ＝金額）</figcaption>
      <ol className="space-y-2">
        {rows.map((r) => (
          <li key={r.label} className="space-y-1">
            <p className="flex items-center justify-between gap-3 text-base">
              <span className="flex items-center gap-2 text-slate-700"><Icon name={r.icon} className="size-5 shrink-0 text-slate-500" />{r.label}</span>
              <span className="shrink-0 font-bold text-ink">{r.sign ?? ""}{yen(r.value)}</span>
            </p>
            <div className="h-5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
              <div className={`h-full rounded-full ${r.cls}`} style={{ width: w(r.value) }} />
            </div>
          </li>
        ))}
      </ol>
      <p className="text-base text-slate-600">「最大」の助成は上限額。申請しないと受け取れません。実際の請求額はお産の経過や部屋で変わります。</p>
    </figure>
  );
}
