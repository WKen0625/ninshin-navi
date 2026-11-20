// 楽天の新APIの応答から写真を選ぶ（scripts/rakuten-photos.ts）。画像とリンクは楽天の公式のURLだけ
import { describe, expect, it } from "vitest";
import { biggerImage, itemsOf, pickItem } from "../lib/rakuten-photos";

const v2 = {
  Items: [
    { itemName: "エルゴベビー OMNI Breeze オムニブリーズ 抱っこ紐", itemCode: "shopa:1", shopName: "A店", reviewCount: 120, mediumImageUrls: ["https://thumbnail.image.rakuten.co.jp/@0_mall/a/cabinet/1.jpg?_ex=128x128"], affiliateUrl: "https://hb.afl.rakuten.co.jp/hgc/x/?pc=y" },
    { itemName: "エルゴベビー OMNI Breeze オムニブリーズ", itemCode: "shopb:2", shopName: "B店", reviewCount: 900, mediumImageUrls: ["https://thumbnail.image.rakuten.co.jp/@0_mall/b/cabinet/2.jpg?_ex=128x128"], affiliateUrl: "https://hb.afl.rakuten.co.jp/hgc/x/?pc=z" },
    { itemName: "抱っこ紐 カバー（エルゴ対応）", itemCode: "shopc:3", shopName: "C店", reviewCount: 5000, mediumImageUrls: ["https://thumbnail.image.rakuten.co.jp/@0_mall/c/cabinet/3.jpg"], affiliateUrl: "https://hb.afl.rakuten.co.jp/hgc/x/?pc=w" },
  ],
};

describe("楽天の写真の選び方", () => {
  it("formatVersion 1 と 2 の両方を読み、画像を 300x300 にする", () => {
    const a = itemsOf(v2);
    expect(a[0].imageUrl).toBe("https://thumbnail.image.rakuten.co.jp/@0_mall/a/cabinet/1.jpg?_ex=300x300");
    const v1 = itemsOf({ Items: [{ Item: { itemName: "x", mediumImageUrls: [{ imageUrl: "https://thumbnail.image.rakuten.co.jp/q.jpg?_ex=128x128" }], affiliateUrl: "https://hb.afl.rakuten.co.jp/hgc/a" } }] });
    expect(v1[0].imageUrl).toBe("https://thumbnail.image.rakuten.co.jp/q.jpg?_ex=300x300");
  });
  it("検索語のすべての語を名前に含むものの中から、レビューの多いものを選ぶ（関係のない付属品は選ばない）", () => {
    expect(pickItem("エルゴベビー オムニブリーズ", itemsOf(v2))?.itemCode).toBe("shopb:2");
    expect(pickItem("コンビ スゴカル", itemsOf(v2))).toBeNull();
  });
  it("楽天の画像サーバー以外の画像と、楽天アフィリエイト以外のリンクは使わない", () => {
    expect(biggerImage("https://example.com/a.jpg")).toBeNull();
    const bad = itemsOf({ Items: [{ itemName: "エルゴベビー オムニブリーズ", mediumImageUrls: ["https://example.com/a.jpg"], affiliateUrl: "https://example.com/" }] });
    expect(pickItem("エルゴベビー オムニブリーズ", bad)).toBeNull();
  });
});
