import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type InsertedUser = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };

    const name = String(body?.name ?? "").trim();
    const email = normalizeEmail(String(body?.email ?? ""));
    const password = String(body?.password ?? "");

    if (!name || !email || !password) {
      return NextResponse.json(
        { ok: false, error: "name, email and password are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "invalid email format" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    const result = await dbQuery<InsertedUser>(
      `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, created_at
      `,
      [name, email, passwordHash]
    );

    return NextResponse.json(
      {
        ok: true,
        user: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      return NextResponse.json(
        { ok: false, error: "email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "registration failed" },
      { status: 500 }
    );
  }
}

