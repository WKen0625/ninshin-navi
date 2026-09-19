import { NextResponse } from "next/server";
import { isSupported } from "@/lib/surveys";
import { loadSurveys } from "@/lib/surveys-server";

// GET /api/surveys … 完了チェック直後の「任意の1問」の定義（data/surveys.yaml）。段階1で扱うものだけ。
export async function GET() {
  return NextResponse.json(loadSurveys().filter(isSupported));
}
