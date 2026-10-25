import { rakutenAffiliateUrl, rakutenSearchUrl, withAffiliate } from "@/lib/affiliate";
import { Icon } from "./Icon";

export type Offer = { id: string; item: string; name: string; asin?: string | null; rakuten_keyword?: string | null; a8_url?: string | null; checked_at: string };

const REL = "sponsored nofollow noopener noreferrer";

/**
 * 商品ボックス（コラム・出産準備リスト）。品目と商品名、Amazon・楽天市場（・提携先）へのボタン。
 * 価格は出さない（Amazon の規約）。「例」はおすすめ順ではないと添える。小さな PR の印つき。
 */
export function OfferCard({ offer, compact = false }: { offer: Offer; compact?: boolean }) {
  const [y, m] = offer.checked_at.split("-").map(Number);
  return (
    <aside className={`rounded-2xl border-2 border-slate-200 bg-white ${compact ? "p-3" : "p-4"} space-y-3`} aria-label={`${offer.item}の例`}>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-800"><Icon name="bag" className="size-6" /></span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="rounded border border-slate-300 px-1 text-xs font-bold tracking-wide text-slate-500">PR</span>
            {offer.item}の例
          </p>
          <p className="text-lg leading-snug font-bold text-ink">{offer.name}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {offer.asin ? (
          <a href={withAffiliate(`https://www.amazon.co.jp/dp/${offer.asin}`)} target="_blank" rel={REL} className="btn min-h-12 border-2 border-amber-400 bg-amber-50 px-2 text-base text-amber-900 hover:bg-amber-100">
            Amazonで見る
          </a>
        ) : null}
        {offer.rakuten_keyword ? (
          <a href={rakutenAffiliateUrl(rakutenSearchUrl(offer.rakuten_keyword))} target="_blank" rel={REL} className="btn min-h-12 border-2 border-slate-300 bg-white px-2 text-base text-slate-800 hover:bg-slate-50">
            楽天市場で見る
          </a>
        ) : null}
        {offer.a8_url ? (
          <a href={offer.a8_url} target="_blank" rel={REL} className="btn col-span-2 min-h-12 border-2 border-indigo-300 bg-indigo-50 px-2 text-base text-indigo-900 hover:bg-indigo-100">
            公式サイトで見る
          </a>
        ) : null}
      </div>
      {!compact ? <p className="text-sm text-slate-500">{y}年{m}月に、評価の件数が多く価格が中ほどのものから選んだ例です（おすすめ順ではありません）。価格と在庫はリンク先で確かめてください。</p> : null}
    </aside>
  );
}
