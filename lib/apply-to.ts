// 申請の窓口の分別: 区役所（区の窓口・保健所・保健センター・オンライン）／東京都／国／勤務先・健康保険／医療機関。
// steps.channel・subsidies.apply_via は自由な文章なので、言葉で見分ける（表示のためだけ。解決ロジックは使わない）。
// 迷ったら「区役所」にはしない: 東京都・国・勤務先・医療機関の言葉が無いときだけ区役所とみなす。

export type ApplyTo = "ward" | "tokyo" | "national" | "employer" | "facility";

export const APPLY_TO_LABEL: Record<ApplyTo, string> = {
  ward: "区役所（区の窓口）",
  tokyo: "東京都",
  national: "国",
  employer: "勤務先・健康保険",
  facility: "医療機関",
};

const RULES: [ApplyTo, RegExp][] = [
  ["employer", /勤務先|事業主|会社|健康保険組合|協会けんぽ|加入している健康保険/],
  ["national", /年金事務所|日本年金機構|ハローワーク|税務署|法務局|出入国在留管理|大使館/],
  ["tokyo", /東京都|都の|都内の|都庁|tokyo\.lg\.jp|018サポート|赤ちゃんファースト/],
  ["facility", /医療機関|助産所|歯科|病院|産院|分娩施設|クリニック|健診実施会場|健診会場|検査機関/],
];

/** 文章から窓口を見分ける。複数に当たれば全部返す（例: 「勤務先の健康保険 または 市区町村」→ 勤務先・区役所）。何も無ければ区役所 */
export function classifyApplyTo(text: string | null | undefined, regionCode?: string): ApplyTo[] {
  const t = text ?? "";
  const out: ApplyTo[] = [];
  for (const [key, re] of RULES) if (re.test(t)) out.push(key);
  // 「都内の契約医療機関」は医療機関。東京都の行（region 13）で言葉が無ければ東京都
  if (out.includes("facility") && out.includes("tokyo") && /都内の/.test(t)) out.splice(out.indexOf("tokyo"), 1);
  if (out.length === 0 && regionCode === "13") out.push("tokyo");
  if (/市区町村|区役所|区の|保健所|保健センター|出張所|窓口|郵送|オンライン|電子申請|国民健康保険|国民年金/.test(t) && !out.includes("ward")) {
    // 勤務先や医療機関と並記されていれば、区役所も足す
    if (out.length === 0 || /または|\/|・/.test(t)) out.push("ward");
  }
  if (out.length === 0) out.push("ward");
  return out;
}
