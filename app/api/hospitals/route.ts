import { NextResponse } from "next/server";
import { getHospitalsFor } from "@/lib/rules";

// GET /api/hospitals?region=13112 … その市区町村の分娩施設と、記録の集計。個人情報は受け取らない。
export async function GET(request: Request) {
  const region = new URL(request.url).searchParams.get("region") ?? "";
  if (!/^\d{5}$/.test(region)) return NextResponse.json({ error: "region は5桁のコード" }, { status: 400 });
  return NextResponse.json(await getHospitalsFor(region));
}
