/** 文字を減らすための開閉（トグル）。見出しだけ見せて、押すと中身が出る。ネイティブの details で、JSなしでも開く */
export function Disclosure({ summary, children, open = false, className = "" }: { summary: string; children: React.ReactNode; open?: boolean; className?: string }) {
  return (
    <details open={open} className={`group rounded-xl border-2 border-indigo-100 bg-indigo-50/40 ${className}`}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 py-2 text-base font-bold text-indigo-900 [&::-webkit-details-marker]:hidden">
        <span>{summary}</span>
        <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-white text-indigo-600 shadow-sm transition group-open:rotate-180">▾</span>
      </summary>
      <div className="space-y-3 border-t-2 border-indigo-100 bg-white px-4 py-3 text-base rounded-b-xl">{children}</div>
    </details>
  );
}
