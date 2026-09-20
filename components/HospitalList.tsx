"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toFamily } from "@/lib/family-state";
import { listFacilities, type FacilityItem } from "@/lib/facilities";
import { gestationalWeek } from "@/lib/next-actions";
import type { HospitalData } from "@/lib/rules";
import { FeedbackLink } from "./FeedbackLink";
import { SourceLink } from "./SourceLink";
import { todayLocal, useFamilyState } from "./useFamilyState";

const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;
const fmt = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}年${m}月${day}日`;
};
const yesNo = (v: boolean | null, yes: string, no: string) => (v == null ? "未確認" : v ? yes : no);

function DeadlineBox({ item }: { item: FacilityItem }) {
  const week = item.facility.booking_deadline_week_official;
  if (item.status === "after_birth") return null;
  if (item.status === "unknown") {
    return <p className="notice notice-muted">締切の週は公表されていません（または未確認です）。早めに施設へ電話で確認してください。</p>;
  }
  return (
    <p className="notice notice-warn">
      <span className="font-bold">
        施設が公表している目安: 妊娠{week}週まで（{fmt(item.deadline!)}ごろ）
      </span>
      <span className="block">
        {item.status === "passed"
          ? "公表の目安を過ぎています。受け入れてもらえるか、施設へ電話で確認してください。"
          : item.status === "this_week"
            ? "今週が目安の週です。"
            : `あと${item.weeks_left}週です。`}
      </span>
    </p>
  );
}

function FacilityCard({ item, chosen, regionCode, onChoose }: { item: FacilityItem; chosen: boolean; regionCode: string; onChoose: () => void }) {
  const f = item.facility;
  const map = f.lat != null && f.lng != null ? `https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}` : null;
  return (
    <article className={`card space-y-3 ${chosen ? "card-selected" : ""}`}>
      <header>
        <h3 className="text-lg leading-snug font-bold text-ink">{f.name}</h3>
        <p className="text-base text-gray-700">
          {f.facility_type ?? "種別は未確認"}
          {f.address ? `・${f.address}` : ""}
        </p>
      </header>

      <DeadlineBox item={item} />

      {f.booking_policy ? (
        <div>
          <p className="text-base"><span className="font-bold">予約のルール: </span>{f.booking_policy}</p>
          <SourceLink url={f.booking_source_url} verifiedAt={f.verified_at} />
        </div>
      ) : null}

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-base">
        <dt className="text-gray-600">無痛分娩</dt>
        <dd>
          {yesNo(f.has_epidural, "希望すればできる", "行っていない")}
          {f.has_epidural ? `（${yesNo(f.epidural_24h, "24時間対応", "24時間は対応していない")}）` : ""}
        </dd>
        <dt className="text-gray-600">無痛分娩の助成</dt>
        <dd>{yesNo(f.tokyo_epidural_subsidy_target, "都道府県の対象医療機関の一覧に載っている", "対象医療機関の一覧に載っていない")}</dd>
        <dt className="text-gray-600">費用の目安</dt>
        <dd>
          {f.cost ? `${yen(f.cost.yen)}（出産なびの${f.cost.basis === "median" ? "中央値" : "平均値"}。一時金を引く前${f.cost.period ? `、${f.cost.period}` : ""}）` : "データなし"}
        </dd>
        <dt className="text-gray-600">費用の制度</dt>
        <dd>{f.scheme === "lumpsum" ? "出産育児一時金（50万円）" : f.scheme === "new_scheme" ? "新しい制度" : "どちらも選べる"}</dd>
      </dl>

      {item.stat ? (
        <p className="notice notice-info">
          同じ予定月の人の記録 {item.stat.reports}件: 予約できた {item.stat.booked}件／満枠・キャンセル待ち {item.stat.full_or_wait}件
          {item.stat.median_week_booked != null ? `／予約できた人が電話した週のまん中は妊娠${item.stat.median_week_booked}週` : ""}
        </p>
      ) : (
        <p className="text-base text-gray-600">同じ予定月の人の記録は、まだありません。</p>
      )}

      <div className="flex flex-wrap gap-x-4">
        {f.website_url ? <a href={f.website_url} target="_blank" rel="noopener noreferrer" className="link">施設のページ</a> : null}
        {map ? <a href={map} target="_blank" rel="noopener noreferrer" className="link">地図で見る</a> : null}
      </div>
      <SourceLink url={f.source_url} verifiedAt={f.verified_at} needsReview={f.needs_review} />

      <button type="button" onClick={onChoose} aria-pressed={chosen} className={`btn ${chosen ? "btn-primary" : "btn-ghost"}`}>
        {chosen ? "この施設で「お金」を計算中" : "この施設で「お金」を計算する"}
      </button>
      <div>
        <FeedbackLink target={`facilities:${f.id}`} regionCode={regionCode} />
      </div>
    </article>
  );
}

export function HospitalList() {
  const { state, loaded, save } = useFamilyState();
  const [data, setData] = useState<HospitalData | null>(null);
  const [failed, setFailed] = useState(false);
  const [onlyEpidural, setOnlyEpidural] = useState<boolean | null>(null);
  const today = todayLocal();
  const region = state?.region_code;

  useEffect(() => {
    if (!region) return;
    let stale = false;
    fetch(`/api/hospitals?region=${region}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: HospitalData) => !stale && setData(d))
      .catch(() => !stale && setFailed(true));
    return () => {
      stale = true;
    };
  }, [region]);

  // 入口で「無痛分娩を希望する」と答えた人は、最初から絞り込んでおく（外せる）
  const filter = onlyEpidural ?? state?.preferences.epidural === "yes";
  const items = useMemo(
    () => (state && data ? listFacilities({ ...data, family: toFamily(state), today, onlyEpidural: filter }) : []),
    [state, data, today, filter],
  );

  if (!loaded) return <p className="text-base">読み込み中…</p>;
  if (!state) {
    return (
      <div className="space-y-4">
        <p className="text-base">まだ入力がありません。</p>
        <Link href="/" className="link">最初の入力へ</Link>
      </div>
    );
  }
  if (failed) return <p className="notice notice-warn">情報を読み込めませんでした。少し待ってから開き直してください。</p>;
  if (!data) return <p className="text-base">読み込み中…</p>;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="h-page">病院と締切</h1>
        <p className="text-base text-gray-700">
          {state.region_name}でお産ができる施設
          {state.birth_date ? "" : `・いま妊娠${gestationalWeek(state.due_date, today)}週`}
        </p>
        <p className="text-base text-gray-700">並びは、施設が公表している予約の目安の週が早い順です。おすすめ順ではありません。</p>
      </header>

      {data.facilities.length === 0 ? (
        <p className="notice notice-info">
          この市区町村の施設の情報はまだありません。厚生労働省の「出産なび」で探せます。
          <a href="https://birth-navi.mhlw.go.jp/" target="_blank" rel="noopener noreferrer" className="link ml-1">出産なびを開く</a>
        </p>
      ) : (
        <>
          <label className="flex min-h-11 items-center gap-3 text-base">
            <input type="checkbox" className="check" checked={filter} onChange={(e) => setOnlyEpidural(e.target.checked)} />
            無痛分娩ができると確認できた施設だけ（{items.length}件を表示中）
          </label>
          <section className="space-y-4">
            {items.map((item) => (
              <FacilityCard
                key={item.facility.id}
                item={item}
                chosen={state.preferences.facility_id === item.facility.id}
                regionCode={state.region_code}
                onChoose={() => save({ ...state, preferences: { ...state.preferences, facility_id: item.facility.id } })}
              />
            ))}
          </section>
          <p className="text-base text-gray-600">
            施設の基本情報と費用の出所: 厚生労働省「出産なび」。無痛分娩の欄は施設の自己申告で、実際に受けられるかは施設の判断によります。
          </p>
        </>
      )}
    </div>
  );
}
