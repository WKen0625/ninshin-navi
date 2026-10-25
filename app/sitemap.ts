import type { MetadataRoute } from "next";
import { listArticles } from "@/lib/articles";
import { articleOf, columnsOf, homeOf, LANGS } from "@/lib/i18n";
import { latestVerified } from "@/lib/public-model";
import { getPublicModel } from "@/lib/rules";
import { absUrl } from "@/lib/site";

// サイトマップ（/sitemap.xml）。検索エンジンに読んでほしいページだけを並べる。
// 入力（端末に保存した状態）が無いと中身が出ない画面（今週やること・病院・お金・助成・印刷・共有）は入れない（noindex）。
// 更新日: 制度のページは出典の確認日、コラムは更新日（無ければ公開日）。
export const revalidate = 86400;

const toDate = (d: string | null | undefined) => (d ? new Date(`${d}T00:00:00+09:00`) : undefined);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const m = await getPublicModel();
  const wardPages = [...m.wardSteps.values()].flat();
  const latestData = latestVerified([...wardPages, ...m.sharedSteps].map((p) => p.step));

  // コラム（言語ごと）
  const articles = LANGS.flatMap((lang) => listArticles(lang).map((a) => ({ a, lang })));
  const latestArticle = articles.reduce<string | null>((x, { a }) => { const d = a.updated ?? a.published; return x == null || d > x ? d : x; }, null);
  const latestSite = [latestData, latestArticle].filter((x): x is string => x != null).sort().at(-1) ?? null;

  const homeAlternates = { languages: Object.fromEntries(LANGS.map((l) => [l, absUrl(homeOf(l))])) };
  const entries: MetadataRoute.Sitemap = [
    ...LANGS.map((l) => ({ url: absUrl(homeOf(l)), lastModified: toDate(latestSite), changeFrequency: "weekly" as const, priority: l === "ja" ? 1 : 0.6, alternates: homeAlternates })),
    { url: absUrl("/navi"), changeFrequency: "monthly", priority: 0.8 },
    { url: absUrl("/junbi"), changeFrequency: "monthly", priority: 0.9 },
    { url: absUrl("/contact"), changeFrequency: "yearly", priority: 0.3 },
    { url: absUrl("/terms"), changeFrequency: "yearly", priority: 0.2 },
    { url: absUrl("/policy"), changeFrequency: "yearly", priority: 0.2 },
    // 制度の公開ページ
    { url: absUrl("/tokyo"), lastModified: toDate(latestData), changeFrequency: "weekly", priority: 0.9 },
    ...m.wards.map((w) => ({
      url: absUrl(`/tokyo/${w.slug}`),
      lastModified: toDate(latestVerified((m.wardSteps.get(w.code) ?? []).map((p) => p.step))),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...m.compare.map((c) => ({ url: absUrl(`/tokyo/compare/${c.topic.slug}`), lastModified: toDate(latestVerified(c.items.map((p) => p.step))), changeFrequency: "monthly" as const, priority: 0.8 })),
    ...wardPages.map((p) => ({ url: absUrl(p.url), lastModified: toDate(p.step.verified_at), changeFrequency: "monthly" as const, priority: 0.7 })),
    ...m.sharedSteps.map((p) => ({ url: absUrl(p.url), lastModified: toDate(p.step.verified_at), changeFrequency: "monthly" as const, priority: 0.6 })),
    // コラム
    ...LANGS.filter((l) => listArticles(l).length > 0).map((l) => ({ url: absUrl(columnsOf(l)), lastModified: toDate(latestArticle), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...articles.map(({ a, lang }) => ({
      url: absUrl(articleOf(a.slug, lang)),
      lastModified: toDate(a.updated ?? a.published),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: a.langs.length > 1 ? { languages: Object.fromEntries(a.langs.map((l) => [l, absUrl(articleOf(a.slug, l))])) } : undefined,
    })),
  ];
  return entries;
}
