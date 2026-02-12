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

const FALLBACK_USERS_FILE = path.join(
  process.cwd(),
  ".data",
  "users.local.json"
);

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createEmailExistsError() {
  const error = new Error("email already exists") as Error & { code?: string };
  error.code = "23505";
  return error;
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
  try {
    const raw = await readFile(FALLBACK_USERS_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as UserRecord[];
  } catch {
    return [];
  }
}

async function writeFallbackUsers(users: UserRecord[]) {
  const folder = path.dirname(FALLBACK_USERS_FILE);
  await mkdir(folder, { recursive: true });
  const tmpFile = `${FALLBACK_USERS_FILE}.tmp`;
  await writeFile(tmpFile, JSON.stringify(users, null, 2), "utf8");
  await rename(tmpFile, FALLBACK_USERS_FILE);
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
