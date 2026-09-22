// 郵便番号 → おおよその位置（緯度・経度）の表を作る。data/reference/postal-13.json に書く。
// 「自宅から病院までの時間」の目安を、郵便番号だけから出すため（住所は取らない。設計原則5）。
//
// 入力: 日本郵便の郵便番号データ（UTF-8版・全国）。対象は service-area の市区町村コードの範囲だけ。
// 位置: 国土地理院「地理院地図」の住所検索API（https://msearch.gsi.go.jp/address-search/AddressSearch）で
//       「東京都＋区＋町域」を検索し、先頭の結果の座標を使う。町域は括弧（「次のビルを除く」など）を落とし、
//       事業所ビルごとの郵便番号（例: 赤坂アーク森ビル 10階）は、同じ区の普通の町域名で最も長く一致するものに寄せる。
// 精度: 小数3桁（約100m）。個人を特定できる精度は持たせない。
//
// 使い方: pnpm build:postal   （数分かかる。国土地理院APIへの負荷を避けるため、1秒に5件まで）

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SOURCE_URL = "https://www.post.japanpost.jp/service/search/zipcode/download/utf/zip/utf_ken_all.zip";
const GEOCODER = "https://msearch.gsi.go.jp/address-search/AddressSearch";
const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "data", "reference", "postal-13.json");
// 東京23区（13101〜13123）。広げるときは service-area の範囲に合わせて変える
const CODE_MIN = 13101;
const CODE_MAX = 13123;

type Row = { code: string; zip: string; ward: string; town: string };

async function loadRows(): Promise<Row[]> {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`郵便番号データの取得に失敗: HTTP ${res.status}`);
  const zip = new Uint8Array(await res.arrayBuffer());
  const csv = await unzipSingleCsv(zip);
  const rows: Row[] = [];
  for (const line of csv.split(/\r?\n/)) {
    if (!line) continue;
    const cols = parseCsvLine(line);
    const code = Number(cols[0]);
    if (code < CODE_MIN || code > CODE_MAX) continue;
    rows.push({ code: cols[0], zip: cols[2], ward: cols[7], town: cols[8] });
  }
  return rows;
}

// zipの中の1つのCSV（utf_ken_all.csv）を取り出す。依存を増やさず、Node標準の zlib だけで済ませる
async function unzipSingleCsv(buf: Uint8Array): Promise<string> {
  const { inflateRawSync } = await import("node:zlib");
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // 中央ディレクトリの終わり（EOCD）を後ろから探す
  let eocd = buf.length - 22;
  while (eocd >= 0 && view.getUint32(eocd, true) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error("zip の形式が読めない");
  const cdOffset = view.getUint32(eocd + 16, true);
  const nameLen = view.getUint16(cdOffset + 28, true);
  const extraLen = view.getUint16(cdOffset + 30, true);
  const commentLen = view.getUint16(cdOffset + 32, true);
  const method = view.getUint16(cdOffset + 10, true);
  const compSize = view.getUint32(cdOffset + 20, true);
  const localOffset = view.getUint32(cdOffset + 42, true);
  void nameLen; void extraLen; void commentLen;
  const localNameLen = view.getUint16(localOffset + 26, true);
  const localExtraLen = view.getUint16(localOffset + 28, true);
  const start = localOffset + 30 + localNameLen + localExtraLen;
  const data = buf.subarray(start, start + compSize);
  const raw = method === 8 ? inflateRawSync(data) : Buffer.from(data);
  return raw.toString("utf8");
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === "," && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** 町域名から括弧の中身と「以下に掲載がない場合」を落とす */
const cleanTown = (t: string) => (t === "以下に掲載がない場合" ? "" : t.replace(/（.*$/, "").replace(/\(.*$/, "").trim());

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function geocode(query: string): Promise<[number, number] | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${GEOCODER}?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { geometry: { coordinates: [number, number] } }[];
      const c = json[0]?.geometry?.coordinates;
      return c ? [round3(c[1]), round3(c[0])] : null;
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(1500);
    }
  }
  return null;
}
const round3 = (n: number) => Math.round(n * 1000) / 1000;

async function main() {
  const rows = await loadRows();
  console.log(`郵便番号の行: ${rows.length}`);

  // 区ごとの「普通の町域名」の集合（ビルごとの郵便番号を寄せる先）
  const plainTowns = new Map<string, Set<string>>();
  for (const r of rows) {
    const t = cleanTown(r.town);
    // ビルごとの郵便番号は 3桁目以降が 6〜8 で始まる（例: 107-6001）。それ以外を普通の町域とする
    if (t && !/^\d{3}[6-8]/.test(r.zip)) (plainTowns.get(r.ward) ?? plainTowns.set(r.ward, new Set()).get(r.ward)!).add(t);
  }

  // 郵便番号 → 検索する住所
  const queryOf = new Map<string, string>();
  for (const r of rows) {
    if (queryOf.has(r.zip)) continue; // 同じ番号に複数の町域があるときは先頭を使う
    let t = cleanTown(r.town);
    if (/^\d{3}[6-8]/.test(r.zip)) {
      const cands = [...(plainTowns.get(r.ward) ?? [])].filter((p) => t.startsWith(p)).sort((a, b) => b.length - a.length);
      t = cands[0] ?? "";
    }
    queryOf.set(r.zip, `東京都${r.ward}${t}`);
  }

  const queries = [...new Set(queryOf.values())];
  console.log(`郵便番号: ${queryOf.size}件 ／ 位置を調べる住所: ${queries.length}件`);
  const coords = new Map<string, [number, number] | null>();
  let done = 0;
  for (const q of queries) {
    coords.set(q, await geocode(q));
    if (++done % 100 === 0) console.log(`  ${done}/${queries.length}`);
    await sleep(200);
  }

  // 区（市区町村コード）ごとにまとめる。API は区の表だけを返す
  const codeOf = new Map(rows.map((r) => [r.zip, r.code]));
  const regions: Record<string, Record<string, [number, number]>> = {};
  const missing: string[] = [];
  let total = 0;
  for (const [zip, q] of queryOf) {
    const c = coords.get(q);
    if (!c) {
      missing.push(`${zip} ${q}`);
      continue;
    }
    (regions[codeOf.get(zip)!] ??= {})[zip] = c;
    total++;
  }
  const today = new Date().toISOString().slice(0, 10);
  mkdirSync(join(ROOT, "data", "reference"), { recursive: true });
  writeFileSync(
    OUT,
    JSON.stringify(
      {
        source: "日本郵便「郵便番号データ（UTF-8版・全国一括）」＋ 国土地理院「地理院地図 住所検索API」",
        source_url: SOURCE_URL,
        geocoder_url: GEOCODER,
        as_of: today,
        verified_at: today,
        precision: "小数3桁（約100m）。町域の代表点。ビルごとの郵便番号は町域に寄せる",
        range: `${CODE_MIN}-${CODE_MAX}`,
        count: total,
        regions,
      },
      null,
      0,
    ) + "\n",
  );
  console.log(`書き出し: ${OUT}（${total}件）`);
  if (missing.length) console.log(`位置が見つからなかった郵便番号 ${missing.length}件:\n  ${missing.slice(0, 30).join("\n  ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
