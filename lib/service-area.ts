import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import master from "@/data/reference/municipalities.json";

export type ServiceArea = { contact: string; label: string; municipalities: { code: string; name: string; prefecture: string }[] };

/** いま選べる市区町村（data/service-area.yaml）。名前は総務省の一覧から引く。 */
export function loadServiceArea(): ServiceArea {
  const raw = parse(readFileSync(join(process.cwd(), "data", "service-area.yaml"), "utf8")) as { contact: string; label: string; municipalities: string[] };
  const byCode = new Map(master.prefectures.flatMap((p) => p.municipalities.map((m) => [m.code, { ...m, prefecture: p.name }] as const)));
  return {
    contact: raw.contact,
    label: raw.label,
    municipalities: raw.municipalities.map((code) => {
      const found = byCode.get(String(code));
      if (!found) throw new Error(`data/service-area.yaml: ${code} が総務省の一覧にありません`);
      return found;
    }),
  };
}
