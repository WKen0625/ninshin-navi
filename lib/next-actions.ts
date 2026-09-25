// 「今週やること」の解決。CLAUDE.md §4「Next Action の解決手順」をそのまま実装した純粋関数。
// 設計原則2: 入力（データ表＋利用者の状態＋今日の日付）が同じなら、結果は必ず同じ。
// 設計原則1: 地域名・ステップidをコードに書かない。違いはすべてデータが持つ。

export type Region = {
  code: string;
  level: "national" | "prefecture" | "municipality";
  name: string;
  parent_code: string | null;
  status: "skeleton_only" | "in_progress" | "verified";
};

/** includes = この紙に含まれる紙（例: 保健バッグ → 母子手帳・受診票） */
export type DocumentDef = {
  id: string;
  phase: string;
  includes: string[];
  // 以下は画面の表示用（解決ロジックは使わない）
  region_code?: string;
  name?: string;
  aliases?: string[];
  description?: string | null;
  source_url?: string | null;
  verified_at?: string | null;
};

/** 困ったときの問い合わせ先（区のハンドブック・公式ページから）。表示専用 */
export type Contact = {
  id: string;
  region_code: string;
  name: string;
  topics: string | null;
  phone: string | null;
  hours: string | null;
  address: string | null;
  url: string | null;
  note: string | null;
  source_url: string;
  verified_at: string;
  needs_review: boolean;
};

export type DeadlineBase =
  | "confirmation_date"
  | "notification_date"
  | "due_date"
  | "birth_date"
  | "gestational_week"
  | "facility";

export type Step = {
  id: string;
  region_code: string;
  phase: string;
  sort_order: number;
  title: string;
  detail: string | null;
  trigger_document_id: string | null;
  /** 完了で手に入る紙。完了チェックでこの紙を「持っている」に加えると、次のステップが出る */
  produces_document_id: string | null;
  channel: string | null;
  action_url: string | null;
  deadline_base: DeadlineBase | null;
  deadline_offset_days: number | null;
  deadline_week: number | null;
  deadline_note: string | null;
  /** 申請できるようになる日（期限と同じ基準＋日数のずれ）。文章だけなら apply_from_note */
  apply_from_base?: DeadlineBase | null;
  apply_from_offset_days?: number | null;
  apply_from_week?: number | null;
  apply_from_note?: string | null;
  overrides_step_id: string | null;
  survey_question_id: string | null;
  /** 困ったときの問い合わせ先（contacts.id）。無ければ画面がその区の代表の窓口を出す */
  contact_id?: string | null;
  source_url: string;
  verified_at: string;
  needs_review: boolean;
};

/** 日付はすべて 'YYYY-MM-DD'（時刻・タイムゾーンを持ち込まない） */
export type Family = {
  region_code: string;
  due_date: string;
  confirmation_date: string | null;
  birth_date: string | null;
  held_documents: { document_id: string; held_at: string }[];
  completed_step_ids: string[];
  /** 「自分は該当しない」を付けたステップ（step_progress.status = 'not_applicable'） */
  not_applicable_step_ids: string[];
};

/** 期限がこの日数以内（または過ぎている）ものを「期限が近い」として先頭に出す。メール通知の「30日前から知らせる」と同じ */
export const URGENT_DAYS = 30;

export type NextAction = {
  step: Step;
  /** なぜこの位置にあるか: overdue = 期限を過ぎている ／ deadline_soon = 期限が近い ／ flow = 手続きの流れの順 */
  reason: "overdue" | "deadline_soon" | "flow";
  deadline: string | null;
  /** 心拍確認日が未入力で、LMP＋49日の推定から期限を出した（画面に「推定」と表示する） */
  deadline_estimated: boolean;
  /** 出典が未確定（画面に「確認中」と表示する） */
  needs_review: boolean;
};

export type NextActionsResult = {
  /** いまやること（1件だけ強調して表示する）。actions の先頭 */
  current: NextAction | null;
  /** このあと（控えめに表示する。完了チェックはどれからでも付けられる） */
  upcoming: NextAction[];
  /** current ＋ upcoming（期限順） */
  actions: NextAction[];
  gestational_week: number;
  /** 適用した地域（市区町村 → 都府県 → 国）。未登録の市区町村は含まれない */
  regions: Region[];
  /** 市区町村の情報が verified でない／未登録（画面上部に「この市区町村の情報は確認中です」を表示する） */
  region_unverified: boolean;
};

