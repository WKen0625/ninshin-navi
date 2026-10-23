/** 検索エンジン向けの構造化データ（JSON-LD）。</script> を閉じられないよう < を逃がす */
export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
