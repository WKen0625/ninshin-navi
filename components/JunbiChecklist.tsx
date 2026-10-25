"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { gestationalWeek } from "@/lib/next-actions";
import { Icon } from "./Icon";
import { OfferCard, type Offer } from "./OfferCard";
import { todayLocal, useFamilyState } from "./useFamilyState";

export type JunbiItemView = { id: string; name: string; why: string; offer: Offer | null; article: string | null; source_url: string | null };
export type JunbiGroupView = { id: string; title: string; from_week: number; to_week: number; lead: string | null; items: JunbiItemView[] };

const KEY = "tsugiraku:junbi";

/**
 * 出産準備リスト。チェックはこの端末にだけ保存（サーバーに送らない）。
 * Navi に予定日が入っていれば「いまの時期」の見出しを目立たせる（本当の日付に基づく案内だけ。あおらない）。
 */
export function JunbiChecklist({ groups }: { groups: JunbiGroupView[] }) {
  const { state } = useFamilyState();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
      if (Array.isArray(raw)) setChecked(new Set(raw.filter((x) => typeof x === "string")));
    } catch {
      // 保存できない環境でも、画面の中では動く
    }
  }, []);
  const toggle = (id: string) => {
    setChecked((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        window.localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        /* 保存できなくても続ける */
      }
      return next;
    });
  };

  const week = useMemo(() => {
    if (!state || state.loss) return null;
    if (state.birth_date) return 99;
    return gestationalWeek(state.due_date, todayLocal());
  }, [state]);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const done = groups.reduce((n, g) => n + g.items.filter((i) => checked.has(`${g.id}:${i.id}`)).length, 0);

  return (
    <div className="space-y-8">
      <div className="card space-y-2 print:hidden">
        <p className="flex items-baseline justify-between gap-3 text-base">
          <span className="font-bold text-ink">チェック済み</span>
          <span className="font-bold text-ink">{done} / {total}</span>
        </p>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all" style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} />
        </div>
        <p className="text-base text-slate-600">
          {week == null ? (
            <>予定日を入れると、いまの時期の準備が目立つように出ます。<Link href="/navi" className="link-inline">予定日を入れる</Link></>
          ) : week >= 99 ? "出産後です。「産後1か月の買い足し」から見てください。" : week < Math.min(...groups.map((g) => g.from_week)) ? (
            <>いま妊娠{week}週。準備は{Math.min(...groups.map((g) => g.from_week))}週ごろからで間に合います。いまは<Link href="/articles/early-dont-buy-yet" className="link-inline">買わなくていいもの</Link>を先に。</>
          ) : `いま妊娠${week}週。「いまの時期」の見出しから見てください。`}
        </p>
        <button type="button" onClick={() => window.print()} className="btn btn-ghost"><Icon name="download" className="size-5" />印刷する（チェック欄つき）</button>
      </div>

      {groups.map((g) => {
        const now = week != null && week >= g.from_week && week <= g.to_week;
        return (
          <section key={g.id} id={g.id} className="scroll-mt-4 space-y-4">
            <h2 className={`flex flex-wrap items-center gap-2 text-2xl font-bold text-ink ${now ? "rounded-2xl bg-indigo-50 px-3 py-2" : ""}`}>
              {now ? <span className="chip-ai text-base">いまの時期</span> : null}
              {g.title}
            </h2>
            {g.lead ? <p className="text-base leading-loose text-slate-700">{g.lead}</p> : null}
            <ul className="space-y-5">
              {g.items.map((i) => {
                const key = `${g.id}:${i.id}`;
                const on = checked.has(key);
                return (
                  <li key={key} className="space-y-3">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input type="checkbox" className="check mt-1.5" checked={on} onChange={() => toggle(key)} />
                      <span className="min-w-0">
                        <span className={`block text-lg leading-snug font-bold ${on ? "text-slate-400 line-through" : "text-ink"}`}>{i.name}</span>
                        <span className="mt-1 block text-base leading-loose text-slate-700">{i.why}</span>
                        {i.article || i.source_url ? (
                          <span className="mt-1 flex flex-wrap gap-x-4 text-base">
                            {i.article ? <Link href={i.article} className="link-inline">くわしい選び方</Link> : null}
                            {i.source_url ? <a href={i.source_url} target="_blank" rel="noopener noreferrer" className="link-inline">出典</a> : null}
                          </span>
                        ) : null}
                      </span>
                    </label>
                    {i.offer && !on ? <div className="pl-9 print:hidden"><OfferCard offer={i.offer} compact /></div> : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
