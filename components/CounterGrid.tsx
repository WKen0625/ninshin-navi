"use client";

import { APPLY_TO_LABEL, type ApplyTo } from "@/lib/apply-to";
import { Icon, type IconName, type Tone } from "./Icon";

/** 窓口の種類を絵で見せる: 区役所＝建物（青）／東京都＝柱の建物（紫）／国＝日の丸（灰）／勤務先・健康保険＝かばん（緑）／医療機関＝病院（空色） */
export const TARGET_ICON: Record<ApplyTo, { icon: IconName; tone: Tone }> = {
  ward: { icon: "building", tone: "blue" },
  tokyo: { icon: "tower", tone: "violet" },
  national: { icon: "japan", tone: "slate" },
  employer: { icon: "briefcase", tone: "green" },
  facility: { icon: "hospital", tone: "sky" },
};

const TILE: Record<Tone, string> = {
  indigo: "bg-indigo-100 text-indigo-700", amber: "bg-amber-100 text-amber-800", green: "bg-emerald-100 text-emerald-700", blue: "bg-blue-100 text-blue-700",
  sky: "bg-sky-100 text-sky-700", violet: "bg-violet-100 text-violet-700", slate: "bg-slate-200 text-slate-700", hero: "bg-gradient-to-br from-indigo-600 to-violet-600 text-white",
};

const ORDER: ApplyTo[] = ["ward", "tokyo", "national", "employer", "facility"];
const SHORT: Record<ApplyTo, string> = { ward: "区役所", tokyo: "東京都", national: "国", employer: "勤務先", facility: "病院" };

/**
 * 「どこに行く」の地図: 窓口ごとの件数を5枚の板で見せ、押すとその窓口の分だけに絞る。
 */
export function CounterGrid({ counts, selected, onSelect }: { counts: Record<ApplyTo, number>; selected: ApplyTo | null; onSelect: (t: ApplyTo | null) => void }) {
  return (
    <div role="group" aria-label="窓口で絞る" className="grid grid-cols-5 gap-1">
      {ORDER.map((t) => {
        const m = TARGET_ICON[t];
        const on = selected === t;
        return (
          <button
            key={t}
            type="button"
            aria-pressed={on}
            aria-label={`${APPLY_TO_LABEL[t]} ${counts[t]}件`}
            onClick={() => onSelect(on ? null : t)}
            className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 px-0.5 py-2 text-center transition ${on ? "border-indigo-500 bg-white ring-2 ring-indigo-300/60" : "border-slate-200 bg-white hover:border-indigo-300"} ${counts[t] === 0 ? "opacity-50" : ""}`}
          >
            <span className={`grid size-10 place-items-center rounded-xl ${TILE[m.tone]}`}><Icon name={m.icon} className="size-6" /></span>
            <span className="text-[0.8rem] leading-tight font-bold whitespace-nowrap text-ink">{SHORT[t]}</span>
            <span className="text-base font-bold text-ink">{counts[t]}<span className="text-sm font-normal text-slate-500">件</span></span>
          </button>
        );
      })}
    </div>
  );
}
