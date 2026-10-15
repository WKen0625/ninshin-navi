import type { PaperVariant } from "@/lib/paper";

type Issuer = "hospital" | "ward" | "employer" | "insurer" | "tokyo" | "national" | "other";

/** 発行元ごとの帯の色（窓口のアイコンと同じ色の決まり: 病院＝空色／区＝青／勤務先＝緑／健康保険＝緑／都＝紫／国＝灰） */
const BAND: Record<Issuer, { fill: string; text: string; label: string }> = {
  hospital: { fill: "#0ea5e9", text: "#0369a1", label: "病院" },
  ward: { fill: "#3b82f6", text: "#1d4ed8", label: "区" },
  employer: { fill: "#10b981", text: "#047857", label: "勤務先" },
  insurer: { fill: "#059669", text: "#065f46", label: "健保" },
  tokyo: { fill: "#8b5cf6", text: "#6d28d9", label: "都" },
  national: { fill: "#64748b", text: "#334155", label: "国" },
  other: { fill: "#94a3b8", text: "#475569", label: "" },
};

/**
 * 紙の絵。形で種類（袋・手帳・券・証・通知・記入する紙・紙）を、帯の色と文字で発行元を表す。装飾なので aria-hidden。
 * 文字は帯の中の発行元だけ（名前は横のHTMLが持つ）。
 */
export function PaperIllustration({ variant, issuer, className = "h-24 w-20" }: { variant: PaperVariant; issuer: Issuer; className?: string }) {
  const b = BAND[issuer];
  const lines = (
    <g stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round">
      <line x1="16" y1="46" x2="56" y2="46" />
      <line x1="16" y1="58" x2="50" y2="58" />
      <line x1="16" y1="70" x2="54" y2="70" />
    </g>
  );
  const band = (y = 10, h = 16, w = 48) => (
    <>
      <rect x="12" y={y} width={w} height={h} rx="4" fill={b.fill} />
      {b.label ? <text x={12 + w / 2} y={y + h / 2 + 4.5} textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{b.label}</text> : null}
    </>
  );
  return (
    <svg viewBox="0 0 72 96" className={className} aria-hidden="true">
      {variant === "bag" ? (
        <>
          <path d="M10 30h52l-4 56H14z" fill="#e0e7ff" stroke="#6366f1" strokeWidth="3" strokeLinejoin="round" />
          <path d="M24 30v-8a12 12 0 0 1 24 0v8" fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
          <rect x="22" y="42" width="28" height="36" rx="3" fill="#fff" stroke="#94a3b8" strokeWidth="2" />
          <rect x="28" y="36" width="28" height="36" rx="3" fill="#fff" stroke="#94a3b8" strokeWidth="2" />
          {band(50, 12, 28)}
        </>
      ) : variant === "booklet" ? (
        <>
          <rect x="12" y="10" width="48" height="76" rx="5" fill={b.fill} />
          <rect x="18" y="16" width="40" height="70" rx="3" fill="#fff" stroke="#94a3b8" strokeWidth="2" />
          <rect x="24" y="22" width="26" height="30" rx="3" fill="#fde68a" />
          <circle cx="37" cy="37" r="7" fill="#fff" />
          <line x1="24" y1="62" x2="52" y2="62" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
          <line x1="24" y1="72" x2="46" y2="72" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
          {b.label ? <text x="15" y="60" fontSize="10" fontWeight="700" fill="#fff" transform="rotate(-90 15 60)">{b.label}</text> : null}
        </>
      ) : variant === "ticket" ? (
        <>
          <rect x="8" y="22" width="56" height="52" rx="6" fill="#fff" stroke="#94a3b8" strokeWidth="2.5" />
          <line x1="44" y1="22" x2="44" y2="74" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="4 4" />
          <circle cx="44" cy="22" r="4" fill="#f7f7fc" stroke="#94a3b8" strokeWidth="2.5" />
          <circle cx="44" cy="74" r="4" fill="#f7f7fc" stroke="#94a3b8" strokeWidth="2.5" />
          <rect x="14" y="30" width="24" height="10" rx="3" fill={b.fill} />
          {b.label ? <text x="26" y="38" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">{b.label}</text> : null}
          <line x1="14" y1="50" x2="36" y2="50" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
          <line x1="14" y1="60" x2="30" y2="60" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
          <text x="54" y="52" textAnchor="middle" fontSize="12" fontWeight="700" fill="#64748b">券</text>
        </>
      ) : variant === "card" ? (
        <>
          <rect x="6" y="28" width="60" height="40" rx="6" fill="#fff" stroke="#94a3b8" strokeWidth="2.5" />
          <rect x="6" y="28" width="60" height="12" rx="6" fill={b.fill} />
          <rect x="6" y="36" width="60" height="4" fill={b.fill} />
          {b.label ? <text x="36" y="37" textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">{b.label}</text> : null}
          <rect x="12" y="46" width="14" height="14" rx="2" fill="#fde68a" />
          <line x1="32" y1="50" x2="58" y2="50" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
          <line x1="32" y1="58" x2="50" y2="58" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : variant === "envelope" ? (
        <>
          <rect x="8" y="26" width="56" height="44" rx="5" fill="#fff" stroke="#94a3b8" strokeWidth="2.5" />
          <path d="M8 30l28 22 28-22" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinejoin="round" />
          <rect x="44" y="32" width="14" height="10" rx="2" fill={b.fill} />
          {b.label ? <text x="36" y="66" textAnchor="middle" fontSize="9" fontWeight="700" fill={b.text}>{b.label}</text> : null}
        </>
      ) : variant === "form" ? (
        <>
          <path d="M12 6h34l14 14v70H12z" fill="#fff" stroke="#94a3b8" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M46 6v14h14" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2.5" strokeLinejoin="round" />
          {band(26, 12, 30)}
          <rect x="16" y="46" width="10" height="10" rx="2" fill="none" stroke="#94a3b8" strokeWidth="2" />
          <line x1="30" y1="51" x2="54" y2="51" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
          <rect x="16" y="62" width="10" height="10" rx="2" fill="none" stroke="#94a3b8" strokeWidth="2" />
          <line x1="30" y1="67" x2="50" y2="67" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" />
          <line x1="16" y1="82" x2="54" y2="82" stroke="#1e1b4b" strokeWidth="2" />
          <text x="54" y="80" textAnchor="end" fontSize="8" fill="#64748b">印</text>
        </>
      ) : (
        <>
          <path d="M12 6h34l14 14v70H12z" fill="#fff" stroke="#94a3b8" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M46 6v14h14" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2.5" strokeLinejoin="round" />
          {band(26, 12, 30)}
          {lines}
        </>
      )}
    </svg>
  );
}
