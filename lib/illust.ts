// 商品の絵の種類（components/ProductIllust.tsx が描く）。products.yaml の illust はこの中から選ぶ。
// 絵は「どんな種類の物か」を伝えるためのもので、特定の商品の見た目ではない。alt にはこの名前を使う。

export const ILLUST_LABELS = {
  "carrier-belt": "腰ベルト型の抱っこ紐",
  "carrier-light": "軽い前抱きの抱っこ紐",
  "carrier-wrap": "布を巻くラップ型の抱っこ紐",
  "stroller-a": "両対面のベビーカー（A型）",
  "stroller-b": "軽いベビーカー（B型）",
  "car-seat": "チャイルドシート",
  "milk-can": "液体ミルク（缶）",
  "milk-pack": "液体ミルク（紙パック）",
  nipple: "缶に付ける乳首のアタッチメント",
  bottle: "哺乳瓶",
  "bottle-straw": "ストローつきの飲みもの",
  diaper: "紙おむつ",
  wipes: "おしりふき",
  "bag-roll": "においを閉じ込める袋",
  bin: "蓋つきのゴミ箱",
  onesie: "肌着",
  cloth: "ガーゼのハンカチ",
  blanket: "おくるみ・ケット",
  futon: "布団・シーツ",
  bath: "ベビーバス",
  thermometer: "体温計",
  "nail-clipper": "赤ちゃん用の爪切り",
  pad: "産褥パッド",
  shorts: "産褥ショーツ",
  pouch: "母子手帳ケース",
  bouncer: "バウンサー",
  highlow: "ハイローチェア",
  monitor: "ベビーモニター",
  battery: "モバイルバッテリー",
  cable: "長い充電ケーブル",
  stamp: "お名前スタンプ",
  label: "名前シール",
  bank: "銀行口座",
  bag: "商品",
} as const;

export type IllustKind = keyof typeof ILLUST_LABELS;
export const ILLUST_KINDS = Object.keys(ILLUST_LABELS) as IllustKind[];
export const isIllustKind = (k: string): k is IllustKind => k in ILLUST_LABELS;
