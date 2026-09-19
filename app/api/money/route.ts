import { NextResponse } from "next/server";
import { getMoneyFor } from "@/lib/rules";

// GET /api/money?region=13112 … 地域の階層の助成と、その市区町村の分娩施設（出産なびの費用つき）。個人情報は受け取らない。
export async function GET(request: Request) {
  const region = new URL(request.url).searchParams.get("region") ?? "";
  if (!/^\d{5}$/.test(region)) return NextResponse.json({ error: "region は5桁のコード" }, { status: 400 });
  return NextResponse.json(await getMoneyFor(region));
}
