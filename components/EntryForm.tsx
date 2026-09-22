"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { setSelectedDocuments, type FamilyState, type Preferences } from "@/lib/family-state";
import type { DocumentDef } from "@/lib/next-actions";
import type { Rules } from "@/lib/rules";
import { normalizePostal } from "@/lib/geo";
import { SourceLink } from "./SourceLink";
import { todayLocal, useFamilyState } from "./useFamilyState";

type Area = { contact: string; label: string; municipalities: { code: string; name: string; prefecture: string }[] };

const PHASE_ORDER = ["pre_notification", "notification", "pregnancy", "birth", "postpartum"];
const field = "field";
const legend = "h-section";

export function EntryForm({ area }: { area: Area }) {
  const router = useRouter();
  const { state, loaded, save } = useFamilyState();

  const [region, setRegion] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [born, setBorn] = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [confirmationDate, setConfirmationDate] = useState("");
  const [preferences, setPreferences] = useState<Preferences>({ epidural: "undecided", distance: "any", postal_code: null });
  const [postal, setPostal] = useState("");
  const [rules, setRules] = useState<Rules | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");
  const [error, setError] = useState("");

  // 前に入力した内容があれば、それを初期値にする
  useEffect(() => {
    if (!state) return;
    // 前に選んだ地域が、いまの対象地域に無ければ、選び直してもらう
    setRegion(area.municipalities.some((m) => m.code === state.region_code) ? state.region_code : "");
    setDueDate(state.due_date);
    setBorn(state.birth_date != null);
    setBirthDate(state.birth_date ?? "");
    setConfirmationDate(state.confirmation_date ?? "");
    setPreferences(state.preferences);
    setPostal(state.preferences.postal_code ?? "");
    setSelected(state.held_documents.filter((h) => !h.from_step).map((h) => h.document_id));
  }, [state]);

  useEffect(() => {
    if (!region) return setRules(null);
    let stale = false;
    fetch(`/api/rules?region=${region}`)
      .then((r) => r.json())
      .then((r: Rules) => !stale && setRules(r));
    return () => {
      stale = true;
    };
  }, [region]);

  // 選べる紙は documents マスタ。「まだ紙がない」「その他」（＝出典のない国の選択肢のうち、段階が最初のもの）を先頭に置く。
  const documents = useMemo(() => {
    if (!rules) return [];
    const rank = (d: DocumentDef) => (d.phase === "pre_notification" && !d.source_url ? -1 : PHASE_ORDER.indexOf(d.phase));
    return [...rules.documents].sort(
      (a, b) => rank(a) - rank(b) || b.region_code!.localeCompare(a.region_code!) || a.id.localeCompare(b.id),
    );
  }, [rules]);

  // 袋の中の紙（documents.includes）は、袋を選べば持っている扱いになる
  const includedBy = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of documents) if (selected.includes(d.id)) for (const inner of d.includes) map.set(inner, d.name ?? d.id);
    return map;
  }, [documents, selected]);

  const otherId = documents.find((d) => d.id.endsWith(".other"))?.id;
  const ownRegion = rules?.regions.find((r) => r.code === region);
  const chosen = area.municipalities.find((m) => m.code === region);
  const regionName = chosen ? `${chosen.prefecture}${chosen.name}` : "";

  const toggle = (id: string) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!chosen) return setError("お住まいの区を選んでください。");
    if (!dueDate) return setError("出産予定日を入れてください。");
    if (born && !birthDate) return setError("出産した日を入れてください。");
    const postalCode = postal.trim() ? normalizePostal(postal) : null;
    if (postal.trim() && !postalCode) return setError("郵便番号は7桁の数字で入れてください（例: 1070052）。");
    if (preferences.distance !== "any" && !postalCode) return setError("「自宅から病院までの時間」を選ぶには、郵便番号が要ります。郵便番号を入れるか、「こだわらない」を選んでください。");
    if (selected.length === 0) return setError("手元にある紙を1つ以上選んでください。何もなければ、いちばん上の「まだ紙がない」を選んでください。");
    setError("");

    const today = todayLocal();
    const base: FamilyState = {
      region_code: region,
      region_name: regionName,
      due_date: dueDate,
      confirmation_date: confirmationDate || null,
      birth_date: born ? birthDate : null,
      preferences: { ...preferences, postal_code: postalCode },
      // 市区町村を変えたら、前の地域の進み具合は引き継がない
      held_documents: state?.region_code === region ? state.held_documents : [],
      progress: state?.region_code === region ? state.progress : [],
      consent_survey: state?.consent_survey ?? false,
      consent_sensitive: state?.consent_sensitive ?? false,
      surveys_closed: state?.region_code === region ? state.surveys_closed : [],
    };
    const known = new Set(documents.map((d) => d.id));
    save(setSelectedDocuments(base, selected.filter((id) => known.has(id)), today));

    // 「その他」の自由記述は、人がレビューしてマスタに追加する。保存に失敗しても先へ進める。
    if (otherId && selected.includes(otherId) && otherText.trim()) {
      fetch("/api/document-suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ region_code: region, free_text: otherText }),
      }).catch(() => {});
    }
    router.push("/todo");
  }

  if (!loaded) return <p className="text-base">読み込み中…</p>;

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset className="card space-y-1">
        <legend className={legend}>1. お住まいの区（{area.label}）</legend>
        <div className="space-y-3">
          <label className="block text-base">
            区
            <select className={field} value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">選んでください</option>
              {area.municipalities.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}
            </select>
          </label>
          <p className="text-base text-gray-600">
            いまは{area.label}だけです。ほかの市区町村は準備中です。リクエストがあれば、
            <a href={`mailto:${area.contact}?subject=${encodeURIComponent("対象地域のリクエスト")}`} className="link-inline">{area.contact}</a>
            あてにご連絡ください。
          </p>
          {rules && ownRegion?.status !== "verified" ? (
            <p className="notice notice-info">
              {ownRegion ? "この市区町村の情報は確認中です。" : "この市区町村の情報はまだありません。国と都道府県の共通の手続きを表示します。"}
            </p>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="card space-y-1">
        <legend className={legend}>2. 出産予定日</legend>
        <div className="space-y-3">
          <label className="block text-base">
            出産予定日
            <input type="date" className={field} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </label>
          <p className="text-base text-gray-600">まだ病院で言われていなければ、最後の生理が始まった日の280日後を入れてください。</p>
          <label className="block text-base">
            病院で赤ちゃんの心拍を確認した日（わかれば）
            <input type="date" className={field} value={confirmationDate} onChange={(e) => setConfirmationDate(e.target.value)} />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-base">
            <input type="checkbox" className="check" checked={born} onChange={(e) => setBorn(e.target.checked)} />
            もう出産した
          </label>
          {born ? (
            <label className="block text-base">
              出産した日
              <input type="date" className={field} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </label>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="card space-y-1">
        <legend className={legend}>3. 希望</legend>
        <div className="space-y-3">
          <label className="block text-base">
            無痛分娩（麻酔で痛みをやわらげるお産）
            <select className={field} value={preferences.epidural} onChange={(e) => setPreferences({ ...preferences, epidural: e.target.value as Preferences["epidural"] })}>
              <option value="undecided">まだ決めていない</option>
              <option value="yes">希望する</option>
              <option value="no">希望しない</option>
            </select>
          </label>
          <label className="block text-base">
            自宅の郵便番号（7桁。病院までの時間の目安を出すためだけに使います）
            <input
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={8}
              placeholder="例: 1070052"
              className={field}
              value={postal}
              onChange={(e) => setPostal(e.target.value)}
            />
            <span className="block text-gray-600">番地や住所は要りません。郵便番号はこの端末の中にだけ保存します。</span>
          </label>
          <label className="block text-base">
            自宅から病院までの時間（郵便番号からの直線距離で出す目安です）
            <select className={field} value={preferences.distance} onChange={(e) => setPreferences({ ...preferences, distance: e.target.value as Preferences["distance"] })}>
              <option value="any">こだわらない</option>
              <option value="30min">30分以内</option>
              <option value="60min">1時間以内</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="card space-y-1">
        <legend className={legend}>4. いま手元にある紙（いくつでも）</legend>
        {!rules ? (
          <p className="text-base text-gray-600">市区町村を選ぶと、選べる紙が出ます。</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((d) => {
              const inside = includedBy.get(d.id);
              return (
                <li key={d.id} className="rounded-xl border border-slate-200 bg-white/70 p-3">
                  <label className="flex min-h-11 items-start gap-3 text-base">
                    <input type="checkbox" className="check mt-1" checked={selected.includes(d.id) || inside != null} disabled={inside != null} onChange={() => toggle(d.id)} />
                    <span>
                      <span className="font-bold">{d.name}</span>
                      {d.aliases?.length ? <span className="text-gray-600">（{d.aliases.join("、")}）</span> : null}
                      {inside ? <span className="block text-gray-600">「{inside}」に入っています</span> : null}
                      {d.description && d.id !== otherId ? <span className="block text-gray-600">{d.description}</span> : null}
                    </span>
                  </label>
                  {d.source_url ? <div className="pl-9"><SourceLink url={d.source_url} verifiedAt={d.verified_at} /></div> : null}
                  {d.id === otherId && selected.includes(d.id) ? (
                    <label className="mt-2 block pl-9 text-base">
                      紙に書いてある名前（名前や住所は書かないでください）
                      <input type="text" maxLength={200} className={field} value={otherText} onChange={(e) => setOtherText(e.target.value)} />
                      <span className="text-gray-600">一覧に追加するための参考として、紙の名前と市区町村だけを送ります。</span>
                    </label>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </fieldset>

      {error ? <p role="alert" className="notice notice-warn">{error}</p> : null}

      <button type="submit" className="btn btn-primary w-full text-lg">
        今週やることを見る
      </button>
      <p className="text-base text-gray-600">入力した内容は、この端末の中にだけ保存します。名前やメールアドレスは要りません。</p>
    </form>
  );
}
