// pnpm notify:run          … 送らずに、今週送るはずのメールを表示する（宛先は伏せ字）
// pnpm notify:run --date=2026-10-01 … その日に実行したら何を送るかを見る（送らない）
// pnpm notify:run --send   … 実際に送る（本番では Vercel の cron が毎週月曜 9:00 JST に同じ処理を呼ぶ）

import { runNotifyJob } from "../lib/notify/server";

const send = process.argv.includes("--send");
// --date=2026-10-01 … その日に実行したら何を送るかを見る（送らない確認のときだけ使える）
const date = process.argv.find((a) => a.startsWith("--date="))?.slice(7);
if (date && send) {
  console.error("--date は --send と一緒には使えません。");
  process.exit(1);
}

runNotifyJob({ dryRun: !send, ...(date ? { now: new Date(`${date}T00:00:00Z`) } : {}) })
  .then((summary) => {
    const { preview, ...counts } = summary;
    console.log(counts);
    for (const m of preview ?? []) console.log(`\n=== to: ${m.to}\n件名: ${m.subject}\n\n${m.text}`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
