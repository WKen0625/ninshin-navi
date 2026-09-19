// 利用規約・プライバシーポリシーの下書き（content/legal/*.md）を表示するための、ごく小さなMarkdown変換。
// 見出し・箇条書き・段落・太字だけ。文書は自分たちで書いたものだけを渡す（利用者の入力は渡さない）。

export type Block = { type: "h1" | "h2" | "h3" | "p"; text: string } | { type: "ul"; items: string[] };

export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "p", text: para.join("\n") });
    if (list.length) blocks.push({ type: "ul", items: list });
    para = [];
    list = [];
  };
  for (const line of src.split("\n")) {
    const h = line.match(/^(#{1,3}) (.+)$/);
    if (h) {
      flush();
      blocks.push({ type: `h${h[1].length}` as "h1" | "h2" | "h3", text: h[2] });
    } else if (line.startsWith("- ")) {
      if (para.length) flush();
      list.push(line.slice(2));
    } else if (line.trim() === "") {
      flush();
    } else {
      if (list.length) flush();
      para.push(line);
    }
  }
  flush();
  return blocks;
}
