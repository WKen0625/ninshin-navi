// 商品ボックスの写真の候補を、楽天市場商品検索API（2026年の新API）で取る。
// 使い方（.env.local に RAKUTEN_APP_ID と RAKUTEN_ACCESS_KEY を入れてから）:
//   node --env-file=.env.local --import tsx scripts/rakuten-photos.ts            … 候補を表示（書かない）
//   node --env-file=.env.local --import tsx scripts/rakuten-photos.ts --write    … content/shop/product-photos.json に書く
// 書いたあと、写真が本当にその商品かを人が目で確かめる（違うものは JSON から消す）。
//
// 環境変数:
//   RAKUTEN_APP_ID      楽天ウェブサービスのアプリID（新API用。UUIDの形）
//   RAKUTEN_ACCESS_KEY  アクセスキー（pk_ で始まる。ヘッダで送る。表示しない・コミットしない）
//   RAKUTEN_API_URL     省略時 https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601（版が変わったらここを替える）
//   RAKUTEN_REFERER     省略時 https://www.tsugiraku.jp/（アプリ登録で許可したサイト）

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { RAKUTEN_ID } from "../lib/affiliate";
import { itemsOf, pickItem } from "../lib/rakuten-photos";

const appId = process.env.RAKUTEN_APP_ID;
const accessKey = process.env.RAKUTEN_ACCESS_KEY;
const api = process.env.RAKUTEN_API_URL ?? "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20220601";
const referer = process.env.RAKUTEN_REFERER ?? "https://www.tsugiraku.jp/";
const write = process.argv.includes("--write");

async function main() {
  if (!appId || !accessKey) {
    console.error("RAKUTEN_APP_ID と RAKUTEN_ACCESS_KEY を .env.local に入れてください（値は表示しません）");
    process.exit(1);
  }
  const shop = join(process.cwd(), "content", "shop");
  const products = (parse(readFileSync(join(shop, "products.yaml"), "utf8")) as { products: { id: string; name: string; rakuten_keyword?: string }[] }).products.filter((p) => p.rakuten_keyword);
  const photos: Record<string, { src: string; href: string; alt: string; shop: string; item_code: string }> = {};
  for (const p of products) {
    const q = new URLSearchParams({ applicationId: appId, affiliateId: RAKUTEN_ID, keyword: p.rakuten_keyword!, hits: "10", sort: "-reviewCount", imageFlag: "1", availability: "1", formatVersion: "2" });
    const res = await fetch(`${api}?${q}`, { headers: { accessKey, Referer: referer, Origin: referer.replace(/\/$/, "") } });
    if (!res.ok) {
      console.log(`${p.id.padEnd(20)} HTTP ${res.status}`);
    } else {
      const pick = pickItem(p.rakuten_keyword!, itemsOf(await res.json()));
      if (pick?.imageUrl && pick.affiliateUrl) {
        photos[p.id] = { src: pick.imageUrl, href: pick.affiliateUrl, alt: p.name, shop: pick.shopName, item_code: pick.itemCode };
        console.log(`${p.id.padEnd(20)} ${pick.reviewCount}件  ${pick.shopName}  ${pick.itemName.slice(0, 50)}`);
      } else console.log(`${p.id.padEnd(20)} 候補なし（絵のまま）`);
    }
    await new Promise((r) => setTimeout(r, 1600)); // 1秒に1回より遅く（429 を避ける）
  }
  if (write) {
    const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
    writeFileSync(join(shop, "product-photos.json"), `${JSON.stringify({ checked_at: today, source: "rakuten-ichiba-item-search", photos }, null, 2)}\n`);
    console.log(`\n書きました: content/shop/product-photos.json（${Object.keys(photos).length}件）。写真がその商品か、目で確かめてください。`);
  }
}

main();
