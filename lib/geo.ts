// 郵便番号から「自宅から病院までの時間」の目安を出すための、純粋な計算。決定的（設計原則2）。
// 住所は取らない。郵便番号は端末のブラウザ内にだけ保存し、サーバーには「区」の位置表を取りに行くだけ（設計原則5）。
// 時間は直線距離からの目安で、道路・電車の経路は見ていない。画面には必ず「目安」と添える。

import type { Preferences } from "./family-state";

export type LatLng = { lat: number; lng: number };

/** 区ごとの位置表（/api/postal?region= の返り）。郵便番号7桁 → [緯度, 経度]（小数3桁・町域の代表点） */
export type PostalTable = Record<string, [number, number]>;

export const POSTAL_RE = /^\d{7}$/;

/** 「107-0052」「１０７００５２」などを7桁の数字にそろえる。7桁にならなければ null */
export function normalizePostal(input: string): string | null {
  const digits = input.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\D/g, "");
  return POSTAL_RE.test(digits) ? digits : null;
}

export function lookupPostal(table: PostalTable | null, postal: string | null): LatLng | null {
  if (!table || !postal) return null;
  const hit = table[postal];
  return hit ? { lat: hit[0], lng: hit[1] } : null;
}

/** 2点の直線距離（km）。地球を球とみなす */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * 直線距離 → ドアからドアまでの時間の目安（分）。
 * 都区部で電車・バス・徒歩を混ぜた平均を、直線で時速10kmとみなす（待ち時間・乗り換え込み）。
 * つまり 30分 ≒ 5km、1時間 ≒ 10km。切り上げて5分単位。
 */
export const DOOR_TO_DOOR_KMH = 10;
export function estimateMinutes(km: number): number {
  return Math.max(5, Math.ceil((km / DOOR_TO_DOOR_KMH) * 60 / 5) * 5);
}

export const PREFERENCE_MINUTES: Record<Exclude<Preferences["distance"], "any">, number> = { "30min": 30, "60min": 60 };

export type Travel = { km: number; minutes: number; within: boolean | null };

/** 自宅と施設の位置から、距離・時間の目安と、希望（30分／1時間）に収まるか。位置が無ければ null */
export function travelTo(home: LatLng | null, facility: { lat: number | null; lng: number | null }, preference: Preferences["distance"]): Travel | null {
  if (!home || facility.lat == null || facility.lng == null) return null;
  const km = Math.round(distanceKm(home, { lat: facility.lat, lng: facility.lng }) * 10) / 10;
  const minutes = estimateMinutes(km);
  const within = preference === "any" ? null : minutes <= PREFERENCE_MINUTES[preference];
  return { km, minutes, within };
}
