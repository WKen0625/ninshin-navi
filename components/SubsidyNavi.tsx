"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DOCUMENT_FROM_LABEL, FORM_FROM_LABEL, type ApplyGuide } from "@/lib/apply-guide";
import { applyWindowOf } from "@/lib/apply-window";
import { classifyApplyTo, type ApplyTo } from "@/lib/apply-to";
import { judgeItems, listBenefitSteps, type BenefitItem } from "@/lib/benefit";
import { STATUS_LABEL, type Check, type EligibilityStatus } from "@/lib/eligibility";
import { toFamily, type FamilyState } from "@/lib/family-state";
import { amountOf } from "@/lib/money";
import { expandHeldDocuments } from "@/lib/next-actions";
import type { MoneyData, Rules } from "@/lib/rules";
import { ApplyToChips, ApplyWindowBox, isApplication } from "./ApplyWindow";
import { CounterGrid } from "./CounterGrid";
import { Disclosure } from "./Disclosure";
import { Icon, IconTile, SectionHeading, type Tone } from "./Icon";
import { SourceLink } from "./SourceLink";
import { todayLocal, useFamilyState } from "./useFamilyState";

const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;

const STATUS_TONE: Record<EligibilityStatus, Tone> = { eligible: "green", check: "amber", not_eligible: "slate" };
const CHECK_MARK: Record<Check, string> = { yes: "✓", no: "✕", unknown: "？" };
const CHECK_CLASS: Record<Check, string> = { yes: "border-emerald-200 bg-emerald-50 text-emerald-800", no: "border-slate-300 bg-slate-100 text-slate-600", unknown: "border-amber-200 bg-amber-50 text-amber-800" };

/** 「あなたの答え」の短い表示 */
function answersOf(p: FamilyState["preferences"]): string[] {
  const ins = { employer: "勤務先の健康保険", national: "国民健康保険", none: "健康保険なし", unknown: "健康保険: わからない" }[p.insurance ?? "unknown"];
  const work = { employee: "会社員・公務員", self_employed: "自営業・フリーランス", not_working: "働いていない", unknown: "働き方: わからない" }[p.work ?? "unknown"];
  const out = [ins, work];
  if (p.single_parent) out.push("ひとり親");
  if ((p.children ?? 1) >= 2) out.push("双子以上");
  if (p.epidural === "yes" || p.epidural === "yes_24h") out.push("無痛分娩を希望");
  if (p.satogaeri) out.push("里帰り");
  if (p.foreign_parent) out.push("子は外国籍");
  out.push({ under: "所得: 制限内の見込み", over: "所得: 制限超の見込み", unknown: "所得制限: わからない" }[p.income_limit ?? "unknown"]);
  return out;
}

