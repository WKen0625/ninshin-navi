// 公開ページ（/tokyo 以下）とサイトマップ。URL が変わらないこと・重複しないこと・入力が要る画面を検索に出さないこと。
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { beforeAll, describe, expect, it } from "vitest";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { amountText, subsidyForStep, windowText, type PublicModel } from "../lib/public-model";
import { getPublicModel } from "../lib/rules";
import { topicOf } from "../lib/topics";
import { WARDS } from "../lib/wards";
import { ROOT } from "./helpers/db";

let m: PublicModel;
beforeAll(async () => {
  m = await getPublicModel();
});

describe("23区の英字の名前", () => {
  it("対象地域の区と1対1で、区のファイルの名前・id の頭と一致する", () => {
    const area = parse(readFileSync(join(ROOT, "data", "service-area.yaml"), "utf8")) as { municipalities: string[] };
    expect(WARDS.map((w) => w.code)).toEqual(area.municipalities);
    expect(new Set(WARDS.map((w) => w.slug)).size).toBe(23);
    for (const f of readdirSync(join(ROOT, "data", "municipalities"))) {
      const d = parse(readFileSync(join(ROOT, "data", "municipalities", f), "utf8")) as { region: { code: string; name: string }; steps: { id: string }[] };
      const w = WARDS.find((x) => x.code === d.region.code)!;
      expect(w.name).toBe(d.region.name);
      for (const s of d.steps) expect(s.id.split(".")[0], s.id).toBe(w.slug);
    }
  });
});

describe("話題と URL（変わると検索の評価を失うので固定）", () => {
  it("23区の主な手続きは、どの区でも同じ話題になる", () => {
    const expected: Record<string, string> = { s03: "ninshin-todoke", s03b: "mensetsu", s05: "kyufu-1kaime", s08: "kyufu-2kaime", s05c: "shika", s06d: "kokuho-menjo", s08b: "sanpu-kenshin" };
    for (const w of WARDS) {
      const list = m.wardSteps.get(w.code)!;
      for (const [suffix, slug] of Object.entries(expected)) {
        const p = list.find((x) => x.step.id === `${w.slug}.${suffix}`);
        expect(p, `${w.slug}.${suffix}`).toBeDefined();
        expect(p!.slug, `${w.slug}.${suffix} ${p!.step.title}`).toBe(slug);
        expect(p!.url).toBe(`/tokyo/${w.slug}/${slug}`);
      }
    }
  });
  it("話題の判定の例（先に当てる話題が優先）", () => {
    expect(topicOf("出生通知票をオンラインで出し、目黒区の新生児誕生祝金（1人につき2万円）を受け取る")?.slug).toBe("shussan-josei");
    expect(topicOf("ねりママ出産応援金〈妊婦支援給付金・1回目・5万円〉を電子申請する")?.slug).toBe("kyufu-1kaime");
    expect(topicOf("妊婦のための支援給付（妊娠届のあとの給付）は、流産・死産のあとも対象。区の窓口に確認する")?.slug).toBe("kyufu-ryuzan-shizan");
    expect(topicOf("妊婦支援給付金（出産後・子ども1人あたり5万円）を申請する")?.slug).toBe("kyufu-2kaime");
    expect(topicOf("（双子以上）産前休業を出産予定日の14週間前から請求できることを、勤務先に伝える")?.slug).toBe("sanzen-kyugyo-tatai");
  });
  it("URL はすべて別々。区の中の手続き、23区共通の手続きも重ならない", () => {
    const all = [...[...m.wardSteps.values()].flat(), ...m.sharedSteps];
    expect(new Set(all.map((p) => p.url)).size).toBe(all.length);
    expect(m.byUrl.size).toBe(all.length);
    for (const w of WARDS) expect(m.wardSteps.get(w.code)!.length, w.name).toBeGreaterThanOrEqual(8);
  });
  it("23区共通のページ: 出生届はある。全区が区の手続きで置き換えている妊娠届（国）は作らない", () => {
    expect(m.byUrl.get("/tokyo/common/shussei-todoke")?.step.id).toBe("jp.s07");
    expect(m.sharedSteps.some((p) => p.step.id === "jp.s03")).toBe(false);
    // 港区の一覧には、区の妊娠届が入り、国の妊娠届は入らない
    const minato = m.chainOf("13103").map((p) => p.step.id);
    expect(minato).toContain("minato.s03");
    expect(minato).not.toContain("jp.s03");
    expect(minato).toContain("jp.s07");
  });
  it("比較ページは10以上の話題で、どれも5区以上", () => {
    expect(m.compare.length).toBeGreaterThanOrEqual(10);
    for (const c of m.compare) expect(new Set(c.items.map((p) => p.ward!.code)).size, c.topic.slug).toBeGreaterThanOrEqual(5);
    expect(m.compare.map((c) => c.topic.slug)).toEqual(expect.arrayContaining(["ninshin-todoke", "mensetsu", "kyufu-1kaime", "kyufu-2kaime", "shussan-josei"]));
  });
});

