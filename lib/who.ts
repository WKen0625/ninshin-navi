// 「誰がやる手続きか」。パートナーと分担しやすくするための目安。本人が端末の中で付け替えられる（state.assignments）。
// データに持たせず題名と窓口から機械的に出す（決定的）。本人しかできないのは「体を伴う」もの（受診・健診・面接・入院・産休）。
// それ以外は委任状や代理でパートナーが出せることが多いので「どちらでも」。出生届・扶養・児童手当のようにパートナーが
// 行くことの多いものは「パートナー向き」。最終的な可否は窓口に確認してもらう（画面に添える）。

export type Who = "mother" | "partner" | "either";

export const WHO_LABEL: Record<Who, string> = { mother: "本人が行く", partner: "パートナー向き", either: "どちらでも" };

const MOTHER_ONLY = /受診|健診|検診|面接|面談|心拍|入院|産前休業|産後休業|出産手当金|母親学級|分娩予約|母性健康管理|つわり|体調/;
const PARTNER_FRIENDLY = /出生届|扶養|児童手当|医療証|乳幼児医療|子ども医療|出生連絡票|パパ|父親|配偶者|育児休業（父|両親学級|死産届/;

export function suggestWho(step: { title: string; channel?: string | null }): Who {
  if (MOTHER_ONLY.test(step.title)) return "mother";
  if (PARTNER_FRIENDLY.test(step.title)) return "partner";
  return "either";
}

/** 本人が付け替えた担当があればそれ、無ければ目安 */
export function whoOf(step: { id: string; title: string; channel?: string | null }, assignments: Record<string, "mother" | "partner"> | undefined): { who: Who; assigned: boolean } {
  const a = assignments?.[step.id];
  return a ? { who: a, assigned: true } : { who: suggestWho(step), assigned: false };
}
