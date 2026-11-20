import { withAffiliate } from "@/lib/affiliate";
import { parseInline, tocOf, type Block } from "@/lib/markdown";
import { ArticleBox, ArticleTable, ProductCompare, RelatedCards, Talk, Toc, type RelatedCard } from "./ArticleParts";
import { OfferCard, type Offer } from "./OfferCard";

/** 行の中の 太字・リンク・【要確認】。リンクは外部なら新しいタブで開き、rel を付ける */
export function Inline({ text, sponsored = false }: { text: string; /** PR記事: 外部リンクに rel="sponsored" を付ける（検索エンジン向けの広告リンクの印） */ sponsored?: boolean }) {
  return (
    <>
      {parseInline(text).map((p, i) =>
        // 太字の中のリンク（例: **[品目](https://…)**）も解釈する
        p.type === "strong" ? <strong key={i}><Inline text={p.text} sponsored={sponsored} /></strong>
        : p.type === "mark" ? <mark key={i} className="bg-amber-100 px-1 text-amber-800">{p.text}</mark>
        : p.type === "link" ? (
          p.href.startsWith("/") ? <a key={i} href={p.href} className="link-inline">{p.text}</a>
          : <a key={i} href={withAffiliate(p.href)} target="_blank" rel={sponsored ? "sponsored nofollow noopener noreferrer" : "noopener noreferrer nofollow"} className="link-inline">{p.text}</a>
        )
        : <span key={i}>{p.text}</span>,
      )}
    </>
  );
}

type Props = { blocks: Block[]; skipH1?: boolean; sponsored?: boolean; /** [[product:id]]・[[compare:...]] の中身 */ products?: Map<string, Offer>; /** [[related:...]] の中身（slug → カード） */ related?: Map<string, RelatedCard>; /** 目次と見出しの id を付ける（いちばん外側だけ） */ top?: boolean };

export function Blocks({ blocks, skipH1 = false, sponsored = false, products, related, top = true }: Props) {
  const render = (t: string) => <Inline text={t} sponsored={sponsored} />;
  // 目次と ## の見出しの id（sec-1, sec-2, …）。囲みの中の見出しは数えない
  const toc = top ? tocOf(blocks) : [];
  let h2 = 0;
  return (
    <>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h1":
            return skipH1 ? null : <h1 key={i} className="h-page">{b.text}</h1>;
          case "h2":
            h2 += 1;
            return <h2 key={i} id={top ? `sec-${h2}` : undefined} className="h-section scroll-mt-4 pt-3">{b.text}</h2>;
          case "h3":
            return <h3 key={i} className="text-lg font-bold text-ink">{b.text}</h3>;
          case "product":
            return products?.get(b.id) ? <OfferCard key={i} offer={products.get(b.id)!} /> : null;
          case "compare": {
            const offers = b.ids.map((id) => products?.get(id)).filter((o): o is Offer => Boolean(o));
            return <ProductCompare key={i} offers={offers} />;
          }
          case "toc":
            return <Toc key={i} items={toc} />;
          case "related":
            return <RelatedCards key={i} cards={b.slugs.map((s) => related?.get(s)).filter((c): c is RelatedCard => Boolean(c))} />;
          case "box":
            return (
              <ArticleBox key={i} kind={b.kind} title={b.title}>
                <Blocks blocks={b.blocks} sponsored={sponsored} products={products} related={related} top={false} />
              </ArticleBox>
            );
          case "talk":
            return <Talk key={i} lines={b.lines} render={render} />;
          case "table":
            return <ArticleTable key={i} head={b.head} rows={b.rows} render={render} />;
          case "ul":
            return <ul key={i} className="list-disc space-y-2 pl-6">{b.items.map((t, j) => <li key={j}>{render(t)}</li>)}</ul>;
          case "ol":
            return <ol key={i} className="list-decimal space-y-2 pl-6">{b.items.map((t, j) => <li key={j}>{render(t)}</li>)}</ol>;
          case "quote":
            return <blockquote key={i} className="notice notice-muted whitespace-pre-line">{render(b.text)}</blockquote>;
          case "p":
            return <p key={i} className="whitespace-pre-line">{render(b.text)}</p>;
          default:
            return null;
        }
      })}
    </>
  );
}
