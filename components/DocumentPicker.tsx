"use client";

import { useMemo, useState } from "react";
import type { DocumentDef } from "@/lib/next-actions";
import { SourceLink } from "./SourceLink";

const PHASES: { key: string; label: string }[] = [
  { key: "pre_notification", label: "妊娠がわかったら" },
  { key: "notification", label: "妊娠届・母子手帳" },
  { key: "pregnancy", label: "妊娠中" },
  { key: "birth", label: "出産" },
  { key: "postpartum", label: "出産後" },
];

/**
 * 「いま手元にある紙」の選択。
 * 1. 区の「母と子の保健バッグ」（中に母子手帳・受診票が入っている袋）を一番最初に置く。これを選べば中の紙も選んだ扱いになり、入力の手間が省ける。
 * 2. 「まだ紙がない」「その他」。
 * 3. 残りは段階ごとのタブ。紙の名前を押すと、説明と出典が開く。
 * どの紙が袋に入っているかは documents.includes（データ）が決める。コードに区の名前や紙の名前は書かない（設計原則1）。
 */
export function DocumentPicker({
  documents, regionCode, selected, includedBy, otherId, otherText, onToggle, onOtherText,
}: {
  documents: DocumentDef[];
  regionCode: string;
  selected: string[];
  /** 紙のid → その紙が入っている袋の名前 */
  includedBy: Map<string, string>;
  otherId: string | undefined;
  otherText: string;
  onToggle: (id: string) => void;
  onOtherText: (v: string) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState<string | null>(null);

  const { bags, quick, rest } = useMemo(() => {
    const bags = documents.filter((d) => d.includes.length > 0 && d.region_code === regionCode);
    const quick = documents.filter((d) => d.phase === "pre_notification" && !d.source_url && !bags.includes(d));
    const rest = documents.filter((d) => !bags.includes(d) && !quick.includes(d));
    return { bags, quick, rest };
  }, [documents, regionCode]);
  const tabs = PHASES.filter((p) => rest.some((d) => d.phase === p.key));
  const current = tab && tabs.some((t) => t.key === tab) ? tab : tabs[0]?.key;
  const nameOf = (id: string) => documents.find((d) => d.id === id)?.name ?? id;
  const isOn = (d: DocumentDef) => selected.includes(d.id) || includedBy.has(d.id);

  return (
    <div className="space-y-4">
      {bags.map((d) => (
        <div key={d.id} className={`rounded-2xl border-2 p-4 ${isOn(d) ? "border-indigo-400 bg-indigo-50/70" : "border-indigo-200 bg-white/80"}`}>
          <label className="flex min-h-11 items-start gap-3 text-base">
            <input type="checkbox" className="check mt-1" checked={isOn(d)} onChange={() => onToggle(d.id)} />
            <span>
              <span className="chip-ai mb-1">まずこれ</span>
              <span className="block text-lg leading-snug font-bold text-ink">{d.name}</span>
              <span className="block text-gray-700">
                これを持っていれば、中の「{d.includes.map(nameOf).join("」「")}」も持っている扱いになります。下の紙を1つずつ選ばなくて済みます。
              </span>
            </span>
          </label>
          {d.source_url ? <div className="pl-9"><SourceLink url={d.source_url} verifiedAt={d.verified_at} /></div> : null}
        </div>
      ))}

      {quick.length > 0 ? (
        <ul className="space-y-2">
          {quick.map((d) => (
            <li key={d.id} className="rounded-xl border border-slate-200 bg-white/70 p-3">
              <label className="flex min-h-11 items-center gap-3 text-base">
                <input type="checkbox" className="check" checked={selected.includes(d.id)} onChange={() => onToggle(d.id)} />
                <span className="font-bold">{d.name}</span>
              </label>
              {d.id === otherId && selected.includes(d.id) ? (
                <label className="mt-2 block pl-9 text-base">
                  紙に書いてある名前（名前や住所は書かないでください）
                  <input type="text" maxLength={200} className="field" value={otherText} onChange={(e) => onOtherText(e.target.value)} />
                  <span className="text-gray-600">一覧に追加するための参考として、紙の名前と市区町村だけを送ります。</span>
                </label>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {tabs.length > 0 ? (
        <div className="space-y-3">
          <p className="text-base text-gray-700">ほかに持っている紙があれば、下から選んでください。紙の名前を押すと説明が出ます。</p>
          <div role="tablist" aria-label="紙の種類" className="flex flex-wrap gap-1 rounded-2xl border border-white/70 bg-white/70 p-1">
            {tabs.map((t) => {
              const count = rest.filter((d) => d.phase === t.key && isOn(d)).length;
              const active = t.key === current;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={`min-h-11 flex-1 rounded-xl px-2 text-sm font-bold whitespace-nowrap transition sm:text-base ${active ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm" : "text-slate-700 hover:bg-white"}`}
                >
                  {t.label}
                  {count > 0 ? <span className={`ml-1 rounded-full px-1.5 text-xs ${active ? "bg-white/25" : "bg-indigo-100 text-indigo-800"}`}>{count}</span> : null}
                </button>
              );
            })}
          </div>
          <ul role="tabpanel" className="space-y-2">
            {rest.filter((d) => d.phase === current).map((d) => {
              const inside = includedBy.get(d.id);
              const expanded = open === d.id;
              return (
                <li key={d.id} className={`rounded-xl border p-3 ${isOn(d) ? "border-indigo-300 bg-indigo-50/60" : "border-slate-200 bg-white/70"}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" className="check mt-2.5" aria-label={d.name} checked={isOn(d)} disabled={inside != null} onChange={() => onToggle(d.id)} />
                    <button
                      type="button"
                      aria-expanded={expanded}
                      onClick={() => setOpen(expanded ? null : d.id)}
                      className="flex min-h-11 flex-1 items-center justify-between gap-2 text-left text-base"
                    >
                      <span>
                        <span className="font-bold">{d.name}</span>
                        {inside ? <span className="block text-gray-600">「{inside}」に入っています</span> : null}
                      </span>
                      <span aria-hidden="true" className={`text-slate-400 transition ${expanded ? "rotate-180" : ""}`}>▾</span>
                    </button>
                  </div>
                  {expanded ? (
                    <div className="space-y-1 pl-9 text-base text-gray-700">
                      {d.aliases?.length ? <p>別の呼び方: {d.aliases.join("、")}</p> : null}
                      {d.description ? <p>{d.description}</p> : null}
                      {d.includes.length > 0 ? <p>中に入っている紙: {d.includes.map(nameOf).join("、")}</p> : null}
                      {d.source_url ? <SourceLink url={d.source_url} verifiedAt={d.verified_at} /> : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
