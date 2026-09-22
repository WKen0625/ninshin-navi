// 郵便番号 → 「自宅から病院までの時間」の目安。決定的で、住所を取らない（設計原則2・5）。

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { distanceKm, estimateMinutes, lookupPostal, normalizePostal, travelTo, type PostalTable } from "../lib/geo";
import { ROOT } from "./helpers/db";

const AKASAKA = { lat: 35.669, lng: 139.742 }; // 港区赤坂（107-0052）の代表点
const SANNO = { lat: 35.6693, lng: 139.7302 }; // 山王病院（港区赤坂8丁目）
const JIKEI = { lat: 35.6505, lng: 139.7373 }; // 慈恵医大（港区西新橋）

describe("郵便番号の形", () => {
  it("ハイフン・全角・空白を許し、7桁にそろえる。7桁にならなければ null", () => {
    expect(normalizePostal("107-0052")).toBe("1070052");
    expect(normalizePostal("１０７００５２")).toBe("1070052");
    expect(normalizePostal(" 107 0052 ")).toBe("1070052");
    expect(normalizePostal("1070")).toBeNull();
    expect(normalizePostal("10700521")).toBeNull();
    expect(normalizePostal("")).toBeNull();
  });
});

describe("距離と時間の目安", () => {
  it("直線距離: 赤坂 → 山王病院は約1km、赤坂 → 慈恵医大は約2km", () => {
    expect(distanceKm(AKASAKA, SANNO)).toBeCloseTo(1.07, 1);
    expect(distanceKm(AKASAKA, JIKEI)).toBeCloseTo(2.1, 1);
    expect(distanceKm(AKASAKA, AKASAKA)).toBe(0);
  });

  it("時間は直線で時速10km（待ち時間・乗り換え込み）とみなし、5分単位に切り上げる。最低5分", () => {
    expect(estimateMinutes(0)).toBe(5);
    expect(estimateMinutes(1.07)).toBe(10);
    expect(estimateMinutes(5)).toBe(30);
    expect(estimateMinutes(5.1)).toBe(35);
    expect(estimateMinutes(10)).toBe(60);
  });

  it("希望（30分／1時間）に収まるか。「こだわらない」なら判定しない。位置が無ければ null", () => {
    expect(travelTo(AKASAKA, SANNO, "30min")).toEqual({ km: 1.1, minutes: 10, within: true });
    expect(travelTo(AKASAKA, { lat: 35.75, lng: 139.85 }, "30min")).toMatchObject({ within: false }); // 約13km（足立区あたり）
    expect(travelTo(AKASAKA, { lat: 35.75, lng: 139.85 }, "60min")).toMatchObject({ minutes: 80, within: false });
    expect(travelTo(AKASAKA, SANNO, "any")).toMatchObject({ within: null });
    expect(travelTo(null, SANNO, "30min")).toBeNull();
    expect(travelTo(AKASAKA, { lat: null, lng: null }, "30min")).toBeNull();
  });

  it("位置表から引く。表に無い番号は null", () => {
    const table: PostalTable = { "1070052": [35.669, 139.742] };
    expect(lookupPostal(table, "1070052")).toEqual(AKASAKA);
    expect(lookupPostal(table, "1000001")).toBeNull();
    expect(lookupPostal(null, "1070052")).toBeNull();
    expect(lookupPostal(table, null)).toBeNull();
  });
});

describe("位置表（data/reference/postal-13.json）", () => {
  const path = join(ROOT, "data", "reference", "postal-13.json");
  it.skipIf(!existsSync(path))("23区ぶんの表があり、出典と取得日を持つ。港区の赤坂は港区の中にある", () => {
    const file = JSON.parse(readFileSync(path, "utf8"));
    expect(file.source_url).toMatch(/^https:\/\//);
    expect(file.as_of).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Object.keys(file.regions)).toHaveLength(23);
    const akasaka = file.regions["13103"]["1070052"];
    expect(akasaka[0]).toBeCloseTo(35.669, 2);
    expect(akasaka[1]).toBeCloseTo(139.742, 2);
    // 精度は小数3桁まで（個人を特定できる精度は持たせない）
    for (const table of Object.values(file.regions) as PostalTable[]) {
      for (const [lat, lng] of Object.values(table)) {
        expect(String(lat).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(3);
        expect(String(lng).split(".")[1]?.length ?? 0).toBeLessThanOrEqual(3);
      }
    }
  });
});
