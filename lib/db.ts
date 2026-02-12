import { Pool } from "pg";

declare global {
  var __matrixPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const isLocal =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1");

  return new Pool({
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
  });
}

function getPool() {
  if (!global.__matrixPool) {
    global.__matrixPool = createPool();
  }
  return global.__matrixPool;
}

export async function dbQuery<T = unknown>(
  text: string,
  params: unknown[] = []
) {
  const result = await getPool().query<T>(text, params);
  return result;
}
