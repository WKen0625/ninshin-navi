"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BASIS_LABEL, estimateDueDate, type DueDateBasis } from "@/lib/due-date";
import { setSelectedDocuments, type FamilyState, type Preferences } from "@/lib/family-state";
import type { DocumentDef } from "@/lib/next-actions";
import type { Rules } from "@/lib/rules";
import { normalizePostal } from "@/lib/geo";
import { DocumentGuide } from "./DocumentGuide";
import { DocumentPicker } from "./DocumentPicker";
import { LangHint } from "./LangHint";
import { Disclosure } from "./Disclosure";
import { SectionHeading } from "./Icon";
import { SourceLink } from "./SourceLink";
import { todayLocal, useFamilyState } from "./useFamilyState";

type Area = { contact: string; label: string; municipalities: { code: string; name: string; prefecture: string }[] };

const PHASE_ORDER = ["pre_notification", "notification", "pregnancy", "birth", "postpartum"];
const field = "field";
const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}年${m}月${day}日`;
};

export function EntryForm({ area }: { area: Area }) {
  const router = useRouter();
  const { state, loaded, save } = useFamilyState();

  const [region, setRegion] = useState("");
  const [dueDate, setDueDate] = useState("");
  // 予定日がまだわからない人: 最後の生理が始まった日／検査薬で陽性になった日 から仮の予定日を出す
  const [basis, setBasis] = useState<DueDateBasis>("known");
  const [basisDate, setBasisDate] = useState("");
  // 流産・死産で妊娠を終えた
  const [loss, setLoss] = useState(false);
  const [lossDate, setLossDate] = useState("");
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
    setBasis(state.due_date_basis ?? "known");
    setBasisDate(state.due_date_input ?? "");
    setLoss(state.loss === true);
    setLossDate(state.loss ? (state.birth_date ?? "") : "");
    setBorn(!state.loss && state.birth_date != null);
    setBirthDate(state.loss ? "" : (state.birth_date ?? ""));
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
    const effectiveDue = basis === "known" ? dueDate : basisDate ? estimateDueDate(basis, basisDate) : "";
    if (!effectiveDue) return setError(basis === "known" ? "出産予定日を入れてください。" : "日付を入れてください（仮の予定日を計算します）。");
    if (loss && !lossDate) return setError("妊娠が終わった日を入れてください。");
    if (!loss && born && !birthDate) return setError("出産した日を入れてください。");
    const postalCode = postal.trim() ? normalizePostal(postal) : null;
    if (postal.trim() && !postalCode) return setError("郵便番号は7桁の数字で入れてください（例: 1070052）。");
    if (preferences.distance !== "any" && !postalCode) return setError("「自宅から病院までの時間」を選ぶには、郵便番号が要ります。郵便番号を入れるか、「こだわらない」を選んでください。");
    if (selected.length === 0) return setError("手元にある紙を1つ以上選んでください。何もなければ、いちばん上の「まだ紙がない」を選んでください。");
    setError("");

    const today = todayLocal();
    const base: FamilyState = {
      region_code: region,
      region_name: regionName,
      due_date: effectiveDue,
      due_date_basis: basis,
      due_date_input: basis === "known" ? null : basisDate,
      confirmation_date: confirmationDate || null,
      birth_date: loss ? lossDate : born ? birthDate : null,
      loss,
      preferences: { ...preferences, postal_code: postalCode },
      // 市区町村を変えたら、前の地域の進み具合は引き継がない
      held_documents: state?.region_code === region ? state.held_documents : [],
      progress: state?.region_code === region ? state.progress : [],
      consent_survey: state?.consent_survey ?? false,
      consent_sensitive: state?.consent_sensitive ?? false,
      surveys_closed: state?.region_code === region ? state.surveys_closed : [],
      stuck: state?.region_code === region ? state.stuck : [],
      assignments: state?.region_code === region ? state.assignments : {},
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
      <LangHint />
      <fieldset className="card space-y-1">
        <SectionHeading as="legend" icon="pin" tone="sky">1. お住まいの区（{area.label}）</SectionHeading>
        <div className="space-y-3">
          <label className="block text-base">
            区
            <select className={field} value={region} onChange={(e) => setRegion(e.target.value)}>
              <option value="">選んでください</option>
              {area.municipalities.map((m) => <option key={m.code} value={m.code}>{m.name}</option>)}
            </select>
          </label>
          <Disclosure summary="ほかの市区町村は？">
            <p>いまは{area.label}だけです。ほかの市区町村は準備中です。リクエストは
            <a href={`mailto:${area.contact}?subject=${encodeURIComponent("対象地域のリクエスト")}`} className="link-inline">{area.contact}</a>
            へ。</p>
          </Disclosure>
          {rules && ownRegion?.status !== "verified" ? (
            <p className="notice notice-info">
              {ownRegion ? "この市区町村の情報は確認中です。" : "この市区町村の情報はまだありません。国と都道府県の共通の手続きを表示します。"}
            </p>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="card space-y-1">
        <SectionHeading as="legend" icon="calendar" tone="violet">2. 出産予定日</SectionHeading>
        <div className="space-y-3">
          <label className="block text-base">
            出産予定日は？
            <select className={field} value={basis} onChange={(e) => setBasis(e.target.value as DueDateBasis)}>
              <option value="known">病院で言われた（わかる）</option>
              <option value="lmp">まだわからない。最後の生理が始まった日ならわかる</option>
              <option value="test">まだわからない。検査薬で陽性になった日ならわかる</option>
            </select>
          </label>
          {basis === "known" ? (
            <label className="block text-base">
              出産予定日
              <input type="date" className={field} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>
          ) : (
            <>
              <label className="block text-base">
                {basis === "lmp" ? "最後の生理が始まった日" : "検査薬で陽性になった日"}
                <input type="date" className={field} value={basisDate} onChange={(e) => setBasisDate(e.target.value)} />
              </label>
              {basisDate ? (
                <p className="notice notice-info">
                  仮の予定日: <b>{fmtDate(estimateDueDate(basis, basisDate))}</b>（{BASIS_LABEL[basis]}）。
                  まずはこの日付で「次にやること」を出します。病院で予定日がわかったら、ここで「病院で言われた」に直してください。
                </p>
              ) : null}
            </>
          )}
          <label className="block text-base">
            病院で赤ちゃんの心拍を確認した日（わかれば）
            <input type="date" className={field} value={confirmationDate} onChange={(e) => setConfirmationDate(e.target.value)} />
          </label>
          {!loss ? (
            <label className="flex min-h-11 items-center gap-3 text-base">
              <input type="checkbox" className="check" checked={born} onChange={(e) => setBorn(e.target.checked)} />
              もう出産した
            </label>
          ) : null}
          {born ? (
            <label className="block text-base">
              出産した日
              <input type="date" className={field} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </label>
          ) : null}
        </div>
      </fieldset>

      <fieldset className="card space-y-1">
        <SectionHeading as="legend" icon="heart" tone="amber">3. 希望</SectionHeading>
        <div className="space-y-3">
          <label className="block text-base">
            無痛分娩（麻酔で痛みをやわらげるお産）
            <select className={field} value={preferences.epidural} onChange={(e) => setPreferences({ ...preferences, epidural: e.target.value as Preferences["epidural"] })}>
              <option value="undecided">まだ決めていない</option>
              <option value="yes">希望する</option>
              <option value="yes_24h">希望する。24時間対応の病院を希望する</option>
              <option value="no">希望しない</option>
            </select>
          </label>
          <label className="block text-base">
            おなかの赤ちゃんの人数
            <select className={field} value={preferences.children ?? 1} onChange={(e) => setPreferences({ ...preferences, children: Number(e.target.value) })}>
              <option value={1}>1人</option>
              <option value={2}>2人（双子）</option>
              <option value={3}>3人以上</option>
            </select>

          </label>
          <label className="flex min-h-11 items-center gap-3 text-base">
            <input type="checkbox" className="check" checked={preferences.satogaeri === true} onChange={(e) => setPreferences({ ...preferences, satogaeri: e.target.checked })} />
            里帰り出産の予定がある（東京都外や助産所で健診を受ける）
          </label>
          <label className="flex min-h-11 items-start gap-3 text-base">
            <input type="checkbox" className="check mt-1" checked={preferences.foreign_parent === true} onChange={(e) => setPreferences({ ...preferences, foreign_parent: e.target.checked })} />
            <span>生まれる子が日本国籍にならない（両親とも外国籍など）</span>
          </label>
          <label className="block text-base">
            自宅の郵便番号（任意・7桁）
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
            <span className="block text-gray-600">病院までの時間の目安に使います。この端末の中にだけ保存。</span>
          </label>
          <label className="block text-base">
            自宅から病院までの時間
            <select className={field} value={preferences.distance} onChange={(e) => setPreferences({ ...preferences, distance: e.target.value as Preferences["distance"] })}>
              <option value="any">こだわらない</option>
              <option value="30min">30分以内</option>
              <option value="60min">1時間以内</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="card space-y-1">
        <SectionHeading as="legend" icon="money" tone="green">4. あなたのこと（助成の判定に使います）</SectionHeading>
        <div className="space-y-3">
          <p className="text-base text-gray-600">助成金Naviで「あなたは対象か」を出すために使います。所得の額は聞きません。わからなければ「わからない」のままで進めます。</p>
          <label className="block text-base">
            加入している健康保険
            <select className={field} value={preferences.insurance ?? "unknown"} onChange={(e) => setPreferences({ ...preferences, insurance: e.target.value as Preferences["insurance"] })}>
              <option value="unknown">わからない</option>
              <option value="employer">勤務先の健康保険（健保組合・協会けんぽ・共済）。配偶者の扶養もここ</option>
              <option value="national">国民健康保険（区役所で入るもの）</option>
              <option value="none">日本の健康保険に入っていない</option>
            </select>
          </label>
          <label className="block text-base">
            あなたの働き方
            <select className={field} value={preferences.work ?? "unknown"} onChange={(e) => setPreferences({ ...preferences, work: e.target.value as Preferences["work"] })}>
              <option value="unknown">わからない・答えない</option>
              <option value="employee">会社員・公務員（雇われて働いている。パート・派遣も）</option>
              <option value="self_employed">自営業・フリーランス</option>
              <option value="not_working">働いていない（配偶者の扶養など）</option>
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-3 text-base">
            <input type="checkbox" className="check" checked={preferences.single_parent === true} onChange={(e) => setPreferences({ ...preferences, single_parent: e.target.checked })} />
            ひとり親（結婚していない・離婚した・パートナーと別れた）
          </label>
          <label className="block text-base">
            所得制限のある助成について
            <select className={field} value={preferences.income_limit ?? "unknown"} onChange={(e) => setPreferences({ ...preferences, income_limit: e.target.value as Preferences["income_limit"] })}>
              <option value="unknown">わからない（制度ごとに「要確認」と出します）</option>
              <option value="under">たぶん制限の範囲内（世帯の所得は高くない）</option>
              <option value="over">たぶん制限を超える（高所得の世帯）</option>
            </select>
          </label>
        </div>
      </fieldset>

      <fieldset className="card space-y-1">
        <SectionHeading as="legend" icon="document">5. いま手元にある紙</SectionHeading>
        {!rules ? (
          <p className="text-base text-gray-600">市区町村を選ぶと、選べる紙が出ます。</p>
        ) : (
          <>
            <Disclosure summary="どれが何の紙？（病院や区でもらった紙の見分け方）">
              <DocumentGuide documents={rules.documents} steps={rules.steps} regionCode={region} />
            </Disclosure>
            <DocumentPicker
              documents={documents}
              regionCode={region}
              selected={selected}
              includedBy={includedBy}
              otherId={otherId}
              otherText={otherText}
              onToggle={toggle}
              onOtherText={setOtherText}
            />
          </>
        )}
      </fieldset>

      {/* 妊娠を終えたとき。静かな導線: 開閉の中にだけ置く */}
      <Disclosure summary="妊娠を終えたとき（流産・死産）" open={loss} className="border-slate-200 bg-slate-50">
        <p className="text-base text-slate-700">つらいときに、手続きのことまで考えなくて大丈夫です。必要になったら、ここに印を付けると、妊娠中・出産後の手続きは出さず、死産届や休業など「いま関係する手続き」と相談先だけを出します。</p>
        <label className="flex min-h-11 items-center gap-3 text-base">
          <input type="checkbox" className="check" checked={loss} onChange={(e) => setLoss(e.target.checked)} />
          妊娠を終えた（流産・死産）
        </label>
        {loss ? (
          <label className="block text-base">
            妊娠が終わった日（だいたいで大丈夫）
            <input type="date" className={field} value={lossDate} onChange={(e) => setLossDate(e.target.value)} />
          </label>
        ) : null}
      </Disclosure>

      {error ? <p role="alert" className="notice notice-warn">{error}</p> : null}

      <button type="submit" className="btn btn-primary w-full text-lg">
        今週やることを見る
      </button>
      <p className="text-base text-gray-600">入力はこの端末の中にだけ保存します。</p>
    </form>
  );
}
