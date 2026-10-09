import { PHASE_INFO, type Journey, type PhaseSummary } from "@/lib/journey";
import { Icon, IconTile } from "./Icon";

/**
 * 妊娠〜産後の全体マップ。5つの段階を道のように横に並べ、「いま」の位置と、段階ごとの件数（済・期限切れ・期限が近い・まだ）を
 * 色ではなく「形」で見せる: 済＝緑の✓、期限切れ＝琥珀の！、期限が近い＝琥珀の時計、まだ＝灰色の丸。
 */
export function JourneyMap({ journey, weekLabel }: { journey: Journey; /** 「妊娠12週」「出産から10日」など */ weekLabel: string }) {
  return (
    <section aria-label="全体マップ" className="card space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-base font-bold text-ink">全体マップ</p>
        <p className="text-base text-slate-600">
          済 <span className="font-bold text-done">{journey.totalDone}</span>・まだ <span className="font-bold text-ink">{journey.totalRemaining}</span>件
        </p>
      </div>
      <ol className="relative grid grid-cols-5 gap-1 pt-8">
        {/* 道の線 */}
        <div aria-hidden="true" className="absolute top-[54px] right-[10%] left-[10%] h-1 rounded-full bg-slate-200" />
        {journey.phases.map((p, i) => (
          <PhaseColumn key={p.phase} p={p} weekLabel={weekLabel} align={i === 0 ? "left" : i === journey.phases.length - 1 ? "right" : "center"} />
        ))}
      </ol>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-base text-slate-600">
        <span className="inline-flex items-center gap-1"><Icon name="checkCircle" className="size-5 text-done" />済</span>
        <span className="inline-flex items-center gap-1"><Icon name="alert" className="size-5 text-amber-700" />期限切れ</span>
        <span className="inline-flex items-center gap-1"><Icon name="clock" className="size-5 text-amber-700" />30日以内</span>
        <span className="inline-flex items-center gap-1"><span className="inline-block size-3 rounded-full border-2 border-slate-400" />まだ</span>
      </p>
    </section>
  );
}

function PhaseColumn({ p, weekLabel, align }: { p: PhaseSummary; weekLabel: string; /** 端の段階では札が画面からはみ出ないように寄せる */ align: "left" | "center" | "right" }) {
  const info = PHASE_INFO[p.phase];
  const tone = p.state === "current" ? "hero" : p.state === "past" ? "green" : "slate";
  const pending = Math.max(0, p.remaining - p.overdue - p.soon);
  return (
    <li className="relative flex flex-col items-center gap-1 text-center">
      {p.state === "current" ? (
        <span className={`absolute -top-0.5 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-2 py-0.5 text-sm font-bold whitespace-nowrap text-white shadow-sm ${align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2"}`}>
          いま・{weekLabel}
        </span>
      ) : null}
      <IconTile name={info.icon} tone={tone} size="size-11" />
      <span className={`text-base leading-tight font-bold ${p.state === "future" ? "text-slate-500" : "text-ink"}`}>{info.short}</span>
      {p.total === 0 ? (
        <span className="text-sm text-slate-400">—</span>
      ) : (
        <span className="flex flex-wrap justify-center gap-0.5" aria-label={`${info.name}: ${p.total}件中 ${p.done}件済み${p.overdue ? `、期限切れ${p.overdue}件` : ""}${p.soon ? `、期限が近い${p.soon}件` : ""}`}>
          {Array.from({ length: p.done }).map((_, i) => <Icon key={`d${i}`} name="checkCircle" className="size-4 text-done" />)}
          {Array.from({ length: p.overdue }).map((_, i) => <Icon key={`o${i}`} name="alert" className="size-4 text-amber-700" />)}
          {Array.from({ length: p.soon }).map((_, i) => <Icon key={`s${i}`} name="clock" className="size-4 text-amber-700" />)}
          {Array.from({ length: Math.min(pending, 12) }).map((_, i) => <span key={`p${i}`} className="inline-block size-3 rounded-full border-2 border-slate-400" />)}
          {pending > 12 ? <span className="text-sm text-slate-500">+{pending - 12}</span> : null}
        </span>
      )}
      <span className="text-sm text-slate-600">{p.total === 0 ? "" : `${p.done}/${p.total}`}</span>
    </li>
  );
}
