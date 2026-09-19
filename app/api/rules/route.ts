import { NextResponse } from "next/server";
import { getRulesFor } from "@/lib/rules";

// GET /api/rules?region=13112 … その市区町村に適用される regions / documents / steps。個人情報は受け取らない。
export async function GET(request: Request) {
  const region = new URL(request.url).searchParams.get("region") ?? "";
  if (!/^\d{5}$/.test(region)) return NextResponse.json({ error: "region は5桁のコード" }, { status: 400 });
  return NextResponse.json(await getRulesFor(region));
}
