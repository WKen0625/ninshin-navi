// 東京23区の英字の名前（公開ページ /tokyo/<slug> の URL）。区のコードと1対1。
// 英字は区のデータファイルの id の頭（minato.s03 の minato）と同じにしている（tests/public.test.ts で照合）。

export type Ward = { code: string; slug: string; name: string };

export const WARDS: Ward[] = [
  { code: "13101", slug: "chiyoda", name: "千代田区" },
  { code: "13102", slug: "chuo", name: "中央区" },
  { code: "13103", slug: "minato", name: "港区" },
  { code: "13104", slug: "shinjuku", name: "新宿区" },
  { code: "13105", slug: "bunkyo", name: "文京区" },
  { code: "13106", slug: "taito", name: "台東区" },
  { code: "13107", slug: "sumida", name: "墨田区" },
  { code: "13108", slug: "koto", name: "江東区" },
  { code: "13109", slug: "shinagawa", name: "品川区" },
  { code: "13110", slug: "meguro", name: "目黒区" },
  { code: "13111", slug: "ota", name: "大田区" },
  { code: "13112", slug: "setagaya", name: "世田谷区" },
  { code: "13113", slug: "shibuya", name: "渋谷区" },
  { code: "13114", slug: "nakano", name: "中野区" },
  { code: "13115", slug: "suginami", name: "杉並区" },
  { code: "13116", slug: "toshima", name: "豊島区" },
  { code: "13117", slug: "kita", name: "北区" },
  { code: "13118", slug: "arakawa", name: "荒川区" },
  { code: "13119", slug: "itabashi", name: "板橋区" },
  { code: "13120", slug: "nerima", name: "練馬区" },
  { code: "13121", slug: "adachi", name: "足立区" },
  { code: "13122", slug: "katsushika", name: "葛飾区" },
  { code: "13123", slug: "edogawa", name: "江戸川区" },
];

export const wardBySlug = (slug: string) => WARDS.find((w) => w.slug === slug) ?? null;
export const wardByCode = (code: string) => WARDS.find((w) => w.code === code) ?? null;
