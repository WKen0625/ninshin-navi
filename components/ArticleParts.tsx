// 記事の部品: 目次・囲み・吹き出し・表・商品の比較表（lib/markdown.ts の書き方）。
// 吹き出しの話し手は「よくある疑問」と「Tsugiraku」だけ。実在の人や体験談のように見せない（作った体験談は載せない）。

import type { BoxKind, TalkLine } from "@/lib/markdown";
import { Icon, type IconName } from "./Icon";
import { illustOf, OfferButtons, OfferImage, type Offer } from "./OfferCard";
import { ILLUST_LABELS } from "@/lib/illust";

export type RelatedCard = { slug: string; title: string; description: string; href: string };

const BOX: Record<BoxKind, { title: string; icon: IconName; cls: string; iconCls: string }> = {
  summary: { title: "この記事でわかること", icon: "flag", cls: "border-indigo-200 bg-indigo-50/70", iconCls: "bg-indigo-600 text-white" },
  point: { title: "ポイント", icon: "sparkle", cls: "border-amber-200 bg-amber-50/80", iconCls: "bg-amber-500 text-white" },
  check: { title: "チェックリスト", icon: "check", cls: "border-emerald-200 bg-emerald-50/70", iconCls: "bg-emerald-600 text-white" },
  caution: { title: "気をつけること", icon: "alert", cls: "border-amber-300 bg-amber-50", iconCls: "bg-amber-600 text-white" },
  good: { title: "こんな人に合います", icon: "heart", cls: "border-emerald-200 bg-white", iconCls: "bg-emerald-600 text-white" },
  bad: { title: "こんな人は別の型も見て", icon: "help", cls: "border-slate-300 bg-white", iconCls: "bg-slate-600 text-white" },
  memo: { title: "メモ", icon: "pen", cls: "border-slate-200 bg-slate-50", iconCls: "bg-slate-500 text-white" },
};

