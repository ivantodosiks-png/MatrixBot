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
      "42P01",
      "3D000",
    ].includes(code)
  ) {
    return true;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("failed to connect") ||
    message.includes("database_url is not set") ||
    message.includes('relation "users" does not exist')
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

export async function findUserByEmail(emailInput: string): Promise<UserRecord | null> {
  const email = normalizeEmail(emailInput);
  if (!email) return null;

  try {
    const result = await dbQuery<UserRecord>(
      `
      SELECT id, name, email, password_hash, created_at
      FROM users
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );
    return result.rows[0] ?? null;
  } catch (error) {
    if (!isDbUnavailableError(error)) {
      throw error;
    }
  }

  const fallbackUsers = await readFallbackUsers();
  return fallbackUsers.find((user) => normalizeEmail(user.email) === email) ?? null;
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (!name || !email) {
    throw new Error("name and email are required");
  }

  try {
    const result = await dbQuery<UserRecord>(
      `
      INSERT INTO users (name, email, password_hash)
      VALUES ($1, $2, $3)
      RETURNING id, name, email, password_hash, created_at
      `,
      [name, email, input.passwordHash]
    );
    return result.rows[0];
  } catch (error: unknown) {
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
