import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { seed, SeedRejectedError, loadSeedData } from "../lib/seed";
import { createTestDb, ROOT } from "./helpers/db";

const DATA = join(ROOT, "data");

/** data/ を一時フォルダに写し、1ファイルだけ書き換える */
function dataWith(file: string, edit: (yaml: string) => string): string {
  const dir = mkdtempSync(join(tmpdir(), "ninshin-seed-"));
  cpSync(DATA, dir, { recursive: true });
  const path = join(dir, file);
  const before = readFileSync(path, "utf8");
  const after = edit(before);
  expect(after).not.toBe(before);
  writeFileSync(path, after);
  return dir;
}

describe("seed: 本物の data/ を投入できる", () => {
  let ctx: Awaited<ReturnType<typeof createTestDb>>;
  beforeAll(async () => {
    ctx = await createTestDb();
  });

  it("schema.sql と policies.sql が通り、全行が入る", async () => {
    const result = await seed(ctx.db, DATA);
    expect(result.upserted).toEqual({ regions: 4, documents: 23, steps: 34, subsidies: 12, facilities: 18, facility_costs_public: 18 });
    expect(result.orphans).toEqual({});
  });

  it("もう一度流しても同じ結果（上書き）", async () => {
    await seed(ctx.db, DATA);
    const { rows } = await ctx.db.query("select count(*)::int as n from steps");
    expect(rows[0].n).toBe(34);
  });

  it("投入後、出典と確認日の無いルール・金額の行は0件", async () => {
    for (const table of ["steps", "subsidies", "facilities"]) {
      const { rows } = await ctx.db.query(
        `select count(*)::int as n from ${table} where source_url is null or source_url = '' or verified_at is null`,
      );
      expect(rows[0].n, table).toBe(0);
    }
  });

  it('source_url が "TODO" の行はすべて needs_review = true', async () => {
    const { rows } = await ctx.db.query(
      "select id from steps where source_url not like 'http%' and not needs_review union all select id from subsidies where source_url not like 'http%' and not needs_review",
    );
    expect(rows).toEqual([]);
  });
});

describe("seed: 出典・確認日が無い行は拒否する（設計原則3）", () => {
  const cases: [string, string, (y: string) => string, string, string][] = [
    [
      "steps の source_url が無い",
      "national.yaml",
      (y) => y.replace("    source_url: https://kawaguchiladys-clinic.net/faq/834/\n", ""),
      "steps:jp.s02",
      "source_url が無い",
    ],
    [
      "steps の verified_at が無い",
      "municipalities/13112.yaml",
      (y) => y.replace(/(id: setagaya\.s03b[\s\S]*?20413\.html\n)    verified_at: 2026-09-18\n/, "$1"),
      "steps:setagaya.s03b",
      "verified_at が無い",
    ],
    [
      "subsidies の source_url が空文字",
      "prefectures/13.yaml",
      (y) => y.replace("    source_url: https://018support.metro.tokyo.lg.jp/", '    source_url: ""'),
      "subsidies:tokyo.018support",
      "source_url が無い",
    ],
    [
      "TODO なのに needs_review が無い",
      "national.yaml",
      (y) => y.replace(/(source_url: "TODO[^\n]*\n    verified_at: [^\n]*\n)    needs_review: true\n/, "$1"),
      "steps:jp.s09b",
      "needs_review",
    ],
    [
      "facilities の verified_at が無い",
      "facilities/13112.yaml",
      (y) => y.replace(/(ncchd\.go\.jp\/hospital\/pregnancy\/yoyaku\/\n)    verified_at: [^\n]*\n/, "$1"),
      "facilities:ncchd",
      "verified_at が無い",
    ],
    [
      "費用（facility_costs_public）の verified_at が無い",
      "facilities/13112.yaml",
      (y) => y.replace(/(facilities\/10168\n)        verified_at: [^\n]*\n/, "$1"),
      "facility_costs_public:ncchd@2025-09-30",
      "verified_at が無い",
    ],
    [
      "documents に source_url だけあって verified_at が無い",
      "municipalities/13112.yaml",
      (y) => y.replace(/(shussanhisinseisho\.pdf\n)    verified_at: 2026-09-18\n/, "$1"),
      "documents:setagaya.shussanhi_shinsei",
      "verified_at が無い",
    ],
  ];

  it.each(cases)("%s", async (_name, file, edit, row, message) => {
    const dir = dataWith(file, edit);
    const { db } = await createTestDb();

    const error = await seed(db, dir).catch((e) => e);
    expect(error).toBeInstanceOf(SeedRejectedError);
    expect((error as SeedRejectedError).issues).toEqual([expect.objectContaining({ row, message: expect.stringContaining(message) })]);

    // 1行でも拒否されたら、他の正しい行も入れない
    const { rows } = await db.query("select (select count(*) from regions)::int + (select count(*) from steps)::int as n");
    expect(rows[0].n).toBe(0);
  });

  it("綴り間違いの列（source_ulr）も拒否する", () => {
    const dir = dataWith("prefectures/13.yaml", (y) => y.replace("    source_url: https://018support", "    source_ulr: https://018support"));
    const { errors } = loadSeedData(dir);
    expect(errors.length).toBeGreaterThan(0);
  });

  it("存在しない書類・上位でないステップへの参照を拒否する", () => {
    const dir = dataWith("municipalities/13112.yaml", (y) =>
      y.replace("trigger_document_id: setagaya.akachan_homon_annai", "trigger_document_id: setagaya.nai").replace("overrides_step_id: jp.s05", "overrides_step_id: setagaya.s03b"),
    );
    const messages = loadSeedData(dir).errors.map((e) => `${e.row} ${e.message}`);
    expect(messages).toEqual([
      expect.stringContaining('steps:setagaya.s05 overrides_step_id "setagaya.s03b" は上位地域のステップではない'),
      expect.stringContaining('steps:setagaya.s08 trigger_document_id "setagaya.nai" が documents に無い'),
    ]);
  });
});
