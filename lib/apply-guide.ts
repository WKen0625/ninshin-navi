// 申請ガイド（助成金Navi）: 「どこに・何を出すか・用紙はどこでもらうか」の構造化データ。steps と subsidies の両方が持つ。
// 画面はこれを選択式の答えとして出す。無い行は、従来の文章（channel / apply_via）と出典リンクで代用する。

import type { EligibilityKey } from "./eligibility";

/** 書類を誰が用意するか */
export type DocumentFrom = "hospital" | "ward" | "employer" | "insurer" | "self" | "download" | "mailed";
export const DOCUMENT_FROM_LABEL: Record<DocumentFrom, string> = {
  hospital: "病院が書く・渡す",
  ward: "区役所でもらう",
  employer: "勤務先が用意",
  insurer: "健康保険から届く",
  self: "自分で用意",
  download: "ダウンロード",
  mailed: "郵送で届く",
};

/** 申請の用紙をどこで手に入れるか */
export type FormFrom = "window" | "download" | "mailed" | "hospital" | "employer" | "online" | "none";
export const FORM_FROM_LABEL: Record<FormFrom, string> = {
  window: "窓口でもらう",
  download: "ダウンロードして印刷",
  mailed: "郵送で届く（区・健康保険から）",
  hospital: "病院でもらう",
  employer: "勤務先からもらう",
  online: "電子申請（用紙は要らない）",
  none: "用紙は要らない",
};

export type ApplyGuide = {
  eligibility?: EligibilityKey[];
  submit_to?: string | null;
  online_url?: string | null;
  by_mail?: boolean | null;
  documents?: { name: string; from: DocumentFrom; url?: string | null; note?: string | null }[];
  form?: { from: FormFrom; url?: string | null; note?: string | null } | null;
  how_to?: string | null;
};
