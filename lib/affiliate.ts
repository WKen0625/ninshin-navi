// アフィリエイトの設定（設計原則8: 製品の紹介は記事にだけ。表示側が PR 表記を出す）。
// Amazon のリンクは「商品ページ（/dp/ASIN）」か「検索結果（/s?k=品目）」に、タグを付けるだけで成立する（APIは要らない）。
// 記事にはタグ無しの Amazon の URL を書いてよい。表示側（components/Markdown.tsx）がここで定めたタグを付ける＝タグの置き場は1か所。
// 検索結果へのリンクは「品目で探す」案内で、特定の商品をすすめるものではない（設計原則10: おすすめ順を付けない）。

export const AMAZON_TAG = "tsugiraku-22";
/** 楽天アフィリエイトの ID。管理画面の「アフィリエイトID」（ドット区切りの英数字のことが多い）。違っていれば差し替える */
export const RAKUTEN_ID = "tsugiraku";

/** 楽天市場の検索結果（品目で探す）へのリンク。表示側がアフィリエイトの形に包む */
export function rakutenSearchUrl(keyword: string): string {
  return `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(keyword)}/`;
}

/** 楽天市場の URL を、アフィリエイトの形（hb.afl.rakuten.co.jp/hgc/ID/?pc=…）に包む */
export function rakutenAffiliateUrl(target: string): string {
  const u = encodeURIComponent(target);
  return `https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_ID}/?pc=${u}&m=${u}`;
}

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
    // 楽天市場（検索・商品ページ）。すでに包んであるもの（hb.afl）は触らない
    if (/^(search|item|www)\.rakuten\.co\.jp$/.test(u.hostname)) return rakutenAffiliateUrl(href);
    return href;
  } catch {
    return href;
  }
}

/** この URL がアフィリエイトのリンクか（記事の検査と、rel="sponsored" の判断に使う） */
export const isAffiliateHref = (href: string) => /amzn\.(to|asia)|amazon\.co\.jp|a\.r10\.to|rakuten\.co\.jp|valuecommerce|a8\.net|moshimo|accesstrade|afi-b/.test(href);