/** 出生日（birth_date）が入力されるまで隠す段階。出産前の家族に出生届などを見せない。 */
const AFTER_BIRTH_PHASES = new Set(["birth", "postpartum"]);

/**
 * 出産したあとは出さないステップ: 妊娠中にしかできないもの。
 * データ上は「期限が妊娠週数で決まる」か「期限が出産予定日まで（予定日より後ろにずらしていない）」ステップ。
 * 例: 妊婦健診、妊婦面接（産後は受けられない）、8か月時アンケート。これを出すと、出産後に「期限切れ」として先頭に来てしまう。
 */
const onlyDuringPregnancy = (s: Step) =>
  s.deadline_base === "gestational_week" || (s.deadline_base === "due_date" && (s.deadline_offset_days ?? 0) <= 0);

const DAY_MS = 86_400_000;
const toMs = (d: string) => Date.parse(`${d.slice(0, 10)}T00:00:00Z`);
export const addDays = (d: string, days: number) => new Date(toMs(d) + days * DAY_MS).toISOString().slice(0, 10);
const diffDays = (a: string, b: string) => Math.round((toMs(a) - toMs(b)) / DAY_MS);

/** 最終月経開始日（LMP）= 出産予定日 − 280日 */
export const lmpOf = (dueDate: string) => addDays(dueDate, -280);
/** 妊娠週数 = floor((今日 − LMP) ÷ 7) */
export const gestationalWeek = (dueDate: string, today: string) => Math.floor(diffDays(today, lmpOf(dueDate)) / 7);

/** 手順1: 市区町村 → 都府県 → JP。未登録の市区町村でも「国＋都府県」は返す（設計原則4）。 */
export function regionChain(regionCode: string, regions: Region[]): Region[] {
  const byCode = new Map(regions.map((r) => [r.code, r]));
  const chain: Region[] = [];
  let cur = byCode.get(regionCode);
  if (!cur) {
    // 全国地方公共団体コードは先頭2桁が都道府県。都府県も未登録なら国だけ。
    cur = byCode.get(regionCode.slice(0, 2)) ?? regions.find((r) => r.level === "national");
  }
  while (cur && !chain.includes(cur)) {
    chain.push(cur);
    cur = cur.parent_code ? byCode.get(cur.parent_code) : undefined;
  }
  return chain;
}

/** 持っている紙を、含まれる紙（documents.includes）まで広げる。受取日は外側の紙のものを引き継ぐ。 */
export function expandHeldDocuments(held: Family["held_documents"], documents: DocumentDef[]): Family["held_documents"] {
  const includesOf = new Map(documents.map((d) => [d.id, d.includes]));
  const out = new Map<string, string>(); // document_id → held_at（早いほう）
  const visit = (id: string, heldAt: string) => {
    const known = out.get(id);
    if (known != null && known <= heldAt) return;
    out.set(id, heldAt);
    for (const inner of includesOf.get(id) ?? []) visit(inner, heldAt);
  };
  for (const h of held) visit(h.document_id, h.held_at);
  return [...out].map(([document_id, held_at]) => ({ document_id, held_at })).sort((a, b) => (a.document_id < b.document_id ? -1 : 1));
}

/** 期限のルール（steps と subsidies で共通） */
export type DeadlineRule = {
  deadline_base: DeadlineBase | null;
  deadline_offset_days: number | null;
  deadline_week?: number | null;
};

