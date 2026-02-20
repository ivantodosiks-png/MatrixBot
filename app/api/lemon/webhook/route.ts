import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: { message: "Webhook route is disabled" } },
    { status: 410 }
  );
}
