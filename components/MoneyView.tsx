"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toFamily } from "@/lib/family-state";
import { calculateMoney, schemesOf, type MoneyLine, type MoneyResult } from "@/lib/money";
import { expandHeldDocuments } from "@/lib/next-actions";
import type { MoneyData, Rules } from "@/lib/rules";
import { FeedbackLink } from "./FeedbackLink";
import { SourceLink } from "./SourceLink";
import { useFamilyState } from "./useFamilyState";

const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;
const fmt = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}年${m}月${day}日`;
};
const field = "block min-h-11 w-full rounded-md border border-gray-400 bg-white px-3 py-2 text-base";

function Line({ line, sign }: { line: MoneyLine; sign: "−" | "＋" | "" }) {
  const s = line.subsidy;
  return (
    <li className="space-y-1 rounded-md border border-gray-300 p-3">
      <div className="flex items-baseline justify-between gap-3 text-base">
        <span className="font-bold">{s.name}</span>
        <span className="shrink-0 font-bold">
          {line.amount_yen == null
            ? line.needs_facility
              ? "施設を選ぶと計算します"
              : "金額は人による"
            : `${s.amount_is_upper_limit ? "最大 " : ""}${sign}${yen(line.amount_yen)}${s.kind === "recurring" ? "（くり返し受け取る）" : ""}`}
        </span>
      </div>
      {s.amount_note ? <p className="text-base text-gray-700">{s.amount_note}</p> : null}
      {s.conditions ? <p className="text-base text-gray-700">条件: {s.conditions}</p> : null}
      {s.apply_via ? <p className="text-base text-gray-700">申請: {s.apply_via}</p> : null}
      {s.taxable ? <p className="text-base text-gray-700">税金: 課税の対象です。</p> : null}
      {line.deadline ? (
        <p className="rounded-md bg-amber-50 p-2 text-base font-bold text-amber-800">
          申請期限: {fmt(line.deadline)}
          {line.deadline_estimated ? "（推定。心拍を確認した日が未入力のため）" : ""}
        </p>
      ) : s.deadline_base === "birth_date" ? (
        <p className="rounded-md bg-amber-50 p-2 text-base text-amber-800">申請期限: 出産した日から{s.deadline_offset_days === 365 ? "1年" : `${s.deadline_offset_days}日`}以内（出産日を入力すると日付で出ます）</p>
      ) : null}
      <SourceLink url={s.source_url} verifiedAt={s.verified_at} needsReview={s.needs_review} />
    </li>
  );
}

function SchemeResult({ result, facilityName }: { result: MoneyResult; facilityName: string | null }) {
  const isNew = result.scheme === "new_scheme";
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold">
        {isNew ? "新しい制度（分娩費用を保険でまかなう制度）の場合" : "いまの制度（出産育児一時金 50万円）の場合"}
      </h2>

      {isNew ? (
        <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-base text-info">新しい制度の金額はまだ決まっていないため、計算はしません。決まっている内容だけを下に出します。</p>
      ) : (
        <>
          <div className="space-y-1 rounded-md border border-gray-300 p-3">
            <div className="flex items-baseline justify-between gap-3 text-base">
              <span className="font-bold">出産にかかる費用{facilityName ? `（${facilityName}）` : ""}</span>
              <span className="shrink-0 font-bold">{result.cost ? yen(result.cost.yen) : "—"}</span>
            </div>
            {result.cost ? (
              <>
                <p className="text-base text-gray-700">
                  出産なび（厚生労働省）の{result.cost.basis === "median" ? "中央値（まん中の人の額）" : "平均値（この施設は中央値が公表されていません）"}。
                  {result.cost.source.period ? `${result.cost.source.period}の請求データ。` : ""}
                  一時金を引く前の額で、保険診療を行った分娩は含みません。
                  {result.cost.basis === "median" && result.cost.source.total_avg_yen != null ? `平均値は${yen(result.cost.source.total_avg_yen)}。` : ""}
                </p>
                <SourceLink url={result.cost.source.source_url} verifiedAt={result.cost.source.verified_at} />
              </>
            ) : (
              <p className="text-base text-gray-700">{facilityName ? "この施設の費用データはまだありません。" : "施設を選ぶと、出産なびの費用が入ります。"}</p>
            )}
          </div>
          <ul className="space-y-2">{result.at_counter.map((l) => <Line key={l.subsidy.id} line={l} sign="−" />)}</ul>
          {result.pay_at_counter_yen != null ? (
            <p className="flex items-baseline justify-between gap-3 rounded-md bg-gray-100 p-3 text-base font-bold">
              <span>退院のとき窓口で払う目安</span>
              <span>{yen(result.pay_at_counter_yen)}</span>
            </p>
          ) : null}
        </>
      )}

      {result.cash_later.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-base font-bold">あとから申請して受け取るお金（合計 {yen(result.cash_later_total_yen)}）</h3>
          <ul className="space-y-2">{result.cash_later.map((l) => <Line key={l.subsidy.id} line={l} sign="＋" />)}</ul>
        </div>
      ) : null}

      {result.net_yen != null ? (
        <div className="rounded-lg border-2 border-blue-700 p-4">
          <p className="flex items-baseline justify-between gap-3 text-xl font-bold">
            <span>実際の負担の目安</span>
            <span>{yen(Math.max(0, result.net_yen))}</span>
          </p>
          <p className="mt-1 text-base text-gray-700">
            窓口で払う目安 − あとから受け取る合計{result.cash_later.some((l) => l.subsidy.amount_is_upper_limit) ? "（「最大」の助成は上限額で計算）" : ""}。申請しないと受け取れません。実際の請求額は、お産の経過や部屋の種類で変わります。
            {result.net_yen < 0 ? `受け取る合計のほうが${yen(-result.net_yen)}多くなります。` : ""}
          </p>
        </div>
      ) : null}

      {result.not_counted.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-base font-bold">上の計算に入れていないもの（毎月の給付・条件つき）</h3>
          <ul className="space-y-2">{result.not_counted.map((l) => <Line key={l.subsidy.id} line={l} sign="" />)}</ul>
        </div>
      ) : null}
    </section>
  );
}

export function MoneyView() {
  const { state, loaded, save } = useFamilyState();
  const [data, setData] = useState<{ money: MoneyData; rules: Rules } | null>(null);
  const [failed, setFailed] = useState(false);
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

  const facility = data?.money.facilities.find((f) => f.id === state?.preferences.facility_id) ?? null;
  const children = state?.preferences.children ?? 1;
  const wantsEpidural = state?.preferences.epidural === "yes";

  const results = useMemo(() => {
    if (!state || !data) return [];
    const family = toFamily(state);
    const expanded = { ...family, held_documents: expandHeldDocuments(family.held_documents, data.rules.documents) };
    return schemesOf(facility).map((scheme) =>
      calculateMoney({ scheme, facility, subsidies: data.money.subsidies, family: expanded, documents: data.rules.documents, children, wantsEpidural }),
    );
  }, [state, data, facility, children, wantsEpidural]);

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
  if (!data) return <p className="text-base">読み込み中…</p>;

  const ownRegion = data.rules.regions.find((r) => r.code === state.region_code);
  const setPref = (patch: Partial<typeof state.preferences>) => save({ ...state, preferences: { ...state.preferences, ...patch } });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">お金</h1>
        <p className="text-base text-gray-700">{state.region_name}・出産にかかる費用から、もらえるお金を引いた目安です。</p>
      </header>

      {ownRegion?.status !== "verified" ? (
        <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-base text-info">
          {ownRegion ? "この市区町村の情報は確認中です。" : "この市区町村の情報はまだありません。国と都道府県の制度だけを表示しています。"}
        </p>
      ) : null}

      <section className="space-y-3">
        <label className="block text-base">
          出産する（したい）施設
          <select className={field} value={facility?.id ?? ""} onChange={(e) => setPref({ facility_id: e.target.value || null })} disabled={data.money.facilities.length === 0}>
            <option value="">{data.money.facilities.length === 0 ? "この市区町村の施設データはまだありません" : "まだ決めていない"}</option>
            {data.money.facilities.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
        {facility?.needs_review ? <p className="text-base text-info">この施設の情報は一部確認中です。</p> : null}
        <label className="block text-base">
          おなかの赤ちゃんの人数
          <select className={field} value={children} onChange={(e) => setPref({ children: Number(e.target.value) })}>
            <option value={1}>1人</option>
            <option value={2}>2人（双子）</option>
            <option value={3}>3人</option>
          </select>
        </label>
        <label className="block text-base">
          無痛分娩（麻酔で痛みをやわらげるお産）
          <select className={field} value={state.preferences.epidural} onChange={(e) => setPref({ epidural: e.target.value as typeof state.preferences.epidural })}>
            <option value="undecided">まだ決めていない</option>
            <option value="yes">希望する</option>
            <option value="no">希望しない</option>
          </select>
        </label>
        {wantsEpidural && facility && facility.tokyo_epidural_subsidy_target === false ? (
          <p className="rounded-md bg-amber-50 p-3 text-base text-amber-800">この施設は、都道府県の無痛分娩の助成の「対象医療機関」の一覧に載っていません。助成を受けられない可能性があります。施設と都道府県の窓口に確認してください。</p>
        ) : null}
        {wantsEpidural ? <p className="text-base text-gray-700">無痛分娩の費用は施設ごとに違い、下の「出産にかかる費用」に上乗せになる場合があります。</p> : null}
      </section>

      {results.map((r) => <SchemeResult key={r.scheme} result={r} facilityName={facility?.name ?? null} />)}
      <FeedbackLink target="screen:money" regionCode={state.region_code} />
    </div>
  );
}
