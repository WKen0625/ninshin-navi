// 利用規約・プライバシーポリシー・記事（content/**/*.md）を表示するための、ごく小さなMarkdown変換。
// 見出し・箇条書き・番号つき・引用・段落と、行の中の太字・リンク。記事用に、目次・囲み・吹き出し・表・商品の比較。
// 文書は自分たちで書いたものだけを渡す（利用者の入力は渡さない）。
//
// 記事で使える書き方（docs/ARTICLES.md）:
//   [[toc]]                       … 目次（## の見出しから作る）
//   [[product:<id>]]              … 商品ボックス（content/shop/products.yaml）
//   [[compare:<id>,<id>,<id>]]    … 商品を横に並べて比べる表（画像・specs・ボタン）
//   [[related:<slug>,<slug>]]     … 関連記事のカード（content/articles の slug）
//   :::summary この記事でわかること … 囲み。summary / point / check / caution / good / bad / memo。:::で閉じる
//   :::talk                       … 吹き出し。「Q: 」はよくある疑問、「A: 」は Tsugiraku の答え。:::で閉じる
//   | 見出し | 見出し |             … 表（2行目は |---|---|）

export const BOX_KINDS = ["summary", "point", "check", "caution", "good", "bad", "memo"] as const;
export type BoxKind = (typeof BOX_KINDS)[number];
const isBoxKind = (k: string): k is BoxKind => (BOX_KINDS as readonly string[]).includes(k);

export type TalkLine = { who: "q" | "a"; text: string };

export type Block =
  | { type: "h1" | "h2" | "h3" | "p" | "quote"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  /** [[product:<id>]] だけの行。content/shop/products.yaml の商品ボックス */
  | { type: "product"; id: string }
  /** [[compare:a,b,c]] だけの行。商品を横に並べた比較表 */
  | { type: "compare"; ids: string[] }
  /** [[toc]] だけの行。## の見出しの目次 */
  | { type: "toc" }
  /** [[related:a,b]] だけの行。関連記事のカード */
  | { type: "related"; slugs: string[] }
  /** :::<kind> 題 … ::: の囲み。中身は同じ書き方で読む */
  | { type: "box"; kind: BoxKind; title: string | null; blocks: Block[] }
  /** :::talk … ::: の吹き出し */
  | { type: "talk"; lines: TalkLine[] }
  /** | a | b | の表。1行目が見出し、2行目が |---| */
  | { type: "table"; head: string[]; rows: string[][] };

const cellsOf = (row: string) => row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const isSeparator = (row: string) => cellsOf(row).every((c) => /^:?-{2,}:?$/.test(c));

function parseTalk(lines: string[]): TalkLine[] {
  const out: TalkLine[] = [];
  for (const line of lines) {
    const m = line.match(/^([QA])[:：]\s*(.*)$/);
    if (m) out.push({ who: m[1] === "Q" ? "q" : "a", text: m[2] });
    else if (line.trim() && out.length) out[out.length - 1].text += `\n${line.trim()}`;
  }
  return out;
}

export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];
  let listType: "ul" | "ol" = "ul";
  let quote: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "p", text: para.join("\n") });
    if (list.length) blocks.push({ type: listType, items: list });
    if (quote.length) blocks.push({ type: "quote", text: quote.join("\n") });
    para = [];
    list = [];
    quote = [];
  };
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // :::kind 題 … ::: （囲み・吹き出し）
    const fence = trimmed.match(/^:::([a-z]+)(?:\s+(.+))?$/);
    if (fence) {
      flush();
      const body: string[] = [];
      let j = i + 1;
      while (j < lines.length && lines[j].trim() !== ":::") body.push(lines[j++]);
      i = j; // 閉じの ::: を飛ばす（閉じが無ければ最後まで）
      if (fence[1] === "talk") blocks.push({ type: "talk", lines: parseTalk(body) });
      else if (isBoxKind(fence[1])) blocks.push({ type: "box", kind: fence[1], title: fence[2]?.trim() || null, blocks: parseMarkdown(body.join("\n")) });
      else blocks.push(...parseMarkdown(body.join("\n"))); // 知らない種類は中身だけ出す
      continue;
    }

    // | 表 |
    if (trimmed.startsWith("|")) {
      flush();
      const rows: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith("|")) rows.push(lines[j++].trim());
      i = j - 1;
      if (rows.length >= 2 && isSeparator(rows[1])) blocks.push({ type: "table", head: cellsOf(rows[0]), rows: rows.slice(2).map(cellsOf) });
      else blocks.push({ type: "p", text: rows.join("\n") });
      continue;
    }

    const h = line.match(/^(#{1,3}) (.+)$/);
    const prod = trimmed.match(/^\[\[product:([a-z0-9-]+)\]\]$/);
    const cmp = trimmed.match(/^\[\[compare:([a-z0-9-]+(?:,[a-z0-9-]+)+)\]\]$/);
    const rel = trimmed.match(/^\[\[related:([a-z0-9-]+(?:,[a-z0-9-]+)*)\]\]$/);
    const ol = line.match(/^\d+\. (.+)$/);
    if (prod) {
      flush();
      blocks.push({ type: "product", id: prod[1] });
    } else if (cmp) {
      flush();
      blocks.push({ type: "compare", ids: cmp[1].split(",") });
    } else if (rel) {
      flush();
      blocks.push({ type: "related", slugs: rel[1].split(",") });
    } else if (trimmed === "[[toc]]") {
      flush();
      blocks.push({ type: "toc" });
    } else if (h) {
      flush();
      blocks.push({ type: `h${h[1].length}` as "h1" | "h2" | "h3", text: h[2] });
    } else if (line.startsWith("- ")) {
      if (para.length || quote.length || (list.length && listType !== "ul")) flush();
      listType = "ul";
      list.push(line.slice(2));
    } else if (ol) {
      if (para.length || quote.length || (list.length && listType !== "ol")) flush();
      listType = "ol";
      list.push(ol[1]);
    } else if (line.startsWith("> ")) {
      if (para.length || list.length) flush();
      quote.push(line.slice(2));
    } else if (trimmed === "") {
      flush();
    } else {
      if (list.length || quote.length) flush();
      para.push(line);
    }
  }
  flush();
  return blocks;
}

