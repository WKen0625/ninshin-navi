// 記事（content/articles）とMarkdown変換。記事は言語ごとに1ファイル。製品を載せる記事は pr: true（設計原則8）。

import { describe, expect, it } from "vitest";
import { getArticle, listArticles, validateArticles } from "../lib/articles";
import { parseInline, parseMarkdown } from "../lib/markdown";

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
    expect(ja.map((a) => a.published)).toEqual([...ja.map((a) => a.published)].sort().reverse());
    const intro = ja.find((a) => a.slug === "how-tsugiraku-works")!;
    expect(intro.langs).toEqual(["ja", "en"]);
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

  it("製品のリンクを含む記事は pr: true が必須。いまはアフィリエイトリンクを載せていない（弁護士確認前）", () => {
    for (const { slug, lang } of validateArticles()) {
      const a = getArticle(slug, lang)!;
      const links = a.blocks.flatMap((b) => ("text" in b ? [b.text] : b.items)).flatMap(parseInline).filter((p) => p.type === "link");
      const affiliate = links.filter((l) => l.type === "link" && /amzn\.to|amazon\.co\.jp.*tag=|a\.r10\.to|rakuten\.co\.jp.*afid|valuecommerce|a8\.net|moshimo/.test(l.href));
      if (affiliate.length > 0) expect(a.pr).toBe(true);
      expect(affiliate).toEqual([]);
    }
  });
});
