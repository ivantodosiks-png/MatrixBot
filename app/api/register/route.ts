import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/password";
import { createUser } from "@/lib/user-store";

export const runtime = "nodejs";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

    const user = await createUser({ name, email, passwordHash });

    return NextResponse.json(
      {
        ok: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          created_at: user.created_at,
        },
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
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "MATRIX_DB_UNAVAILABLE"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "registration service is temporarily unavailable (database connection issue)",
        },
        { status: 503 }
      );
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "42P01"
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: 'database setup error: relation "users" does not exist',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: false, error: "registration failed" },
      { status: 500 }
    );
  }
}
