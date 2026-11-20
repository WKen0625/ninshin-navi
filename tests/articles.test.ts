// 記事（content/articles）とMarkdown変換。記事は言語ごとに1ファイル。製品を載せる記事は pr: true（設計原則8）。

import { describe, expect, it } from "vitest";
import { getArticle, listArticles, validateArticles } from "../lib/articles";
import { blockTexts, parseInline, parseMarkdown, productIdsIn, relatedSlugsIn, tocOf } from "../lib/markdown";
import { loadJunbi, loadProducts } from "../lib/products";

const products = loadProducts();

describe("Markdown変換", () => {
  it("見出し・箇条書き・番号つき・引用・段落を分ける", () => {
    const blocks = parseMarkdown("# 題\n\n本文1\n本文2\n\n- a\n- b\n\n1. x\n2. y\n\n> 注\n\n## 小見出し");
    expect(blocks).toEqual([
      { type: "h1", text: "題" },
      { type: "p", text: "本文1\n本文2" },
      { type: "ul", items: ["a", "b"] },
      { type: "ol", items: ["x", "y"] },
      { type: "quote", text: "注" },
      { type: "h2", text: "小見出し" },
    ]);
  });

  it("行の中の太字・リンク・【要確認】。リンクは http(s) かサイト内（/）だけ", () => {
    expect(parseInline("A **太い** [区のページ](https://example.jp/a) と [入口](/navi) 【要確認】 end")).toEqual([
      { type: "text", text: "A " },
      { type: "strong", text: "太い" },
      { type: "text", text: " " },
      { type: "link", text: "区のページ", href: "https://example.jp/a" },
      { type: "text", text: " と " },
      { type: "link", text: "入口", href: "/navi" },
      { type: "text", text: " " },
      { type: "mark", text: "【要確認】" },
      { type: "text", text: " end" },
    ]);
    // javascript: などはリンクにしない
    expect(parseInline("[x](javascript:alert(1))")).toEqual([{ type: "text", text: "[x](javascript:alert(1))" }]);
  });
});

