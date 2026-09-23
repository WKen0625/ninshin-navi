import type { ApplyWindow } from "@/lib/apply-window";
import { APPLY_TO_LABEL, type ApplyTo } from "@/lib/apply-to";

const fmt = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}年${m}月${day}日`;
};

/** 申請期間を目立たせて出す: いつから申請できて、いつまでに終えるか */
/** 申請ではない手続き（健診を受ける・面接を受ける）は「できる時期／期限」と書く */
export const isApplication = (title: string) => /申請|届|免除|減額|軽減|加入|登録|書類|予約/.test(title);

export function ApplyWindowBox({ window, today, label = "申請" }: { window: ApplyWindow; today: string; /** "申請" なら「申請可能な時期／申請期限」、"" なら「可能な時期／期限」 */ label?: string }) {
  const { from, until } = window;
  if (!from && !until) return null;
  const overdue = until?.date != null && until.date < today;
  // 見出しと日付は濃い琥珀色で太く、詳細（根拠の文章）は灰色で細く。色で読み分けられるようにする
  const detail = "block text-base font-normal text-slate-600";
  return (
    <dl className="notice notice-warn grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
      {from ? (
        <>
          <dt className="font-bold text-amber-900">{label}可能な時期</dt>
          <dd>
            {from.date ? <span className="font-bold text-amber-900">{fmt(from.date)}から</span> : null}
            {from.text ? <span className={from.date ? detail : "font-bold text-amber-900"}>{from.text}</span> : null}
          </dd>
        </>
      ) : null}
      {until ? (
        <>
          <dt className="font-bold text-amber-900">{label}期限</dt>
          <dd>
            {until.date ? (
              <span className="text-lg font-bold text-amber-900">
                {fmt(until.date)}まで{until.estimated ? "（推定）" : ""}
              </span>
            ) : (
              <span className="font-bold text-amber-900">決まった日付はない</span>
            )}
            {until.text ? <span className={detail}>{until.text}</span> : null}
            {overdue ? <span className="block font-bold text-amber-900">期限を過ぎています。早めに窓口へ相談してください。</span> : null}
            {until.estimated ? <span className={detail}>心拍を確認した日が未入力のため、予定日から推定しています。</span> : null}
          </dd>
        </>
      ) : null}
    </dl>
  );
}

const CHIP: Record<ApplyTo, string> = {
  ward: "bg-blue-50 text-blue-800 border-blue-200",
  tokyo: "bg-violet-50 text-violet-800 border-violet-200",
  national: "bg-slate-100 text-slate-800 border-slate-300",
  employer: "bg-emerald-50 text-emerald-800 border-emerald-200",
  facility: "bg-sky-50 text-sky-800 border-sky-200",
};

/** 窓口の分別の印: 区役所／東京都／国／勤務先・健康保険／医療機関 */
export function ApplyToChips({ targets, detail }: { targets: ApplyTo[]; detail?: string | null }) {
  return (
    <p className="flex flex-wrap items-center gap-2 text-base">
      <span className="text-gray-600">窓口:</span>
      {targets.map((t) => (
        <span key={t} className={`rounded-md border px-2 py-0.5 text-sm font-bold ${CHIP[t]}`}>{APPLY_TO_LABEL[t]}</span>
      ))}
      {detail && !targets.some((t) => APPLY_TO_LABEL[t] === detail || APPLY_TO_LABEL[t].startsWith(detail)) ? <span className="text-gray-700">{detail}</span> : null}
    </p>
  );
}
