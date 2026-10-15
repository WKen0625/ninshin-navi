"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { applyWindowOf } from "@/lib/apply-window";
import { classifyApplyTo, APPLY_TO_LABEL } from "@/lib/apply-to";
import { toFamily } from "@/lib/family-state";
import { journeyOf, PHASE_INFO, PHASES } from "@/lib/journey";
import { expandHeldDocuments, regionChain, resolveNextActions } from "@/lib/next-actions";
import type { Rules } from "@/lib/rules";
import { suggestWho, WHO_LABEL } from "@/lib/who";
import { Icon } from "./Icon";
import { JourneyMap } from "./JourneyMap";
import { todayLocal, useFamilyState } from "./useFamilyState";

const fmt = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}年${m}月${day}日`;
};

/**
 * 「あなたの全体マップ」を1枚（A4）に。冷蔵庫に貼る・パートナーに渡す・ママ友に見せる用。
 * 中身は「今週やること」と同じデータ（全段階の手続きを、段階ごとにチェック欄つきで並べる）。ブラウザの印刷でPDFにもできる。
 */
export function PrintSheet() {
  const { state, loaded } = useFamilyState();
  const [rules, setRules] = useState<Rules | null>(null);
  const today = todayLocal();
  const region = state?.region_code;
  useEffect(() => {
    if (!region) return;
    fetch(`/api/rules?region=${region}`).then((r) => (r.ok ? r.json() : null)).then((r: Rules | null) => r && setRules(r)).catch(() => {});
  }, [region]);

  const view = useMemo(() => {
    if (!state || !rules) return null;
    const family = toFamily(state);
    const expanded = { ...family, held_documents: expandHeldDocuments(family.held_documents, rules.documents) };
    const result = resolveNextActions({ family, today, ...rules });
    const journey = journeyOf({ steps: rules.steps, regions: rules.regions, family, progress: state.progress, actions: result.actions, current: result.current });
    const codes = new Set(regionChain(family.region_code, rules.regions).map((r) => r.code));
    const inScope = rules.steps.filter((s) => codes.has(s.region_code));
    const overridden = new Set(inScope.map((s) => s.overrides_step_id).filter((id): id is string => id != null));
    const flags = new Set(family.flags ?? []);
    const loss = flags.has("loss");
    const all = inScope
      .filter((s) => !overridden.has(s.id))
      .filter((s) => (loss ? s.requires === "loss" : s.requires !== "loss"))
      .filter((s) => s.requires == null || flags.has(s.requires))
      .sort((a, b) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : 1));
    const done = new Map(state.progress.map((p) => [p.step_id, p.status]));
    const reason = new Map(result.actions.map((a) => [a.step.id, a.reason]));
    const rows = all.map((step) => ({ step, status: done.get(step.id) ?? null, reason: reason.get(step.id) ?? null, window: applyWindowOf(step, expanded, rules.documents) }));
    return { result, journey, rows };
  }, [state, rules, today]);

  if (!loaded) return <p className="text-base">読み込み中…</p>;
  if (!state) {
    return (
      <div className="space-y-4">
        <p className="text-base">まだ入力がありません。</p>
        <Link href="/navi" className="link">最初の入力へ</Link>
      </div>
    );
  }
  if (!view) return <p className="text-base">読み込み中…</p>;
  const weekLabel = state.birth_date ? "出産後" : `妊娠${view.result.gestational_week}週`;

  return (
    <div className="space-y-5 print:space-y-3">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <button type="button" onClick={() => window.print()} className="btn btn-primary"><Icon name="download" className="size-5" />印刷・PDFに保存</button>
        <Link href="/todo" className="link">今週やることへ戻る</Link>
        <p className="w-full text-base text-slate-600">A4たて1〜2枚。冷蔵庫に貼る、パートナーに渡す、ママ友に見せる用です。名前は入っていません。</p>
      </div>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-ink">あなたの全体マップ</h1>
        <p className="text-base text-slate-700">
          {state.region_name}・{state.birth_date ? `出産日 ${fmt(state.birth_date)}` : `予定日 ${fmt(state.due_date)}`}・{weekLabel}・{fmt(today)}時点
        </p>
      </header>

      <JourneyMap journey={view.journey} weekLabel={weekLabel} />

      {PHASES.map((phase) => {
        const list = view.rows.filter((r) => r.step.phase === phase);
        if (list.length === 0) return null;
        const info = PHASE_INFO[phase];
        return (
          <section key={phase} className="break-inside-avoid space-y-1">
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Icon name={info.icon} className="size-5 text-indigo-600" />{info.name}<span className="text-base font-normal text-slate-500">{info.hint}</span></h2>
            <ul className="divide-y divide-slate-200 rounded-xl border-2 border-slate-200 bg-white">
              {list.map(({ step, status, reason, window }) => {
                const targets = classifyApplyTo(step.channel, step.region_code);
                return (
                  <li key={step.id} className="flex items-start gap-2 px-3 py-1.5 text-base">
                    <span aria-hidden="true" className={`mt-1 grid size-5 shrink-0 place-items-center rounded border-2 ${status === "done" ? "border-emerald-600 bg-emerald-600 text-white" : status === "not_applicable" ? "border-slate-300 bg-slate-200" : "border-slate-400"}`}>
                      {status === "done" ? <Icon name="check" className="size-4" /> : status === "not_applicable" ? "–" : ""}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={status ? "text-slate-500 line-through decoration-slate-400" : "text-ink"}>{step.title}</span>
                      <span className="block text-sm text-slate-600">
                        {targets.map((t) => APPLY_TO_LABEL[t]).join("・")}・{WHO_LABEL[suggestWho(step)]}
                        {window.until?.date ? `・期限 ${fmt(window.until.date)}${window.until.estimated ? "（推定）" : ""}` : window.until?.text ? `・${window.until.text}` : window.from?.text ? `・${window.from.text}` : ""}
                        {reason === "overdue" ? "・期限切れ" : reason === "deadline_soon" ? "・30日以内" : ""}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className="text-sm text-slate-600">
        Tsugiraku Navi（www.tsugiraku.jp）。すべての期限と金額に出典と確認日があります。最終確認は窓口・医療機関へ。この紙は名前や住所を含みません。
      </p>
    </div>
  );
}