describe("記事", () => {
  it("すべての記事ファイルが読める（見出し情報が揃っている）。フォルダ名は英小文字・数字・ハイフン", () => {
    const all = validateArticles();
    expect(all.length).toBeGreaterThan(0);
    expect(all).toContainEqual({ slug: "how-tsugiraku-works", lang: "ja" });
    expect(all).toContainEqual({ slug: "how-tsugiraku-works", lang: "en" });
  });

  it("一覧は新しい順で、下書きを含まない。日本語版と英語版の両方があることがわかる", () => {
    const ja = listArticles("ja");
    const en = listArticles("en");
    expect(ja.every((a) => !a.draft)).toBe(true);
    // 並びは周期の順（いつでも → 初期 → 中期 → 後期 → 出産 → 産後）、同じ周期の中は新しい順
    const order = ["all", "early", "mid", "late", "birth", "postpartum"];
    for (let i = 1; i < ja.length; i++) {
      const a = ja[i - 1], b = ja[i];
      expect(order.indexOf(a.stage) < order.indexOf(b.stage) || (a.stage === b.stage && a.published >= b.published)).toBe(true);
    }
    const intro = ja.find((a) => a.slug === "how-tsugiraku-works")!;
    expect(intro.langs).toEqual(["ja", "en", "zh", "ko", "ru"]);
    expect(en.find((a) => a.slug === "how-tsugiraku-works")?.lang).toBe("en");
  });

  it("本文が読める。無い言語・無いslug・変なslugは null", () => {
    const a = getArticle("hospital-bag", "en")!;
    expect(a.blocks[0]).toEqual({ type: "h1", text: a.title });
    expect(a.sources.length).toBeGreaterThan(0);
    for (const s of a.sources) expect(s.url).toMatch(/^https:\/\//);
    expect(getArticle("no-such-article", "ja")).toBeNull();
    expect(getArticle("../etc/passwd", "ja")).toBeNull();
  });

  it("アフィリエイトのリンクを含む記事は pr: true と programs が必須（PR表記と規約の文言を出すため）", () => {
    for (const { slug, lang } of validateArticles()) {
      const a = getArticle(slug, lang);
      if (!a) continue; // 下書き（draft: true）は公開前なので、公開の検査は通らない
      // 太字の中のリンク（**[品目](url)**）も数える
      const links = a.blocks.flatMap(blockTexts).flatMap(parseInline).flatMap((p) => (p.type === "strong" ? parseInline(p.text) : [p])).filter((p) => p.type === "link");
      const amazon = links.some((l) => l.type === "link" && /amzn\.(to|asia)|amazon\.co\.jp/.test(l.href));
      const rakuten = links.some((l) => l.type === "link" && /a\.r10\.to|rakuten\.co\.jp/.test(l.href));
      const other = links.some((l) => l.type === "link" && /valuecommerce|a8\.net|moshimo|accesstrade|afi-b/.test(l.href));
      if (amazon) expect(a.programs).toContain("amazon");
      if (rakuten) expect(a.programs).toContain("rakuten");
      if (amazon || rakuten || other) expect(a.pr).toBe(true);
      // 商品ボックス（[[product:id]]）と比較表（[[compare:...]]）は Amazon と楽天のリンクを出すので、PR と programs が要る。囲みの中も数える。商品は content/shop/products.yaml にあること
      const ids = productIdsIn(a.blocks);
      for (const id of ids) expect(products.has(id), `${slug} ${id}`).toBe(true);
      const offers = ids.map((id) => products.get(id)!).filter(Boolean);
      if (offers.some((o) => o.asin || o.rakuten_keyword || o.a8_html)) expect(a.pr, slug).toBe(true);
      if (offers.some((o) => o.asin)) expect(a.programs, slug).toContain("amazon");
      if (offers.some((o) => o.rakuten_keyword)) expect(a.programs, slug).toContain("rakuten");
      if (offers.some((o) => o.a8_html)) expect(a.programs, slug).toContain("other");
      // 関連記事のカード（[[related:...]]）は、公開中の記事だけ
      for (const r of relatedSlugsIn(a.blocks)) expect(getArticle(r, "ja"), `${slug} → ${r}`).not.toBeNull();
      // 吹き出しは「よくある疑問」と Tsugiraku の答えだけ（Q: / A:）。体験談の話し手は作らない
      const walk = (bs: typeof a.blocks): typeof a.blocks => bs.flatMap((b) => (b.type === "box" ? [b, ...walk(b.blocks)] : [b]));
      for (const b of walk(a.blocks)) if (b.type === "talk") { expect(b.lines.length, slug).toBeGreaterThan(0); for (const l of b.lines) expect(["q", "a"]).toContain(l.who); }
      // 周期は決まった値
      expect(["all", "early", "mid", "late", "birth", "postpartum"]).toContain(a.stage);
    }
  });
  it("一覧は周期で絞れる。「いつでも」の記事はどの周期にも出る", () => {
    const late = listArticles("ja", "late");
    expect(late.every((a) => a.stage === "late" || a.stage === "all")).toBe(true);
    expect(late.map((a) => a.slug)).toContain("hospital-bag");
    expect(late.map((a) => a.slug)).toContain("how-tsugiraku-works");
    const early = listArticles("ja", "early");
    expect(early.every((a) => a.stage === "early" || a.stage === "all")).toBe(true);
    expect(early.map((a) => a.slug)).toContain("how-tsugiraku-works");
    expect(early.map((a) => a.slug)).toContain("first-two-weeks");
  });
});

describe("記事の部品（目次・囲み・吹き出し・表・比較）", () => {
  it("囲みは中身を同じ書き方で読み、::: で閉じる。題を省くと null", () => {
    expect(parseMarkdown(":::summary この記事でわかること\n- a\n- **b**\n:::\n\n本文")).toEqual([
      { type: "box", kind: "summary", title: "この記事でわかること", blocks: [{ type: "ul", items: ["a", "**b**"] }] },
      { type: "p", text: "本文" },
    ]);
    expect(parseMarkdown(":::check\n- x\n:::")).toEqual([{ type: "box", kind: "check", title: null, blocks: [{ type: "ul", items: ["x"] }] }]);
  });
  it("吹き出しは Q: と A:（全角のコロンも）。続きの行は前の吹き出しにつなぐ", () => {
    expect(parseMarkdown(":::talk\nQ: 2本いるの？\nA：1本目は\n腰ベルト型\n:::")).toEqual([
      { type: "talk", lines: [{ who: "q", text: "2本いるの？" }, { who: "a", text: "1本目は\n腰ベルト型" }] },
    ]);
  });
  it("表は2行目が |---| のときだけ表にする", () => {
    expect(parseMarkdown("| 項目 | A |\n|---|---|\n| 重さ | 3.9kg |")).toEqual([{ type: "table", head: ["項目", "A"], rows: [["重さ", "3.9kg"]] }]);
    expect(parseMarkdown("| ただの | 線 |")).toEqual([{ type: "p", text: "| ただの | 線 |" }]);
  });
  it("目次・比較・商品の id。比較の id は囲みの中も数える", () => {
    const bs = parseMarkdown("[[toc]]\n\n## 一\n\n:::point\n[[compare:stroller-a,stroller-b]]\n:::\n\n## 二\n\n[[product:cable]]");
    expect(bs[0]).toEqual({ type: "toc" });
    expect(tocOf(bs)).toEqual([{ id: "sec-1", text: "一" }, { id: "sec-2", text: "二" }]);
    expect(productIdsIn(bs)).toEqual(["stroller-a", "stroller-b", "cable"]);
    expect(bs.flatMap(blockTexts)).toContain("一");
  });
});

describe("商品ボックスと出産準備リスト", () => {
  it("すべての商品に絵の種類があり、比較表の項目は空でない", () => {
    for (const p of products.values()) {
      expect(p.illust, p.id).toBeTruthy();
      for (const [k, v] of Object.entries(p.specs ?? {})) expect(k.length && v.length, `${p.id} ${k}`).toBeTruthy();
    }
  });
  it("[[product:id]] だけの行は商品ボックスになり、前後のリストを分ける", () => {
    expect(parseMarkdown("- a\n\n[[product:cable]]\n\n- b")).toEqual([
      { type: "ul", items: ["a"] },
      { type: "product", id: "cable" },
      { type: "ul", items: ["b"] },
    ]);
  });
  it("商品はASINか楽天の検索語を持ち、出産準備リストの商品はすべて一覧にある", () => {
    for (const p of products.values()) expect(p.asin || p.rakuten_keyword || p.a8_html || p.official_url, p.id).toBeTruthy();
    const groups = loadJunbi();
    expect(groups.length).toBeGreaterThanOrEqual(4);
    const ids = groups.flatMap((g) => g.items.map((i) => `${g.id}:${i.id}`));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
