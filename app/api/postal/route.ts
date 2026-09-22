import { NextResponse } from "next/server";
import { getPostalTable } from "@/lib/postal";

// GET /api/postal?region=13103 … その区の郵便番号 → おおよその位置の表。
// 郵便番号そのものはサーバーに送らない（端末の中で照合する。設計原則5）。
export async function GET(request: Request) {
  const region = new URL(request.url).searchParams.get("region") ?? "";
  if (!/^\d{5}$/.test(region)) return NextResponse.json({ error: "region は5桁のコード" }, { status: 400 });
  const table = getPostalTable(region);
  return NextResponse.json(table, { headers: { "cache-control": "public, max-age=86400, s-maxage=604800" } });
}
