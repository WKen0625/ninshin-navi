// 試用に向けた仕上げ: 投稿の回数制限、まちがいの知らせの表、下書きの文書。

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../lib/markdown";
import { createTestDb, ROOT } from "./helpers/db";

describe("投稿の回数制限（本物のスキーマ）", () => {
  it("同じ鍵・同じ1時間の区切りなら数が増え、区切りが変われば1から数え直す", async () => {
    const { db } = await createTestDb();
    const hit = async (key: string, window: string) => (await db.query("select rate_limit_hit($1, $2) as n", [key, window])).rows[0].n;
    const now = new Date();
    now.setUTCMinutes(0, 0, 0);
    const next = new Date(now.getTime() + 3_600_000);
    expect(await hit("reports:abc", now.toISOString())).toBe(1);
    expect(await hit("reports:abc", now.toISOString())).toBe(2);
    expect(await hit("reports:zzz", now.toISOString())).toBe(1);
    expect(await hit("reports:abc", next.toISOString())).toBe(1);
  });

  it("1日より前の行は、次に数えるときに消える（IPのハッシュを長く持たない）", async () => {
    const { db } = await createTestDb();
    await db.query("insert into rate_limits (key, window_start, count) values ('old', now() - interval '2 days', 9)");
    await db.query("select rate_limit_hit('new', date_trunc('hour', now()))");
    const { rows } = await db.query("select key from rate_limits order by 1");
    expect(rows.map((r) => r.key)).toEqual(["new"]);
  });

  it("rate_limits と feedback は RLS が有効でポリシーなし。回数制限の関数は公開の役割から呼べない", async () => {
    const { db } = await createTestDb();
    for (const table of ["rate_limits", "feedback"]) {
      const rls = await db.query("select relrowsecurity from pg_class where relname = $1", [table]);
      const policies = await db.query("select count(*)::int as n from pg_policies where tablename = $1", [table]);
      expect(rls.rows[0].relrowsecurity, table).toBe(true);
      expect(policies.rows[0].n, table).toBe(0);
    }
    const acl = await db.query("select has_function_privilege('anon', 'rate_limit_hit(text, timestamptz)', 'execute') as anon, has_function_privilege('authenticated', 'rate_limit_hit(text, timestamptz)', 'execute') as auth");
    expect(acl.rows[0]).toEqual({ anon: false, auth: false });
  });
});

describe("利用規約・プライバシーポリシーの下書き", () => {
  const read = (f: string) => readFileSync(join(ROOT, "content", "legal", f), "utf8");

  it("見出し・箇条書き・段落に分けられる", () => {
    expect(parseMarkdown("# 題\n\n本文1\n本文2\n\n- あ\n- い\n\n## 次\n終わり")).toEqual([
      { type: "h1", text: "題" },
      { type: "p", text: "本文1\n本文2" },
      { type: "ul", items: ["あ", "い"] },
      { type: "h2", text: "次" },
      { type: "p", text: "終わり" },
    ]);
  });

  it("どちらも「下書き」と明記し、運営者と問い合わせ先を書いてある。弁護士に確認するところは【要確認】で残してある", () => {
    for (const f of ["terms.md", "privacy.md"]) {
      expect(read(f)).toContain("下書き");
      expect(read(f)).toContain("Tsugiraku事務局");
      expect(read(f)).toContain("info@tsugiraku.jp");
      expect(read(f)).toContain("【要確認】");
      expect(read(f)).not.toContain("【運営者名】");
    }
  });

  it("プライバシーポリシーは、サーバーに保存するもの（実装している5種類）と、利用している外部の事業者をすべて挙げている", () => {
    const p = read("privacy.md");
    for (const word of ["一覧にない紙", "記録（任意の1問", "メール通知", "まちがいの知らせ", "回数制限", "Vercel", "Supabase", "Resend", "Anthropic", "localStorage"]) expect(p, word).toContain(word);
  });

  it("利用規約は、設計原則の約束（医療判断をしない・最終確認は窓口へ・謝礼なし・施設の画面に広告なし）を書いている", () => {
    const t = read("terms.md");
    for (const word of ["医療に関する判断や助言をしません", "最終確認", "お礼の品やポイントはありません", "広告や製品の紹介は置きません", "掲載料を受け取りません"]) expect(t, word).toContain(word);
  });
});
