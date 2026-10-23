import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicStepView } from "@/components/public/PublicStepView";
import { stepDescription, stepTitle } from "@/lib/public-meta";
import { getPublicModel } from "@/lib/rules";

// 区の手続き1件の公開ページ。データ（data/・Supabase）から作り、1日1回作り直す
export const revalidate = 86400;
export const dynamicParams = false;

type Params = { params: Promise<{ ward: string; slug: string }> };

export async function generateStaticParams() {
  const m = await getPublicModel();
  return [...m.wardSteps.values()].flat().map((p) => ({ ward: p.ward!.slug, slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { ward, slug } = await params;
  const m = await getPublicModel();
  const p = m.byUrl.get(`/tokyo/${ward}/${slug}`);
  if (!p) return {};
  return { title: stepTitle(p), description: stepDescription(p, m), alternates: { canonical: p.url }, openGraph: { title: stepTitle(p), description: stepDescription(p, m), url: p.url, type: "article" } };
}

export default async function WardStepPage({ params }: Params) {
  const { ward, slug } = await params;
  const m = await getPublicModel();
  const p = m.byUrl.get(`/tokyo/${ward}/${slug}`);
  if (!p) notFound();
  return <PublicStepView p={p} m={m} />;
}
