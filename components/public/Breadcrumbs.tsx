import Link from "next/link";
import { absUrl } from "@/lib/site";
import { JsonLd } from "./JsonLd";

export type Crumb = { name: string; href: string };

/** パンくず（画面の上と、検索結果の表示用の構造化データの両方） */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <>
      <nav aria-label="いまいる場所" className="text-base text-slate-600">
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
          {items.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1">
              {i > 0 ? <span aria-hidden="true" className="text-slate-400">›</span> : null}
              {i < items.length - 1 ? <Link href={c.href} className="link-inline">{c.name}</Link> : <span aria-current="page">{c.name}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absUrl(c.href) })),
        }}
      />
    </>
  );
}