/** 申請ガイド（どこに・何を・用紙は）。無い項目は、従来の文章と出典で代用する */
function GuideBody({ guide, fallbackChannel, regionCode, sourceUrl }: { guide: ApplyGuide | null | undefined; fallbackChannel: string | null; regionCode: string; sourceUrl: string }) {
  const submit = guide?.submit_to ?? fallbackChannel;
  const targets = classifyApplyTo(submit, regionCode);
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-base font-bold text-ink"><Icon name="building" className="size-5 text-indigo-600" />どこに出す</p>
        <ApplyToChips targets={targets} />
        {submit ? <p className="text-base">{submit}</p> : null}
        <p className="flex flex-wrap gap-x-4 text-base">
          {guide?.online_url ? <a href={guide.online_url} target="_blank" rel="noopener noreferrer" className="link">電子申請のページを開く</a> : null}
          {guide?.by_mail === true ? <span className="text-slate-700">郵送でも出せる</span> : guide?.by_mail === false ? <span className="text-slate-700">郵送は不可</span> : null}
        </p>
      </div>
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-base font-bold text-ink"><Icon name="document" className="size-5 text-indigo-600" />何を出す</p>
        {guide?.documents && guide.documents.length > 0 ? (
          <ul className="space-y-1">
            {guide.documents.map((d) => (
              <li key={d.name} className="flex flex-wrap items-start gap-2 text-base">
                <span className="rounded-md border border-slate-300 bg-slate-50 px-1.5 font-bold text-slate-700">{DOCUMENT_FROM_LABEL[d.from]}</span>
                <span>
                  {d.url ? <a href={d.url} target="_blank" rel="noopener noreferrer" className="link-inline">{d.name}</a> : d.name}
                  {d.note ? <span className="block text-slate-600">{d.note}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-base text-slate-700">
            書類の一覧はまだ入っていません。<a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="link-inline">出典のページ</a>で確認してください。
          </p>
        )}
      </div>
      <div className="space-y-1">
        <p className="flex items-center gap-2 text-base font-bold text-ink"><Icon name="pen" className="size-5 text-indigo-600" />用紙はどこでもらう</p>
        {guide?.form ? (
          <p className="text-base">
            {guide.form.url ? <a href={guide.form.url} target="_blank" rel="noopener noreferrer" className="link-inline">{FORM_FROM_LABEL[guide.form.from]}</a> : FORM_FROM_LABEL[guide.form.from]}
            {guide.form.note ? <span className="block text-slate-600">{guide.form.note}</span> : null}
          </p>
        ) : (
          <p className="text-base text-slate-700">窓口か出典のページで確認してください。</p>
        )}
      </div>
      {guide?.how_to ? (
        <div className="space-y-1">
          <p className="flex items-center gap-2 text-base font-bold text-ink"><Icon name="next" className="size-5 text-indigo-600" />手順</p>
          <p className="text-base whitespace-pre-line">{guide.how_to.replaceAll("  ", "\n")}</p>
        </div>
      ) : null}
    </div>
  );
}

function ItemCard({ item, state, rules, today, claimed, onClaim }: { item: BenefitItem; state: FamilyState; rules: Rules; today: string; claimed: boolean; onClaim: (v: boolean) => void }) {
  const family = toFamily(state);
  const expanded = { ...family, held_documents: expandHeldDocuments(family.held_documents, rules.documents) };
  const title = item.kind === "subsidy" ? item.subsidy.name : item.step.title;
  // 助成にガイドが無ければ、同じ制度の手続きのガイドで補う
  const guide = item.kind === "subsidy" ? (item.subsidy.apply_guide ?? item.step?.apply_guide) : item.step.apply_guide;
  const fallback = item.kind === "subsidy" ? (item.subsidy.apply_via ?? item.step?.channel ?? null) : item.step.channel;
  const regionCode = item.kind === "subsidy" ? item.subsidy.region_code : item.step.region_code;
  const sourceUrl = item.kind === "subsidy" ? item.subsidy.source_url : item.step.source_url;
  const verifiedAt = item.kind === "subsidy" ? item.subsidy.verified_at : item.step.verified_at;
  const needsReview = item.kind === "subsidy" ? item.subsidy.needs_review : item.step.needs_review;
  const own = applyWindowOf(item.kind === "subsidy" ? item.subsidy : item.step, expanded, rules.documents);
  // 期限が助成に無く、手続きにあるときは手続きの期限を使う
  const window = item.kind === "subsidy" && item.step && !own.until ? { from: own.from ?? applyWindowOf(item.step, expanded, rules.documents).from, until: applyWindowOf(item.step, expanded, rules.documents).until } : own;
  const amount = item.kind === "subsidy" ? amountOf(item.subsidy, { children: state.preferences.children ?? 1, cost: null, lumpsum: null }) : null;
  const amountNote = item.kind === "subsidy" ? item.subsidy.amount_note : null;
  const tone = STATUS_TONE[item.status];
  return (
    <article className={`card space-y-3 ${claimed ? "card-quiet opacity-70" : ""}`}>
      <div className="flex items-start gap-3">
        <IconTile name={item.kind === "subsidy" ? "money" : "document"} tone={tone} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg leading-snug font-bold text-ink">{title}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-base">
            <span className={`rounded-md border px-2 py-0.5 font-bold ${item.status === "eligible" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : item.status === "check" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-300 bg-slate-100 text-slate-600"}`}>
              {STATUS_LABEL[item.status]}
            </span>
            {amount != null ? <span className="font-bold text-ink">{item.kind === "subsidy" && item.subsidy.amount_is_upper_limit ? "最大" : ""}{yen(amount)}{item.kind === "subsidy" && item.subsidy.kind === "recurring" ? "／月" : ""}</span> : null}
          </p>
        </div>
      </div>
      {item.judgement.checks.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {item.judgement.checks.map((c) => (
            <li key={c.key} className={`rounded-md border px-2 py-0.5 text-base ${CHECK_CLASS[c.result]}`}>
              <span className="mr-1 font-bold">{CHECK_MARK[c.result]}</span>{c.label}
            </li>
          ))}
        </ul>
      ) : item.status === "check" ? (
        <p className="text-base text-amber-800">対象や金額が人によって違います。条件を読んで、窓口に確認してください。</p>
      ) : null}
      {window.from || window.until ? (
        <p className="flex items-start gap-2 text-base">
          <Icon name="clock" className="mt-1 size-5 shrink-0 text-amber-800" />
          <span>
            {window.until?.date ? <span className="font-bold text-amber-900">{isApplication(title) || item.kind === "subsidy" ? "申請期限" : "期限"}: {window.until.date.replace(/^(\d+)-(\d+)-(\d+)$/, "$1年$2月$3日")}まで{window.until.estimated ? "（推定）" : ""}</span> : window.until?.text ? <span className="font-bold text-amber-900">{window.until.text}</span> : null}
            {window.from?.text ? <span className={window.until ? "block text-slate-700" : "text-slate-700"}>申請できる時期: {window.from.text}</span> : null}
          </span>
        </p>
      ) : null}
      <Disclosure summary="どこに・何を・用紙は（申請の手順）">
        <GuideBody guide={guide} fallbackChannel={fallback} regionCode={regionCode} sourceUrl={sourceUrl} />
        {item.kind === "subsidy" && item.subsidy.conditions ? <p className="text-base text-slate-700"><span className="font-bold">条件: </span>{item.subsidy.conditions}</p> : null}
        {item.kind === "subsidy" && item.step?.detail ? <p className="text-base text-slate-700"><span className="font-bold">手続きの説明: </span>{item.step.detail}</p> : null}
        {amountNote ? <p className="text-base text-slate-700"><span className="font-bold">金額: </span>{amountNote}</p> : null}
        <ApplyWindowBox window={window} today={today} label="申請" />
        <SourceLink url={sourceUrl} verifiedAt={verifiedAt} needsReview={needsReview} />
      </Disclosure>
      <label className="flex min-h-11 items-center gap-3 text-base">
        <input type="checkbox" className="check" checked={claimed} onChange={(e) => onClaim(e.target.checked)} />
        申請した（この端末に記録）
      </label>
    </article>
  );
}

export function SubsidyNavi() {
  const { state, loaded, save } = useFamilyState();
  const today = todayLocal();
  const [data, setData] = useState<{ money: MoneyData; rules: Rules } | null>(null);
  const [failed, setFailed] = useState(false);
  const [showNot, setShowNot] = useState(false);
  const [counter, setCounter] = useState<ApplyTo | null>(null);
  const region = state?.region_code;

  useEffect(() => {
    if (!region) return;
    let stale = false;
    const get = (path: string) => fetch(`${path}?region=${region}`).then((r) => (r.ok ? r.json() : Promise.reject()));
    Promise.all([get("/api/money"), get("/api/rules")])
      .then(([money, rules]) => !stale && setData({ money, rules }))
      .catch(() => !stale && setFailed(true));
    return () => {
      stale = true;
    };
  }, [region]);

  const items = useMemo(() => {
    if (!state || !data) return [];
    const family = toFamily(state);
    const steps = listBenefitSteps({ steps: data.rules.steps, regions: data.rules.regions, family });
    return judgeItems({ subsidies: data.money.subsidies, steps, preferences: state.preferences });
  }, [state, data]);

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
  if (!data) return <p className="text-base">読み込み中…</p>;

  const claimed = new Set(state.claimed ?? []);
  const targetsOf = (item: BenefitItem) => {
    const guide = item.kind === "subsidy" ? (item.subsidy.apply_guide ?? item.step?.apply_guide) : item.step.apply_guide;
    const text = guide?.submit_to ?? (item.kind === "subsidy" ? (item.subsidy.apply_via ?? item.step?.channel) : item.step.channel);
    return classifyApplyTo(text, item.kind === "subsidy" ? item.subsidy.region_code : item.step.region_code);
  };
  const counts: Record<ApplyTo, number> = { ward: 0, tokyo: 0, national: 0, employer: 0, facility: 0 };
  for (const item of items) if (item.status !== "not_eligible") for (const t of new Set(targetsOf(item))) counts[t]++;
  const visible = items.filter((i) => counter == null || targetsOf(i).includes(counter));
  const setClaimed = (id: string, v: boolean) => save({ ...state, claimed: v ? [...claimed, id] : [...claimed].filter((x) => x !== id) });
  const groups: { status: EligibilityStatus; items: BenefitItem[] }[] = (["eligible", "check", "not_eligible"] as const).map((status) => ({ status, items: visible.filter((i) => i.status === status) }));
  const answered = state.preferences.insurance && state.preferences.insurance !== "unknown";

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <SectionHeading as="h1" icon="money" tone="green" className="text-[2.2rem]">助成金Navi</SectionHeading>
        <p className="text-base text-gray-700">{state.region_name}・もらえるお金と、保険料や医療費が減る手続き。あなたの答えから「対象かどうか」「どこに・何を出すか」を出します。</p>
      </header>

      <section className="card card-ai space-y-2">
        <p className="text-base font-bold text-ink">あなたの答え</p>
        <ul className="flex flex-wrap gap-2">
          {answersOf(state.preferences).map((a) => <li key={a} className="rounded-md border border-indigo-200 bg-white px-2 py-0.5 text-base text-indigo-900">{a}</li>)}
        </ul>
        <p className="text-base">
          <Link href="/navi" className="link-inline">入口で答えを直す</Link>
          {!answered ? <span className="block text-slate-600">健康保険と働き方を答えると、「要確認」が減ります。</span> : null}
        </p>
      </section>

      <section className="space-y-2">
        <p className="text-base font-bold text-ink">どこに行く（押すと絞れます）</p>
        <CounterGrid counts={counts} selected={counter} onSelect={setCounter} />
        {counter ? <p className="text-base text-slate-600">{visible.length}件を表示中。もう一度押すと全部に戻ります。</p> : null}
      </section>

      {groups.map(({ status, items: list }) =>
        list.length === 0 ? null : status === "not_eligible" ? (
          <section key={status} className="space-y-3">
            <button type="button" onClick={() => setShowNot((v) => !v)} className="btn btn-ghost" aria-expanded={showNot}>
              {showNot ? "対象外を隠す" : `対象外を見る（${list.length}件）`}
            </button>
            {showNot ? list.map((item) => <ItemCard key={item.id} item={item} state={state} rules={data.rules} today={today} claimed={claimed.has(item.id)} onClaim={(v) => setClaimed(item.id, v)} />) : null}
          </section>
        ) : (
          <section key={status} className="space-y-3">
            <SectionHeading icon={status === "eligible" ? "checkCircle" : "help"} tone={STATUS_TONE[status]}>
              {status === "eligible" ? "あなたが対象" : "要確認（答えによっては対象）"}
              <span className="ml-2 text-base font-normal text-slate-600">{list.length}件</span>
            </SectionHeading>
            {list.map((item) => <ItemCard key={item.id} item={item} state={state} rules={data.rules} today={today} claimed={claimed.has(item.id)} onClaim={(v) => setClaimed(item.id, v)} />)}
          </section>
        ),
      )}

      <p className="notice notice-muted">
        判定は入口の答えから機械的に出した目安です。所得制限の金額は聞いていないので、「要確認」は窓口か出典のページで確かめてください。金額の計算は<Link href="/money" className="link-inline">お金</Link>の画面、期限つきの一覧は<Link href="/todo" className="link-inline">今週やること</Link>にあります。
      </p>
    </div>
  );
}
