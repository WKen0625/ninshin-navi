import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { baseUrl, mailProviderReady, sendMail } from "../notify/server";
import { buildSummaryPrompt, decide, extractText, plainDiffSummary, SUMMARY_SYSTEM, type Fetched, type Outcome, type SourceRef } from "./core";

// CLAUDE.md §5: 差分の要約は Haiku。要約は参考情報で、承認は人がする。
const SUMMARY_MODEL = "claude-haiku-4-5";
const USER_AGENT = "ninshin-navi-source-watch/0.1 (weekly check of cited public pages)";
const FETCH_TIMEOUT_MS = 25_000;
const CONCURRENCY = 4;
/** 行に needs_review の列がある表（変更が見つかったら画面に「内容を確認中」を出す） */
const FLAGGABLE = ["steps", "subsidies", "facilities"] as const;

type WatchRow = { url: string; content_hash: string | null; content_text: string | null; consecutive_failures: number; needs_review: boolean };

function server(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase の設定が足りません（NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY）");
  return createClient(url, key, { auth: { persistSession: false } });
}

async function fetchSource(url: string): Promise<Fetched> {
  try {
    const res = await fetch(url, { headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml,*/*" }, redirect: "follow", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return { kind: "http_error", status: res.status };
    const type = res.headers.get("content-type") ?? "";
    const bytes = new Uint8Array(await res.arrayBuffer());
    // PDF を text/html などと名乗って返すサーバーがあるので、中身の先頭（%PDF）でも見分ける
    const looksPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    if (!looksPdf && /html|xml|text\//i.test(type)) return { kind: "text", status: res.status, text: extractText(decodeBody(bytes, type)) };
    return { kind: "binary", status: res.status, bytes };
  } catch (e) {
    return { kind: "network_error", message: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
  }
}

/** Shift_JIS や EUC-JP のページもあるので、Content-Type か meta の charset に合わせて読む */
function decodeBody(bytes: Uint8Array, contentType: string): string {
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 2048));
  const charset = (contentType.match(/charset=["']?([\w-]+)/i) ?? head.match(/<meta[^>]+charset=["']?([\w-]+)/i))?.[1] ?? "utf-8";
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/** 差分の要約（Haiku）。鍵が無い・失敗したときは null を返し、機械的な差分だけを残す。 */
async function summarize(url: string, refs: SourceRef[], diff: { removed: string[]; added: string[] }): Promise<string | null> {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return null;
  const { prompt, truncated } = buildSummaryPrompt(url, refs, diff);
  try {
    const client = new Anthropic({ timeout: 60_000 });
    const response = await client.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: 1500, // 8行以内の短い要約だけを求めている
      system: SUMMARY_SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") return null;
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
    if (!text) return null;
    return truncated ? `（差分が長いため、先頭の一部だけを要約しています）\n${text}` : text;
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) console.error("[source-watch] 要約: レート制限");
    else if (e instanceof Anthropic.AuthenticationError) console.error("[source-watch] 要約: APIキーが正しくありません");
    else if (e instanceof Anthropic.APIError) console.error(`[source-watch] 要約: APIエラー ${e.status}`);
    else console.error("[source-watch] 要約に失敗", e);
    return null;
  }
}

export type WatchReportItem = { url: string; outcome: Outcome["type"]; detail: string; refs: SourceRef[] };
export type WatchSummary = { checked: number; baseline: number; unchanged: number; changed: number; gone: number; unreadable: number; error: number; dry_run: boolean; items: WatchReportItem[] };

/** 週1回の実行本体。cron（/api/cron/source-watch）と手元（pnpm watch:run）の両方から呼ぶ。 */
export async function runSourceWatch(opts: { dryRun: boolean }): Promise<WatchSummary> {
  const db = server();
  const now = new Date().toISOString();

  const urls = await db.from("v_source_urls").select("url, table_name, row_id, label, verified_at");
  if (urls.error) throw urls.error;
  const refsByUrl = new Map<string, SourceRef[]>();
  for (const r of urls.data as (SourceRef & { url: string })[]) {
    const { url, ...ref } = r;
    const list = refsByUrl.get(url) ?? [];
    if (!list.some((x) => x.table_name === ref.table_name && x.row_id === ref.row_id)) list.push(ref);
    refsByUrl.set(url, list);
  }

  const watched = await db.from("source_watch").select("url, content_hash, content_text, consecutive_failures, needs_review");
  if (watched.error) throw watched.error;
  const previous = new Map((watched.data as WatchRow[]).map((w) => [w.url, w]));

  const summary: WatchSummary = { checked: 0, baseline: 0, unchanged: 0, changed: 0, gone: 0, unreadable: 0, error: 0, dry_run: opts.dryRun, items: [] };
  const queue = [...refsByUrl.keys()].sort();

  async function handle(url: string) {
    const refs = refsByUrl.get(url)!;
    const outcome = decide(previous.get(url) ?? null, await fetchSource(url));
    summary.checked++;
    summary[outcome.type]++;

    const base = { url, last_checked_at: now };
    let row: Record<string, unknown> | null = null;
    let detail = "";
    let flag = false;
    switch (outcome.type) {
      case "baseline":
        row = { ...base, content_hash: outcome.hash, content_text: outcome.text, http_status: outcome.status, last_error: null, consecutive_failures: 0 };
        break;
      case "unchanged":
        row = { ...base, http_status: outcome.status, last_error: null, consecutive_failures: 0 };
        break;
      case "changed": {
        const plain = plainDiffSummary(outcome.diff);
        const ai = opts.dryRun || !outcome.diff ? null : await summarize(url, refs, outcome.diff);
        detail = ai ? `${ai}\n\n--- 機械的な差分 ---\n${plain}` : plain;
        row = { ...base, content_hash: outcome.hash, content_text: outcome.text, http_status: outcome.status, last_error: null, consecutive_failures: 0, changed_at: now, needs_review: true, diff_summary: detail };
        flag = true;
        break;
      }
      case "gone":
        detail = `ページが見つかりません（HTTP ${outcome.status}）。出典のURLが変わったか、制度が終了した可能性があります。`;
        row = { ...base, http_status: outcome.status, last_error: detail, changed_at: now, needs_review: true, diff_summary: detail };
        flag = true;
        break;
      case "unreadable":
        detail = outcome.reason;
        row = { ...base, http_status: outcome.status, last_error: outcome.reason, consecutive_failures: 0 };
        break;
      case "error":
        detail = `${outcome.reason}（連続${outcome.failures}回）`;
        row = { ...base, http_status: outcome.status, last_error: outcome.reason, consecutive_failures: outcome.failures };
        break;
    }
    if (outcome.type !== "unchanged" && outcome.type !== "baseline") summary.items.push({ url, outcome: outcome.type, detail, refs });
    if (opts.dryRun) return;

    const saved = await db.from("source_watch").upsert(row, { onConflict: "url" });
    if (saved.error) throw saved.error;
    if (flag) {
      // このページを出典にしている行に「内容を確認中」を出す。外すのは人（YAML の verified_at を新しくして pnpm seed）
      for (const table of FLAGGABLE) await db.from(table).update({ needs_review: true }).eq("source_url", url);
      await db.from("facilities").update({ needs_review: true }).eq("booking_source_url", url);
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      // 1つのURLでつまずいても、残りの確認は続ける
      await handle(url).catch((e) => {
        summary.error++;
        summary.items.push({ url, outcome: "error", detail: `記録に失敗: ${e instanceof Error ? e.message : JSON.stringify(e)}`, refs: refsByUrl.get(url) ?? [] });
      });
    }
  });
  await Promise.all(workers);

  if (!opts.dryRun) {
    // もうどの行からも参照されていないURLは、監視の表から外す
    const stale = [...previous.keys()].filter((u) => !refsByUrl.has(u));
    if (stale.length > 0) await db.from("source_watch").delete().in("url", stale);
    await notifyAdmin(summary);
  }
  summary.items.sort((a, b) => a.url.localeCompare(b.url));
  return summary;
}

/** 変更が見つかった週だけ、管理者にメールで知らせる（ADMIN_EMAIL とメール送信が設定されている場合） */
async function notifyAdmin(summary: WatchSummary) {
  const to = process.env.ADMIN_EMAIL;
  const hits = summary.items.filter((i) => i.outcome === "changed" || i.outcome === "gone");
  if (!to || !mailProviderReady() || hits.length === 0) return;
  const text = [
    `出典ページの変更が${hits.length}件見つかりました。該当の行には「内容を確認中」を表示しています。`,
    "ページを開いて内容を確かめ、data/ のYAMLを直し（変更が無ければ verified_at だけ新しくし）、pnpm seed を流すと表示が消えます。",
    "",
    ...hits.flatMap((i) => [`■ ${i.url}`, ...i.refs.map((r) => `　・${r.table_name}:${r.row_id}「${r.label}」`), i.detail, ""]),
    `一覧: pnpm watch:report ／ サイト: ${baseUrl()}`,
  ].join("\n");
  const html = `<pre style="font-size:14px;white-space:pre-wrap">${text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)}</pre>`;
  await sendMail(to, { subject: `【妊娠手続きナビ・管理】出典ページの変更 ${hits.length}件`, text, html });
}

export type WatchReport = { needs_review: { url: string; changed_at: string | null; diff_summary: string | null; refs: SourceRef[] }[]; trouble: { url: string; last_error: string; consecutive_failures: number }[]; watched: number };

/** いま人の確認を待っているもの・取得できていないものの一覧 */
export async function sourceWatchReport(): Promise<WatchReport> {
  const db = server();
  const [rows, urls] = await Promise.all([
    db.from("source_watch").select("url, changed_at, needs_review, diff_summary, last_error, consecutive_failures").order("url"),
    db.from("v_source_urls").select("url, table_name, row_id, label, verified_at"),
  ]);
  if (rows.error) throw rows.error;
  if (urls.error) throw urls.error;
  const refs = (u: string) => (urls.data as (SourceRef & { url: string })[]).filter((r) => r.url === u).map(({ url: _url, ...r }) => r);
  return {
    watched: rows.data.length,
    needs_review: rows.data.filter((r) => r.needs_review).map((r) => ({ url: r.url, changed_at: r.changed_at, diff_summary: r.diff_summary, refs: refs(r.url) })),
    trouble: rows.data.filter((r) => r.last_error && !r.needs_review).map((r) => ({ url: r.url, last_error: r.last_error as string, consecutive_failures: r.consecutive_failures })),
  };
}
