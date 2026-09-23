import "server-only";
// 記事（content/articles/<slug>/<lang>.md）。言語ごとに1ファイル。先頭の --- で囲んだ部分が見出し情報。
// 記事は「手続きの答え」ではなく読みもの。制度の数字を書くときは、本文に出典のリンクと確認日を書く（設計原則3）。
// 製品を載せる記事は pr: true を必ず付ける。表示側が先頭に「PR・広告を含みます」を出す（設計原則8）。
// 病院の画面（/hospitals）から記事へは遷移させない。

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { parseMarkdown, type Block } from "./markdown";

import { isLang, isStage, LANGS, STAGE_LABEL, STAGES, type Lang, type Stage } from "./i18n";
export { isLang, isStage, LANGS, STAGE_LABEL, STAGES };
export type { Lang, Stage };

const Front = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    /** 公開日・更新日（YYYY-MM-DD） */
    published: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    /** 製品・アフィリエイトリンクを含むか。true なら表示側が PR表記を先頭に出す */
    pr: z.boolean().default(false),
    /** 使っているアフィリエイトの仕組み（表示する規約上の文言を決める）。例: amazon */
    programs: z.array(z.enum(["amazon", "rakuten", "yahoo", "other"])).default([]),
    /** 周期。一覧の並び（周期順 → 新しい順）と絞り込み */
    stage: z.enum(["all", "early", "mid", "late", "birth", "postpartum"]).default("all"),
    /** 下書き。一覧に出さず、URL直打ちでも 404 */
    draft: z.boolean().default(false),
    /** 本文で使った出典（URL と 確認日） */
    sources: z.array(z.object({ label: z.string(), url: z.string().url(), verified_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).default([]),
    tags: z.array(z.string()).default([]),
  })
  .strict();

export type ArticleMeta = z.infer<typeof Front> & { slug: string; lang: Lang; /** ほかの言語版があるか */ langs: Lang[] };
export type Article = ArticleMeta & { blocks: Block[] };

const DIR = () => join(process.cwd(), "content", "articles");

function splitFrontmatter(src: string): { front: unknown; body: string } {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error("記事の先頭に --- で囲んだ見出し情報がありません");
  return { front: parse(m[1]), body: m[2] };
}

function read(slug: string, lang: Lang): Article | null {
  const path = join(DIR(), slug, `${lang}.md`);
  if (!existsSync(path)) return null;
  const { front, body } = splitFrontmatter(readFileSync(path, "utf8"));
  const meta = Front.parse(front);
  const langs = LANGS.filter((l) => existsSync(join(DIR(), slug, `${l}.md`)));
  return { ...meta, slug, lang, langs, blocks: parseMarkdown(body) };
}

/** 公開している記事の一覧（その言語版があるものだけ）。周期の順 → 新しい順。stage を渡すとその周期（と「いつでも」）だけ */
export function listArticles(lang: Lang, stage?: Stage): ArticleMeta[] {
  if (!existsSync(DIR())) return [];
  return readdirSync(DIR(), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => read(d.name, lang))
    .filter((a): a is Article => a != null && !a.draft)
    .filter((a) => !stage || stage === "all" || a.stage === stage || a.stage === "all")
    .map(({ blocks: _blocks, ...meta }) => meta)
    .sort((a, b) => STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) || (a.published < b.published ? 1 : a.published > b.published ? -1 : a.slug.localeCompare(b.slug)));
}

export function getArticle(slug: string, lang: Lang): Article | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;
  const a = read(slug, lang);
  return a && !a.draft ? a : null;
}

/** すべての記事ファイルを検査する（テスト・preflight 用）。壊れていれば投げる */
export function validateArticles(): { slug: string; lang: Lang }[] {
  const out: { slug: string; lang: Lang }[] = [];
  if (!existsSync(DIR())) return out;
  for (const d of readdirSync(DIR(), { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    if (!/^[a-z0-9-]+$/.test(d.name)) throw new Error(`記事のフォルダ名は英小文字・数字・ハイフンだけ: ${d.name}`);
    for (const lang of LANGS) {
      const a = read(d.name, lang);
      if (a) out.push({ slug: d.name, lang });
    }
    if (!out.some((x) => x.slug === d.name)) throw new Error(`記事 ${d.name} に ja.md も en.md もありません`);
  }
  return out;
}
