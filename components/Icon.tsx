/**
 * 画面の「一瞬で何かわかる」ための絵（線のアイコン）。文字の前に置き、意味を色と形で先に伝える。
 * 名前で選ぶ。装飾なので aria-hidden（意味は横の文字が持つ）。
 */
const PATHS = {
  /** 入力・住まい */
  home: "M3 11l9-8 9 8M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10",
  pin: "M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  calendar: "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 13h3M8 17h5",
  /** 希望・お産 */
  heart: "M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10z",
  /** 紙・書類 */
  document: "M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h6",
  bag: "M6 8h12l1 12H5L6 8zM9 8V6a3 3 0 0 1 6 0v2",
  /** 次にやること */
  next: "M5 12h13M13 6l6 6-6 6",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  check: "M5 12.5l4.5 4.5L19 7.5",
  checkCircle: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM8 12.5l3 3 5-6",
  clock: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 7v5l3 2",
  alert: "M12 9v4M12 17h.01M10.3 3.9L2.5 17.5A2 2 0 0 0 4.2 20.5h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
  /** 困ったら */
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01",
  /** 窓口の種類 */
  building: "M4 21V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v16M4 21h16M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2",
  /** 都庁・官庁（柱のある建物） */
  tower: "M3 10l9-6 9 6M4 10h16M6 10v8M10 10v8M14 10v8M18 10v8M3 20h18",
  japan: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  briefcase: "M4 8h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1zM9 8V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3M3 13h18",
  hospital: "M4 21V7l8-4 8 4v14M9 21v-5h6v5M12 8v4M10 10h4",
  /** お金 */
  money: "M3 7h18v10H3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 10h.01M18 14h.01",
  /** 読みもの・連絡 */
  book: "M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2zM20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2z",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20",
  pen: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4",
  edit: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4",
  download: "M12 3v12M7 10l5 5 5-5M4 19h16",
  external: "M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6",
  baby: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 12h.01M15 12h.01M9.5 15.5a3.5 3.5 0 0 0 5 0M12 5V3",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2z",
  shield: "M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3zM9 12l2 2 4-4",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  stethoscope: "M6 3v6a5 5 0 0 0 10 0V3M11 14v3a4 4 0 0 0 8 0v-2M19 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-6" }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

/** 色のついた丸い板にアイコン。見出しや大事な行の先頭に置く */
export const TILE = {
  indigo: "bg-indigo-100 text-indigo-700",
  amber: "bg-amber-100 text-amber-800",
  green: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  sky: "bg-sky-100 text-sky-700",
  violet: "bg-violet-100 text-violet-700",
  slate: "bg-slate-200 text-slate-700",
  hero: "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-hero",
} as const;
export type Tone = keyof typeof TILE;

export function IconTile({ name, tone = "indigo", size = "size-11" }: { name: IconName; tone?: Tone; size?: string }) {
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-xl ${TILE[tone]}`}>
      <Icon name={name} className="size-[60%]" />
    </span>
  );
}

/** 絵つきの見出し。h2 が基本。id は aria-labelledby 用 */
export function SectionHeading({ icon, tone = "indigo", children, id, as: Tag = "h2", className = "" }: { icon: IconName; tone?: Tone; children: React.ReactNode; id?: string; as?: "h1" | "h2" | "h3" | "legend" | "p"; className?: string }) {
  return (
    <Tag id={id} className={`flex items-center gap-3 text-2xl leading-tight font-bold text-ink ${className}`}>
      <IconTile name={icon} tone={tone} />
      <span>{children}</span>
    </Tag>
  );
}
