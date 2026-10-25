// アフィリエイトのタグは1か所（lib/affiliate.ts）。表示側が Amazon のリンクに付ける
import { describe, expect, it } from "vitest";
import { a8Href, a8Kind } from "../lib/a8";
import { AMAZON_TAG, amazonSearchUrl, isAffiliateHref, RAKUTEN_ID, rakutenSearchUrl, withAffiliate } from "../lib/affiliate";

describe("Amazon のリンク", () => {
  it("タグが無ければ付け、あれば触らない。Amazon 以外はそのまま", () => {
    expect(withAffiliate("https://www.amazon.co.jp/dp/B000000000")).toBe(`https://www.amazon.co.jp/dp/B000000000?tag=${AMAZON_TAG}`);
    expect(withAffiliate("https://www.amazon.co.jp/s?k=%E3%81%8A%E3%82%80%E3%81%A4")).toBe(`https://www.amazon.co.jp/s?k=%E3%81%8A%E3%82%80%E3%81%A4&tag=${AMAZON_TAG}`);
    expect(withAffiliate("https://www.amazon.co.jp/dp/X?tag=other-22")).toBe("https://www.amazon.co.jp/dp/X?tag=other-22");
    expect(withAffiliate("https://www.city.minato.tokyo.jp/a")).toBe("https://www.city.minato.tokyo.jp/a");
    expect(withAffiliate("/navi")).toBe("/navi");
  });
  it("検索結果のリンクは品目をエンコードする", () => {
    expect(amazonSearchUrl("おむつ 新生児")).toBe("https://www.amazon.co.jp/s?k=%E3%81%8A%E3%82%80%E3%81%A4%20%E6%96%B0%E7%94%9F%E5%85%90");
    expect(isAffiliateHref("https://www.amazon.co.jp/s?k=x")).toBe(true);
    expect(isAffiliateHref("https://www.mhlw.go.jp/")).toBe(false);
  });
});

describe("楽天のリンク", () => {
  it("楽天市場の検索・商品ページは hgc/ID で包む。包んであるものは触らない", () => {
    const s = rakutenSearchUrl("おむつ 新生児");
    expect(s).toBe("https://search.rakuten.co.jp/search/mall/%E3%81%8A%E3%82%80%E3%81%A4%20%E6%96%B0%E7%94%9F%E5%85%90/");
    const wrapped = withAffiliate(s);
    expect(wrapped.startsWith(`https://hb.afl.rakuten.co.jp/hgc/${RAKUTEN_ID}/?pc=`)).toBe(true);
    expect(new URL(wrapped).searchParams.get("pc")).toBe(s); // searchParams が1回だけ戻す
    expect(withAffiliate(wrapped)).toBe(wrapped);
    expect(withAffiliate("https://item.rakuten.co.jp/shop/item/")).toContain("hb.afl.rakuten.co.jp");
    expect(isAffiliateHref(s)).toBe(true);
  });
});

describe("A8 の広告コード（改変せずにそのまま出す）", () => {
  const banner = `<a href="https://px.a8.net/svt/ejp?a8mat=4BEOXU+7118VM+57YO+61C2P" rel="nofollow">
<img border="0" width="300" height="250" alt="" src="https://www22.a8.net/svt/bgt?aid=261025986425&wid=001&eno=01&mid=s00000024360001014000&mc=1"></a>
<img border="0" width="1" height="1" src="https://www15.a8.net/0.gif?a8mat=4BEOXU+7118VM+57YO+61C2P" alt="">`;
  const text = `<a href="https://px.a8.net/svt/ejp?a8mat=4BEOXU+7118VM+57YO+61C2P" rel="nofollow">シェフの無添つくりおき</a>
<img border="0" width="1" height="1" src="https://www15.a8.net/0.gif?a8mat=4BEOXU+7118VM+57YO+61C2P" alt="">`;
  it("A8 が出すバナーとテキストの形だけを通す", () => {
    expect(a8Kind(banner)).toBe("banner");
    expect(a8Kind(text)).toBe("text");
    expect(a8Href(banner)).toBe("https://px.a8.net/svt/ejp?a8mat=4BEOXU+7118VM+57YO+61C2P");
  });
  it("別のサイトへのリンク・スクリプト・属性の書き足しは止める", () => {
    expect(a8Kind(banner.replace("px.a8.net", "px.a8.net.example.com"))).toBeNull();
    expect(a8Kind(banner.replace('rel="nofollow"', 'rel="nofollow" onclick="x()"'))).toBeNull();
    expect(a8Kind(text.replace("シェフの無添つくりおき", "<script>x</script>"))).toBeNull();
    expect(a8Kind(banner + "<script>x</script>")).toBeNull();
    expect(a8Kind(banner.replace(/<img border="0" width="1"[^>]*>/, ""))).toBeNull(); // 計測画像が無い
  });
});
