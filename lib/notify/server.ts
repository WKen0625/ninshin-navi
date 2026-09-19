import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getRulesFor, type Rules } from "../rules";
import { buildDigest, canSendNow, maskEmail, renderDigestMail, type Mail, type Snapshot } from "./digest";

export type Subscription = {
  id: string;
  email: string;
  status: "pending" | "active";
  snapshot: Snapshot;
  last_progress_on: string | null;
  nudges_sent: number;
  last_sent_at: string | null;
  confirmed_at: string | null;
  created_at: string;
};

export function notifyServer(): { db: SupabaseClient; linkSecret: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const linkSecret = process.env.NOTIFY_LINK_SECRET;
  if (!url || !key || !linkSecret) return null;
  return { db: createClient(url, key, { auth: { persistSession: false } }), linkSecret };
}

export const baseUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100").replace(/\/$/, "");

/** 端末が持つ合言葉。DBには sha256 だけを置く。 */
export const newDeviceToken = () => randomBytes(32).toString("hex");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const isToken = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{64}$/.test(v);
export const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);

/** メールの中のリンク（登録の完了・通知をやめる）は、id と署名で確かめる。DBに合言葉を平文で置かなくて済む。 */
export type LinkPurpose = "confirm" | "unsubscribe";
export const signLink = (purpose: LinkPurpose, id: string, secret: string) => createHmac("sha256", secret).update(`${purpose}:${id}`).digest("hex");
export function verifyLink(purpose: LinkPurpose, id: unknown, sig: unknown, secret: string): id is string {
  if (!isUuid(id) || typeof sig !== "string" || !/^[0-9a-f]{64}$/.test(sig)) return false;
  return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(signLink(purpose, id, secret), "hex"));
}
export const linkFor = (purpose: LinkPurpose, id: string, secret: string) => `${baseUrl()}/notify/${purpose}?id=${id}&sig=${signLink(purpose, id, secret)}`;

export const mailProviderReady = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

/** メールを送る（Resend）。未設定なら送らずに false を返す。 */
export async function sendMail(to: string, mail: Mail, unsubscribeUrl?: string): Promise<boolean> {
  if (!mailProviderReady()) {
    console.log(`[mail 未送信: RESEND_API_KEY / MAIL_FROM が未設定] to=${maskEmail(to)} subject=${mail.subject}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      ...(unsubscribeUrl ? { headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } } : {}),
    }),
  });
  if (!res.ok) console.error(`[mail 失敗] status=${res.status} to=${maskEmail(to)}`);
  return res.ok;
}

/** 日本時間の今日（YYYY-MM-DD） */
export const todayJst = (now = new Date()) => new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 10);

export type JobSummary = {
  active: number;
  sent: number;
  nothing_to_say: number;
  skipped_weekly_limit: number;
  failed: number;
  expired_pending_deleted: number;
  dry_run: boolean;
  /** dry run のときだけ: 送るはずだったメール（宛先は伏せ字） */
  preview?: { to: string; subject: string; text: string }[];
};

/** 週1回の実行本体。cron（/api/cron/notify）と手元の確認（pnpm notify:run）の両方から呼ぶ。 */
export async function runNotifyJob(opts: { dryRun: boolean; now?: Date }): Promise<JobSummary> {
  const s = notifyServer();
  if (!s) throw new Error("通知の設定が足りません（Supabase の鍵 / NOTIFY_LINK_SECRET）");
  const now = opts.now ?? new Date();
  const today = todayJst(now);
  const summary: JobSummary = { active: 0, sent: 0, nothing_to_say: 0, skipped_weekly_limit: 0, failed: 0, expired_pending_deleted: 0, dry_run: opts.dryRun, ...(opts.dryRun ? { preview: [] } : {}) };

  // 確認メールのリンクを7日間開かなかった登録は消す
  if (!opts.dryRun) {
    const expired = await s.db.from("notification_subscriptions").delete().eq("status", "pending").lt("created_at", new Date(now.getTime() - 7 * 86_400_000).toISOString()).select("id");
    summary.expired_pending_deleted = expired.data?.length ?? 0;
  }

  const { data, error } = await s.db.from("notification_subscriptions").select("*").eq("status", "active");
  if (error) throw error;
  const subs = data as Subscription[];
  summary.active = subs.length;

  const rulesCache = new Map<string, Rules>();
  for (const sub of subs) {
    if (!canSendNow(sub.last_sent_at, now)) {
      summary.skipped_weekly_limit++;
      continue;
    }
    const region = sub.snapshot.region_code;
    if (!rulesCache.has(region)) rulesCache.set(region, await getRulesFor(region));
    const digest = buildDigest({
      snapshot: sub.snapshot,
      today,
      lastProgressOn: sub.last_progress_on ?? todayJst(new Date(sub.confirmed_at ?? sub.created_at)),
      nudgesSent: sub.nudges_sent,
      ...rulesCache.get(region)!,
    });
    if (!digest) {
      summary.nothing_to_say++;
      continue;
    }
    const unsubscribe = linkFor("unsubscribe", sub.id, s.linkSecret);
    const mail = renderDigestMail(digest, today, { todo: `${baseUrl()}/todo`, unsubscribe });
    if (opts.dryRun) {
      summary.preview!.push({ to: maskEmail(sub.email), subject: mail.subject, text: mail.text.replace(/sig=[0-9a-f]+/g, "sig=…") });
      continue;
    }
    if (await sendMail(sub.email, mail, unsubscribe)) {
      summary.sent++;
      await s.db.from("notification_subscriptions").update({ last_sent_at: now.toISOString(), nudges_sent: sub.nudges_sent + (digest.nudge ? 1 : 0) }).eq("id", sub.id);
    } else {
      summary.failed++;
    }
  }
  return summary;
}
