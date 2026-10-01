// 紹介投稿の静止画（1080×1350 のカルーセル5枚）と動画（1080×1920・14秒）を作る。
// 使い方: pnpm tsx social/render-intro.ts [reel.html] [reel.mp4]   → social/intro/out/ に slide-1..5.png と動画
//   例: pnpm tsx social/render-intro.ts reel-v2.html reel-v2.mp4   （人物入りの版。静止画は作らない）
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import ffmpeg from "ffmpeg-static";
import { chromium } from "playwright";
import QRCode from "qrcode";

async function main() {
const DIR = join(__dirname, "intro");
const reelFile = process.argv[2] ?? "reel.html";
const reelOut = process.argv[3] ?? "reel.mp4";
const onlyReel = process.argv.length > 2;
const OUT = join(DIR, "out");
mkdirSync(OUT, { recursive: true });
const qr = await QRCode.toDataURL("https://www.tsugiraku.jp/?utm_source=instagram&utm_medium=social&utm_campaign=intro", { width: 420, margin: 1 });

const browser = await chromium.launch();

// 静止画
if (!onlyReel) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  await page.goto(`file://${join(DIR, "slides.html")}`);
  await page.evaluate((src) => { (document.getElementById("qr") as HTMLImageElement).src = src; }, qr);
  await page.waitForTimeout(500);
  const slides = await page.$$("section.slide");
  for (let i = 0; i < slides.length; i++) {
    await slides[i].screenshot({ path: join(OUT, `slide-${i + 1}.png`), type: "png" });
  }
  await page.close();
  console.log(`${slides.length} 枚 → ${OUT}`);
}

// 動画: ブラウザの録画（webm）→ ffmpeg で mp4（H.264・yuv420p・30fps）
{
  const tmp = join(OUT, "tmp-video");
  rmSync(tmp, { recursive: true, force: true });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1, recordVideo: { dir: tmp, size: { width: 1080, height: 1920 } } });
  const page = await ctx.newPage();
  await page.goto(`file://${join(DIR, reelFile)}`);
  await page.evaluate((src) => { (document.getElementById("qr") as HTMLImageElement).src = src; }, qr);
  await page.waitForTimeout(400);
  await page.evaluate(() => document.body.classList.add("play"));
  await page.waitForTimeout(14500);
  await ctx.close();
  const webm = readdirSync(tmp).find((f) => f.endsWith(".webm"))!;
  // 先頭の読み込み待ち 0.4 秒を切り、14 秒に揃える。音は無し
  execFileSync(ffmpeg as string, ["-y", "-ss", "0.4", "-t", "14", "-i", join(tmp, webm), "-vf", "fps=30,scale=1080:1920", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20", "-movflags", "+faststart", join(OUT, reelOut)], { stdio: "inherit" });
  rmSync(tmp, { recursive: true, force: true });
  console.log(`動画 → ${join(OUT, reelOut)}`);
}
await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
