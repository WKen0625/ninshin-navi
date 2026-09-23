// コラムをまとめて編集するための束ね／ほどき。
//   pnpm articles:export           … content/articles/**/*.md を1つのファイル content/articles/ALL.md に束ねる
//   pnpm articles:export --lang zh … その言語だけ
//   pnpm articles:import           … ALL.md を編集したあと、各ファイルに書き戻す（見出し情報も本文も）
// ALL.md の区切り行「<!-- file: <slug>/<lang>.md -->」は消さない。区切りの間を自由に直してよい。

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const DIR = join(ROOT, "content", "articles");
const ALL = join(DIR, "ALL.md");
const LANGS = ["ja", "en", "zh", "ko", "ru"];

const mode = process.argv[2];
const langArg = process.argv.indexOf("--lang") > 0 ? process.argv[process.argv.indexOf("--lang") + 1] : null;

if (mode === "export") {
  const parts: string[] = [
    "# コラムの一括編集用ファイル（pnpm articles:export で作成。編集後に pnpm articles:import で各ファイルへ戻す）",
    "",
    "- 区切り行 `<!-- file: ... -->` は消さない・動かさない。",
    "- 区切りの間（--- で囲んだ見出し情報と本文）は自由に直してよい。",
    "- 直したら `pnpm articles:import` → `pnpm vitest run tests/articles.test.ts` で検査 → git push。",
    "",
  ];
  for (const slug of readdirSync(DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
    for (const lang of LANGS) {
      if (langArg && lang !== langArg) continue;
      const path = join(DIR, slug, `${lang}.md`);
      if (!existsSync(path)) continue;
      parts.push(`<!-- file: ${slug}/${lang}.md -->`, "", readFileSync(path, "utf8").replace(/\s+$/, ""), "");
    }
  }
  writeFileSync(ALL, parts.join("\n") + "\n");
  console.log(`束ねた: ${ALL}`);
} else if (mode === "import") {
  if (!existsSync(ALL)) throw new Error("content/articles/ALL.md がありません（先に pnpm articles:export）");
  const src = readFileSync(ALL, "utf8");
  const re = /<!-- file: ([a-z0-9-]+)\/(ja|en|zh|ko|ru)\.md -->\n([\s\S]*?)(?=\n<!-- file: |\s*$)/g;
  let n = 0;
  for (const m of src.matchAll(re)) {
    const [, slug, lang, body] = m;
    const text = body.replace(/^\s+/, "").replace(/\s+$/, "") + "\n";
    if (!text.startsWith("---\n")) throw new Error(`${slug}/${lang}.md: 先頭が --- ではありません`);
    mkdirSync(join(DIR, slug), { recursive: true });
    writeFileSync(join(DIR, slug, `${lang}.md`), text);
    n++;
  }
  console.log(`書き戻した: ${n}ファイル。次に pnpm vitest run tests/articles.test.ts で検査してください。`);
} else {
  console.log("使い方: pnpm articles:export [--lang xx] ／ pnpm articles:import");
  process.exit(1);
}