/** 期限の計算（CLAUDE.md §4）。family.held_documents は expandHeldDocuments 済みのものを渡す。 */
export function deadlineOf(step: DeadlineRule, family: Family, documents: DocumentDef[]): { date: string | null; estimated: boolean } {
  const offset = step.deadline_offset_days ?? 0;
  switch (step.deadline_base) {
    case "confirmation_date":
      return family.confirmation_date
        ? { date: addDays(family.confirmation_date, offset), estimated: false }
        : { date: addDays(lmpOf(family.due_date), 49 + offset), estimated: true };
    case "notification_date": {
      // 母子手帳の受取日 = notification 段階の紙の held_at（最も早いもの）
      const phaseOf = new Map(documents.map((d) => [d.id, d.phase]));
      const dates = family.held_documents
        .filter((h) => phaseOf.get(h.document_id) === "notification")
        .map((h) => h.held_at.slice(0, 10))
        .sort();
      return { date: dates.length > 0 ? addDays(dates[0], offset) : null, estimated: false };
    }
    case "due_date":
      return { date: addDays(family.due_date, offset), estimated: false };
    case "birth_date":
      return { date: family.birth_date ? addDays(family.birth_date, offset) : null, estimated: false };
    case "gestational_week":
      return {
        date: step.deadline_week != null ? addDays(lmpOf(family.due_date), step.deadline_week * 7 + offset) : null,
        estimated: false,
      };
    default:
      // 'facility'（施設ごと）と未指定は日付なし。deadline_note を画面に出す。
      return { date: null, estimated: false };
  }
}

export function resolveNextActions(input: {
  family: Family;
  today: string;
  regions: Region[];
  documents: DocumentDef[];
  steps: Step[];
}): NextActionsResult {
  const { today, regions, documents, steps } = input;
  const family = { ...input.family, held_documents: expandHeldDocuments(input.family.held_documents, documents) };

  // 1. 地域の階層
  const chain = regionChain(family.region_code, regions);
  const codes = new Set(chain.map((r) => r.code));

  // 2. 3階層の steps を読み、下位が overrides_step_id で指す上位ステップを除外
  const inScope = steps.filter((s) => codes.has(s.region_code));
  const overridden = new Set(inScope.map((s) => s.overrides_step_id).filter((id): id is string => id != null));

  // 3. trigger_document_id が null か held_documents（含まれる紙も）にある  4. 出産前は出産後の段階を、出産後は妊娠中にしかできないものを隠す  5. 完了済み・該当しないを除外
  const held = new Set(family.held_documents.map((h) => h.document_id));
  // 完了と「該当しない」は、どちらも一覧から外す
  const completed = new Set([...family.completed_step_ids, ...family.not_applicable_step_ids]);
  const candidates = inScope.filter(
    (s) =>
      !overridden.has(s.id) &&
      (s.trigger_document_id == null || held.has(s.trigger_document_id)) &&
      (family.birth_date != null ? !onlyDuringPregnancy(s) : !AFTER_BIRTH_PHASES.has(s.phase)) &&
      !completed.has(s.id),
  );

  // 6. 期限が近いもの（30日以内・期限切れ）を期限順で先頭に。それ以外は手続きの流れの順（sort_order）。
  //    ずっと先の期限（例: 妊娠28週）が、日付のない急ぎの手続き（妊娠届・分娩予約）より前に来ないようにするため。
  //    同順位は sort_order → id で固定する（結果を決定的にするため）。
  const soon = addDays(today, URGENT_DAYS);
  const flow = (a: NextAction, b: NextAction) => a.step.sort_order - b.step.sort_order || (a.step.id < b.step.id ? -1 : 1);
  const actions = candidates
    .map((step): NextAction => {
      const { date, estimated } = deadlineOf(step, family, documents);
      const reason = date == null || date > soon ? "flow" : date < today ? "overdue" : "deadline_soon";
      return { step, reason, deadline: date, deadline_estimated: estimated, needs_review: step.needs_review };
    })
    .sort((a, b) => {
      const urgentA = a.reason !== "flow";
      const urgentB = b.reason !== "flow";
      if (urgentA !== urgentB) return urgentA ? -1 : 1;
      if (urgentA && a.deadline !== b.deadline) return a.deadline! < b.deadline! ? -1 : 1;
      return flow(a, b);
    });

  // 7. 市区町村が verified でなければ「確認中」
  const own = chain.find((r) => r.code === family.region_code);
  return {
    current: actions[0] ?? null,
    upcoming: actions.slice(1),
    actions,
    gestational_week: gestationalWeek(family.due_date, today),
    regions: chain,
    region_unverified: own?.status !== "verified",
  };
}
