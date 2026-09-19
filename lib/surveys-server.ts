import "server-only";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { normalizeOptions, type Survey, type SurveyField } from "./surveys";

type RawField = Omit<SurveyField, "options"> & { options?: unknown[]; option_suffix?: string };
type RawSurvey = Omit<Survey, "fields"> & { fields: RawField[] };

let cache: Survey[] | null = null;

/** data/surveys.yaml を読む（質問の追加・変更でコードを変えない） */
export function loadSurveys(): Survey[] {
  if (cache && process.env.NODE_ENV === "production") return cache;
  const raw = parse(readFileSync(join(process.cwd(), "data", "surveys.yaml"), "utf8")) as { surveys: RawSurvey[] };
  cache = raw.surveys.map((s) => ({
    id: s.id,
    title: s.title,
    reward_text: s.reward_text,
    target_table: s.target_table,
    fields: s.fields.map(({ option_suffix, options, ...f }) => ({
      ...f,
      ...(options ? { options: normalizeOptions(options, option_suffix) } : {}),
    })),
  }));
  return cache;
}

/** reporter_hash = sha256(端末ごとのランダムID + サーバー側の秘密値)。端末IDそのものは保存しない。 */
export function reporterHash(deviceId: string, secret: string): string {
  return createHash("sha256").update(`${deviceId}:${secret}`).digest("hex");
}

export const isDeviceId = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/.test(v);
