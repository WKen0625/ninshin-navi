// 申請できる時期（apply_from_*）を、既にある期限の型（deadline_base / offset / note）から機械的に埋める。一度だけ使う補助スクリプト。
// 埋めるのは「型から確実に言える」ものだけ。決まった型に当てはまらない行は空のまま（画面は条件の紙から「◯◯を受け取ったあと」を出す）。
// 実行: pnpm exec tsx scripts/fill-apply-from.ts [--write]

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

const ROOT = join(import.meta.dirname, "..");
const WRITE = process.argv.includes("--write");
const files = ["data/national.yaml", "data/prefectures/13.yaml", ...readdirSync(join(ROOT, "data/municipalities")).map((f) => `data/municipalities/${f}`)];

type Row = Record<string, unknown> & { id: string };
type From = { base?: string; offset?: number; week?: number; note?: string };

// 個別に決める行（国・都）
const EXPLICIT: Record<string, From> = {
  "jp.s02": { note: "妊娠がわかったら、すぐ（施設によっては心拍確認後）" },
  "jp.s03": { base: "confirmation_date", offset: 0, note: "心拍を確認した日から（医療機関で妊娠が確認されたら）" },
  "jp.s05": { base: "confirmation_date", offset: 0, note: "心拍を確認した日から（区の面接のあと）" },
  "jp.s06": { note: "分娩予約のあと、施設が案内する時期に" },
  "jp.s06b": { note: "産休に入ってから（勤務先が手続きする）" },
  "jp.s06c": { base: "due_date", offset: -182, note: "出産予定日の6か月前から" },
  "jp.s07": { base: "birth_date", offset: 0, note: "出産した日から" },
  "jp.s08": { base: "birth_date", offset: 0, note: "出産した日から（区の案内・訪問のあと）" },
  "jp.s09": { base: "birth_date", offset: 0, note: "出産した日から" },
  "jp.s09b": { base: "birth_date", offset: 0, note: "出産した日から" },
  "jp.s09c": { note: "育児休業に入ってから（勤務先が手続きする）" },
  "tokyo.s02": { base: "birth_date", offset: 0, note: "出産した日から（無痛分娩で出産したあと）" },
  "tokyo.s03": { base: "birth_date", offset: 0, note: "出産した日から（子どもの住民登録のあと）" },
  "tokyo.epidural": { base: "birth_date", offset: 0, note: "出産した日から" },
  "tokyo.018support": { base: "birth_date", offset: 0, note: "出産した日から（子どもの住民登録のあと）" },
  "tokyo.babyfirst": { base: "birth_date", offset: 0, note: "出産した日から（018サポートと同時に）" },
};

