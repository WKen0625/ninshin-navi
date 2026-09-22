import type { Metadata } from "next";
import Link from "next/link";
import { isLang, listArticles, type Lang } from "@/lib/articles";

export const metadata: Metadata = { title: "記事｜Tsugiraku" };

const T: Record<Lang, { title: string; lead: string; pr: string; other: string; none: string; switch_: string }> = {
  ja: {
    title: "記事",
    lead: "妊娠・出産の手続きと準備についての読みものです。制度の数字には出典と確認日を添えます。製品を紹介する記事は、先頭に「PR」と明記します。",
    pr: "PR",
    other: "English",
    none: "記事はまだありません。",
    switch_: "English articles",
  },
  en: {
    title: "Articles",
    lead: "Guides on pregnancy and childbirth paperwork in Tokyo. Every figure links to its official source with the date we checked it. Articles that mention products are marked “PR” at the top.",
    pr: "PR",
    other: "日本語",
    none: "No articles yet.",
    switch_: "日本語の記事",
  },
};

export default async function ArticlesPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang: raw } = await searchParams;
  const lang: Lang = isLang(raw) ? raw : "ja";
  const t = T[lang];
  const articles = listArticles(lang);
  const otherLang: Lang = lang === "ja" ? "en" : "ja";
  return (
    <div className="space-y-6" lang={lang}>
      <header className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="h-page">{t.title}</h1>
          <Link href={`/articles?lang=${otherLang}`} className="link" hrefLang={otherLang} lang={otherLang}>{t.switch_}</Link>
        </div>
        <p className="text-base text-slate-700">{t.lead}</p>
      </header>
      {articles.length === 0 ? (
        <p className="notice notice-muted">{t.none}</p>
      ) : (
        <ul className="space-y-3">
          {articles.map((a) => (
            <li key={a.slug}>
              <Link href={`/articles/${a.slug}${lang === "ja" ? "" : `?lang=${lang}`}`} className="card block space-y-1 transition hover:bg-white">
                <span className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <time dateTime={a.published}>{a.published.replaceAll("-", "/")}</time>
                  {a.pr ? <span className="rounded-md border border-amber-300 bg-amber-50 px-1.5 text-amber-800">{t.pr}</span> : null}
                  {a.langs.includes(otherLang) ? <span className="rounded-md border border-slate-300 px-1.5" lang={otherLang}>{t.other}</span> : null}
                </span>
                <span className="block text-lg leading-snug font-bold text-ink">{a.title}</span>
                <span className="block text-base text-slate-700">{a.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
