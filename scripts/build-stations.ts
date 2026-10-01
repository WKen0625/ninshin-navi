// 駅の位置の表を作る。data/reference/stations-13.json に書く。
// 「病院と締切」で、施設ごとの「最寄り駅の目安」（直線距離で最も近い駅）を出すため。
//
// 入力: 国土数値情報「鉄道データ（N02）」の駅 GeoJSON（国土交通省）。
//   https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2023.html から N02-23_GML.zip を取り、
//   UTF-8/N02-23_Station.geojson のパスを引数に渡す。
// 範囲: 東京23区を含む四角（緯度 35.50–35.85、経度 139.55–139.95）。駅は線で入っているので中点を位置にする。
// 同じ駅名で路線が複数ある行は1つにまとめ、路線名を並べる。
//
// 使い方: pnpm tsx scripts/build-stations.ts <N02-23_Station.geojson>

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(import.meta.dirname, "..", "data", "reference", "stations-13.json");
const BBOX = { minLat: 35.5, maxLat: 35.85, minLng: 139.55, maxLng: 139.95 };

type Feature = { properties: Record<string, string>; geometry: { type: string; coordinates: number[][] } };

const src = process.argv[2];
if (!src) throw new Error("駅の GeoJSON のパスを引数に渡してください");
const geo = JSON.parse(readFileSync(src, "utf8")) as { features: Feature[] };

const byName = new Map<string, { name: string; lines: Set<string>; lat: number; lng: number; n: number }>();
for (const f of geo.features) {
  if (f.geometry.type !== "LineString") continue;
  const pts = f.geometry.coordinates;
  const lng = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  if (lat < BBOX.minLat || lat > BBOX.maxLat || lng < BBOX.minLng || lng > BBOX.maxLng) continue;
  const name = f.properties.N02_005;
  const line = f.properties.N02_003;
  const cur = byName.get(name);
  if (cur) {
    cur.lines.add(line);
    // 同じ駅名の複数の位置は平均（同名の別の駅は遠くに無い前提。東京23区内では成り立つ）
    cur.lat = (cur.lat * cur.n + lat) / (cur.n + 1);
    cur.lng = (cur.lng * cur.n + lng) / (cur.n + 1);
    cur.n++;
  } else byName.set(name, { name, lines: new Set([line]), lat, lng, n: 1 });
}

const rows = [...byName.values()]
  .sort((a, b) => a.name.localeCompare(b.name, "ja"))
  .map((s) => [s.name, [...s.lines].join("・"), Math.round(s.lat * 10000) / 10000, Math.round(s.lng * 10000) / 10000] as const);

writeFileSync(
  OUT,
  JSON.stringify({ source: "国土数値情報（鉄道データ N02-23）国土交通省", source_url: "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2023.html", built_at: new Date().toISOString().slice(0, 10), stations: rows }),
);
console.log(`${rows.length} 駅 → ${OUT}`);
