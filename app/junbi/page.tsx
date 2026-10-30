import type { Metadata } from "next";
import { SectionHeading } from "@/components/Icon";
import { JunbiChecklist, type JunbiGroupView } from "@/components/JunbiChecklist";
import { Breadcrumbs } from "@/components/public/Breadcrumbs";
import { NaviCta } from "@/components/public/NaviCta";
import { loadJunbi, loadProducts } from "@/lib/products";

// 出産準備リスト（チェックできる）。検索で需要が大きい「出産準備 リスト」「入院準備 リスト」向けの入口で、
// 商品の例（PR）を載せる。産院と区がくれるものは買わない、を先に伝えるのがこのサイトの切り口。
export const metadata: Metadata = {
  title: "出産準備リスト｜入院バッグ・退院の日・家に用意するもの（チェックできる）｜Tsugiraku",
  description: "出産準備を、いつ・何を・どれだけで1枚に。産院と区（母子手帳と一緒にもらう袋）が用意するものは買わない前提で、妊娠中期・入院バッグ・退院の日・家の準備・産後1か月に分けました。チェックはこの端末に保存。",
  alternates: { canonical: "/junbi" },
};

export default function JunbiPage() {
  const products = loadProducts();
  const groups: JunbiGroupView[] = loadJunbi().map((g) => ({
    ...g,
    lead: g.lead ?? null,
    items: g.items.map((i) => ({ id: i.id, name: i.name, why: i.why, offer: i.product ? (products.get(i.product) ?? null) : null, article: i.article ?? null, source_url: i.source_url ?? null })),
  }));
  return (
    <div className="space-y-7">
      <Breadcrumbs items={[{ name: "トップ", href: "/" }, { name: "出産準備リスト", href: "/junbi" }]} />
      <header className="space-y-3">
        {/* 設計原則8: PR表記必須。本文より前は「PR」の印だけ（文は出さない。2026-10-31 運営者の指示）。説明と規約の文言はページの最後 */}
        <p><span className="rounded-md border border-amber-300 bg-amber-50 px-1.5 text-sm font-bold tracking-wide text-amber-800">PR</span></p>
        <h1 className="h-page">出産準備リスト</h1>
        <p className="text-lg leading-loose text-slate-700">
          いつ・何を・どれだけ、を1枚に。産院の持ち物リストと、区で母子手帳と一緒にもらう袋に入っているものは買わない前提で、時期ごとに分けました。チェックはこの端末にだけ保存します。
        </p>
      </header>

      <JunbiChecklist groups={groups} />

      <NaviCta ward={null} />

      <section className="space-y-2">
        <SectionHeading icon="document">あわせて読む</SectionHeading>
        <ul className="space-y-1 text-base">
          <li><a href="/articles/hospital-bag" className="link">入院バッグの中身は、産院のリストから始める</a></li>
          <li><a href="/articles/baby-goods-before-after" className="link">ベビー用品「産前に買う／産後でよい」の分け方</a></li>
          <li><a href="/articles/early-dont-buy-yet" className="link">妊娠初期に「買わなくていいもの」リスト</a></li>
        </ul>
      </section>

      <section className="space-y-1 border-t border-slate-200 pt-4 text-sm leading-relaxed text-slate-500">
        <p>このページには製品の紹介とアフィリエイトリンクが含まれます。リンク先で購入があると、運営に紹介料が入ることがあります。紹介料の有無で、手続きの案内や病院の情報は変わりません。商品は、評価の件数が多く価格が中ほどのものから選んだ例で、おすすめ順ではありません。</p>
        <p>Amazonのアソシエイトとして、Tsugirakuは適格販売により収入を得ています。</p>
        <p>楽天アフィリエイトのリンクを含みます。</p>
      </section>
    </div>
  );
}
