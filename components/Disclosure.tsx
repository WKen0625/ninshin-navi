/** 文字を減らすための開閉（トグル）。見出しだけ見せて、押すと中身が出る。ネイティブの details で、JSなしでも開く */
export function Disclosure({ summary, children, open = false, className = "" }: { summary: string; children: React.ReactNode; open?: boolean; className?: string }) {
  return (
    <details open={open} className={`group rounded-xl border border-slate-200/80 bg-white/60 ${className}`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-base font-bold text-slate-700 [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <span aria-hidden="true" className="text-slate-400 transition group-open:rotate-180">▾</span>
      </summary>
      <div className="space-y-3 px-3 pb-3 text-base">{children}</div>
    </details>
  );
}
