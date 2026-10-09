"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { applyWindowOf } from "@/lib/apply-window";
import { downloadIcs, eventOfStep, googleCalendarUrl, icsOf, reentryEvents } from "@/lib/calendar";
import { APPLY_TO_LABEL, classifyApplyTo, type ApplyTo } from "@/lib/apply-to";
import { assignStep, clearStep, markStep, markStuck, toFamily, type FamilyState } from "@/lib/family-state";
import { BASIS_LABEL } from "@/lib/due-date";
import { journeyOf } from "@/lib/journey";
import { WHO_LABEL, whoOf } from "@/lib/who";
import { NA_REASONS, naLabel, STUCK_REASONS, stuckLabel, type NaReason, type StuckReason } from "@/lib/stuck";
import { expandHeldDocuments, resolveNextActions, type NextAction, type Step } from "@/lib/next-actions";
import type { Rules } from "@/lib/rules";
import type { Survey } from "@/lib/surveys";
import { ApplyToChips, ApplyWindowBox, isApplication } from "./ApplyWindow";
import { ContactBox, ContactList } from "./ContactBox";
import { Disclosure } from "./Disclosure";
import { Icon, IconTile, SectionHeading } from "./Icon";
import { JourneyMap } from "./JourneyMap";
import { TARGET_ICON } from "./CounterGrid";
import { DocumentGuide } from "./DocumentGuide";
import { FeedbackLink } from "./FeedbackLink";
import { LangHint } from "./LangHint";
import { SourceLink } from "./SourceLink";
import { SurveyCard } from "./SurveyCard";
import { getDeviceId, todayLocal, useFamilyState, useNotifyAvailable } from "./useFamilyState";

