import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon, SectionHeading } from "@/components/Icon";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { JsonLd } from "@/components/public/JsonLd";
import { NaviCta } from "@/components/public/NaviCta";
import { amountText, latestVerified, subsidyForStep, windowText, ym } from "@/lib/public-model";
import { getPublicModel } from "@/lib/rules";
import { absUrl } from "@/lib/site";

// 区どうしの比較（同じ話題の手続きを23区で並べる）。区の公式ページには無い切り口
export const revalidate = 86400;
export const dynamicParams = false;

type Params = { params: Promise<{ topic: string }> };

export async function generateStaticParams() {
  const m = await getPublicModel();
  return m.compare.map((c) => ({ topic: c.topic.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { topic } = await params;
  const m = await getPublicModel();
  const c = m.compare.find((x) => x.topic.slug === topic);
  if (!c) return {};
  const n = new Set(c.items.map((p) => p.ward!.code)).size;
  const title = `${c.topic.label}｜東京23区の区ごとの違い（窓口・時期・金額）｜Tsugiraku`;
  const description = `${c.topic.lead ?? ""}${n}区を並べて比べられます。各区の公式ページをもとに確認しています。`;
  return { title, description, alternates: { canonical: `/tokyo/compare/${c.topic.slug}` }, openGraph: { title, description, url: `/tokyo/compare/${c.topic.slug}` } };
}

export default async function ComparePage({ params }: Params) {
  const { topic } = await params;
  const m = await getPublicModel();
  const c = m.compare.find((x) => x.topic.slug === topic);
  if (!c) notFound();
  const data = m.data;
  const covered = new Set(c.items.map((p) => p.ward!.code));
  const missing = m.wards.filter((w) => !covered.has(w.code));
  const verified = latestVerified(c.items.map((p) => p.step));
  const url = `/tokyo/compare/${c.topic.slug}`;

  return (
    <div className="space-y-7">
      <Breadcrumbs items={[{ name: "トップ", href: "/" }, { name: "東京23区の手続き", href: "/tokyo" }, { name: `比べる: ${c.topic.label}`, href: url }]} />
      <header className="space-y-3">
        <p className="chip-ai">東京23区の比較</p>
        <h1 className="h-page">{c.topic.label}の区ごとの違い</h1>
        {c.topic.lead ? <p className="text-lg text-slate-700">{c.topic.lead}</p> : null}
        <p className="text-base text-slate-600">{covered.size}区を並べました。各区の公式ページをもとに、{ym(verified)}までに確認しています。</p>
      </header>

      <ul className="space-y-3">
        {c.items.map((p) => {
          const w = windowText(p.step, data.documents);
          const s = subsidyForStep(p.step, p.ward!.code, data);
          const amount = s ? (amountText(s) ?? s.amount_note) : null;
          return (
            <li key={p.url} className="card space-y-2">
              <h2 className="flex items-center gap-2 text-xl font-bold text-ink">
                <Icon name="pin" className="size-6 text-sky-700" />
                <Link href={`/tokyo/${p.ward!.slug}`} className="link-inline">{p.ward!.name}</Link>
              </h2>
              <p className="text-lg font-bold"><Link href={p.url} className="link-inline">{p.step.title}</Link></p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-base">
                {p.step.channel ? (<><dt className="font-bold text-slate-600">窓口</dt><dd>{p.step.channel}</dd></>) : null}
                {w.from ? (<><dt className="font-bold text-slate-600">時期</dt><dd>{w.from}</dd></>) : null}
                {w.until ? (<><dt className="font-bold text-amber-900">期限</dt><dd className="font-bold text-amber-900">{w.until}</dd></>) : null}
                {amount ? (<><dt className="font-bold text-slate-600">金額</dt><dd>{amount}</dd></>) : null}
              </dl>
              <p className="text-sm text-slate-500">確認日 {p.step.verified_at.replaceAll("-", "/")}</p>
            </li>
          );
        })}
      </ul>

      {missing.length > 0 ? (
        <p className="notice notice-muted">
          {missing.map((w) => w.name).join("・")}は、この話題の区独自の手続きをまだ確認できていません（国・東京都の共通の手続きで足りる場合もあります）。<Link href="/tokyo" className="link-inline">区ごとの一覧</Link>から確かめてください。
        </p>
      ) : null}

      <NaviCta ward={null} />

      <section className="space-y-2">
        <SectionHeading icon="flag">ほかの比較</SectionHeading>
        <ul className="flex flex-wrap gap-2">
          {m.compare.filter((x) => x.topic.slug !== c.topic.slug).map((x) => (
            <li key={x.topic.slug}><Link href={`/tokyo/compare/${x.topic.slug}`} className="inline-flex min-h-11 items-center rounded-xl border-2 border-slate-200 bg-white px-3 text-base font-bold text-ink hover:border-indigo-300">{x.topic.label}</Link></li>
          ))}
        </ul>
      </section>

      <p className="notice notice-muted">この比較は手続きの案内です。医療の判断はしません。最終確認は各区の窓口へ。</p>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${c.topic.label}の区ごとの違い（東京23区）`,
          url: absUrl(url),
          inLanguage: "ja",
          ...(verified ? { dateModified: verified } : {}),
          mainEntity: { "@type": "ItemList", itemListElement: c.items.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: absUrl(p.url), name: `${p.ward!.name}: ${p.step.title}` })) },
        }}
      />
    </div>
  );
}
