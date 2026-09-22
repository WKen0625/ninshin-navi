import { parseInline, type Block } from "@/lib/markdown";

/** 行の中の 太字・リンク・【要確認】。リンクは外部なら新しいタブで開き、rel を付ける */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((p, i) =>
        p.type === "strong" ? <strong key={i}>{p.text}</strong>
        : p.type === "mark" ? <mark key={i} className="bg-amber-100 px-1 text-amber-800">{p.text}</mark>
        : p.type === "link" ? (
          p.href.startsWith("/") ? <a key={i} href={p.href} className="link-inline">{p.text}</a>
          : <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow" className="link-inline">{p.text}</a>
        )
        : <span key={i}>{p.text}</span>,
      )}
    </>
  );
}

export function Blocks({ blocks, skipH1 = false }: { blocks: Block[]; skipH1?: boolean }) {
  return (
    <>
      {blocks.map((b, i) =>
        b.type === "h1" ? (skipH1 ? null : <h1 key={i} className="h-page">{b.text}</h1>)
        : b.type === "h2" ? <h2 key={i} className="h-section pt-3">{b.text}</h2>
        : b.type === "h3" ? <h3 key={i} className="font-bold">{b.text}</h3>
        : b.type === "ul" ? <ul key={i} className="list-disc space-y-1 pl-6">{b.items.map((t, j) => <li key={j}><Inline text={t} /></li>)}</ul>
        : b.type === "ol" ? <ol key={i} className="list-decimal space-y-1 pl-6">{b.items.map((t, j) => <li key={j}><Inline text={t} /></li>)}</ol>
        : b.type === "quote" ? <blockquote key={i} className="notice notice-muted whitespace-pre-line"><Inline text={b.text} /></blockquote>
        : b.type === "p" ? <p key={i} className="whitespace-pre-line"><Inline text={b.text} /></p>
        : null,
      )}
    </>
  );
}
