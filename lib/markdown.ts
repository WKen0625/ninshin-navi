// 利用規約・プライバシーポリシー・記事（content/**/*.md）を表示するための、ごく小さなMarkdown変換。
// 見出し・箇条書き・番号つき・引用・段落と、行の中の太字・リンクだけ。
// 文書は自分たちで書いたものだけを渡す（利用者の入力は渡さない）。

export type Block =
  | { type: "h1" | "h2" | "h3" | "p" | "quote"; text: string }
  | { type: "ul" | "ol"; items: string[] };

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
  for (const line of src.split("\n")) {
    const h = line.match(/^(#{1,3}) (.+)$/);
    const ol = line.match(/^\d+\. (.+)$/);
    if (h) {
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
    } else if (line.trim() === "") {
      flush();
    } else {
      if (list.length || quote.length) flush();
      para.push(line);
    }
  }
  flush();
  return blocks;
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
