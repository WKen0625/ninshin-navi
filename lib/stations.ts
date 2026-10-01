import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { StationRow } from "./geo";

type StationFile = { source: string; source_url: string; built_at: string; stations: StationRow[] };

let cache: StationFile | null = null;

/** 駅の位置表（scripts/build-stations.ts が作る data/reference/stations-13.json） */
export function getStations(): StationFile {
  if (!cache) cache = JSON.parse(readFileSync(join(process.cwd(), "data", "reference", "stations-13.json"), "utf8")) as StationFile;
  return cache;
}
