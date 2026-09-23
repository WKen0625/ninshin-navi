"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FamilyState } from "@/lib/family-state";
import type { HospitalData } from "@/lib/rules";
import type { BookingRecord } from "@/lib/archive";
import type { Answers, Survey, SurveyField } from "@/lib/surveys";
import { getDeviceId } from "./useFamilyState";

const field = "field";
const yen = (n: number) => `${Math.round(n).toLocaleString("ja-JP")}円`;
const NOT_LISTED = "__not_listed__";

type BookingStat = { facility_id: string; reports: number; booked: number; full_or_wait: number; median_week_booked: number | null };
type CostStat = { facility_id: string; epidural: boolean | null; reports: number; median_paid_yen: number };
type Result = { saved: boolean; kind: "booking"; stats: BookingStat[] } | { saved: boolean; kind: "cost"; min_reports: number; stats: CostStat[] } | { saved: false; kind: "local" };

function defaultOf(f: SurveyField, state: FamilyState): string {
  // 「わからない・答えない」（値が null）の選択肢がある項目は、それを初期値にする（任意の項目で手を止めさせない）
  const skip = f.options?.findIndex((o) => o.value === null) ?? -1;
  if (skip >= 0) return String(skip);
  if (f.type === "select_facility") return state.preferences.facility_id ?? "";
  if (f.default_from === "profiles.due_date") return state.due_date.slice(0, 7);
  if (f.default_from === "profiles.birth_date") return state.birth_date?.slice(0, 7) ?? "";
  return "";
}

