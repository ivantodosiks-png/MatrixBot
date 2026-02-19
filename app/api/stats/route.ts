import { NextResponse } from "next/server";
import { getPublicStats } from "@/lib/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getPublicStats(120);
    return NextResponse.json(stats);
  } catch (error) {
    const message = error instanceof Error ? error.message : "stats fetch failed";
    return NextResponse.json(
      {
        usersCount: 0,
        successfulChatsCount: 0,
        responsesPerSecond: 0,
        error: message,
      },
      { status: 500 }
    );
  }
}
