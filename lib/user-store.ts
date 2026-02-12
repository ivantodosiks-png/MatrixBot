import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { dbQuery } from "@/lib/db";

export type UserRecord = {
  id: string;
  name: string | null;
  email: string;
  password_hash: string;
  created_at: string;
};

type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
};

declare global {
  // In-memory emergency fallback for readonly/serverless filesystems.
  var __matrixLocalUsers: UserRecord[] | undefined;
}

function isLocalFallbackEnabled() {
  const explicit = String(process.env.MATRIX_ALLOW_LOCAL_USER_FALLBACK ?? "")
    .trim()
    .toLowerCase();
  if (["1", "true", "yes", "on"].includes(explicit)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(explicit)) {
    return false;
  }

  // Safe default: enable fallback only in local dev.
  return process.env.NODE_ENV !== "production" && !process.env.VERCEL;
}

function getFallbackUsersFile() {
  const explicitPath = process.env.MATRIX_USER_STORE_FILE;
  if (explicitPath) return explicitPath;

  if (process.env.VERCEL) {
    return path.join("/tmp", "matrix-ui", "users.local.json");
  }

  return path.join(process.cwd(), ".data", "users.local.json");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createEmailExistsError() {
  const error = new Error("email already exists") as Error & { code?: string };
  error.code = "23505";
  return error;
}

function createDbUnavailableError() {
  const error = new Error("database is unavailable") as Error & {
    code?: string;
  };
  error.code = "MATRIX_DB_UNAVAILABLE";
  return error;
}

function isUsersTableMissingError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: string }).code;
  if (code === "42P01") return true;
  const message = error.message.toLowerCase();
  return (
    message.includes('relation "users" does not exist') ||
    message.includes('relation "public.users" does not exist')
  );
}

function isReadonlyFsError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: string }).code;
  return Boolean(code && ["EROFS", "EPERM", "EACCES", "ENOENT"].includes(code));
}

function isDbUnavailableError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: string }).code;
  if (
    code &&
    [
      "ETIMEDOUT",
      "ECONNREFUSED",
      "ENOTFOUND",
      "EHOSTUNREACH",
    ].includes(code)
  ) {
    return true;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("failed to connect") ||
    message.includes("database_url is not set")
  );
}

async function readFallbackUsers(): Promise<UserRecord[]> {
  const fallbackUsersFile = getFallbackUsersFile();
  try {
    const raw = await readFile(fallbackUsersFile, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as UserRecord[];
  } catch (error) {
    if (isReadonlyFsError(error)) {
      return global.__matrixLocalUsers ?? [];
    }
    return [];
  }
}

async function writeFallbackUsers(users: UserRecord[]) {
  const fallbackUsersFile = getFallbackUsersFile();
  const folder = path.dirname(fallbackUsersFile);
  try {
    await mkdir(folder, { recursive: true });
    const tmpFile = `${fallbackUsersFile}.tmp`;
    await writeFile(tmpFile, JSON.stringify(users, null, 2), "utf8");
    await rename(tmpFile, fallbackUsersFile);
  } catch (error) {
    if (!isReadonlyFsError(error)) {
      throw error;
    }
    global.__matrixLocalUsers = [...users];
  }
}

async function ensureUsersTableExists() {
  await dbQuery(
    `
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    `
  );
  await dbQuery(
    `
    CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email)
    `
  );
}

export async function findUserByEmail(emailInput: string): Promise<UserRecord | null> {
  const email = normalizeEmail(emailInput);
  if (!email) return null;

  const selectUser = async () =>
    dbQuery<UserRecord>(
      `
      SELECT id, name, email, password_hash, created_at
      FROM public.users
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

  try {
    const result = await selectUser();
    return result.rows[0] ?? null;
  } catch (error) {
    if (isUsersTableMissingError(error)) {
      await ensureUsersTableExists();
      const result = await selectUser();
      return result.rows[0] ?? null;
    }
    if (!isDbUnavailableError(error)) {
      throw error;
    }
    if (!isLocalFallbackEnabled()) {
      throw createDbUnavailableError();
    }
  }

  const fallbackUsers = await readFallbackUsers();
  return fallbackUsers.find((user) => normalizeEmail(user.email) === email) ?? null;
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const id = crypto.randomUUID();
  if (!name || !email) {
    throw new Error("name and email are required");
  }

  const insertUser = async (userId: string) =>
    dbQuery<UserRecord>(
      `
      INSERT INTO public.users (id, name, email, password_hash)
      VALUES ($1, $2, $3, $4)
      RETURNING id, name, email, password_hash, created_at
      `,
      [userId, name, email, input.passwordHash]
    );

  try {
    const result = await insertUser(id);
    return result.rows[0];
  } catch (error: unknown) {
    if (isUsersTableMissingError(error)) {
      await ensureUsersTableExists();
      const result = await insertUser(id);
      return result.rows[0];
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23505"
    ) {
      throw error;
    }
    if (!isDbUnavailableError(error)) {
      throw error;
    }
    if (!isLocalFallbackEnabled()) {
      throw createDbUnavailableError();
    }
  }

  const users = await readFallbackUsers();
  if (users.some((user) => normalizeEmail(user.email) === email)) {
    throw createEmailExistsError();
  }

  const createdAt = new Date().toISOString();
  const user: UserRecord = {
    id: crypto.randomUUID(),
    name,
    email,
    password_hash: input.passwordHash,
    created_at: createdAt,
  };

  users.push(user);
  await writeFallbackUsers(users);
  return user;
}