/** :::<kind> の囲み。中身（children）は本文と同じ部品 */
export function ArticleBox({ kind, title, children }: { kind: BoxKind; title: string | null; children: React.ReactNode }) {
  const b = BOX[kind];
  return (
    <section className={`article-box rounded-2xl border-2 p-4 ${b.cls} ${kind === "check" ? "article-box-check" : ""}`}>
      <p className="mb-2 flex items-center gap-2 text-lg font-bold text-ink">
        <span className={`grid size-8 shrink-0 place-items-center rounded-full ${b.iconCls}`}><Icon name={b.icon} className="size-5" /></span>
        {title ?? b.title}
      </p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/** 吹き出し。Q は読む人のよくある疑問（左）、A は Tsugiraku の答え（右） */
export function Talk({ lines, render }: { lines: TalkLine[]; render: (text: string) => React.ReactNode }) {
  return (
    <div className="space-y-4">
      {lines.map((l, i) =>
        l.who === "q" ? (
          <div key={i} className="flex items-start gap-3">
            <span className="flex w-14 shrink-0 flex-col items-center gap-1">
              <span className="grid size-12 place-items-center rounded-full border-2 border-sky-200 bg-sky-50 text-sky-700"><Icon name="help" className="size-7" /></span>
              <span className="text-center text-xs leading-tight text-slate-500">よくある<br />疑問</span>
            </span>
            <div className="talk-bubble talk-q relative min-w-0 flex-1 rounded-2xl border-2 border-sky-100 bg-white px-4 py-3 whitespace-pre-line">{render(l.text)}</div>
          </div>
        ) : (
          <div key={i} className="flex flex-row-reverse items-start gap-3">
            <span className="flex w-14 shrink-0 flex-col items-center gap-1">
              <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-500 text-white">
                <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </span>
              <span className="text-xs leading-tight text-slate-500">Tsugiraku</span>
            </span>
            <div className="talk-bubble talk-a relative min-w-0 flex-1 rounded-2xl border-2 border-indigo-100 bg-indigo-50/60 px-4 py-3 whitespace-pre-line">{render(l.text)}</div>
          </div>
        ),
      )}
    </div>
  );
}

/** 目次（## の見出しへのリンク） */
export function Toc({ items }: { items: { id: string; text: string }[] }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="目次" className="rounded-2xl border-2 border-slate-200 bg-white p-4">
      <p className="mb-2 flex items-center gap-2 text-lg font-bold text-ink"><Icon name="book" className="size-6 text-indigo-600" />目次</p>
      <ol className="space-y-1">
        {items.map((t, i) => (
          <li key={t.id} className="flex gap-2">
            <span className="w-6 shrink-0 text-right font-bold text-indigo-600">{i + 1}.</span>
            <a href={`#${t.id}`} className="link-inline">{t.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** | a | b | の表。横に長いときはスクロール */
export function ArticleTable({ head, rows, render }: { head: string[]; rows: string[][]; render: (text: string) => React.ReactNode }) {
  // 中身が短い列（6文字まで。例: 「腰ベルト型」）は折り返さない。答えの列が細く折れて読みにくくなるのを防ぐ
  const short = head.map((_, j) => j > 0 && rows.every((r) => (r[j] ?? "").length <= 6));
  return (
    <div className="article-table -mx-4 overflow-x-auto px-4">
      {/* 3列までは画面の幅に収め（折り返す）、4列以上は横に動かす */}
      <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border-2 border-slate-200 text-base" style={head.length >= 4 ? { minWidth: `${head.length * 7.5}rem` } : undefined}>
        <thead>
          <tr>{head.map((h, i) => <th key={i} scope="col" className="border-b-2 border-slate-200 bg-indigo-50 px-3 py-2 text-left font-bold text-ink">{render(h)}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="even:bg-slate-50/70">
              {r.map((c, j) => (j === 0 ? <th key={j} scope="row" className="border-b border-slate-200 px-3 py-2 text-left align-top font-bold text-slate-700">{render(c)}</th> : <td key={j} className={`border-b border-slate-200 px-3 py-2 align-top ${short[j] ? "font-bold whitespace-nowrap text-ink" : ""}`}>{render(c)}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 商品を横に並べた比較表（[[compare:a,b,c]]）。画像・商品名・specs の項目・ボタン。
 * 数字はメーカーの公表値（products.yaml の specs）。価格・評価は出さない（Amazon の規約。変わるため）。
 */
export function ProductCompare({ offers }: { offers: Offer[] }) {
  if (offers.length < 2) return null;
  const keys = [...new Set(offers.flatMap((o) => Object.keys(o.specs ?? {})))];
  const [y, m] = offers[0].checked_at.split("-").map(Number);
  const sponsored = offers.some((o) => o.asin || o.rakuten_keyword);
  return (
    <figure className="space-y-2">
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full border-separate border-spacing-0 overflow-hidden rounded-2xl border-2 border-slate-200 bg-white text-base" style={{ minWidth: `${7 + offers.length * 10.5}rem` }}>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 w-28 border-b-2 border-slate-200 bg-white px-2 py-3 text-left text-sm font-bold text-slate-500">
                {sponsored ? <span className="rounded border border-slate-300 px-1 text-xs font-bold tracking-wide text-slate-500">PR</span> : null}
              </th>
              {offers.map((o) => (
                <th key={o.id} scope="col" className="w-[10.5rem] border-b-2 border-slate-200 px-2 py-3 align-top font-normal">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <OfferImage offer={o} size="size-24" />
                    <span className="text-sm text-slate-500">{o.photo ? o.item : ILLUST_LABELS[illustOf(o)]}</span>
                    <span className="text-base leading-snug font-bold text-ink">{o.name}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k} className="bg-white even:bg-slate-50">
                <th scope="row" className="sticky left-0 z-10 border-b border-slate-200 bg-inherit px-2 py-2 text-left text-sm font-bold whitespace-nowrap text-slate-600">{k}</th>
                {offers.map((o) => <td key={o.id} className="border-b border-slate-200 px-2 py-2 text-center align-top">{o.specs?.[k] ?? "—"}</td>)}
              </tr>
            ))}
            <tr>
              <th scope="row" className="sticky left-0 z-10 bg-white px-2 py-3 text-left text-sm font-bold text-slate-600">見る</th>
              {offers.map((o) => <td key={o.id} className="px-2 py-3 align-top"><OfferButtons offer={o} stacked /></td>)}
            </tr>
          </tbody>
        </table>
      </div>
      <figcaption className="text-sm text-slate-500">
        数字はメーカーの公表値（{y}年{m}月に確認）。{offers.some((o) => !o.photo) ? "絵は種類のイメージです。" : ""}順位ではありません。価格と在庫はリンク先で確かめてください。表は横に動かせます。
      </figcaption>
    </figure>
  );
}

/** 関連記事のカード（[[related:a,b]]）。「あわせて読みたい」 */
export function RelatedCards({ cards }: { cards: RelatedCard[] }) {
  if (cards.length === 0) return null;
  return (
    <section aria-label="あわせて読みたい" className="space-y-2">
      <p className="flex items-center gap-2 text-lg font-bold text-ink"><Icon name="book" className="size-6 text-violet-600" />あわせて読みたい</p>
      <ul className="space-y-2">
        {cards.map((c) => (
          <li key={c.slug}>
            <a href={c.href} className="flex items-start gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3 no-underline transition hover:border-indigo-300">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700"><Icon name="next" className="size-6" /></span>
              <span className="min-w-0">
                <span className="block text-base leading-snug font-bold text-ink">{c.title}</span>
                <span className="mt-1 line-clamp-2 block text-sm text-slate-600">{c.description}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
