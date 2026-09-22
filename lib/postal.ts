import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PostalTable } from "./geo";

type PostalFile = { source: string; source_url: string; as_of: string; regions: Record<string, PostalTable> };

let cache: PostalFile | null = null;

/** 郵便番号の位置表（scripts/build-postal.ts が作る data/reference/postal-13.json） */
function load(): PostalFile {
  if (!cache) cache = JSON.parse(readFileSync(join(process.cwd(), "data", "reference", "postal-13.json"), "utf8")) as PostalFile;
  return cache;
}

/** その区の表だけを返す。表に無い区は空 */
export function getPostalTable(regionCode: string): PostalTable {
  return load().regions[regionCode] ?? {};
}

export function getPostalSource(): { source: string; source_url: string; as_of: string } {
  const { source, source_url, as_of } = load();
  return { source, source_url, as_of };
}
