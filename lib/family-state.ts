// 利用者の状態。ログインなしで使えるよう、この端末のブラウザ内（localStorage）にだけ保存する（設計原則5）。
// サーバーに送るのは市区町村コードだけ（制度データの取得のため）。
// ここは純粋関数だけ。localStorage の読み書きは components/useFamilyState.ts。

import type { Family, Step } from "./next-actions";

export const STORAGE_KEY = "ninshin-navi:v1";

export type Preferences = {
  epidural: "yes" | "no" | "undecided";
  /** 自宅から分娩施設までの目安 */
  distance: "30min" | "60min" | "any";
  /** 「お金」画面で選んだ施設と、おなかの赤ちゃんの人数（支援給付2回目の計算に使う） */
  facility_id?: string | null;
  children?: number;
};

export type FamilyState = {
  region_code: string;
  region_name: string;
  due_date: string;
  confirmation_date: string | null;
  birth_date: string | null;
  preferences: Preferences;
  /** from_step = 完了チェックで手に入れた紙（チェックを外すと一緒に消す） */
  held_documents: { document_id: string; held_at: string; from_step?: string }[];
  progress: { step_id: string; status: "done" | "not_applicable"; at: string }[];
  /** 記録（アンケート）への同意。保存するのは同意した場合だけ */
  consent_survey: boolean;
  /** 分娩方法など任意項目への同意 */
  consent_sensitive: boolean;
  /** 完了チェック後の1問を、答えた／答えないと決めたステップ（同じ質問を何度も出さない） */
  surveys_closed: string[];
};

export function toFamily(state: FamilyState): Family {
  return {
    region_code: state.region_code,
    due_date: state.due_date,
    confirmation_date: state.confirmation_date,
    birth_date: state.birth_date,
    held_documents: state.held_documents.map(({ document_id, held_at }) => ({ document_id, held_at })),
    completed_step_ids: state.progress.filter((p) => p.status === "done").map((p) => p.step_id),
    not_applicable_step_ids: state.progress.filter((p) => p.status === "not_applicable").map((p) => p.step_id),
  };
}

/** 完了／該当しない を付ける。完了なら、そのステップで手に入る紙（produces_document_id）を持っている紙に加える。 */
export function markStep(state: FamilyState, step: Step, status: "done" | "not_applicable", today: string): FamilyState {
  const cleared = clearStep(state, step.id);
  const held = [...cleared.held_documents];
  const produced = step.produces_document_id;
  if (status === "done" && produced && !held.some((h) => h.document_id === produced)) {
    held.push({ document_id: produced, held_at: today, from_step: step.id });
  }
  return { ...cleared, held_documents: held, progress: [...cleared.progress, { step_id: step.id, status, at: today }] };
}

/** チェックを外す。そのチェックで加えた紙も外す（入口で自分で選んだ紙は残す）。 */
export function clearStep(state: FamilyState, stepId: string): FamilyState {
  return {
    ...state,
    held_documents: state.held_documents.filter((h) => h.from_step !== stepId),
    progress: state.progress.filter((p) => p.step_id !== stepId),
  };
}

/** 入口で選んだ紙を入れ替える。完了チェックで手に入れた紙と、すでに選んでいた紙の受取日は保つ。 */
export function setSelectedDocuments(state: FamilyState, documentIds: string[], today: string): FamilyState {
  const earned = state.held_documents.filter((h) => h.from_step);
  const previous = new Map(state.held_documents.filter((h) => !h.from_step).map((h) => [h.document_id, h.held_at]));
  const selected = documentIds
    .filter((id) => !earned.some((h) => h.document_id === id))
    .map((id) => ({ document_id: id, held_at: previous.get(id) ?? today }));
  return { ...state, held_documents: [...selected, ...earned] };
}

const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/** localStorage から読んだ値を検査する。壊れていたら null（入口からやり直し）。 */
export function parseState(raw: string | null): FamilyState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<FamilyState>;
    if (typeof s.region_code !== "string" || !/^\d{5}$/.test(s.region_code) || !isDate(s.due_date)) return null;
    return {
      region_code: s.region_code,
      region_name: typeof s.region_name === "string" ? s.region_name : "",
      due_date: s.due_date,
      confirmation_date: isDate(s.confirmation_date) ? s.confirmation_date : null,
      birth_date: isDate(s.birth_date) ? s.birth_date : null,
      preferences: {
        epidural: s.preferences?.epidural ?? "undecided",
        distance: s.preferences?.distance ?? "any",
        facility_id: typeof s.preferences?.facility_id === "string" ? s.preferences.facility_id : null,
        children: Number.isInteger(s.preferences?.children) && s.preferences!.children! >= 1 ? s.preferences!.children : 1,
      },
      held_documents: Array.isArray(s.held_documents) ? s.held_documents.filter((h) => typeof h?.document_id === "string" && isDate(h?.held_at)) : [],
      progress: Array.isArray(s.progress) ? s.progress.filter((p) => typeof p?.step_id === "string") : [],
      consent_survey: s.consent_survey === true,
      consent_sensitive: s.consent_sensitive === true,
      surveys_closed: Array.isArray(s.surveys_closed) ? s.surveys_closed.filter((x) => typeof x === "string") : [],
    };
  } catch {
    return null;
  }
}
