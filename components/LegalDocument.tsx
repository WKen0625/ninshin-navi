import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseMarkdown } from "@/lib/markdown";

/** **太字** と 【要確認】 を目立たせる */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|【[^】]*】)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p.startsWith("【") ? <mark key={i} className="bg-amber-100 px-1 text-amber-800">{p}</mark> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

export function LegalDocument({ file }: { file: "terms" | "privacy" }) {
  const blocks = parseMarkdown(readFileSync(join(process.cwd(), "content", "legal", `${file}.md`), "utf8"));
  return (
    <article className="space-y-4 text-base">
      <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800">これは下書きです。弁護士の確認のあと、正式版に差し替えます。</p>
      {blocks.map((b, i) =>
        b.type === "h1" ? <h1 key={i} className="text-2xl font-bold">{b.text}</h1>
        : b.type === "h2" ? <h2 key={i} className="pt-2 text-lg font-bold">{b.text}</h2>
        : b.type === "h3" ? <h3 key={i} className="font-bold">{b.text}</h3>
        : b.type === "ul" ? <ul key={i} className="list-disc space-y-1 pl-6">{b.items.map((t, j) => <li key={j}><Inline text={t} /></li>)}</ul>
        : <p key={i} className="whitespace-pre-line"><Inline text={b.text} /></p>,
      )}
    </article>
  );
}
