// 出産予定日がまだわからない人のための仮の予定日。決定的（設計原則2）。受診後に本当の予定日に直してもらう。
//  lmp  = 最後の生理が始まった日 + 280日（妊娠40週0日。ネーゲレの概算法）
//  test = 検査薬で陽性になった日。生理予定日（妊娠4週0日）ごろに陽性になったとみなし、+252日（280 − 28）

import { addDays } from "./next-actions";

export type DueDateBasis = "known" | "lmp" | "test";

export const DUE_OFFSET: Record<Exclude<DueDateBasis, "known">, number> = { lmp: 280, test: 252 };

export const BASIS_LABEL: Record<DueDateBasis, string> = {
  known: "病院で言われた出産予定日",
  lmp: "最後の生理が始まった日から（+280日）",
  test: "検査薬で陽性になった日から（妊娠4週ごろとみなして +252日）",
};

export function estimateDueDate(basis: Exclude<DueDateBasis, "known">, date: string): string {
  return addDays(date, DUE_OFFSET[basis]);
}

export const isDueDateBasis = (v: unknown): v is DueDateBasis => v === "known" || v === "lmp" || v === "test";
