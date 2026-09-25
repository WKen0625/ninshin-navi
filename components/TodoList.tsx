"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { applyWindowOf } from "@/lib/apply-window";
import { APPLY_TO_LABEL, classifyApplyTo, type ApplyTo } from "@/lib/apply-to";
import { clearStep, markStep, markStuck, toFamily, type FamilyState } from "@/lib/family-state";
import { STUCK_REASONS, stuckLabel, type StuckReason } from "@/lib/stuck";
import { expandHeldDocuments, resolveNextActions, type NextAction, type Step } from "@/lib/next-actions";
import type { Rules } from "@/lib/rules";
import type { Survey } from "@/lib/surveys";
import { ApplyToChips, ApplyWindowBox, isApplication } from "./ApplyWindow";
import { ContactBox, ContactList } from "./ContactBox";
import { FeedbackLink } from "./FeedbackLink";
import { SourceLink } from "./SourceLink";
import { SurveyCard } from "./SurveyCard";
import { getDeviceId, todayLocal, useFamilyState, useNotifyAvailable } from "./useFamilyState";

const fmt = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}年${m}月${day}日`;
};

type StuckStat = { reason: StuckReason; reports: number };

/**
 * 「わからない」。理由を1つ選んでもらい、同意があればサーバーに送る（どこでつまずくかの集計のため）。
 * 送るのは ステップid・区・理由・妊娠週数 と、端末を区別する記号だけ。送らなくても、この端末には「わからない」の印が残る。
 */
function StuckBox({ step, state, week, onSave, onClose }: { step: Step; state: FamilyState; week: number | null; onSave: (next: FamilyState) => void; onClose: () => void }) {
  const [reason, setReason] = useState<StuckReason | "">("");
  const [agree, setAgree] = useState(state.consent_survey);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<StuckStat[] | null>(null);
  const today = todayLocal();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return setError("どこがわからないかを1つ選んでください。");
    setError("");
    const next = markStuck({ ...state, consent_survey: state.consent_survey || agree }, step.id, reason, today);
    if (!agree) {
      onSave(next);
      return onClose();
    }
    setSending(true);
    try {
      const res = await fetch("/api/stuck", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ device_id: getDeviceId(true), region_code: state.region_code, step_id: step.id, reason, gestational_week: week, consent: true }),
      });
      if (!res.ok) throw new Error();
      onSave(next);
      setStats(((await res.json()) as { stats: StuckStat[] }).stats);
    } catch {
      setError("送れませんでした。この端末には「わからない」の印だけ付けます。");
      onSave(next);
    } finally {
      setSending(false);
    }
  }

  if (stats) {
    const total = stats.reduce((n, x) => n + Number(x.reports), 0);
    return (
      <div className="card card-ai space-y-2">
        <p className="text-base font-bold">ありがとうございます。記録しました。</p>
        <p className="text-base">
          同じ区でこの手続きに「わからない」を付けた人は、あなたを含めて{total}人です。
          {total > 1 ? `いちばん多い理由は「${stuckLabel([...stats].sort((a, b) => Number(b.reports) - Number(a.reports))[0].reason)}」。` : ""}
          運営が案内の書き方を直す材料にします。窓口に聞くときは、母子手帳と身分証を持っていくと早いです。
        </p>
        <button type="button" onClick={onClose} className="btn btn-ghost">閉じる</button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="card card-ai space-y-3">
      <p className="text-base font-bold">どこがわからないですか（1つ）</p>
      <div className="space-y-1">
        {STUCK_REASONS.map((r) => (
          <label key={r.value} className="flex min-h-11 items-center gap-3 text-base">
            <input type="radio" name={`stuck-${step.id}`} className="check" checked={reason === r.value} onChange={() => setReason(r.value)} />
            {r.label}
          </label>
        ))}
      </div>
      <label className="flex min-h-11 items-start gap-3 text-base">
        <input type="checkbox" className="check mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>
          この記録（手続きの名前・区・理由・妊娠週数）を運営に送ってよい。名前や連絡先は送りません。
          <Link href="/privacy" className="link-inline ml-1">くわしく・取り消す方法</Link>
        </span>
      </label>
      {error ? <p role="alert" className="notice notice-warn">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={sending} className="btn btn-primary">{sending ? "送っています…" : "記録する"}</button>
        <button type="button" onClick={onClose} className="btn btn-ghost">やめる</button>
      </div>
    </form>
  );
}

function ActionCard({ action, today, emphasized, regionCode, state, week, rules, onMark, onSave }: { action: NextAction; today: string; emphasized: boolean; regionCode: string; state: FamilyState; week: number | null; rules: Rules; onMark: (step: Step, status: "done" | "not_applicable") => void; onSave: (next: FamilyState) => void }) {
  const { step } = action;
  const family = toFamily(state);
  const window = applyWindowOf(step, { ...family, held_documents: expandHeldDocuments(family.held_documents, rules.documents) }, rules.documents);
  const targets = classifyApplyTo(step.channel, step.region_code);
  const [asking, setAsking] = useState(false);
  const stuck = state.stuck.find((x) => x.step_id === step.id);
  return (
    <article className={emphasized ? "card card-hero space-y-3" : "card card-quiet space-y-2"}>
      {emphasized ? (
        <p className="flex flex-wrap items-center gap-2 text-base">
          <span className="chip-ai">Next Action</span>
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
      <ApplyToChips targets={targets} detail={step.channel} />
      <ApplyWindowBox window={window} today={today} label={isApplication(step.title) ? "申請" : ""} />
      {emphasized && step.action_url ? (
        <a href={step.action_url} target="_blank" rel="noopener noreferrer" className="link">
          手続きのページを開く
        </a>
      ) : null}
      {step.deadline_base === "facility" ? (
        <Link href="/hospitals" className="link">
          病院と締切を見る
        </Link>
      ) : null}
      <ContactBox contact={step.contact_id ? rules.contacts.find((c) => c.id === step.contact_id) ?? null : null} fallback={emphasized ? rules.contacts.filter((c) => c.region_code === state.region_code).slice(0, 1) : []} />
      <SourceLink url={step.source_url} verifiedAt={step.verified_at} needsReview={action.needs_review} />
      {stuck ? (
        <p className="notice notice-info flex flex-wrap items-center justify-between gap-2">
          <span>「わからない」を付けています（{stuckLabel(stuck.reason)}）。窓口に聞くか、下の「まちがいを知らせる」から質問できます。</span>
          <button type="button" onClick={() => onSave(clearStep(state, step.id))} className="btn btn-ghost">印を消す</button>
        </p>
      ) : null}
      {asking ? (
        <StuckBox step={step} state={state} week={week} onSave={onSave} onClose={() => setAsking(false)} />
      ) : (
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => onMark(step, "done")} className="btn btn-done">
            完了した
          </button>
          <button type="button" onClick={() => onMark(step, "not_applicable")} className="btn btn-ghost">
            自分は該当しない
          </button>
          {!stuck ? (
            <button type="button" onClick={() => setAsking(true)} className="btn btn-ghost">
              わからない
            </button>
          ) : null}
        </div>
      )}
      {emphasized ? <FeedbackLink target={`steps:${step.id}`} regionCode={regionCode} /> : null}
    </article>
  );
}

export function TodoList() {
  const { state, loaded, save } = useFamilyState();
  const [rules, setRules] = useState<Rules | null>(null);
  const [failed, setFailed] = useState(false);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [applyTo, setApplyTo] = useState<ApplyTo | "all">("all");
  const notifyAvailable = useNotifyAvailable();
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
        <Link href="/navi" className="link">最初の入力へ</Link>
      </div>
    );
  }
  if (failed) return <p className="notice notice-warn">情報を読み込めませんでした。少し待ってから開き直してください。</p>;
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
        <h1 className="h-page">今週やること</h1>
        <p className="text-base text-gray-700">
          {state.region_name}
          {state.birth_date ? `・出産日 ${fmt(state.birth_date)}` : `・いま妊娠${result.gestational_week}週・予定日 ${fmt(state.due_date)}`}
        </p>
        <div className="flex flex-wrap gap-x-4">
          <Link href="/navi" className="link">入力を直す（紙が増えたとき・出産したとき）</Link>
          {notifyAvailable ? <Link href="/notify" className="link">期限が近づいたらメールで知らせる</Link> : null}
        </div>
      </header>

      {(() => {
        const done = finished.length;
        const total = done + result.actions.length;
        return total > 0 ? (
          <div className="card card-quiet space-y-2" aria-label={`進み具合 ${done}/${total}`}>
            <p className="flex items-baseline justify-between text-base text-slate-600">
              <span>いま出ている手続きの進み具合</span>
              <span className="font-bold text-ink">{done} / {total}</span>
            </p>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400 transition-all" style={{ width: `${Math.round((done / total) * 100)}%` }} />
            </div>
          </div>
        ) : null;
      })()}

      {result.region_unverified ? (
        <p className="notice notice-info">
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
        <h2 className="h-section">次にやること</h2>
        {result.current ? (
          <ActionCard action={result.current} today={today} emphasized regionCode={state.region_code} state={state} week={state.birth_date ? null : result.gestational_week} rules={rules} onMark={mark} onSave={save} />
        ) : (
          <p className="notice notice-done">
            いま出せる手続きは、すべて終わっています。新しい紙を受け取ったら「入力を直す」から追加してください。
          </p>
        )}
      </section>

      {finished.length > 0 ? (
        <section className="space-y-2">
          <h2 className="h-section">終わったもの</h2>
          <ul className="space-y-2">
            {finished.map((p) => (
              <li key={p.step_id} className="card card-quiet flex flex-wrap items-center justify-between gap-2 text-base">
                <span>
                  <span className={p.status === "done" ? "font-bold text-done" : "text-gray-600"}>{p.status === "done" ? "完了" : "該当しない"}</span>
                  ：{stepById.get(p.step_id)!.title}
                </span>
                <button type="button" onClick={() => save(clearStep(state, p.step_id))} className="btn btn-ghost">
                  元に戻す
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {rules.contacts.length > 0 ? (
        <section className="space-y-3">
          <h2 className="h-section">困ったら、ここに聞く</h2>
          <ContactList contacts={rules.contacts} regionCode={state.region_code} regionName={state.region_name} />
        </section>
      ) : null}

      {result.upcoming.length > 0 ? (
        <section className="space-y-3">
          <h2 className="h-section">このあと</h2>
          <p className="text-base text-gray-600">期限が近いものが上、そのあとは手続きの順番です。先に終わったものがあれば、ここからチェックしてもかまいません。</p>
          {(() => {
            const present = new Set(result.upcoming.flatMap((a) => classifyApplyTo(a.step.channel, a.step.region_code)));
            if (present.size < 2) return null;
            const options: (ApplyTo | "all")[] = ["all", ...(["ward", "tokyo", "national", "employer", "facility"] as ApplyTo[]).filter((t) => present.has(t))];
            return (
              <div role="group" aria-label="窓口で絞る" className="flex flex-wrap gap-1 rounded-2xl border border-white/70 bg-white/70 p-1">
                {options.map((t) => (
                  <button key={t} type="button" aria-pressed={applyTo === t} onClick={() => setApplyTo(t)} className={`min-h-11 rounded-xl px-3 text-sm font-bold ${applyTo === t ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white" : "text-slate-700 hover:bg-white"}`}>
                    {t === "all" ? "すべての窓口" : APPLY_TO_LABEL[t]}
                  </button>
                ))}
              </div>
            );
          })()}
          {result.upcoming.filter((a) => applyTo === "all" || classifyApplyTo(a.step.channel, a.step.region_code).includes(applyTo)).map((a) => <ActionCard key={a.step.id} action={a} today={today} emphasized={false} regionCode={state.region_code} state={state} week={state.birth_date ? null : result.gestational_week} rules={rules} onMark={mark} onSave={save} />)}
        </section>
      ) : null}

    </div>
  );
}
