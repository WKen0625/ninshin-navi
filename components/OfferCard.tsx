import { a8Kind } from "@/lib/a8";
import { rakutenAffiliateUrl, rakutenSearchUrl, withAffiliate } from "@/lib/affiliate";
import { ILLUST_LABELS, isIllustKind, type IllustKind } from "@/lib/illust";
import { ProductIllust } from "./ProductIllust";

export type OfferPhoto = { src: string; href: string; alt: string };
export type Offer = {
  id: string;
  item: string;
  name: string;
  asin?: string | null;
  rakuten_keyword?: string | null;
  a8_html?: string | null;
  official_url?: string | null;
  note?: string | null;
  illust?: string | null;
  specs?: Record<string, string> | null;
  photo?: OfferPhoto | null;
  checked_at: string;
};

export const REL_SPONSORED = "sponsored nofollow noopener noreferrer";

export const amazonHref = (asin: string) => withAffiliate(`https://www.amazon.co.jp/dp/${asin}`);
export const rakutenHref = (keyword: string) => rakutenAffiliateUrl(rakutenSearchUrl(keyword));
export const illustOf = (o: Offer): IllustKind => (o.illust && isIllustKind(o.illust) ? o.illust : "bag");

/**
 * 商品の画像。写真（楽天の公式APIで取った画像。その商品へのリンクつき）があれば写真、無ければ種類の絵。
 * Amazon の商品ページの画像はコピーしない（Amazon の規約。画像は公式API経由だけ）。
 */
export function OfferImage({ offer, size = "size-24" }: { offer: Offer; size?: string }) {
  if (offer.photo) {
    return (
      <a href={offer.photo.href} target="_blank" rel={REL_SPONSORED} className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-white`}>
        {/* 外部の画像（楽天の画像サーバー）。next/image の最適化は通さない */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={offer.photo.src} alt={offer.photo.alt} width={128} height={128} loading="lazy" decoding="async" className="size-full object-contain" />
      </a>
    );
  }
  return (
    <span className="relative">
      <ProductIllust kind={illustOf(offer)} size={size} />
      <span className="sr-only">{ILLUST_LABELS[illustOf(offer)]}の絵</span>
    </span>
  );
}

/** Amazon・楽天市場（・公式サイト）のボタン。価格は出さない（Amazon の規約） */
export function OfferButtons({ offer, stacked = false }: { offer: Offer; stacked?: boolean }) {
  const a8 = offer.a8_html ? a8Kind(offer.a8_html) : null;
  if (!offer.asin && !offer.rakuten_keyword && (a8 || !offer.official_url)) return null;
  return (
    <div className={stacked ? "grid gap-2" : "grid gap-2 sm:grid-cols-2"}>
      {offer.asin ? (
        <a href={amazonHref(offer.asin)} target="_blank" rel={REL_SPONSORED} className="btn min-h-12 border-2 border-amber-500 bg-amber-400 px-3 text-base font-bold whitespace-nowrap text-amber-950 hover:bg-amber-300">
          Amazonで見る
        </a>
      ) : null}
      {offer.rakuten_keyword ? (
        <a href={offer.photo?.href ?? rakutenHref(offer.rakuten_keyword)} target="_blank" rel={REL_SPONSORED} className="btn min-h-12 border-2 border-slate-700 bg-white px-3 text-base font-bold whitespace-nowrap text-slate-900 hover:bg-slate-50">
          楽天市場で見る
        </a>
      ) : null}
      {!a8 && offer.official_url ? (
        <a href={offer.official_url} target="_blank" rel="noopener noreferrer" className="btn min-h-12 border-2 border-indigo-300 bg-indigo-50 px-3 text-base whitespace-nowrap text-indigo-900 hover:bg-indigo-100 sm:col-span-2">
          公式サイトで見る
        </a>
      ) : null}
    </div>
  );
}

/**
 * 商品ボックス（コラム・出産準備リスト）。画像・品目と商品名・事実・Amazon と楽天市場（・提携先）へのボタン。
 * 価格は出さない（Amazon の規約）。「例」はおすすめ順ではないと添える。小さな PR の印つき。
 */
export function OfferCard({ offer, compact = false }: { offer: Offer; compact?: boolean }) {
  const [y, m] = offer.checked_at.split("-").map(Number);
  // 紹介料が発生するリンクがあるときだけ PR の印を付ける（公式サイトへの普通のリンクだけなら広告ではない）
  const sponsored = Boolean(offer.asin || offer.rakuten_keyword || offer.a8_html);
  // A8 の広告コードは改変できないので、形を確かめたうえでそのまま出す（lib/a8.ts）
  const a8 = offer.a8_html ? a8Kind(offer.a8_html) : null;
  const isService = !offer.asin && !offer.rakuten_keyword;
  return (
    <aside className={`relative rounded-2xl border-2 border-slate-200 bg-white ${compact ? "p-3" : "p-4"} space-y-3 shadow-sm`} aria-label={`${offer.item}の例`}>
      <div className="flex items-start gap-3">
        {/* A8 のバナーがあるサービスは、バナー自体が画像なので絵は出さない */}
        {a8 === "banner" ? null : <OfferImage offer={offer} size={compact ? "size-16" : "size-24"} />}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            {sponsored ? <span className="rounded border border-slate-300 px-1 text-xs font-bold tracking-wide text-slate-500">PR</span> : null}
            {offer.item}{isService ? "" : "の例"}
          </p>
          <p className="text-lg leading-snug font-bold text-ink">{offer.name}</p>
          {offer.note && !compact ? <p className="mt-1 text-base leading-relaxed text-slate-700">{offer.note}</p> : null}
        </div>
      </div>
      {offer.note && compact ? <p className="text-base leading-relaxed text-slate-700">{offer.note}</p> : null}
      <OfferButtons offer={offer} />
      {/* A8 の広告コード（バナー＋1×1の計測画像、またはテキスト＋計測画像）。A8 の規約で改変できないので、受け取ったHTMLのまま */}
      {a8 && offer.a8_html ? <div className={a8 === "banner" ? "a8-banner" : "a8-text"} dangerouslySetInnerHTML={{ __html: offer.a8_html.trim() }} /> : null}
      {!compact ? (
        <p className="text-sm text-slate-500">
          {isService
            ? `${y}年${m}月に公式ページで確かめた内容です。条件は変わることがあるので、申し込む前に公式サイトで確かめてください。`
            : `${y}年${m}月に、評価の件数が多く価格が中ほどのものから選んだ例です（順位ではありません）。${offer.photo ? "写真は楽天市場の商品ページのもの" : "絵は種類のイメージ"}です。価格と在庫はリンク先で確かめてください。`}
        </p>
      ) : null}
    </aside>
  );
}
