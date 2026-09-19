"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clearStep, markStep, toFamily } from "@/lib/family-state";
import { resolveNextActions, type NextAction, type Step } from "@/lib/next-actions";
import type { Rules } from "@/lib/rules";
import type { Survey } from "@/lib/surveys";
import { FeedbackLink } from "./FeedbackLink";
import { SourceLink } from "./SourceLink";
import { SurveyCard } from "./SurveyCard";
import { todayLocal, useFamilyState } from "./useFamilyState";

const fmt = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}年${m}月${day}日`;
};

function Deadline({ action, today }: { action: NextAction; today: string }) {
  const { deadline, deadline_estimated, step } = action;
  if (!deadline && !step.deadline_note) return null;
  return (
    <p className="rounded-md bg-amber-50 p-3 text-base text-amber-800">
      {deadline ? (
        <span className="font-bold">
          期限: {fmt(deadline)}
          {deadline_estimated ? "（推定）" : ""}
          {deadline < today ? "　期限を過ぎています。早めに窓口へ相談してください。" : ""}
        </span>
      ) : null}
      {step.deadline_note ? <span className="block">{step.deadline_note}</span> : null}
      {deadline_estimated ? <span className="block">心拍を確認した日が未入力のため、予定日から推定しています。</span> : null}
    </p>
  );
}

function ActionCard({ action, today, emphasized, regionCode, onMark }: { action: NextAction; today: string; emphasized: boolean; regionCode: string; onMark: (step: Step, status: "done" | "not_applicable") => void }) {
  const { step } = action;
  return (
    <article className={emphasized ? "space-y-3 rounded-lg border-2 border-blue-700 bg-white p-4" : "space-y-2 rounded-lg border border-gray-300 bg-gray-50 p-4"}>
      {emphasized ? (
        <p className="flex flex-wrap items-center gap-2 text-base">
          <span className="rounded bg-blue-700 px-2 py-1 font-bold text-white">Next Action</span>
          <span className={action.reason === "flow" ? "text-gray-700" : "font-bold text-amber-800"}>
            {action.reason === "overdue"
              ? "期限を過ぎているので、いちばん先に出しています"
              : action.reason === "deadline_soon"
                ? "期限が30日以内なので、いちばん先に出しています"
                : "手続きの順番で、次はこれです"}
          </span>
        </p>
      ) : action.reason !== "flow" ? (
        <p className="text-base font-bold text-amber-800">{action.reason === "overdue" ? "期限を過ぎています" : "期限が30日以内"}</p>
      ) : null}
      <h3 className={emphasized ? "text-xl font-bold" : "text-base font-bold"}>{step.title}</h3>
      {emphasized && step.detail ? <p className="text-base">{step.detail}</p> : null}
      {step.channel ? <p className="text-base text-gray-700">どこで: {step.channel}</p> : null}
      <Deadline action={action} today={today} />
      {emphasized && step.action_url ? (
        <a href={step.action_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-base text-info underline">
          手続きのページを開く
        </a>
      ) : null}
      {step.deadline_base === "facility" ? (
        <Link href="/hospitals" className="inline-flex min-h-11 items-center text-base text-info underline">
          病院と締切を見る
        </Link>
      ) : null}
      <SourceLink url={step.source_url} verifiedAt={step.verified_at} needsReview={action.needs_review} />
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => onMark(step, "done")} className="min-h-11 rounded-md bg-green-700 px-4 py-2 text-base font-bold text-white">
          完了した
        </button>
        <button type="button" onClick={() => onMark(step, "not_applicable")} className="min-h-11 rounded-md border border-gray-400 bg-white px-4 py-2 text-base">
          自分は該当しない
        </button>
      </div>
      {emphasized ? <FeedbackLink target={`steps:${step.id}`} regionCode={regionCode} /> : null}
    </article>
  );
}

export function TodoList() {
  const { state, loaded, save } = useFamilyState();
  const [rules, setRules] = useState<Rules | null>(null);
  const [failed, setFailed] = useState(false);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const today = todayLocal();

  useEffect(() => {
    fetch("/api/surveys")
      .then((r) => (r.ok ? r.json() : []))
      .then(setSurveys)
      .catch(() => {});
  }, []);
  const region = state?.region_code;

  useEffect(() => {
    if (!region) return;
    let stale = false;
    fetch(`/api/rules?region=${region}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r: Rules) => !stale && setRules(r))
      .catch(() => !stale && setFailed(true));
    return () => {
      stale = true;
    };
  }, [region]);

  const result = useMemo(
    () => (state && rules ? resolveNextActions({ family: toFamily(state), today, ...rules }) : null),
    [state, rules, today],
  );

  if (!loaded) return <p className="text-base">読み込み中…</p>;
  if (!state) {
    return (
      <div className="space-y-4">
        <p className="text-base">まだ入力がありません。</p>
        <Link href="/" className="inline-flex min-h-11 items-center text-base text-info underline">最初の入力へ</Link>
      </div>
    );
  }
  if (failed) return <p className="rounded-md bg-amber-50 p-3 text-base text-amber-800">情報を読み込めませんでした。少し待ってから開き直してください。</p>;
  if (!result || !rules) return <p className="text-base">読み込み中…</p>;

  const stepById = new Map(rules.steps.map((s) => [s.id, s]));
  const finished = state.progress.filter((p) => stepById.has(p.step_id));
  const mark = (step: Step, status: "done" | "not_applicable") => save(markStep(state, step, status, today));

  // 完了チェック直後に、任意で1問だけ（設計原則7）。「該当しない」のときは出さない。答えた／答えないと決めたら二度と出さない。
  const asking = state.progress
    .filter((p) => p.status === "done" && !state.surveys_closed.includes(p.step_id))
    .map((p) => ({ stepId: p.step_id, survey: surveys.find((s) => s.id === stepById.get(p.step_id)?.survey_question_id) }))
    .find((x) => x.survey != null);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">今週やること</h1>
        <p className="text-base text-gray-700">
          {state.region_name}
          {state.birth_date ? `・出産日 ${fmt(state.birth_date)}` : `・いま妊娠${result.gestational_week}週・予定日 ${fmt(state.due_date)}`}
        </p>
        <div className="flex flex-wrap gap-x-4">
          <Link href="/" className="inline-flex min-h-11 items-center text-base text-info underline">入力を直す（紙が増えたとき・出産したとき）</Link>
          <Link href="/notify" className="inline-flex min-h-11 items-center text-base text-info underline">期限が近づいたらメールで知らせる</Link>
        </div>
      </header>

      {result.region_unverified ? (
        <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-base text-info">
          {result.regions.some((r) => r.code === state.region_code)
            ? "この市区町村の情報は確認中です。"
            : "この市区町村の情報はまだありません。国と都道府県の共通の手続きだけを表示しています。"}
        </p>
      ) : null}

      {asking?.survey ? (
        <SurveyCard
          key={asking.stepId}
          survey={asking.survey}
          state={state}
          onSave={save}
          onClose={() => save({ ...state, surveys_closed: [...state.surveys_closed, asking.stepId] })}
        />
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-bold">次にやること</h2>
        {result.current ? (
          <ActionCard action={result.current} today={today} emphasized regionCode={state.region_code} onMark={mark} />
        ) : (
          <p className="rounded-md border border-green-200 bg-green-50 p-4 text-base text-done">
            いま出せる手続きは、すべて終わっています。新しい紙を受け取ったら「入力を直す」から追加してください。
          </p>
        )}
      </section>

      {result.upcoming.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-bold">このあと</h2>
          <p className="text-base text-gray-600">期限が近いものが上、そのあとは手続きの順番です。先に終わったものがあれば、ここからチェックしてもかまいません。</p>
          {result.upcoming.map((a) => <ActionCard key={a.step.id} action={a} today={today} emphasized={false} regionCode={state.region_code} onMark={mark} />)}
        </section>
      ) : null}

      {finished.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-lg font-bold">終わったもの</h2>
          <ul className="space-y-2">
            {finished.map((p) => (
              <li key={p.step_id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-gray-200 p-3 text-base">
                <span>
                  <span className={p.status === "done" ? "font-bold text-done" : "text-gray-600"}>{p.status === "done" ? "完了" : "該当しない"}</span>
                  ：{stepById.get(p.step_id)!.title}
                </span>
                <button type="button" onClick={() => save(clearStep(state, p.step_id))} className="min-h-11 rounded-md border border-gray-400 px-3 text-base">
                  元に戻す
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
