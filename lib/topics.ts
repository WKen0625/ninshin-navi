// 手続きの「話題」: 題名から決める（決定的）。公開ページの URL（/tokyo/minato/ninshin-todoke）と、区どうしの比較ページに使う。
// 上から順に当てる。先に置いたものが優先（例: 「出生通知票を出し、新生児誕生祝金を…」はお祝い・助成）。
// URL が変わらないよう、区の主な手続き（妊娠届・面談・給付金・健診など）が同じ話題になることを tests/public.test.ts で確かめる。

export type Topic = {
  slug: string;
  /** ページの題名に使う短い名前 */
  label: string;
  /** 区どうしの比較ページを作る */
  compare?: boolean;
  /** 比較ページの説明（1文） */
  lead?: string;
  test: (title: string) => boolean;
};

export const TOPICS: Topic[] = [
  // 流産・死産の手続き（ほかの話題の言葉も含むので先に当てる）
  { slug: "ichijikin-ryuzan-shizan", label: "流産・死産のときの出産育児一時金", test: (t) => /一時金/.test(t) && /流産|死産/.test(t) },
  { slug: "sango-kyugyo-ryuzan-shizan", label: "流産・死産のときの産後休業", test: (t) => /産後休業/.test(t) && /流産|死産/.test(t) },
  { slug: "bosei-kenko-kanri-ryuzan-shizan", label: "流産・死産のあとの母性健康管理措置", test: (t) => /流産|死産/.test(t) && /1年以内/.test(t) },
  { slug: "kyufu-ryuzan-shizan", label: "流産・死産のあとの妊婦支援給付", test: (t) => /給付/.test(t) && /流産|死産/.test(t) },
  { slug: "mutsu-josei", label: "無痛分娩費用の助成（東京都）", test: (t) => /無痛分娩費用助成を申請/.test(t) },
  { slug: "mutsu-shisetsu", label: "無痛分娩の対象医療機関（東京都）", test: (t) => /無痛分娩/.test(t) && /対象医療機関/.test(t) },
  { slug: "babyfirst-018", label: "赤ちゃんファーストと018サポート", test: (t) => /赤ちゃんファースト|018サポート/.test(t) },
  {
    slug: "shussan-josei", label: "区の出産のお祝い・助成", compare: true,
    lead: "国の出産育児一時金とは別に、区が独自に出している出産費用の助成やお祝い（現金・クーポン・品物）です。区によって金額も申請先も大きく違います。",
    // 「ねりママ出産応援金〈妊婦支援給付金・1回目〉」のように国の支援給付に区の名前を付けたものは給付金の方
    test: (t) => /出産費|祝金|祝品|出産助成|出産応援|サポートクーポン|ハッピーマザー/.test(t) && !/支援給付/.test(t),
  },
  { slug: "kotsu-shien", label: "交通の支援（乗車券など）", test: (t) => /乗車券|コミュニティバス/.test(t) },
  {
    slug: "ninshin-todoke", label: "妊娠届と母子手帳の受け取り", compare: true,
    lead: "妊娠届を出すと、母子健康手帳と健診の受診票などが入った袋を受け取ります。窓口の場所、電子申請の可否、受け取りに来庁が要るかが区によって違います。",
    test: (t) => /妊娠届/.test(t) && !/給付/.test(t),
  },
  { slug: "anketo", label: "妊娠8か月ごろのアンケート", test: (t) => /アンケート/.test(t) },
  {
    slug: "mensetsu", label: "妊婦面談（面接）", compare: true,
    lead: "妊娠届のあとに受ける、保健師・助産師などとの面談です。区によって名前が違い、受けないと妊婦支援給付金（1回目）の申請に進めない区があります。",
    test: (t) => /面談|面接/.test(t),
  },
  {
    slug: "kyufu-1kaime", label: "妊婦支援給付金（1回目）", compare: true,
    lead: "国の「妊婦のための支援給付」の1回目（5万円）です。申請のしかた（面談のときに案内・専用サイト・電子申請）が区によって違います。",
    test: (t) => /給付/.test(t) && (/1回目/.test(t) || (/妊娠時|産前|出産前/.test(t) && !/2回目|産後|出産後/.test(t))),
  },
  {
    slug: "kyufu-2kaime", label: "妊婦支援給付金（2回目）", compare: true,
    lead: "国の「妊婦のための支援給付」の2回目（子ども1人につき5万円）です。出産後の訪問や通知をきっかけに申請する区が多く、方法が区によって違います。",
    test: (t) => /給付/.test(t) && /2回目|出産後|産後/.test(t),
  },
  { slug: "sango-shika", label: "産後の歯科健診", test: (t) => /歯科/.test(t) && /産後/.test(t) },
  {
    slug: "shika", label: "妊婦歯科健診", compare: true,
    lead: "妊娠中に無料（自己負担なし）で受けられる歯科健診です。保健所・保健センターで受ける区と、区内の歯科医院で受ける区があります。",
    test: (t) => /歯科|歯周/.test(t),
  },
  {
    slug: "kokuho-menjo", label: "国民健康保険料の産前産後の免除・軽減", compare: true,
    lead: "国民健康保険に入っている人は、出産前後の4か月分（双子以上は6か月分）の保険料が軽くなります。届け出の窓口と方法を区ごとに並べました。",
    test: (t) => /国民健康保険料/.test(t),
  },
  { slug: "kokumin-nenkin-menjo", label: "国民年金保険料の産前産後の免除", test: (t) => /国民年金保険料/.test(t) },
  { slug: "sanzen-kyugyo-tatai", label: "双子以上の産前休業", test: (t) => /産前休業/.test(t) },
  { slug: "tatai-kenshin", label: "双子以上の妊婦健診の追加助成", test: (t) => /双子以上|多胎/.test(t) },
  {
    slug: "satogaeri-kenshin", label: "里帰りなどで受けた健診の費用助成", compare: true,
    lead: "里帰り出産などで、東京都の受診票が使えない病院や助産所で自費で受けた健診の費用を、あとから区が助成します。期限と上限額が区によって違います。",
    test: (t) => /里帰り|都外|契約外/.test(t),
  },
  { slug: "ninpu-kenshin", label: "妊婦健診", test: (t) => /妊婦健診を受ける|妊婦健康診査を受ける/.test(t) },
  {
    slug: "sanpu-kenshin", label: "産婦健康診査", compare: true,
    lead: "産後に受ける健診の費用を、区の受診票で助成するものです。回数（多くは2回まで）と、使える期間を区ごとに並べました。",
    test: (t) => /産婦健康診査|産婦健診/.test(t),
  },
  {
    slug: "chokaku-kensa", label: "新生児聴覚検査", compare: true,
    lead: "生まれてすぐに受ける耳の検査の費用を、区の受診票で助成するものです。対象になる期間を区ごとに並べました。",
    test: (t) => /聴覚/.test(t),
  },
  {
    slug: "ikkagetsu-kenshin", label: "1か月児健康診査", compare: true,
    lead: "生後1か月ごろの健診の費用を、区の受診票で助成するものです。受けられる期間（生後27日〜41日など）が区によって違います。",
    test: (t) => /1か月児|１か月児/.test(t),
  },
  {
    slug: "shussei-tsuchi", label: "出生通知票と赤ちゃん訪問", compare: true,
    lead: "母子手帳と一緒に受け取る出生通知票（はがき）を出すと、保健師・助産師が家に来て赤ちゃんの様子を見てくれます。出し方と訪問の時期を区ごとに並べました。",
    test: (t) => /出生通知|赤ちゃん訪問|新生児訪問|乳児家庭訪問/.test(t),
  },
  { slug: "shussei-todoke", label: "出生届", test: (t) => /出生届を出す/.test(t) },
  { slug: "jido-teate", label: "児童手当", test: (t) => /児童手当/.test(t) },
  { slug: "kodomo-hoken", label: "子どもの健康保険の加入", test: (t) => /健康保険に加入/.test(t) },
  { slug: "chokusetsu-shiharai", label: "出産育児一時金の直接支払制度", test: (t) => /直接支払制度/.test(t) },
  { slug: "jushin", label: "妊娠の確認（初めての受診）", test: (t) => /胎児心拍を確認/.test(t) },
  { slug: "bunben-yoyaku", label: "分娩予約", test: (t) => /分娩予約/.test(t) },
  { slug: "sankyu-hokenryo", label: "産休中の社会保険料の免除", test: (t) => /産休中の健康保険/.test(t) },
  { slug: "ikukyu-hokenryo", label: "育休中の社会保険料の免除", test: (t) => /育児休業中の健康保険/.test(t) },
  { slug: "shussan-teatekin", label: "出産手当金", test: (t) => /出産手当金/.test(t) },
  { slug: "ikuji-kyugyo-kyufu", label: "育児休業給付金", test: (t) => /育児休業給付金/.test(t) },
  { slug: "zairyu-shikaku", label: "子の在留資格", test: (t) => /在留資格/.test(t) },
  { slug: "taishikan", label: "大使館・領事館への出生の届け出", test: (t) => /大使館/.test(t) },
  { slug: "shizan-todoke", label: "死産届", test: (t) => /死産届/.test(t) },
];

export const topicOf = (title: string): Topic | null => TOPICS.find((t) => t.test(title)) ?? null;
export const topicBySlug = (slug: string): Topic | null => TOPICS.find((t) => t.slug === slug) ?? null;