/** ブロックの中の文字（行の中のリンクを調べるため）。囲みの中も含める */
export function blockTexts(b: Block): string[] {
  switch (b.type) {
    case "h1":
    case "h2":
    case "h3":
    case "p":
    case "quote":
      return [b.text];
    case "ul":
    case "ol":
      return b.items;
    case "talk":
      return b.lines.map((l) => l.text);
    case "table":
      return [...b.head, ...b.rows.flat()];
    case "box":
      return [b.title ?? "", ...b.blocks.flatMap(blockTexts)];
    default:
      return [];
  }
}

/** 記事に出てくる商品の id（商品ボックスと比較表。囲みの中も） */
export function productIdsIn(blocks: Block[]): string[] {
  return blocks.flatMap((b) => (b.type === "product" ? [b.id] : b.type === "compare" ? b.ids : b.type === "box" ? productIdsIn(b.blocks) : []));
}

/** 記事に出てくる関連記事の slug（囲みの中も） */
export function relatedSlugsIn(blocks: Block[]): string[] {
  return blocks.flatMap((b) => (b.type === "related" ? b.slugs : b.type === "box" ? relatedSlugsIn(b.blocks) : []));
}

/** 目次に出す見出し（いちばん外側の ##）。id は表示側と同じ規則（sec-1, sec-2, …） */
export function tocOf(blocks: Block[]): { id: string; text: string }[] {
  return blocks.filter((b): b is { type: "h2"; text: string } => b.type === "h2").map((b, i) => ({ id: `sec-${i + 1}`, text: b.text }));
}

export type InlinePart = { type: "text" | "strong" | "mark"; text: string } | { type: "link"; text: string; href: string };

/** 行の中の **太字**・[文字](https://…)・【要確認】 を分ける。リンクは http(s) だけ許す */
export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  const re = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)|(【[^】]*】)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) parts.push({ type: "text", text: text.slice(last, m.index) });
    if (m[1] != null) parts.push({ type: "strong", text: m[1] });
    else if (m[2] != null) parts.push({ type: "link", text: m[2], href: m[3] });
    else parts.push({ type: "mark", text: m[4] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts;
}
