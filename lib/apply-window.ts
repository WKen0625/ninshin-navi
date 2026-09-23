// 申請期間: 「いつから申請できて、いつまでに終えるか」。期限の計算は lib/next-actions.ts の deadlineOf を使う（決定的）。
// 文章は、データにある deadline_note / apply_from_note を優先し、無ければ基準と日数から機械的に作る。

import { deadlineOf, type DeadlineBase, type DeadlineRule, type DocumentDef, type Family } from "./next-actions";

export type WindowRule = DeadlineRule & {
  deadline_note?: string | null;
  apply_from_base?: DeadlineBase | null;
  apply_from_offset_days?: number | null;
  apply_from_week?: number | null;
  apply_from_note?: string | null;
  trigger_document_id?: string | null;
  phase?: string;
};

export type ApplyWindow = {
  from: { date: string | null; text: string } | null;
  until: { date: string | null; text: string; estimated: boolean } | null;
};

const BASE_NAME: Record<DeadlineBase, string> = {
  confirmation_date: "心拍を確認した日",
  notification_date: "母子健康手帳を受け取った日",
  due_date: "出産予定日",
  birth_date: "出産した日",
  gestational_week: "妊娠",
  facility: "施設ごと",
};

/** 日数 → 「1年」「2か月」「14日」 */
export function spanText(days: number): string {
  const n = Math.abs(days);
  if (n % 365 === 0) return `${n / 365}年`;
  const months = Math.round(n / 30.4);
  if (months >= 2 && Math.abs(months * 30.4 - n) < 3) return `${months}か月`;
  if (n % 7 === 0 && n >= 14) return `${n / 7}週間`;
  return `${n}日`;
}

/** 期限の文章（deadline_note が無いとき） */
export function untilText(rule: DeadlineRule): string | null {
  const off = rule.deadline_offset_days ?? 0;
  switch (rule.deadline_base) {
    case "gestational_week":
      return rule.deadline_week != null ? `妊娠${rule.deadline_week}週まで` : null;
    case "facility":
      return "施設ごとに違う";
    case null:
    case undefined:
      return null;
    default: {
      const base = BASE_NAME[rule.deadline_base];
      if (off === 0) return `${base}まで`;
      if (off < 0) return `${base}の${spanText(off)}前まで`;
      return `${base}の翌日から起算して${spanText(off)}以内`;
    }
  }
}

/** 申請できる日の文章（apply_from_note が無いとき） */
export function fromText(rule: WindowRule): string | null {
  const off = rule.apply_from_offset_days ?? 0;
  switch (rule.apply_from_base) {
    case "gestational_week":
      return rule.apply_from_week != null ? `妊娠${rule.apply_from_week}週から` : null;
    case "facility":
      return "施設ごとに違う";
    case null:
    case undefined:
      return null;
    default: {
      const base = BASE_NAME[rule.apply_from_base];
      if (off === 0) return `${base}から`;
      if (off < 0) return `${base}の${spanText(off)}前から`;
      return `${base}の${spanText(off)}後から`;
    }
  }
}

/**
 * 申請期間を出す。family.held_documents は expandHeldDocuments 済みのものを渡す。
 * 申請できる日がデータに無いときは、条件の紙（trigger_document_id）から「◯◯を受け取ったあと」を出す。それも無ければ「いまから」。
 */
export function applyWindowOf(rule: WindowRule, family: Family, documents: DocumentDef[]): ApplyWindow {
  // いつまで
  let until: ApplyWindow["until"] = null;
  if (rule.deadline_base || rule.deadline_note) {
    const d = deadlineOf(rule, family, documents);
    const text = rule.deadline_note ?? untilText(rule) ?? "";
    until = { date: d.date, text, estimated: d.estimated };
  }
  // いつから
  let from: ApplyWindow["from"] = null;
  if (rule.apply_from_base) {
    const d = deadlineOf(
      { deadline_base: rule.apply_from_base, deadline_offset_days: rule.apply_from_offset_days ?? 0, deadline_week: rule.apply_from_week ?? null },
      family,
      documents,
    );
    from = { date: d.date, text: rule.apply_from_note ?? fromText(rule) ?? "" };
  } else if (rule.apply_from_note) {
    from = { date: null, text: rule.apply_from_note };
  } else if (rule.trigger_document_id) {
    // 条件の紙が本物の紙（出典がある）なら「◯◯を受け取ったあと」。「まだ紙がない」「その他」のような選択肢用の紙は使わない
    const doc = documents.find((d) => d.id === rule.trigger_document_id);
    from = doc?.name && doc.source_url ? { date: null, text: `「${doc.name}」を受け取ったあと` } : null;
  } else if (rule.phase === "birth" || rule.phase === "postpartum") {
    from = { date: null, text: "出産したあと" };
  }
  return { from, until };
}
