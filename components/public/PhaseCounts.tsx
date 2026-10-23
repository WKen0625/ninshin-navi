import { PHASE_INFO, PHASES, type Phase } from "@/lib/journey";
import { IconTile } from "../Icon";

/** 時期ごとの件数（5段階の道）。押すとその時期の見出しへ */
export function PhaseCounts({ counts }: { counts: Record<Phase, number> }) {
  return (
    <nav aria-label="時期で移動" className="card">
      <ol className="grid grid-cols-5 gap-1">
        {PHASES.map((ph) => (
          <li key={ph}>
            <a href={`#${ph}`} className="flex flex-col items-center gap-1 rounded-xl p-1 text-center hover:bg-indigo-50">
              <IconTile name={PHASE_INFO[ph].icon} tone={counts[ph] > 0 ? "indigo" : "slate"} size="size-10" />
              <span className="text-[0.85rem] leading-tight font-bold whitespace-nowrap text-ink">{PHASE_INFO[ph].short}</span>
              <span className="text-base font-bold text-ink">{counts[ph]}<span className="text-sm font-normal text-slate-500">件</span></span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
