import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Blocks } from "@/components/Markdown";
import { getArticle, isLang, STAGE_LABEL, type Lang } from "@/lib/articles";
import { ARTICLE, articleOf, columnsOf, LANG_NAME, PROGRAM_TEXT } from "@/lib/i18n";
import { loadProducts } from "@/lib/products";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { lang: raw } = await searchParams;
  const a = getArticle(slug, isLang(raw) ? raw : "ja");
  if (!a) return { title: "Tsugiraku" };
  return {
    title: `${a.title}｜Tsugiraku`,
    description: a.description,
    alternates: { canonical: articleOf(a.slug, a.lang), languages: Object.fromEntries(a.langs.map((l) => [l, articleOf(a.slug, l)])) },
    openGraph: { title: a.title, description: a.description, type: "article", url: articleOf(a.slug, a.lang), ...(a.updated ? { modifiedTime: a.updated } : {}), publishedTime: a.published },
  };
}

export default async function ArticlePage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { lang: raw } = await searchParams;
  const lang: Lang = isLang(raw) ? raw : "ja";
  const a = getArticle(slug, lang);
  if (!a) notFound();
  const t = ARTICLE[lang];
  const fmt = (d: string) => d.replaceAll("-", "/");
  const others = a.langs.filter((l) => l !== lang);
  return (
    <article className="space-y-6 text-base" lang={lang}>
      <header className="space-y-3">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
          <Link href={columnsOf(lang)} className="link-inline">{t.back}</Link>
          <span>
            {t.published} <time dateTime={a.published}>{fmt(a.published)}</time>
            {a.updated ? <>・{t.updated} <time dateTime={a.updated}>{fmt(a.updated)}</time></> : null}
          </span>
        </p>
        {others.length > 0 ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
            <span>{t.readIn}:</span>
            {others.map((l) => <Link key={l} href={articleOf(a.slug, l)} className="link-inline" hrefLang={l} lang={l}>{LANG_NAME[l]}</Link>)}
          </p>
        ) : null}
        <p><span className="rounded-md border border-indigo-200 bg-indigo-50 px-1.5 text-sm text-indigo-800">{STAGE_LABEL[lang][a.stage]}</span></p>
        <h1 className="h-page">{a.title}</h1>
        <p className="text-lg text-slate-700">{a.description}</p>
        {a.pr ? (
          // 設計原則8: PR表記必須（ステマ規制）。本文より前に1行だけ。くわしい文言と規約の文言は記事の最後に出す
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <span className="rounded border border-slate-300 px-1.5 text-xs font-bold tracking-wide text-slate-500">PR</span>
            {t.pr}
          </p>
        ) : null}
      </header>

      <div className="prose-ja">
        <Blocks blocks={a.blocks} skipH1 sponsored={a.pr} products={loadProducts()} />
      </div>

      {a.pr ? (
        <section className="space-y-1 border-t border-slate-200 pt-4 text-sm leading-relaxed text-slate-500">
          <p>{t.prBody}</p>
          {a.programs.map((p) => <p key={p}>{PROGRAM_TEXT[lang][p]}</p>)}
        </section>
      ) : null}

      {a.sources.length > 0 ? (
        <section className="card card-quiet space-y-2">
          <h2 className="h-section">{t.sources}</h2>
          <ul className="space-y-1">
            {a.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="link-inline">{s.label}</a>
                <span className="text-slate-600">・{t.checked} {fmt(s.verified_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="notice notice-muted">{t.disclaimer}</p>
      <Link href="/navi" className="btn btn-primary w-full">{t.navi}</Link>
    </article>
  );
}
