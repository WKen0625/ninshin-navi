import Link from "next/link";

/** Navi本体は日本語。日本語が難しい人に、英語の案内と「画面全体の翻訳」を1行で知らせる */
export function LangHint() {
  return (
    <p className="notice notice-muted text-base" lang="ja">
      <Link href="/en" hrefLang="en" lang="en" className="link-inline font-bold">English guide</Link>
      <span className="mx-2">／</span>
      日本語が難しいときは、ブラウザの翻訳機能（Chrome・Safariの「このページを翻訳」）で画面全体を翻訳できます。
    </p>
  );
}
