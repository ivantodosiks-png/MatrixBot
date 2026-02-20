import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: { message: "Legacy portal route is disabled" } },
    { status: 410 }
  );
}