export function SurveyCard({ survey, state, facilityId, onSave, onClose, onSaved, onRecorded }: {
  survey: Survey;
  state: FamilyState;
  facilityId?: string;
  onSave: (next: FamilyState) => void;
  onClose: () => void;
  onSaved?: () => void;
  /** 回答をこの端末のアーカイブに残す（同意の有無にかかわらず。sent = 運営に送ったか） */
  onRecorded?: (record: BookingRecord) => void;
}) {
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>([]);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(survey.fields.map((f) => [f.key, f.type === "select_facility" && facilityId ? facilityId : defaultOf(f, state)])),
  );
  const [agree, setAgree] = useState(state.consent_survey);
  const [agreeSensitive, setAgreeSensitive] = useState(state.consent_sensitive);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    fetch(`/api/hospitals?region=${state.region_code}`)
      .then((r) => r.json())
      .then((d: HospitalData) => setFacilities(d.facilities.map(({ id, name }) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "ja"))));
  }, [state.region_code]);

  const hasSensitive = survey.fields.some((f) => f.requires === "profiles.consent_sensitive");
  const visible = survey.fields.filter((f) => f.requires !== "profiles.consent_sensitive" || agreeSensitive);
  const nameOf = (id: string) => facilities.find((f) => f.id === id)?.name ?? id;

  // この端末のアーカイブ用の1件（施設名と、選んだ選択肢の文字）
  function toRecord(answers: Answers, sent: boolean): BookingRecord {
    const facilityKey = survey.fields.find((f) => f.type === "select_facility")?.key;
    const fid = facilityKey ? (answers[facilityKey] as string | null) : null;
    // 要約は短く: 「妊娠9週に電話 → 満枠で断られた／言われた締切: 12週まで」。null（わからない・答えない）は省く
    const SHORT: Record<string, string> = { contacted_week: "電話", result: "結果", told_deadline_week: "言われた締切", deposit_yen: "予約金", wants_epidural: "無痛の希望", paid_yen: "窓口で払った額", scheme: "制度", delivery: "分娩方法" };
    const parts: string[] = [];
    let result = "";
    for (const f of visible) {
      const v = answers[f.key];
      if (f.type === "select_facility" || f.type === "month" || v == null) continue;
      const label = f.options?.find((o) => o.value === v)?.label ?? String(v);
      if (f.key === "contacted_week") parts.unshift(`妊娠${label}に電話`);
      else if (f.key === "result") result = label;
      else parts.push(`${SHORT[f.key] ?? f.label.slice(0, 12)}: ${label}`);
    }
    const head = parts[0] ? `${parts[0]}${result ? ` → ${result}` : ""}` : result;
    const summary = [head, ...parts.slice(1)].filter(Boolean).join("／");
    return {
      at: new Date().toISOString().slice(0, 10),
      facility_id: fid,
      facility_name: fid ? nameOf(fid) : "一覧にない施設",
      answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, typeof v === "boolean" ? String(v) : v])),
      summary,
      sent,
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree && !onRecorded) return setError("保存してよければ、下の「同意する」にチェックを入れてください。答えない場合は「答えない」を押してください。");
    const answers: Answers = {};
    for (const f of visible) {
      const raw = values[f.key];
      if (f.type === "select_facility") {
        if (!raw) return setError(`${f.label}を選んでください。`);
        answers[f.key] = raw === NOT_LISTED ? null : raw;
      } else if (f.type === "month") {
        if (!raw) return setError(`${f.label}を入れてください。`);
        answers[f.key] = raw;
      } else {
        const option = f.options?.[Number(raw)];
        if (raw === "" || !option) return setError(`${f.label}を選んでください。`);
        answers[f.key] = option.value;
      }
    }
    setError("");
    if (!agree) {
      // 運営には送らず、この端末のアーカイブにだけ残す
      onRecorded?.(toRecord(answers, false));
      setResult({ saved: false, kind: "local" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ survey_id: survey.id, device_id: getDeviceId(true), region_code: state.region_code, consent: true, consent_sensitive: agreeSensitive, answers }),
      });
      if (!res.ok) throw new Error();
      onSave({ ...state, consent_survey: true, consent_sensitive: agreeSensitive });
      const r = (await res.json()) as Result;
      onRecorded?.(toRecord(answers, true));
      setResult(r);
      onSaved?.();
    } catch {
      setError("送れませんでした。少し待ってからもう一度押すか、「答えない」で閉じてください。");
    } finally {
      setSending(false);
    }
  }

  if (result?.kind === "local") {
    return (
      <section className="card card-ai space-y-3">
        <h2 className="h-section">この端末に記録しました。</h2>
        <p className="text-base">運営には送っていません（同意がなかったため）。同じ区の人の集計は、同意して送ったときに見られます。</p>
        <button type="button" onClick={onClose} className="btn btn-ghost">閉じる</button>
      </section>
    );
  }
  if (result) {
    return (
      <section className="card card-ai space-y-3">
        <h2 className="h-section">ありがとうございます。{result.saved ? "記録しました。" : "一覧にない施設のため、運営の集計には入れていません。"}</h2>
        {result.kind === "booking" ? (
          result.stats.length === 0 ? (
            <p className="text-base">同じ予定月の記録は、まだほかにありません。</p>
          ) : (
            <ul className="space-y-2 text-base">
              {result.stats.map((s) => (
                <li key={s.facility_id}>
                  <span className="font-bold">{nameOf(s.facility_id)}</span>: 記録{s.reports}件（予約できた {s.booked}件／満枠・キャンセル待ち {s.full_or_wait}件）
                  {s.median_week_booked != null ? `。予約できた人が電話した週のまん中は妊娠${s.median_week_booked}週` : ""}
                </li>
              ))}
            </ul>
          )
        ) : result.stats.length === 0 ? (
          <p className="text-base">金額のまん中の値（中央値）は、同じ施設の記録が{result.min_reports}件たまると表示します。まだ件数が足りません。</p>
        ) : (
          <ul className="space-y-2 text-base">
            {result.stats.map((s) => (
              <li key={`${s.facility_id}-${s.epidural}`}>
                <span className="font-bold">{nameOf(s.facility_id)}</span>
                {s.epidural == null ? "" : s.epidural ? "（無痛分娩）" : "（無痛分娩なし）"}: 窓口で払った額のまん中は {yen(s.median_paid_yen)}（記録{s.reports}件）
              </li>
            ))}
          </ul>
        )}
        <p className="text-base text-gray-700">同じ区の人の記録の集計です。最終確認は窓口・医療機関へ。</p>
        <button type="button" onClick={onClose} className="btn btn-ghost">閉じる</button>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="card card-ai space-y-4">
      <header className="space-y-1">
        <h2 className="h-section">{survey.title}</h2>
        <p className="text-base">{survey.reward_text}</p>
        <p className="text-base text-gray-700">答えなくても、このサイトは今までどおり使えます。お礼の品やポイントはありません。</p>
      </header>

      {visible.map((f) => (
        <label key={f.key} className="block text-base">
          {f.label}
          {f.type === "month" ? (
            <input type="month" className={field} value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
          ) : (
            <select className={field} value={values[f.key]} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}>
              <option value="">選んでください</option>
              {f.type === "select_facility"
                ? [...facilities.map((x) => <option key={x.id} value={x.id}>{x.name}</option>), <option key={NOT_LISTED} value={NOT_LISTED}>一覧にない施設</option>]
                : f.options?.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
            </select>
          )}
        </label>
      ))}

      <fieldset className="card space-y-2">
        <legend className="px-1 text-base font-bold">保存についての同意</legend>
        <p className="text-base text-gray-700">
          保存するのは上で選んだ内容だけです。名前・メールアドレス・住所は保存しません。ほかの人には、件数やまん中の値などの集計だけを見せます。同じ人の二重回答を防ぐため、この端末を区別する記号（名前とは結びつきません）を暗号化して一緒に保存します。
          <Link href="/privacy" className="link-inline ml-1">くわしく・取り消す方法</Link>
        </p>
        <label className="flex min-h-11 items-center gap-3 text-base">
          <input type="checkbox" className="check" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          同意する（上の内容を保存してよい）
        </label>
        {onRecorded ? <p className="text-base text-gray-700">同意しなくても、この端末の「記録した施設」には残ります（運営には送りません）。</p> : null}
        {hasSensitive ? (
          <label className="flex min-h-11 items-center gap-3 text-base">
            <input type="checkbox" className="check" checked={agreeSensitive} onChange={(e) => setAgreeSensitive(e.target.checked)} />
            分娩方法（経腟分娩・帝王切開）も答える（任意）
          </label>
        ) : null}
      </fieldset>

      {error ? <p role="alert" className="notice notice-warn">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={sending} className="btn btn-primary">
          {sending ? "送っています…" : "答えて集計を見る"}
        </button>
        <button type="button" onClick={onClose} className="btn btn-ghost">答えない</button>
      </div>
    </form>
  );
}
