import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/site";
import { notFound } from "next/navigation";
import { PublicStepView } from "@/components/public/PublicStepView";
import { stepDescription, stepTitle } from "@/lib/public-meta";
import { getPublicModel } from "@/lib/rules";

// 国・東京都の手続き（23区共通）1件の公開ページ。区ごとに同じページは作らない
export const revalidate = 86400;
export const dynamicParams = false;

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const m = await getPublicModel();
  return m.sharedSteps.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const m = await getPublicModel();
  const p = m.byUrl.get(`/tokyo/common/${slug}`);
  if (!p) return {};
  return { title: stepTitle(p), description: stepDescription(p, m), alternates: { canonical: p.url }, openGraph: { images: [OG_IMAGE], title: stepTitle(p), description: stepDescription(p, m), url: p.url, type: "article" } };
}

export default async function CommonStepPage({ params }: Params) {
  const { slug } = await params;
  const m = await getPublicModel();
  const p = m.byUrl.get(`/tokyo/common/${slug}`);
  if (!p) notFound();
  return <PublicStepView p={p} m={m} />;
}