const fmt = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}年${m}月${day}日`;
};

type StuckStat = { reason: StuckReason | NaReason; reports: number };



/**
 * 「わからない」。理由を1つ選んでもらい、同意があればサーバーに送る（どこでつまずくかの集計のため）。
 * 送るのは ステップid・区・理由・妊娠週数 と、端末を区別する記号だけ。送らなくても、この端末には「わからない」の印が残る。
 */
function StuckBox({ step, state, week, mode, onSave, onClose }: { step: Step; state: FamilyState; week: number | null; /** stuck = わからない ／ na = 自分は該当しない（理由を1つ） */ mode: "stuck" | "na"; onSave: (next: FamilyState) => void; onClose: () => void }) {
  const [reason, setReason] = useState<StuckReason | NaReason | "">("");
  const na = mode === "na";
  const reasons: readonly { value: StuckReason | NaReason; label: string }[] = na ? NA_REASONS : STUCK_REASONS;
  const label = (v: StuckReason | NaReason) => (na ? naLabel(v as NaReason) : stuckLabel(v as StuckReason));
  const [agree, setAgree] = useState(state.consent_survey);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<StuckStat[] | null>(null);
  const today = todayLocal();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return setError(na ? "いちばん近い理由を1つ選んでください。" : "どこがわからないかを1つ選んでください。");
    setError("");
    const withConsent = { ...state, consent_survey: state.consent_survey || agree };
    const next = na ? markStep(withConsent, step, "not_applicable", today, reason as NaReason) : markStuck(withConsent, step.id, reason as StuckReason, today);
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
          同じ区でこの手続きに「{na ? "該当しない" : "わからない"}」を付けた人は、あなたを含めて{total}人です。
          {total > 1 ? `いちばん多い理由は「${label([...stats].sort((a, b) => Number(b.reports) - Number(a.reports))[0].reason as StuckReason)}」。` : ""}
          {na ? "本当に対象外か不安なときは、窓口に一度聞くと安心です。" : "運営が案内の書き方を直す材料にします。窓口に聞くときは、母子手帳と身分証を持っていくと早いです。"}
        </p>
        <button type="button" onClick={onClose} className="btn btn-ghost">閉じる</button>
      </div>
    );
  }
  return (
    <form onSubmit={submit} className="card card-ai space-y-3">
      <p className="text-base font-bold">{na ? "該当しない理由にいちばん近いもの（1つ）" : "どこがわからないですか（1つ）"}</p>
      {na ? <p className="text-base text-slate-600">理由を選ぶと「終わったもの」に入ります。あとから元に戻せます。</p> : null}
      <div className="space-y-1">
        {reasons.map((r) => (
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
        <button type="submit" disabled={sending} className="btn btn-primary">{sending ? "送っています…" : na ? "該当しないにする" : "記録する"}</button>
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
  const [asking, setAsking] = useState<"stuck" | "na" | null>(null);
  const stuck = state.stuck.find((x) => x.step_id === step.id);
  const mark = TARGET_ICON[targets[0] ?? "ward"];
  const who = whoOf(step, state.assignments);
  const event = eventOfStep(step, window, state.region_name);
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
      <h3 className={`flex items-center gap-3 font-bold leading-snug ${emphasized ? "text-2xl" : "text-lg"}`}>
        <IconTile name={mark.icon} tone={mark.tone} size={emphasized ? "size-14" : "size-11"} />
        <span>{step.title}</span>
      </h3>
      {/* 文字を減らす: 期限の1行だけ常に見せ、やり方・窓口・根拠は押すと開く */}
      {window.until?.date ? (
        <p className="flex items-start gap-2 text-lg">
          <Icon name={window.until.date < today ? "alert" : "clock"} className="mt-1 size-6 shrink-0 text-amber-800" />
          <span>
            <span className="font-bold text-amber-900">{isApplication(step.title) ? "申請期限" : "期限"}: {fmt(window.until.date)}まで{window.until.estimated ? "（推定）" : ""}</span>
            {window.until.date < today ? <span className="block font-normal text-slate-700">期限は過ぎていますが、過ぎても受け付けてもらえる手続きが多いです。体調のよいときに窓口へ相談してください。</span> : null}
          </span>
        </p>
      ) : window.from?.text ? (
        <p className="flex items-start gap-2 text-base text-gray-700">
          <Icon name="calendar" className="mt-1 size-6 shrink-0 text-slate-500" />
          <span>{isApplication(step.title) ? "申請可能な時期" : "できる時期"}: {window.from.text}</span>
        </p>
      ) : null}
      {/* 担当: パートナーと分担するための目安。押して付け替えられる */}
      <p className="flex flex-wrap items-center gap-2 text-base">
        <span className={`rounded-md border px-2 py-0.5 font-bold ${who.who === "partner" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : who.who === "mother" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-300 bg-slate-50 text-slate-700"}`}>
          {WHO_LABEL[who.who]}{who.assigned ? "" : "（目安）"}
        </span>
        <button type="button" onClick={() => onSave(assignStep(state, step.id, who.who === "partner" ? "mother" : "partner"))} className="link min-h-9">
          {who.who === "partner" ? "本人がやるにする" : "パートナーがやるにする"}
        </button>
      </p>
      {event ? (
        <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer" className="link">
          <Icon name="calendar" className="mr-1.5 size-5" />
          Googleカレンダーに入れる（{fmt(event.date)}）
        </a>
      ) : null}
      <Disclosure summary="くわしく（やり方・窓口・期限の根拠）" open={false}>
        {step.detail ? <p className="text-base">{step.detail}</p> : null}
        <ApplyToChips targets={targets} detail={step.channel} />
        <ApplyWindowBox window={window} today={today} label={isApplication(step.title) ? "申請" : ""} />
        {step.action_url ? (
          <a href={step.action_url} target="_blank" rel="noopener noreferrer" className="link">
            手続きのページを開く
          </a>
        ) : null}
        {step.deadline_base === "facility" ? (
          <Link href="/hospitals" className="link">
            病院と締切を見る
          </Link>
        ) : null}
        <ContactBox contact={step.contact_id ? rules.contacts.find((c) => c.id === step.contact_id) ?? null : null} fallback={rules.contacts.filter((c) => c.region_code === state.region_code).slice(0, 1)} />
        <SourceLink url={step.source_url} verifiedAt={step.verified_at} needsReview={action.needs_review} />
      </Disclosure>
      {stuck ? (
        <p className="notice notice-info flex flex-wrap items-center justify-between gap-2">
          <span>「わからない」を付けています（{stuckLabel(stuck.reason)}）。窓口に聞くか、下の「まちがいを知らせる」から質問できます。</span>
          <button type="button" onClick={() => onSave(clearStep(state, step.id))} className="btn btn-ghost">印を消す</button>
        </p>
      ) : null}
      {asking ? (
        <StuckBox step={step} state={state} week={week} mode={asking} onSave={onSave} onClose={() => setAsking(null)} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => onMark(step, "done")} className="btn btn-done col-span-2">
            <Icon name="check" className="size-5" />
            完了した
          </button>
          <button type="button" onClick={() => setAsking("na")} className={`btn btn-ghost ${stuck ? "col-span-2" : ""}`}>
            該当しない
          </button>
          {!stuck ? (
            <button type="button" onClick={() => setAsking("stuck")} className="btn btn-ghost">
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
  const [whoFilter, setWhoFilter] = useState<"all" | "partner" | "mother">("all");
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
  // カレンダー: 日付のある手続きをまとめて .ics に（期限の7日前に通知の印）
  const familyNow = toFamily(state);
  const held = expandHeldDocuments(familyNow.held_documents, rules.documents);
  const events = [
    ...result.actions.map((a) => eventOfStep(a.step, applyWindowOf(a.step, { ...familyNow, held_documents: held }, rules.documents), state.region_name)).filter((e) => e != null),
    ...reentryEvents(state, typeof window === "undefined" ? undefined : window.location.origin),
  ];
  const loss = state.loss === true && state.birth_date != null;
  const provisional = state.due_date_basis != null && state.due_date_basis !== "known";
  const journey = journeyOf({ steps: rules.steps, regions: rules.regions, family: familyNow, progress: state.progress, actions: result.actions, current: result.current });
  const weekLabel = state.birth_date ? (loss ? "妊娠を終えた" : "出産後") : `妊娠${result.gestational_week}週`;
  const finished = state.progress.filter((p) => stepById.has(p.step_id));
  const mark = (step: Step, status: "done" | "not_applicable") => save(markStep(state, step, status, today));

  // 完了チェック直後に、任意で1問だけ（設計原則7）。「該当しない」のときは出さない。答えた／答えないと決めたら二度と出さない。
  const asking = state.progress
    .filter((p) => p.status === "done" && !state.surveys_closed.includes(p.step_id))
    .map((p) => ({ stepId: p.step_id, survey: surveys.find((s) => s.id === stepById.get(p.step_id)?.survey_question_id) }))
    .find((x) => x.survey != null);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        {loss ? (
          <>
            <SectionHeading as="h1" icon="heart" tone="slate" className="text-[2.2rem]">これからの手続き</SectionHeading>
            <p className="text-base text-gray-700">{state.region_name}・妊娠が終わった日 {fmt(state.birth_date!)}。ゆっくりで大丈夫です。必要なときに見てください。</p>
          </>
        ) : (
          <>
            <SectionHeading as="h1" icon="flag" tone="hero" className="text-[2.2rem]">今週やること</SectionHeading>
            <p className="text-base text-gray-700">
              {state.region_name}
              {state.birth_date ? `・出産日 ${fmt(state.birth_date)}` : `・いま妊娠${result.gestational_week}週・予定日 ${fmt(state.due_date)}${provisional ? "（仮）" : ""}`}
            </p>
            {provisional && !state.birth_date ? (
              <p className="notice notice-info">
                予定日は仮です（{BASIS_LABEL[state.due_date_basis!]}）。期限もその前提の目安です。病院で予定日がわかったら、<Link href="/navi" className="link-inline">入力を直す</Link>で直してください。
              </p>
            ) : null}
          </>
        )}
        <div className="flex flex-wrap gap-x-4">
          <Link href="/navi" className="link">入力を直す（紙が増えたとき・出産したとき）</Link>
          <Link href="/share" className="link">パートナーの端末にも出す（QR）</Link>
          {notifyAvailable && !loss ? <Link href="/notify" className="link">期限が近づいたらメールで知らせる</Link> : null}
        </div>
        <LangHint />
      </header>

      {!loss ? <JourneyMap journey={journey} weekLabel={weekLabel} /> : null}

      {loss && rules.contacts.length > 0 ? (
        <section className="space-y-3">
          <SectionHeading icon="phone" tone="blue">話せるところ</SectionHeading>
          <ContactList
            contacts={rules.contacts.filter((c) => /流産|死産|亡くされた|妊娠相談/.test(`${c.name}${c.topics ?? ""}`))}
            regionCode={state.region_code}
            regionName={state.region_name}
            showAll
            intro="気持ちのことも、手続きのことも、話せるところです。番号を押すと電話がかかります。急がなくて大丈夫です。"
          />
        </section>
      ) : null}


      {events.length > 0 ? (
        <section className="card card-ai space-y-3" aria-labelledby="cal">
          <div className="flex items-center gap-3">
            <IconTile name="calendar" tone="violet" size="size-12" />
            <div>
              <h2 id="cal" className="text-xl font-bold text-ink">期限をカレンダーに入れる</h2>
              <p className="text-base text-slate-600">{events.length}件。期限は7日前にお知らせ。{loss ? "" : state.birth_date ? "出産後30日に「届いた紙を足す」の予定も入れます。" : "出産予定日に「出産日を入れる」の予定も入れます。"}</p>
            </div>
          </div>
          <button type="button" onClick={() => downloadIcs(icsOf(events))} className="btn btn-primary btn-wide">
            <Icon name="download" className="size-6" />
            まとめてカレンダーに入れる
          </button>
          <Disclosure summary="入れ方（Google・iPhone・Outlook）">
            <ul className="list-disc space-y-1 pl-5">
              <li><b>iPhone</b>: 保存したファイルを開き「すべて追加」。Googleカレンダーを使っている人は、追加先にGoogleを選べます。</li>
              <li><b>Android・パソコンのGoogleカレンダー</b>: calendar.google.com → 設定 → 「インポート／エクスポート」でファイルを選びます。</li>
              <li><b>1件ずつ</b>: 各手続きの「Googleカレンダーに入れる」を押すと、その予定だけがGoogleカレンダーに開きます。</li>
            </ul>
            <p className="text-base text-slate-600">カレンダーへはあなたの端末から直接渡します。Tsugirakuのサーバーには送りません。期限が変わったら、もう一度入れ直してください（同じ予定は上書きされます）。</p>
          </Disclosure>
        </section>
      ) : null}

      {result.region_unverified ? (
        <p className="notice notice-info">
          {result.regions.some((r) => r.code === state.region_code)
            ? "この市区町村の情報は確認中です。"
            : "この市区町村の情報はまだありません。国と都道府県の共通の手続きだけを表示しています。"}
        </p>
      ) : null}

      {asking?.survey && !loss ? (
        <SurveyCard
          key={asking.stepId}
          survey={asking.survey}
          state={state}
          onSave={save}
          onClose={() => save({ ...state, surveys_closed: [...state.surveys_closed, asking.stepId] })}
        />
      ) : null}

      {!loss ? (
      <section className="space-y-3">
        <SectionHeading icon="document">もらった紙はどれ？</SectionHeading>
        <Disclosure summary="病院や区でもらった紙を調べる">
          <DocumentGuide documents={rules.documents} steps={rules.steps} regionCode={state.region_code} />
        </Disclosure>
      </section>
      ) : null}

      <section className="space-y-3">
        <SectionHeading icon="next" tone="hero">次にやること</SectionHeading>
        {result.current ? (
          <ActionCard action={result.current} today={today} emphasized regionCode={state.region_code} state={state} week={state.birth_date ? null : result.gestational_week} rules={rules} onMark={mark} onSave={save} />
        ) : (
          <p className="notice notice-done">
            {loss ? "いま出せる手続きは、すべて終わっています。" : "いま出せる手続きは、すべて終わっています。新しい紙を受け取ったら「入力を直す」から追加してください。"}
          </p>
        )}
      </section>

      {finished.length > 0 ? (
        <section className="space-y-2">
          <SectionHeading icon="checkCircle" tone="green">終わったもの</SectionHeading>
          <ul className="space-y-2">
            {finished.map((p) => (
              <li key={p.step_id} className="card card-quiet flex flex-wrap items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <Icon name={p.status === "done" ? "checkCircle" : "next"} className={`size-6 shrink-0 ${p.status === "done" ? "text-done" : "text-slate-400"}`} />
                  <span className={p.status === "done" ? "font-bold text-done" : "text-gray-600"}>{p.status === "done" ? "完了" : "該当しない"}</span>
                  ：{stepById.get(p.step_id)!.title}{p.reason ? <span className="block text-gray-600">理由: {naLabel(p.reason)}</span> : null}
                </span>
                <button type="button" onClick={() => save(clearStep(state, p.step_id))} className="btn btn-ghost">
                  元に戻す
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {rules.contacts.length > 0 && !loss ? (
        <section className="space-y-3">
          <SectionHeading icon="phone" tone="blue">困ったら、ここに聞く</SectionHeading>
          <Disclosure summary="窓口と電話相談を見る">
            <ContactList contacts={rules.contacts} regionCode={state.region_code} regionName={state.region_name} />
          </Disclosure>
        </section>
      ) : null}

      {result.upcoming.length > 0 ? (
        <section className="space-y-3">
          <SectionHeading icon="calendar" tone="violet">このあと</SectionHeading>
          <p className="text-base text-gray-600">期限が近い順。先に終わったものはここでチェックできます。</p>
          <div role="group" aria-label="担当で絞る" className="flex flex-wrap gap-1 rounded-2xl border border-white/70 bg-white/70 p-1">
            {(["all", "partner", "mother"] as const).map((w) => (
              <button key={w} type="button" aria-pressed={whoFilter === w} onClick={() => setWhoFilter(w)} className={`min-h-11 rounded-xl px-3 text-sm font-bold ${whoFilter === w ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white" : "text-slate-700 hover:bg-white"}`}>
                {w === "all" ? "本人もパートナーも" : w === "partner" ? "パートナーの分" : "本人の分"}
              </button>
            ))}
          </div>
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
          {result.upcoming.filter((a) => applyTo === "all" || classifyApplyTo(a.step.channel, a.step.region_code).includes(applyTo)).filter((a) => whoFilter === "all" || whoOf(a.step, state.assignments).who === whoFilter || (whoFilter === "partner" && whoOf(a.step, state.assignments).who === "either")).map((a) => <ActionCard key={a.step.id} action={a} today={today} emphasized={false} regionCode={state.region_code} state={state} week={state.birth_date ? null : result.gestational_week} rules={rules} onMark={mark} onSave={save} />)}
        </section>
      ) : null}

    </div>
  );
}
