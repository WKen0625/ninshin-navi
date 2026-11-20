import { ILLUST_LABELS, type IllustKind } from "@/lib/illust";

// 商品の絵（線のイラスト）。商品ボックスと比較表で、写真が無いときに出す。
// 写真（content/shop/product-photos.json。楽天の公式APIで取ったもの）があれば写真が優先。
// 絵は「どんな種類の物か」を一瞬で伝えるためのもので、特定の商品の見た目ではない。

type Tone = "indigo" | "sky" | "emerald" | "violet" | "amber" | "slate";

const TILE: Record<Tone, string> = {
  indigo: "bg-indigo-50 text-indigo-700",
  sky: "bg-sky-50 text-sky-700",
  emerald: "bg-emerald-50 text-emerald-700",
  violet: "bg-violet-50 text-violet-700",
  amber: "bg-amber-50 text-amber-800",
  slate: "bg-slate-100 text-slate-700",
};

const F = { fill: "currentColor", fillOpacity: 0.14 } as const;
const S = { fill: "currentColor", fillOpacity: 0.85, stroke: "none" } as const;

/** 種類ごとの絵（viewBox 0 0 96 96、線は currentColor） */
const ART = {
  // ── 抱っこ・お出かけ ──
  "carrier-belt": {
    tone: "indigo",
    el: (
      <>
        <circle cx="48" cy="21" r="9" {...F} />
        <path d="M33 33 Q48 27 63 33 L61 64 Q48 69 35 64 Z" {...F} />
        <path d="M33 33 L25 9 M63 33 L71 9" />
        <rect x="12" y="63" width="72" height="13" rx="6.5" {...F} />
        <rect x="42" y="65.5" width="12" height="8" rx="2" {...S} />
      </>
    ),
  },
  "carrier-light": {
    tone: "indigo",
    el: (
      <>
        <circle cx="48" cy="24" r="9" {...F} />
        <path d="M35 35 Q48 31 61 35 L58 61 Q48 65 38 61 Z" {...F} />
        <path d="M35 35 L29 12 M61 35 L67 12 M36 48 L18 53 M60 48 L78 53" />
        <path d="M41 63 L37 79 M55 63 L59 79" />
      </>
    ),
  },
  "carrier-wrap": {
    tone: "indigo",
    el: (
      <>
        <path d="M17 17 L27 11 L79 74 L69 81 Z" {...F} />
        <path d="M79 17 L69 11 L17 74 L27 81 Z" {...F} />
        <ellipse cx="48" cy="50" rx="16" ry="13" {...F} />
        <circle cx="48" cy="27" r="8.5" {...F} />
      </>
    ),
  },
  "stroller-a": {
    tone: "indigo",
    el: (
      <>
        <path d="M20 46 A28 28 0 0 1 58 21 L58 46 Z" {...F} />
        <path d="M20 46 L74 46 Q74 62 58 64 L32 64 Q20 62 20 46 Z" {...F} />
        <path d="M74 46 L85 23 M81 21 L89 25" />
        <path d="M34 64 L31 71 M60 64 L64 71" />
        <circle cx="31" cy="79" r="8" />
        <circle cx="65" cy="79" r="8" />
      </>
    ),
  },
  "stroller-b": {
    tone: "indigo",
    el: (
      <>
        <path d="M23 12 L35 12" />
        <path d="M29 12 L46 74 M46 56 L71 74" />
        <path d="M37 26 Q48 17 60 27" {...F} />
        <path d="M41 33 L45 54 L67 54" strokeWidth="6" />
        <circle cx="46" cy="79" r="6.5" />
        <circle cx="71" cy="79" r="6.5" />
      </>
    ),
  },
  "car-seat": {
    tone: "indigo",
    el: (
      <>
        <path d="M27 21 Q48 6 69 21 L71 64 Q71 81 48 83 Q25 81 25 64 Z" {...F} />
        <path d="M29 35 Q48 41 67 35" />
        <path d="M38 38 L46 60 M58 38 L50 60" />
        <rect x="44" y="58" width="8" height="8" rx="2" {...S} />
        <path d="M25 45 L17 47 L19 67 L26 65 M71 45 L79 47 L77 67 L70 65" />
      </>
    ),
  },
  // ── 授乳・ミルク ──
  "milk-can": {
    tone: "sky",
    el: (
      <>
        <rect x="30" y="18" width="36" height="64" rx="7" {...F} />
        <path d="M30 26 Q48 32 66 26" />
        <rect x="30" y="42" width="36" height="22" fill="#fff" />
        <path d="M48 46 Q41 55 48 60 Q55 55 48 46 Z" {...S} />
        <circle cx="56" cy="22" r="3" />
      </>
    ),
  },
  "milk-pack": {
    tone: "sky",
    el: (
      <>
        <path d="M30 32 L48 16 L66 32 L66 84 L30 84 Z" {...F} />
        <path d="M30 32 L66 32 M48 16 L48 32" />
        <rect x="34" y="46" width="28" height="22" rx="3" fill="#fff" />
        <path d="M48 49 Q42 57 48 62 Q54 57 48 49 Z" {...S} />
      </>
    ),
  },
  nipple: {
    tone: "sky",
    el: (
      <>
        <path d="M41 42 Q40 22 48 15 Q56 22 55 42 Z" {...F} />
        <rect x="30" y="42" width="36" height="15" rx="5" {...F} />
        <rect x="34" y="57" width="28" height="22" rx="4" />
        <path d="M34 66 L62 66" />
      </>
    ),
  },
  bottle: {
    tone: "sky",
    el: (
      <>
        <path d="M42 22 Q42 10 48 8 Q54 10 54 22 Z" {...F} />
        <rect x="36" y="22" width="24" height="10" rx="3" {...S} />
        <rect x="34" y="32" width="28" height="54" rx="9" {...F} />
        <path d="M40 46 L48 46 M40 56 L48 56 M40 66 L48 66" />
      </>
    ),
  },
  "bottle-straw": {
    tone: "sky",
    el: (
      <>
        <rect x="33" y="34" width="30" height="50" rx="9" {...F} />
        <rect x="35" y="24" width="26" height="10" rx="3" {...S} />
        <path d="M54 24 L61 8 L69 8" />
        <path d="M39 50 Q48 46 57 50" />
      </>
    ),
  },
  // ── おむつ・おしりふき ──
  diaper: {
    tone: "emerald",
    el: (
      <>
        <path d="M18 28 L78 28 L78 39 C66 43 60 55 58 71 L38 71 C36 55 30 43 18 39 Z" {...F} />
        <path d="M18 32 L9 34 L9 41 L18 39 M78 32 L87 34 L87 41 L78 39" />
        <path d="M18 34 L78 34" strokeDasharray="3 4" />
        <circle cx="48" cy="48" r="3.5" {...S} />
      </>
    ),
  },
  wipes: {
    tone: "emerald",
    el: (
      <>
        <rect x="12" y="34" width="72" height="42" rx="15" {...F} />
        <rect x="33" y="43" width="30" height="15" rx="7.5" fill="#fff" />
        <path d="M41 43 Q48 28 55 43" {...F} />
      </>
    ),
  },
  "bag-roll": {
    tone: "emerald",
    el: (
      <>
        <path d="M25 38 L71 38 L67 84 L29 84 Z" {...F} />
        <path d="M31 38 L37 18 L45 32 M65 38 L59 18 L51 32" />
        <path d="M37 56 Q48 52 59 56 M37 66 Q48 62 59 66" />
      </>
    ),
  },
  bin: {
    tone: "emerald",
    el: (
      <>
        <path d="M27 33 L69 33 L65 82 L31 82 Z" {...F} />
        <rect x="22" y="23" width="52" height="10" rx="4" {...S} />
        <path d="M40 23 Q48 14 56 23" />
        <path d="M40 44 L41 72 M48 44 L48 72 M56 44 L55 72" />
      </>
    ),
  },
  // ── 服・寝具 ──
  onesie: {
    tone: "violet",
    el: (
      <>
        <path d="M31 19 L42 15 Q48 22 54 15 L65 19 L80 34 L70 43 L64 37 L64 80 L32 80 L32 37 L26 43 L16 34 Z" {...F} />
        <path d="M42 15 L60 62" />
        <path d="M60 50 L70 54 M59 58 L69 62" />
      </>
    ),
  },
  cloth: {
    tone: "violet",
    el: (
      <>
        <path d="M18 18 L78 18 L78 62 L62 78 L18 78 Z" {...F} />
        <rect x="25" y="25" width="46" height="46" rx="2" strokeDasharray="4 4" />
        <path d="M62 78 L62 62 L78 62" />
      </>
    ),
  },
  blanket: {
    tone: "violet",
    el: (
      <>
        <path d="M12 38 Q48 26 84 38 L84 70 Q48 82 12 70 Z" {...F} />
        <path d="M12 52 Q48 41 84 52" />
        <path d="M12 62 Q48 51 84 62" strokeDasharray="3 4" />
      </>
    ),
  },
  futon: {
    tone: "violet",
    el: (
      <>
        <path d="M10 50 L39 35 L86 46 L57 62 Z" {...F} />
        <path d="M10 50 L10 59 L57 73 L57 62 M57 73 L86 57 L86 46" />
        <path d="M22 46 L34 40 L45 43 L33 50 Z" {...S} />
      </>
    ),
  },
  bath: {
    tone: "sky",
    el: (
      <>
        <path d="M14 42 L82 42 L75 72 Q73 79 65 79 L31 79 Q23 79 21 72 Z" {...F} />
        <path d="M9 42 L87 42" strokeWidth="4" />
        <path d="M22 54 Q29 50 36 54 T50 54 T64 54 T76 54" />
        <circle cx="34" cy="29" r="4" />
        <circle cx="46" cy="22" r="3" />
        <circle cx="58" cy="30" r="5" />
      </>
    ),
  },
  thermometer: {
    tone: "sky",
    el: (
      <>
        <rect x="39" y="10" width="18" height="62" rx="9" {...F} />
        <rect x="43" y="22" width="10" height="20" rx="2" {...S} />
        <path d="M43 72 L48 87 L53 72" />
      </>
    ),
  },
  "nail-clipper": {
    tone: "sky",
    el: (
      <>
        <circle cx="33" cy="70" r="10" {...F} />
        <circle cx="63" cy="70" r="10" {...F} />
        <path d="M38 61 L60 14 M58 61 L40 18" />
      </>
    ),
  },
  pad: {
    tone: "violet",
    el: (
      <>
        <path d="M30 13 Q48 7 66 13 L66 83 Q48 89 30 83 Z" {...F} />
        <path d="M38 22 Q48 18 58 22 L58 74 Q48 78 38 74 Z" strokeDasharray="4 4" />
      </>
    ),
  },
  shorts: {
    tone: "violet",
    el: (
      <>
        <path d="M18 23 L78 23 L82 71 L57 71 L48 47 L39 71 L14 71 Z" {...F} />
        <path d="M18 31 L78 31" />
        <circle cx="22" cy="43" r="2.5" {...S} />
        <circle cx="21" cy="55" r="2.5" {...S} />
      </>
    ),
  },
  pouch: {
    tone: "violet",
    el: (
      <>
        <rect x="18" y="28" width="56" height="10" rx="2" />
        <rect x="14" y="30" width="68" height="48" rx="9" {...F} />
        <path d="M16 40 L80 40" strokeDasharray="3 3" />
        <path d="M66 40 L66 50" />
        <circle cx="66" cy="53" r="3" {...S} />
      </>
    ),
  },
  // ── 家で使う ──
  bouncer: {
    tone: "amber",
    el: (
      <>
        <path d="M24 40 Q30 70 58 66 L76 55" {...F} strokeWidth="5" />
        <path d="M24 40 L33 28" strokeWidth="5" />
        <path d="M12 79 Q48 87 84 79" />
        <path d="M31 69 L21 79 M71 58 L80 79" />
      </>
    ),
  },
  highlow: {
    tone: "amber",
    el: (
      <>
        <path d="M30 18 Q22 20 25 31 L30 53 Q32 60 41 60 L71 60 Q76 53 71 48 L45 46 L43 27 Q40 17 30 18 Z" {...F} />
        <path d="M48 60 L48 74 M28 74 L68 74" />
        <circle cx="31" cy="80" r="4.5" />
        <circle cx="65" cy="80" r="4.5" />
      </>
    ),
  },
  monitor: {
    tone: "slate",
    el: (
      <>
        <rect x="10" y="30" width="28" height="30" rx="8" {...F} />
        <circle cx="24" cy="45" r="7" />
        <path d="M24 60 L24 70 M16 70 L32 70" />
        <rect x="48" y="22" width="38" height="56" rx="7" {...F} />
        <rect x="53" y="29" width="28" height="30" rx="3" fill="#fff" />
        <circle cx="67" cy="42" r="6" {...S} />
        <path d="M42 26 Q46 21 42 16" />
      </>
    ),
  },
  battery: {
    tone: "slate",
    el: (
      <>
        <rect x="24" y="16" width="48" height="66" rx="10" {...F} />
        <path d="M51 28 L39 51 L49 51 L43 70 L59 45 L49 45 Z" {...S} />
      </>
    ),
  },
  cable: {
    tone: "slate",
    el: (
      <>
        <rect x="16" y="14" width="18" height="22" rx="3" {...F} />
        <path d="M21 14 L21 8 M29 14 L29 8" />
        <path d="M25 36 C25 62 71 40 71 63 C71 75 58 80 52 74" />
        <rect x="42" y="72" width="16" height="10" rx="3" {...S} />
      </>
    ),
  },
  // ── 名前つけ ──
  stamp: {
    tone: "amber",
    el: (
      <>
        <circle cx="48" cy="20" r="8" {...F} />
        <rect x="42" y="27" width="12" height="18" rx="2" />
        <rect x="27" y="45" width="42" height="14" rx="3" {...F} />
        <path d="M30 72 L66 72" strokeWidth="6" />
        <path d="M34 82 L62 82" />
      </>
    ),
  },
  label: {
    tone: "amber",
    el: (
      <>
        <rect x="16" y="14" width="64" height="70" rx="7" {...F} />
        <rect x="24" y="24" width="20" height="10" rx="3" {...S} />
        <rect x="52" y="24" width="20" height="10" rx="3" {...S} />
        <rect x="24" y="44" width="20" height="10" rx="3" />
        <rect x="52" y="44" width="20" height="10" rx="3" />
        <rect x="24" y="64" width="20" height="10" rx="3" />
        <rect x="52" y="64" width="20" height="10" rx="3" />
      </>
    ),
  },
  // ── サービス ──
  bank: {
    tone: "slate",
    el: (
      <>
        <path d="M12 36 L48 16 L84 36 Z" {...F} />
        <path d="M22 42 L22 70 M36 42 L36 70 M60 42 L60 70 M74 42 L74 70" strokeWidth="5" />
        <rect x="12" y="72" width="72" height="9" rx="2" {...S} />
      </>
    ),
  },
  bag: {
    tone: "amber",
    el: (
      <>
        <path d="M20 34 L76 34 L72 82 L24 82 Z" {...F} />
        <path d="M36 34 Q36 16 48 16 Q60 16 60 34" />
      </>
    ),
  },
} satisfies Record<IllustKind, { tone: Tone; el: React.ReactNode }>;

export const illustLabel = (kind: IllustKind) => ILLUST_LABELS[kind];

/** 商品の絵のタイル。size は外側の箱の大きさ（Tailwind のクラス） */
export function ProductIllust({ kind, size = "size-24" }: { kind: IllustKind; size?: string }) {
  const art = ART[kind] ?? ART.bag;
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-2xl ${TILE[art.tone]}`} aria-hidden="true">
      <svg viewBox="0 0 96 96" className="size-[78%]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {art.el}
      </svg>
    </span>
  );
}
