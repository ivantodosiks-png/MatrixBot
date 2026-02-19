import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { recordChatMetric } from "@/lib/user-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      responseMs?: number;
      success?: boolean;
    };

    const responseMs = Number(body?.responseMs);
    const success = Boolean(body?.success);

    if (!Number.isFinite(responseMs) || responseMs < 0) {
      return NextResponse.json(
        { error: { message: "responseMs must be a non-negative number" } },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;

    await recordChatMetric({
      userId,
      responseMs,
      success,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "metrics save failed";
    return NextResponse.json(
      { error: { message } },
      { status: 500 }
    );
  }
}
