import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/** 1時間あたりの上限。試用の規模（数家族）には十分ゆるく、連投のいたずらは止まる */
export const LIMITS = { reports: 20, notifications: 5, suggestions: 10, feedback: 10, stuck: 30 } as const;

/**
 * 回数制限。超えていたら true（= 断る）。
 * IPアドレスは保存しない。サーバー側の秘密値と合わせたハッシュを、1時間ごとの区切りで数えるだけ（1日で消える）。
 * 数える仕組みが使えないとき（migration 未適用など）は、止めずに通す。
 */
export async function overLimit(db: SupabaseClient, request: Request, name: keyof typeof LIMITS): Promise<boolean> {
  const secret = process.env.REPORTER_HASH_SECRET;
  if (!secret) return false;
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const key = `${name}:${createHash("sha256").update(`${ip}:${secret}`).digest("hex").slice(0, 32)}`;
  const hour = new Date();
  hour.setUTCMinutes(0, 0, 0);
  const { data, error } = await db.rpc("rate_limit_hit", { p_key: key, p_window: hour.toISOString() });
  if (error) {
    console.error("[rate-limit] 数えられませんでした", error.message);
    return false;
  }
  return (data as number) > LIMITS[name];
}

export const TOO_MANY = { error: "短い時間に何度も送られています。1時間ほど待ってからお試しください" } as const;
