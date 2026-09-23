// 出典リンクの表記「出典・◯◯のページへ飛ぶ」。URLのホストから、誰のページかを出す。
// 表示のためだけの表（解決ロジックは使わない）。無い場合は「出典のページへ飛ぶ」。

const HOSTS: [RegExp, string][] = [
  [/(^|\.)city\.chiyoda\.lg\.jp$/, "千代田区"],
  [/(^|\.)city\.chuo\.lg\.jp$/, "中央区"],
  [/(^|\.)city\.minato\.tokyo\.jp$/, "港区"],
  [/(^|\.)city\.shinjuku\.lg\.jp$/, "新宿区"],
  [/(^|\.)city\.bunkyo\.lg\.jp$/, "文京区"],
  [/(^|\.)city\.taito\.lg\.jp$/, "台東区"],
  [/(^|\.)city\.sumida\.lg\.jp$/, "墨田区"],
  [/(^|\.)city\.koto\.lg\.jp$/, "江東区"],
  [/(^|\.)city\.shinagawa\.tokyo\.jp$/, "品川区"],
  [/(^|\.)city\.meguro\.tokyo\.jp$/, "目黒区"],
  [/(^|\.)city\.ota\.tokyo\.jp$/, "大田区"],
  [/(^|\.)city\.setagaya\.lg\.jp$/, "世田谷区"],
  [/(^|\.)city\.shibuya\.tokyo\.jp$/, "渋谷区"],
  [/(^|\.)city\.tokyo-nakano\.lg\.jp$/, "中野区"],
  [/(^|\.)city\.suginami\.tokyo\.jp$/, "杉並区"],
  [/(^|\.)city\.toshima\.lg\.jp$/, "豊島区"],
  [/(^|\.)city\.kita\.lg\.jp$/, "北区"],
  [/(^|\.)city\.arakawa\.tokyo\.jp$/, "荒川区"],
  [/(^|\.)city\.itabashi\.tokyo\.jp$/, "板橋区"],
  [/(^|\.)city\.nerima\.tokyo\.jp$/, "練馬区"],
  [/(^|\.)city\.adachi\.tokyo\.jp$/, "足立区"],
  [/(^|\.)city\.katsushika\.lg\.jp$/, "葛飾区"],
  [/(^|\.)city\.edogawa\.tokyo\.jp$/, "江戸川区"],
  [/(^|\.)metro\.tokyo\.lg\.jp$/, "東京都"],
  [/(^|\.)tmhp\.jp$/, "東京都立病院機構"],
  [/^birth-navi\.mhlw\.go\.jp$/, "出産なび（厚生労働省）"],
  [/(^|\.)mhlw\.go\.jp$/, "厚生労働省"],
  [/(^|\.)cfa\.go\.jp$/, "こども家庭庁"],
  [/(^|\.)nenkin\.go\.jp$/, "日本年金機構"],
  [/(^|\.)moj\.go\.jp$/, "法務省"],
  [/(^|\.)e-gov\.go\.jp$/, "e-Gov 法令検索"],
  [/(^|\.)kyoukaikenpo\.or\.jp$/, "協会けんぽ"],
];

export function sourceOwner(url: string | null | undefined): string | null {
  if (!url) return null;
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const [re, name] of HOSTS) if (re.test(host)) return name;
  return null;
}

/** リンクの文字。owner が無ければ「施設」など呼び方を渡せる */
export function sourceLabel(url: string | null | undefined, fallback = "出典"): string {
  const owner = sourceOwner(url);
  return owner ? `出典・${owner}のページへ飛ぶ` : `${fallback}のページへ飛ぶ`;
}