describe("ページの中身", () => {
  it("題名: 区の手続きは「区名の話題」、23区共通は「話題（東京23区）」", async () => {
    const { stepTitle } = await import("../lib/public-meta");
    expect(stepTitle(m.byUrl.get("/tokyo/minato/ninshin-todoke")!)).toMatch(/^港区の妊娠届と母子手帳の受け取り｜/);
    expect(stepTitle(m.byUrl.get("/tokyo/common/shussei-todoke")!)).toMatch(/^出生届（東京23区）｜/);
  });
  it("予定日を使わない「いつから・いつまで」の文章", () => {
    const w = windowText(m.byUrl.get("/tokyo/common/shussei-todoke")!.step, m.data.documents);
    expect(w.until).toMatch(/14日以内/);
  });
  it("金額の文章: 上限・毎月・費用で決まるもの", () => {
    const sub = (id: string) => m.data.subsidies.find((s) => s.id === id)!;
    expect(amountText(sub("tokyo.epidural"))).toBe("最大100,000円");
    expect(amountText(sub("tokyo.018support"))).toBe("5,000円（毎月）");
    expect(amountText(sub("minato.shussanhi"))).toBeNull();
  });
  it("手続きと助成を名前で結びつける（区の出産費用助成・都の無痛分娩助成）", () => {
    expect(subsidyForStep(m.data.steps.find((s) => s.id === "minato.s07b")!, "13103", m.data)?.id).toBe("minato.shussanhi");
    expect(subsidyForStep(m.data.steps.find((s) => s.id === "tokyo.s02")!, null, m.data)?.id).toBe("tokyo.epidural");
  });
});

describe("サイトマップと robots.txt", () => {
  it("公開ページとコラムを絶対URLで並べ、入力が要る画面は入れない。重複なし", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of urls) expect(u.startsWith("https://www.tsugiraku.jp/"), u).toBe(true);
    for (const path of ["/", "/en", "/navi", "/tokyo", "/tokyo/minato", "/tokyo/minato/ninshin-todoke", "/tokyo/common/shussei-todoke", "/tokyo/compare/mensetsu", "/articles", "/articles/hospital-bag", "/articles/hospital-bag?lang=en"]) {
      expect(urls, path).toContain(`https://www.tsugiraku.jp${path === "/" ? "/" : path}`);
    }
    for (const bad of ["/todo", "/hospitals", "/money", "/subsidies", "/print", "/share", "/privacy", "/notify", "/api/"]) {
      expect(urls.some((u) => new URL(u).pathname.startsWith(bad)), bad).toBe(false);
    }
    // 区の手続きの数だけページがある
    const wardPages = [...m.wardSteps.values()].flat().length;
    expect(urls.filter((u) => /\/tokyo\/(?!common|compare)[a-z]+\/[^/]+$/.test(new URL(u).pathname)).length).toBe(wardPages);
    // 更新日は出典の確認日
    const p = entries.find((e) => e.url.endsWith("/tokyo/minato/ninshin-todoke"))!;
    expect(p.lastModified).toBeInstanceOf(Date);
  });
  it("robots.txt は API だけ止め、サイトマップの場所を書く", () => {
    const r = robots();
    expect(r.sitemap).toBe("https://www.tsugiraku.jp/sitemap.xml");
    expect(JSON.stringify(r.rules)).toContain("/api/");
  });
});
