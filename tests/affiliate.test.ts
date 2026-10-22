// アフィリエイトのタグは1か所（lib/affiliate.ts）。表示側が Amazon のリンクに付ける
import { describe, expect, it } from "vitest";
import { AMAZON_TAG, amazonSearchUrl, isAffiliateHref, withAffiliate } from "../lib/affiliate";

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
