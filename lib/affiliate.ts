// アフィリエイトの設定（設計原則8: 製品の紹介は記事にだけ。表示側が PR 表記を出す）。
// Amazon のリンクは「商品ページ（/dp/ASIN）」か「検索結果（/s?k=品目）」に、タグを付けるだけで成立する（APIは要らない）。
// 記事にはタグ無しの Amazon の URL を書いてよい。表示側（components/Markdown.tsx）がここで定めたタグを付ける＝タグの置き場は1か所。
// 検索結果へのリンクは「品目で探す」案内で、特定の商品をすすめるものではない（設計原則10: おすすめ順を付けない）。

export const AMAZON_TAG = "tsugiraku-22";

/** Amazon の検索結果（品目で探す）へのリンク。タグは表示側が付ける */
export function amazonSearchUrl(keyword: string): string {
  return `https://www.amazon.co.jp/s?k=${encodeURIComponent(keyword)}`;
}

/** 外部リンクにアフィリエイトの印を付ける。Amazon（amazon.co.jp）で tag が無ければ付ける。ほかはそのまま */
export function withAffiliate(href: string): string {
  try {
    const u = new URL(href);
    if ((u.hostname === "www.amazon.co.jp" || u.hostname === "amazon.co.jp") && !u.searchParams.has("tag")) {
      u.searchParams.set("tag", AMAZON_TAG);
      return u.toString();
    }
    return href;
  } catch {
    return href;
  }
}

/** この URL がアフィリエイトのリンクか（記事の検査と、rel="sponsored" の判断に使う） */
export const isAffiliateHref = (href: string) => /amzn\.(to|asia)|amazon\.co\.jp|a\.r10\.to|hb\.afl\.rakuten|rakuten\.co\.jp.*afid|valuecommerce|a8\.net|moshimo|accesstrade|afi-b/.test(href);