function decide(row: Row): From | null {
  if (EXPLICIT[row.id]) return EXPLICIT[row.id];
  const base = row.deadline_base as string | null | undefined;
  const off = row.deadline_offset_days as number | null | undefined;
  const note = String(row.deadline_note ?? "");
  const title = String(row.title ?? row.name ?? "");
  if (/出産予定日の6か月前から/.test(note)) return { base: "due_date", offset: -182, note: "出産予定日の6か月前から" };
  if (base === "due_date" && off === 674) return { base: "due_date", offset: -56, note: "出産予定日の8週間前から（それより前に出産した場合はその日から）" };
  if (base === "confirmation_date" && off === 730) return { base: "confirmation_date", offset: 0, note: /面接|面談|相談/.test(String(row.channel ?? row.apply_via ?? "")) ? "心拍を確認した日から（区の面接・面談のあと）" : "心拍を確認した日から" };
  if (base === "birth_date" && off === 41 && /28日/.test(note)) return { base: "birth_date", offset: 28, note: "生後28日から" };
  if (base === "birth_date" && (off ?? 0) > 0) return { base: "birth_date", offset: 0, note: /聴覚|検査/.test(title) ? "生まれた日から（原則は出産で入院しているあいだ）" : "出産した日から" };
  if (base === "due_date" && off === 0) return { base: "notification_date", offset: 0, note: "母子健康手帳を受け取ってから（妊娠中）" };
  if (base === "gestational_week" && /16[〜～]/.test(note)) return { base: "gestational_week", week: 16, note: "妊娠16週から" };
  if (/訪問のときに確認/.test(note)) return { base: "birth_date", offset: 0, note: "出産後、区の訪問のあと" };
  if (/面接のときに確認|面談のときに確認|相談のときに確認/.test(note)) return { base: "confirmation_date", offset: 0, note: "区の妊婦面接・面談のあと" };
  // 題名の型から
  const phase = String(row.phase ?? "");
  if (/妊娠届/.test(title)) return { base: "confirmation_date", offset: 0, note: "心拍を確認した日から（医療機関で妊娠が確認されたら、なるべく早く）" };
  if (/新生児聴覚検査/.test(title)) return { base: "birth_date", offset: 0, note: "生まれた日から（原則は出産で入院しているあいだ）" };
  if (/産婦健康診査|産婦健診/.test(title)) return { base: "birth_date", offset: 0, note: "出産した日から（1回目は産後2週間ごろ）" };
  if (/1か月児/.test(title)) return { base: "birth_date", offset: 28, note: "生後28日から" };
  if (phase === "postpartum" && /出生通知|訪問|祝品|祝金|クーポン|支援給付|給付金/.test(title)) return { base: "birth_date", offset: 0, note: /訪問|出生通知/.test(title) ? "出産した日から（なるべく早く）" : "出産した日から" };
  if (phase === "pregnancy" && /支援給付|給付金|応援給付/.test(title)) return { base: "confirmation_date", offset: 0, note: "心拍を確認した日から（区の面接・面談のあと）" };
  if (phase === "pregnancy" && /国民健康保険料/.test(title)) return { base: "due_date", offset: -182, note: "出産予定日の6か月前から" };
  if (phase === "pregnancy" && /アンケート/.test(title)) return { base: "gestational_week", week: 24, note: "妊娠7か月ごろ（区からアンケートが届いてから）" };
  if (phase === "pregnancy" && /歯科|面接|面談|相談|ナビゲーション|妊婦健診|祝品|乗車券|バス/.test(title)) return { base: "notification_date", offset: 0, note: "母子健康手帳を受け取ってから（妊娠中）" };
  // 助成（subsidies）
  if (!phase && /妊娠高血圧/.test(title)) return { note: "入院治療を受けたあと（区のページで手続きを確認）" };
  if (!phase && /支援給付|給付金/.test(title)) return { base: "confirmation_date", offset: 0, note: "1回目は心拍確認後の面接・面談のあと、2回目は出産後の訪問・案内のあと" };
  if (!phase && /出産育児一時金/.test(title)) return { note: "出産のとき（直接支払制度なら分娩施設で手続き）" };
  if (!phase && /妊娠時の医療費/.test(title)) return { note: "医療機関にかかったあと（区のページで手続きを確認）" };
  if (/里帰り/.test(title)) return { note: "健診を受けたあと（払い戻しの申請）" };
  return null;
}

function lines(from: From): string {
  const out: string[] = [];
  if (from.base) out.push(`    apply_from_base: ${from.base}`);
  if (from.offset != null) out.push(`    apply_from_offset_days: ${from.offset}`);
  if (from.week != null) out.push(`    apply_from_week: ${from.week}`);
  if (from.note) out.push(`    apply_from_note: ${JSON.stringify(from.note)}`);
  return out.join("\n") + "\n";
}

let filled = 0, skipped = 0, already = 0;
const summary = new Map<string, number>();
for (const rel of files) {
  const path = join(ROOT, rel);
  let text = readFileSync(path, "utf8");
  const doc = parse(text) as { steps?: Row[]; subsidies?: Row[] };
  for (const row of [...(doc.steps ?? []), ...(doc.subsidies ?? [])]) {
    if (row.apply_from_base || row.apply_from_note) { already++; continue; }
    const from = decide(row);
    if (!from) { skipped++; continue; }
    // その行のブロックの source_url の直前に足す
    const re = new RegExp(`(  - id: ${row.id.replace(/\./g, "\\.")}\\n(?:(?!  - id: )[^\\n]*\\n)*?)(    source_url:)`);
    if (!re.test(text)) throw new Error(`${rel}: ${row.id} のブロックが見つからない`);
    text = text.replace(re, (_m, head: string, tail: string) => `${head}${lines(from)}${tail}`);
    filled++;
    summary.set(from.note ?? "(note なし)", (summary.get(from.note ?? "(note なし)") ?? 0) + 1);
  }
  if (WRITE) writeFileSync(path, text);
}
console.log(`埋めた: ${filled} ／ 既にあった: ${already} ／ 型に当てはまらず空のまま: ${skipped}${WRITE ? "（書き込み済み）" : "（--write で書き込む）"}`);
for (const [k, v] of [...summary].sort((a, b) => b[1] - a[1])) console.log(`  ${v}\t${k}`);
