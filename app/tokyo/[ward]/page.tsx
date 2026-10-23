import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactList } from "@/components/ContactBox";
import { Disclosure } from "@/components/Disclosure";
import { Icon, SectionHeading } from "@/components/Icon";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { JsonLd } from "@/components/public/JsonLd";
import { NaviCta } from "@/components/public/NaviCta";
import { PhaseCounts } from "@/components/public/PhaseCounts";
import { StepLink } from "@/components/public/StepLink";
import { SourceLink } from "@/components/SourceLink";
import { matchScore } from "@/lib/benefit";
import { PHASE_INFO, PHASES, type Phase } from "@/lib/journey";
import { regionChain } from "@/lib/next-actions";
import { amountText, latestVerified, ym } from "@/lib/public-model";
import { getPublicModel } from "@/lib/rules";
import { absUrl } from "@/lib/site";
import { wardBySlug, WARDS } from "@/lib/wards";

// 区の手続き一覧（時期の順）。検索で「◯◯区 妊娠 手続き」から来る人の入口
export const revalidate = 86400;
export const dynamicParams = false;

type Params = { params: Promise<{ ward: string }> };

export function generateStaticParams() {
  return WARDS.map((w) => ({ ward: w.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { ward: slug } = await params;
  const ward = wardBySlug(slug);
  if (!ward) return {};
  const m = await getPublicModel();
  const n = m.chainOf(ward.code).filter((p) => p.step.requires !== "loss").length;
  const title = `${ward.name}の妊娠・出産の手続き一覧（${n}件）｜妊娠届から産後の助成まで｜Tsugiraku`;
  const description = `東京都${ward.name}で、妊娠がわかってから産後までに必要な手続き${n}件を時期の順に並べました。妊娠届・妊婦面談・給付金・健診・出生届・児童手当・区の助成の窓口と期限を、公式ページをもとに確認しています。`;
  return { title, description, alternates: { canonical: `/tokyo/${ward.slug}` }, openGraph: { title, description, url: `/tokyo/${ward.slug}` } };
}

export default async function WardPage({ params }: Params) {
  const { ward: slug } = await params;
  const ward = wardBySlug(slug);
  if (!ward) notFound();
  const m = await getPublicModel();
  const data = m.data;
  const chain = m.chainOf(ward.code);
  const main = chain.filter((p) => p.step.requires !== "loss");
  const loss = chain.filter((p) => p.step.requires === "loss");
  const counts = Object.fromEntries(PHASES.map((ph) => [ph, main.filter((p) => p.step.phase === ph).length])) as Record<Phase, number>;
  const codes = new Set(regionChain(ward.code, data.regions).map((r) => r.code));
  const subsidies = data.subsidies.filter((s) => codes.has(s.region_code) && s.scheme_applicable.includes("lumpsum"));
  const linkOf = (name: string) => {
    let best: { url: string; score: number } | null = null;
    for (const p of main) {
      const score = matchScore(p.step, { name });
      if (score > 0 && (!best || score > best.score)) best = { url: p.url, score };
    }
    return best?.url ?? null;
  };
  const contacts = data.contacts.filter((c) => codes.has(c.region_code));
  const facilities = data.facilities.filter((f) => f.region_code === ward.code);
  const verified = latestVerified((m.wardSteps.get(ward.code) ?? []).map((p) => p.step));
  const tag = (r: string | null) => (r === "epidural" ? "（無痛分娩で出産した人）" : r === "single_parent" ? "（ひとり親）" : "");

  return (
    <div className="space-y-7">
      <Breadcrumbs items={[{ name: "トップ", href: "/" }, { name: "東京23区の手続き", href: "/tokyo" }, { name: ward.name, href: `/tokyo/${ward.slug}` }]} />
      <header className="space-y-3">
        <p className="chip-ai">東京都{ward.name}</p>
        <h1 className="h-page">{ward.name}の妊娠・出産の手続き一覧</h1>
        <p className="text-lg text-slate-700">
          妊娠がわかってから産後まで、{ward.name}で必要な手続き{main.length}件を、時期の順に並べました。区・東京都・国の公式ページを出典に、{ym(verified)}までに確認しています。
        </p>
      </header>

      <PhaseCounts counts={counts} />
      <NaviCta ward={ward} />

      {PHASES.map((ph) => {
        const items = main.filter((p) => p.step.phase === ph);
        if (items.length === 0) return null;
        return (
          <section key={ph} id={ph} className="scroll-mt-4 space-y-3">
            <SectionHeading icon={PHASE_INFO[ph].icon}>
              {PHASE_INFO[ph].name}
              <span className="ml-2 text-base font-normal text-slate-600">{PHASE_INFO[ph].hint}</span>
            </SectionHeading>
            <ul className="space-y-2">{items.map((p) => <StepLink key={p.url} p={p} documents={data.documents} />)}</ul>
          </section>
        );
      })}

      <section className="space-y-3">
        <SectionHeading icon="money" tone="green">{ward.name}でもらえるお金・助成</SectionHeading>
        <ul className="space-y-2">
          {subsidies.map((s) => {
            const url = linkOf(s.name);
            const amount = amountText(s);
            return (
              <li key={s.id} className="card card-quiet space-y-1">
                <p className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-lg font-bold text-ink">{url ? <Link href={url} className="link-inline">{s.name}</Link> : s.name}{tag(s.requires)}</span>
                  {amount ? <span className="text-lg font-bold text-ink">{amount}</span> : null}
                </p>
                {!amount && s.amount_note ? <p className="text-base text-slate-700">{s.amount_note}</p> : null}
                <SourceLink url={s.source_url} verifiedAt={s.verified_at} needsReview={s.needs_review} />
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <SectionHeading icon="phone" tone="blue">困ったら、ここに聞く</SectionHeading>
        <ContactList contacts={contacts} regionCode={ward.code} regionName={`東京都${ward.name}`} />
      </section>

      <section className="card space-y-2">
        <p className="flex items-center gap-2 text-lg font-bold text-ink"><Icon name="hospital" className="size-6 text-sky-700" />{ward.name}でお産ができる施設</p>
        <p className="text-base text-slate-700">
          {facilities.length}か所（うち、無痛分娩ができると確認できた施設は{facilities.filter((f) => f.has_epidural).length}か所）。施設ごとの予約の締切の目安は、予定日を入れると Tsugiraku Navi の「病院と締切」に出ます。並びはおすすめ順ではありません。
        </p>
      </section>

      {loss.length > 0 ? (
        <Disclosure summary="妊娠を終えたとき（流産・死産）の手続き">
          <ul className="space-y-2">{loss.map((p) => <StepLink key={p.url} p={p} documents={data.documents} />)}</ul>
        </Disclosure>
      ) : null}

      <section className="space-y-2">
        <SectionHeading icon="pin" tone="sky">ほかの区</SectionHeading>
        <ul className="flex flex-wrap gap-2">
          {WARDS.filter((w) => w.code !== ward.code).map((w) => (
            <li key={w.code}><Link href={`/tokyo/${w.slug}`} className="inline-flex min-h-11 items-center rounded-xl border-2 border-slate-200 bg-white px-3 text-base font-bold text-ink hover:border-indigo-300">{w.name}</Link></li>
          ))}
        </ul>
        <Link href="/tokyo" className="link">23区の違いを比べる</Link>
      </section>

      <p className="notice notice-muted">この一覧は手続きの案内です。医療の判断はしません。最終確認は窓口・医療機関へ。</p>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: `${ward.name}の妊娠・出産の手続き一覧`,
          url: absUrl(`/tokyo/${ward.slug}`),
          inLanguage: "ja",
          ...(verified ? { dateModified: verified } : {}),
          mainEntity: { "@type": "ItemList", itemListElement: main.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: absUrl(p.url), name: p.step.title })) },
        }}
      />
    </div>
  );
}
