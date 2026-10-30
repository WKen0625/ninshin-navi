// 公開ページの題名と説明文（検索結果に出る文）。決定的。
import { windowText, ym, type PublicModel, type PublicStep } from "./public-model";

export const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 1)}…`);

/** 手続き1件のページの題名に使う名前: 題名に区の名前があれば題名、なければ「区名の話題」 */
export function stepHeadline(p: PublicStep): string {
  const base = p.topic?.label.replace(/^区の/, "") ?? clip(p.step.title, 28);
  // 23区共通の手続きは「東京23区の出生届」のように地域を先に置く（「東京都 出生届 やり方」で探す人向け。区のページの「港区の出生届」と同じ形）
  if (!p.ward) return `東京23区の${base}`;
  return p.step.title.includes(p.ward.name) ? clip(p.step.title.replace(/を申請する$|を受ける$|を受け取る$/, ""), 30) : `${p.ward.name}の${base}`;
}

/** 検索結果の題名。「東京都 <手続き> やり方」で探す人に合わせ、「やり方」を含める。先頭30文字ほどしか出ないので、地域と手続きを先に */
export function stepTitle(p: PublicStep): string {
  return `${stepHeadline(p)}｜やり方・期限・窓口・持ち物【${ym(p.step.verified_at)}確認】｜Tsugiraku`;
}

export function stepDescription(p: PublicStep, m: PublicModel): string {
  const w = windowText(p.step, m.data.documents);
  const place = p.ward ? `東京都${p.ward.name}` : "東京23区";
  const parts = [
    `${place}の「${p.step.title}」のやり方・期限・窓口・持ち物。`,
    w.from ? `時期: ${w.from}。` : "",
    w.until ? `期限: ${w.until}。` : "",
    p.step.channel ? `窓口: ${p.step.channel}。` : "",
    `公式ページをもとに${ym(p.step.verified_at)}に確認。`,
  ];
  return clip(parts.join(""), 140);
}
