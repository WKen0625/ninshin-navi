import type { Metadata } from "next";
import Link from "next/link";
import { Disclosure } from "@/components/Disclosure";
import { Icon, SectionHeading } from "@/components/Icon";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { JsonLd } from "@/components/public/JsonLd";
import { NaviCta } from "@/components/public/NaviCta";
import { StepLink } from "@/components/public/StepLink";
import { latestVerified, ym } from "@/lib/public-model";
import { getPublicModel } from "@/lib/rules";
import { absUrl, OG_IMAGE } from "@/lib/site";

// 東京23区の手続きの入口: 区を選ぶ・区どうしを比べる・23区共通の手続き
export const revalidate = 86400;

export async function generateMetadata(): Promise<Metadata> {
  const m = await getPublicModel();
  const n = [...m.wardSteps.values()].reduce((k, l) => k + l.length, 0);
  const title = "東京23区の妊娠・出産の手続き一覧｜区ごとの違いを比較｜Tsugiraku";
  const description = `東京23区の妊娠・出産の手続きを、区ごとに時期の順で並べました（区独自の手続き${n}件と23区共通の手続き）。妊娠届・妊婦面談・給付金・区の出産助成の違いも比べられます。すべて公式ページを出典に確認しています。`;
  return { title, description, alternates: { canonical: "/tokyo" }, openGraph: { images: [OG_IMAGE], title, description, url: "/tokyo" } };
}

export default async function TokyoIndex() {
  const m = await getPublicModel();
  const data = m.data;
  const shared = m.sharedSteps.filter((p) => p.step.requires !== "loss");
  const loss = m.sharedSteps.filter((p) => p.step.requires === "loss");
  const verified = latestVerified([...m.wardSteps.values()].flat().map((p) => p.step));
  const perks = (code: string) => (m.wardSteps.get(code) ?? []).filter((p) => p.topic?.slug === "shussan-josei");

  return (
    <div className="space-y-8">
      <Breadcrumbs items={[{ name: "トップ", href: "/" }, { name: "東京23区の手続き", href: "/tokyo" }]} />
      <header className="space-y-3">
        <p className="chip-ai">東京23区に住む妊婦さんとご家族へ</p>
        <h1 className="h-page">東京23区の妊娠・出産の手続き</h1>
        <p className="text-lg text-slate-700">
          妊娠届から産後の助成まで、区ごとに時期の順で並べました。窓口・期限・持ち物を、区・東京都・国の公式ページをもとに確認しています（{ym(verified)}まで）。
        </p>
      </header>

      <section aria-labelledby="wards" className="space-y-3">
        <SectionHeading id="wards" icon="pin" tone="sky">区を選ぶ</SectionHeading>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {m.wards.map((w) => {
            const n = m.chainOf(w.code).filter((p) => p.step.requires !== "loss").length;
            const p = perks(w.code);
            return (
              <li key={w.code}>
                <Link href={`/tokyo/${w.slug}`} className="card card-quiet flex h-full flex-col gap-1 p-4 hover:border-indigo-300">
                  <span className="text-xl font-bold text-ink">{w.name}</span>
                  <span className="text-base text-slate-600">手続き {n}件</span>
                  {p.length > 0 ? <span className="inline-flex items-center gap-1 text-base font-bold text-emerald-800"><Icon name="money" className="size-5" />区独自の助成・お祝い</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="compare" className="space-y-3">
        <SectionHeading id="compare" icon="flag">区ごとの違いを比べる</SectionHeading>
        <ul className="space-y-2">
          {m.compare.map((c) => (
            <li key={c.topic.slug}>
              <Link href={`/tokyo/compare/${c.topic.slug}`} className="card card-quiet flex items-start gap-3 hover:border-indigo-300">
                <Icon name="flag" className="mt-1 size-6 shrink-0 text-indigo-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-bold text-ink">{c.topic.label}</span>
                  <span className="block text-base text-slate-600">{new Set(c.items.map((p) => p.ward!.code)).size}区を比較</span>
                </span>
                <Icon name="next" className="mt-2 size-5 shrink-0 text-indigo-500" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <NaviCta ward={null} />

      <section id="common" aria-labelledby="common-h" className="scroll-mt-4 space-y-3">
        <SectionHeading id="common-h" icon="japan" tone="slate">23区共通の手続き（国・東京都）</SectionHeading>
        <ul className="space-y-2">{shared.map((p) => <StepLink key={p.url} p={p} documents={data.documents} />)}</ul>
      </section>

      {loss.length > 0 ? (
        <Disclosure summary="妊娠を終えたとき（流産・死産）の手続き">
          <ul className="space-y-2">{loss.map((p) => <StepLink key={p.url} p={p} documents={data.documents} />)}</ul>
        </Disclosure>
      ) : null}

      <p className="notice notice-muted">この一覧は手続きの案内です。医療の判断はしません。最終確認は窓口・医療機関へ。</p>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "東京23区の妊娠・出産の手続き",
          url: absUrl("/tokyo"),
          inLanguage: "ja",
          ...(verified ? { dateModified: verified } : {}),
          mainEntity: { "@type": "ItemList", itemListElement: m.wards.map((w, i) => ({ "@type": "ListItem", position: i + 1, url: absUrl(`/tokyo/${w.slug}`), name: `${w.name}の妊娠・出産の手続き` })) },
        }}
      />
    </div>
  );
}
