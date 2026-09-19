import { NextResponse } from "next/server";
import master from "@/data/reference/municipalities.json";

// GET /api/municipalities?pref=13 … 都道府県内の市区町村（総務省の全国地方公共団体コード）
export async function GET(request: Request) {
  const pref = new URL(request.url).searchParams.get("pref");
  const found = master.prefectures.find((p) => p.code === pref);
  if (!found) return NextResponse.json({ error: "pref は2桁のコード" }, { status: 400 });
  return NextResponse.json(found.municipalities);
}
