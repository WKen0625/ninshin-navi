import { NextResponse } from "next/server";
import { getStations } from "@/lib/stations";

// GET /api/stations … 東京23区のあたりの駅の位置表（施設ごとの「最寄り駅の目安」を端末の中で計算するため）
export async function GET() {
  return NextResponse.json(getStations(), { headers: { "cache-control": "public, max-age=86400, s-maxage=604800" } });
}
