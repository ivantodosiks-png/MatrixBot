import { Pool } from "pg";

declare global {
  var __matrixPool: Pool | undefined;
  var __matrixPoolPromise: Promise<Pool> | undefined;
}

type DbCandidate = {
  key: string;
  connectionString: string;
};

function normalizeConnectionString(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length > 1) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function getConnectionCandidates(): DbCandidate[] {
  const keys = [
    "DATABASE_URL",
    "DATABASE_URL_UNPOOLED",
    "POSTGRES_URL",
    "POSTGRES_URL_NON_POOLING",
    "POSTGRES_PRISMA_URL",
  ] as const;

  const seen = new Set<string>();
  const candidates: DbCandidate[] = [];

  for (const key of keys) {
    const raw = process.env[key];
    if (!raw) continue;
    const connectionString = normalizeConnectionString(raw);
    if (!connectionString || seen.has(connectionString)) continue;
    seen.add(connectionString);
    candidates.push({ key, connectionString });
  }

  return candidates;
}

function createPoolForUrl(connectionString: string) {
  const isLocal =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1");

  return new Pool({
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
}

async function closePoolIfSupported(pool: Pool) {
  const maybeEnd = (pool as unknown as { end?: () => Promise<void> | void }).end;
  if (typeof maybeEnd === "function") {
    await maybeEnd.call(pool);
  }
}

async function createPool() {
  const candidates = getConnectionCandidates();
  if (candidates.length === 0) {
    throw new Error("No database connection string found in env");
  }

  let firstConnectedPool: Pool | null = null;
  let firstConnectedKey = "";
  const errors: string[] = [];

  for (const candidate of candidates) {
    const pool = createPoolForUrl(candidate.connectionString);
    try {
      const probe = await pool.query<{
        current_database: string;
        users_table: string | null;
      }>(
        `
        SELECT
          current_database() AS current_database,
          to_regclass('public.users') AS users_table
        `
      );
      const usersTable = probe.rows[0]?.users_table ?? null;
      if (usersTable) {
        return pool;
      }
      if (!firstConnectedPool) {
        firstConnectedPool = pool;
        firstConnectedKey = candidate.key;
      } else {
        await closePoolIfSupported(pool);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "unknown connection error";
      errors.push(`${candidate.key}: ${message}`);
      await closePoolIfSupported(pool).catch(() => {});
    }
  }

  if (firstConnectedPool) {
    console.warn(
      `[db] Connected via ${firstConnectedKey}, but public.users was not found.`
    );
    return firstConnectedPool;
  }

  throw new Error(
    `Unable to connect to database using configured env vars: ${errors.join(" | ")}`
  );
}

async function getPool() {
  if (!global.__matrixPool) {
    if (!global.__matrixPoolPromise) {
      global.__matrixPoolPromise = createPool();
    }
    global.__matrixPool = await global.__matrixPoolPromise;
  }
  return global.__matrixPool;
}

export async function dbQuery<T = unknown>(
  text: string,
  params: unknown[] = []
) {
  const pool = await getPool();
  const result = await pool.query<T>(text, params);
  return result;
}
