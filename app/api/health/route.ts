import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "AgroLynk",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
