import { sourceLabel } from "@/lib/source-label";

/** 出典・確認日（設計原則3: すべてのルール・金額に表示する）。文字は「出典・◯◯区のページへ飛ぶ」 */
export function SourceLink({ url, verifiedAt, needsReview, fallback }: { url: string | null | undefined; verifiedAt: string | null | undefined; needsReview?: boolean; /** 区・都・国のページでないときの呼び方（例: 施設） */ fallback?: string }) {
  const isUrl = url != null && /^https?:\/\//.test(url);
  return (
    <p className="text-base text-gray-600">
      {isUrl ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="link">
          {sourceLabel(url, fallback ? `出典・${fallback}` : "出典")}
        </a>
      ) : (
        <span>出典: 確認中</span>
      )}
      {verifiedAt ? <span>・確認日 {verifiedAt.replaceAll("-", "/")}</span> : null}
      {needsReview ? <span className="ml-2 rounded bg-blue-50 px-2 py-1 text-info">内容を確認中</span> : null}
    </p>
  );
}
