import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

export const runtime = "nodejs";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

type UserRow = {
  id: string;
  name: string | null;
  email: string;
  password_hash: string;
  created_at: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = normalizeEmail(String(body?.email ?? ""));
    const password = String(body?.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "email and password are required" },
        { status: 400 }
      );
    }

    const result = await dbQuery<UserRow>(
      `
      SELECT id, name, email, password_hash, created_at
      FROM users
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "invalid email or password" },
        { status: 401 }
      );
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "invalid email or password" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "login failed" },
      { status: 500 }
    );
  }
}

