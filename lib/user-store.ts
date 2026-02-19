import crypto from "node:crypto";
import { dbQuery } from "@/lib/db";

export type UserPlan = "FREE" | "PRO" | "ULTRA";
export type UserSubscriptionStatus = "NONE" | "ACTIVE" | "PAST_DUE" | "CANCELED";

export const FREE_DAILY_LIMIT = Number.MAX_SAFE_INTEGER;
export const PRO_MONTHLY_LIMIT = Number.MAX_SAFE_INTEGER;

export type UserRecord = {
  id: string;
  name: string | null;
  email: string;
  password_hash: string;
  created_at: string;
  plan: UserPlan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: UserSubscriptionStatus;
  current_period_end: string | null;
  daily_message_count: number;
  daily_reset_at: string;
  monthly_message_count: number;
  month_reset_at: string;
};

type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
};

type UsageSnapshot = {
  plan: UserPlan;
  dailyMessageCount: number;
  dailyResetAt: Date;
  monthlyMessageCount: number;
  monthResetAt: Date;
};

type ChatAccessResult = {
  allowed: boolean;
  plan: UserPlan;
  reason?: string;
};

type MetricInput = {
  userId?: string | null;
  responseMs: number;
  success: boolean;
};

type StripeSubscriptionUpdate = {
  plan: UserPlan;
  subscriptionStatus: UserSubscriptionStatus;
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: Date | null;
};

declare global {
  var __matrixSchemaReadyPromise: Promise<void> | undefined;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createDbUnavailableError() {
  const error = new Error("database is unavailable") as Error & {
    code?: string;
  };
  error.code = "MATRIX_DB_UNAVAILABLE";
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
      "57P03",
      "53300",
    ].includes(code)
  ) {
    return true;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("failed to connect") ||
    message.includes("no database connection string found")
  );
}

function toUserPlan(input: unknown): UserPlan {
  if (input === "PRO" || input === "ULTRA" || input === "FREE") {
    return input;
  }
  return "FREE";
}

function toSubscriptionStatus(input: unknown): UserSubscriptionStatus {
  if (
    input === "ACTIVE" ||
    input === "PAST_DUE" ||
    input === "CANCELED" ||
    input === "NONE"
  ) {
    return input;
  }
  return "NONE";
}

function nextUtcDayBoundary(base = new Date()) {
  const next = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() + 1, 0, 0, 0, 0));
  return next;
}

function nextUtcMonthBoundary(base = new Date()) {
  const next = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return next;
}

function ensureDate(value: unknown, fallback: Date) {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }
  const parsed = new Date(String(value));
  if (Number.isFinite(parsed.getTime())) {
    return parsed;
  }
  return fallback;
}

function clampResponseMs(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.round(value), 60_000));
}

const userColumns = `
  id,
  name,
  email,
  password_hash,
  created_at,
  plan,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_status,
  current_period_end,
  daily_message_count,
  daily_reset_at,
  monthly_message_count,
  month_reset_at
`;

async function runSchemaMigrations() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      plan TEXT NOT NULL DEFAULT 'FREE',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      subscription_status TEXT NOT NULL DEFAULT 'NONE',
      current_period_end TIMESTAMPTZ,
      daily_message_count INTEGER NOT NULL DEFAULT 0,
      daily_reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      monthly_message_count INTEGER NOT NULL DEFAULT 0,
      month_reset_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await dbQuery(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan TEXT`);
  await dbQuery(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT`);
  await dbQuery(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT`);
  await dbQuery(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_status TEXT`);
  await dbQuery(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ`);
  await dbQuery(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS daily_message_count INTEGER`);
  await dbQuery(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS daily_reset_at TIMESTAMPTZ`);
  await dbQuery(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS monthly_message_count INTEGER`);
  await dbQuery(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS month_reset_at TIMESTAMPTZ`);

  await dbQuery(`UPDATE public.users SET plan = 'FREE' WHERE plan IS NULL`);
  await dbQuery(`UPDATE public.users SET subscription_status = 'NONE' WHERE subscription_status IS NULL`);
  await dbQuery(`UPDATE public.users SET daily_message_count = 0 WHERE daily_message_count IS NULL`);
  await dbQuery(`UPDATE public.users SET monthly_message_count = 0 WHERE monthly_message_count IS NULL`);
  await dbQuery(`UPDATE public.users SET daily_reset_at = now() WHERE daily_reset_at IS NULL`);
  await dbQuery(`UPDATE public.users SET month_reset_at = now() WHERE month_reset_at IS NULL`);

  await dbQuery(`ALTER TABLE public.users ALTER COLUMN plan SET DEFAULT 'FREE'`);
  await dbQuery(`ALTER TABLE public.users ALTER COLUMN plan SET NOT NULL`);
  await dbQuery(`ALTER TABLE public.users ALTER COLUMN subscription_status SET DEFAULT 'NONE'`);
  await dbQuery(`ALTER TABLE public.users ALTER COLUMN subscription_status SET NOT NULL`);
  await dbQuery(`ALTER TABLE public.users ALTER COLUMN daily_message_count SET DEFAULT 0`);
  await dbQuery(`ALTER TABLE public.users ALTER COLUMN daily_message_count SET NOT NULL`);
  await dbQuery(`ALTER TABLE public.users ALTER COLUMN monthly_message_count SET DEFAULT 0`);
  await dbQuery(`ALTER TABLE public.users ALTER COLUMN monthly_message_count SET NOT NULL`);
  await dbQuery(`ALTER TABLE public.users ALTER COLUMN daily_reset_at SET DEFAULT now()`);
  await dbQuery(`ALTER TABLE public.users ALTER COLUMN daily_reset_at SET NOT NULL`);
  await dbQuery(`ALTER TABLE public.users ALTER COLUMN month_reset_at SET DEFAULT now()`);
  await dbQuery(`ALTER TABLE public.users ALTER COLUMN month_reset_at SET NOT NULL`);

  await dbQuery(`CREATE INDEX IF NOT EXISTS users_email_idx ON public.users (email)`);
  await dbQuery(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_id_uidx
    ON public.users (stripe_customer_id)
    WHERE stripe_customer_id IS NOT NULL
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS public.chat_metrics (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
      response_ms INTEGER NOT NULL,
      success BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await dbQuery(`CREATE INDEX IF NOT EXISTS chat_metrics_created_at_idx ON public.chat_metrics (created_at DESC)`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS chat_metrics_success_idx ON public.chat_metrics (success)`);
  await dbQuery(`CREATE INDEX IF NOT EXISTS chat_metrics_user_idx ON public.chat_metrics (user_id)`);
}

async function ensureSchemaReady() {
  if (!global.__matrixSchemaReadyPromise) {
    global.__matrixSchemaReadyPromise = runSchemaMigrations();
  }

  try {
    await global.__matrixSchemaReadyPromise;
  } catch (error) {
    global.__matrixSchemaReadyPromise = undefined;
    throw error;
  }
}

async function withSchema<T>(task: () => Promise<T>): Promise<T> {
  try {
    await ensureSchemaReady();
    return await task();
  } catch (error) {
    if (isDbUnavailableError(error)) {
      throw createDbUnavailableError();
    }
    throw error;
  }
}

function normalizeUsageFromUser(user: UserRecord) {
  const now = new Date();
  const nextDaily = ensureDate(user.daily_reset_at, nextUtcDayBoundary(now));
  const nextMonth = ensureDate(user.month_reset_at, nextUtcMonthBoundary(now));

  const usage: UsageSnapshot = {
    plan: toUserPlan(user.plan),
    dailyMessageCount: Number.isFinite(user.daily_message_count)
      ? Number(user.daily_message_count)
      : 0,
    dailyResetAt: nextDaily,
    monthlyMessageCount: Number.isFinite(user.monthly_message_count)
      ? Number(user.monthly_message_count)
      : 0,
    monthResetAt: nextMonth,
  };

  if (now >= usage.dailyResetAt) {
    usage.dailyMessageCount = 0;
    usage.dailyResetAt = nextUtcDayBoundary(now);
  }

  if (now >= usage.monthResetAt) {
    usage.monthlyMessageCount = 0;
    usage.monthResetAt = nextUtcMonthBoundary(now);
  }

  return usage;
}

async function updateUsageSnapshot(userId: string, usage: UsageSnapshot) {
  await dbQuery(
    `
    UPDATE public.users
    SET
      daily_message_count = $2,
      daily_reset_at = $3,
      monthly_message_count = $4,
      month_reset_at = $5
    WHERE id = $1
    `,
    [
      userId,
      usage.dailyMessageCount,
      usage.dailyResetAt.toISOString(),
      usage.monthlyMessageCount,
      usage.monthResetAt.toISOString(),
    ]
  );
}

function getPlanLimitExceededMessage(plan: UserPlan, usage: UsageSnapshot) {
  void plan;
  void usage;
  // Unlimited messaging enabled for all plans.
  return null;
}

export async function findUserByEmail(emailInput: string): Promise<UserRecord | null> {
  const email = normalizeEmail(emailInput);
  if (!email) return null;

  return withSchema(async () => {
    const result = await dbQuery<UserRecord>(
      `
      SELECT ${userColumns}
      FROM public.users
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    const user = result.rows[0] ?? null;
    if (!user) return null;

    user.plan = toUserPlan(user.plan);
    user.subscription_status = toSubscriptionStatus(user.subscription_status);
    return user;
  });
}

export async function findUserById(userId: string): Promise<UserRecord | null> {
  if (!userId) return null;

  return withSchema(async () => {
    const result = await dbQuery<UserRecord>(
      `
      SELECT ${userColumns}
      FROM public.users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    const user = result.rows[0] ?? null;
    if (!user) return null;

    user.plan = toUserPlan(user.plan);
    user.subscription_status = toSubscriptionStatus(user.subscription_status);
    return user;
  });
}

export async function findUserByStripeCustomerId(
  stripeCustomerId: string
): Promise<UserRecord | null> {
  if (!stripeCustomerId) return null;

  return withSchema(async () => {
    const result = await dbQuery<UserRecord>(
      `
      SELECT ${userColumns}
      FROM public.users
      WHERE stripe_customer_id = $1
      LIMIT 1
      `,
      [stripeCustomerId]
    );

    const user = result.rows[0] ?? null;
    if (!user) return null;

    user.plan = toUserPlan(user.plan);
    user.subscription_status = toSubscriptionStatus(user.subscription_status);
    return user;
  });
}

export async function createUser(input: CreateUserInput): Promise<UserRecord> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (!name || !email) {
    throw new Error("name and email are required");
  }

  return withSchema(async () => {
    const id = crypto.randomUUID();
    const now = new Date();
    const result = await dbQuery<UserRecord>(
      `
      INSERT INTO public.users (
        id,
        name,
        email,
        password_hash,
        plan,
        subscription_status,
        daily_message_count,
        daily_reset_at,
        monthly_message_count,
        month_reset_at
      )
      VALUES ($1, $2, $3, $4, 'FREE', 'NONE', 0, $5, 0, $6)
      RETURNING ${userColumns}
      `,
      [id, name, email, input.passwordHash, nextUtcDayBoundary(now).toISOString(), nextUtcMonthBoundary(now).toISOString()]
    );

    const user = result.rows[0];
    user.plan = toUserPlan(user.plan);
    user.subscription_status = toSubscriptionStatus(user.subscription_status);
    return user;
  });
}

export async function setStripeCustomerIdForUser(userId: string, stripeCustomerId: string) {
  if (!userId || !stripeCustomerId) return;

  await withSchema(async () => {
    await dbQuery(
      `
      UPDATE public.users
      SET stripe_customer_id = $2
      WHERE id = $1
      `,
      [userId, stripeCustomerId]
    );
  });
}

export async function applyFreePlanForUser(userId: string) {
  if (!userId) return;

  await withSchema(async () => {
    const now = new Date();
    await dbQuery(
      `
      UPDATE public.users
      SET
        plan = 'FREE',
        subscription_status = 'NONE',
        stripe_subscription_id = NULL,
        current_period_end = NULL,
        daily_message_count = 0,
        monthly_message_count = 0,
        daily_reset_at = $2,
        month_reset_at = $3
      WHERE id = $1
      `,
      [userId, nextUtcDayBoundary(now).toISOString(), nextUtcMonthBoundary(now).toISOString()]
    );
  });
}

export async function updateUserSubscriptionByStripeCustomer(
  stripeCustomerId: string,
  update: StripeSubscriptionUpdate
) {
  if (!stripeCustomerId) return;

  await withSchema(async () => {
    await dbQuery(
      `
      UPDATE public.users
      SET
        plan = $2,
        subscription_status = $3,
        stripe_subscription_id = $4,
        current_period_end = $5
      WHERE stripe_customer_id = $1
      `,
      [
        stripeCustomerId,
        update.plan,
        update.subscriptionStatus,
        update.stripeSubscriptionId ?? null,
        update.currentPeriodEnd ? update.currentPeriodEnd.toISOString() : null,
      ]
    );
  });
}

export async function updateUserSubscriptionByUserId(
  userId: string,
  update: StripeSubscriptionUpdate & { stripeCustomerId?: string | null }
) {
  if (!userId) return;

  await withSchema(async () => {
    await dbQuery(
      `
      UPDATE public.users
      SET
        plan = $2,
        subscription_status = $3,
        stripe_subscription_id = $4,
        current_period_end = $5,
        stripe_customer_id = COALESCE($6, stripe_customer_id)
      WHERE id = $1
      `,
      [
        userId,
        update.plan,
        update.subscriptionStatus,
        update.stripeSubscriptionId ?? null,
        update.currentPeriodEnd ? update.currentPeriodEnd.toISOString() : null,
        update.stripeCustomerId ?? null,
      ]
    );
  });
}

export async function canUserSendChatMessage(userId: string): Promise<ChatAccessResult> {
  const user = await findUserById(userId);
  if (!user) {
    return {
      allowed: false,
      plan: "FREE",
      reason: "Authentication required",
    };
  }

  const usage = normalizeUsageFromUser(user);
  const persistedDailyReset = ensureDate(user.daily_reset_at, usage.dailyResetAt);
  const persistedMonthlyReset = ensureDate(user.month_reset_at, usage.monthResetAt);
  const usageChanged =
    usage.dailyMessageCount !== user.daily_message_count ||
    usage.monthlyMessageCount !== user.monthly_message_count ||
    usage.dailyResetAt.toISOString() !== persistedDailyReset.toISOString() ||
    usage.monthResetAt.toISOString() !== persistedMonthlyReset.toISOString();

  if (usageChanged) {
    await updateUsageSnapshot(user.id, usage);
  }

  const reason = getPlanLimitExceededMessage(usage.plan, usage);
  if (reason) {
    return {
      allowed: false,
      plan: usage.plan,
      reason,
    };
  }

  return {
    allowed: true,
    plan: usage.plan,
  };
}

export async function incrementUsageAfterSuccessfulChat(userId: string) {
  const user = await findUserById(userId);
  if (!user) {
    return {
      ok: false,
      reason: "Authentication required",
    };
  }

  const usage = normalizeUsageFromUser(user);
  const limitReason = getPlanLimitExceededMessage(usage.plan, usage);
  if (limitReason) {
    await updateUsageSnapshot(user.id, usage);
    return { ok: false, reason: limitReason };
  }

  if (usage.plan === "FREE") {
    usage.dailyMessageCount += 1;
  }
  if (usage.plan === "PRO") {
    usage.monthlyMessageCount += 1;
  }

  await updateUsageSnapshot(user.id, usage);

  return { ok: true };
}

export async function recordChatMetric(input: MetricInput) {
  await withSchema(async () => {
    await dbQuery(
      `
      INSERT INTO public.chat_metrics (id, user_id, response_ms, success)
      VALUES ($1, $2, $3, $4)
      `,
      [
        crypto.randomUUID(),
        input.userId ?? null,
        clampResponseMs(input.responseMs),
        Boolean(input.success),
      ]
    );
  });
}

export async function countUsers() {
  return withSchema(async () => {
    const result = await dbQuery<{ count: string }>(`SELECT COUNT(*)::text AS count FROM public.users`);
    return Number(result.rows[0]?.count ?? "0");
  });
}

export async function countSuccessfulChats() {
  return withSchema(async () => {
    const result = await dbQuery<{ count: string }>(`
      SELECT COUNT(*)::text AS count
      FROM public.chat_metrics
      WHERE success = true
    `);
    return Number(result.rows[0]?.count ?? "0");
  });
}

export async function getResponsesPerSecond(sampleSize = 120) {
  return withSchema(async () => {
    const safeSampleSize = Number.isFinite(sampleSize)
      ? Math.max(5, Math.min(Math.round(sampleSize), 1_000))
      : 120;

    const result = await dbQuery<{ avg_ms: string | null }>(
      `
      SELECT AVG(t.response_ms)::text AS avg_ms
      FROM (
        SELECT response_ms
        FROM public.chat_metrics
        WHERE success = true
        ORDER BY created_at DESC
        LIMIT $1
      ) AS t
      `,
      [safeSampleSize]
    );

    const avgMs = Number(result.rows[0]?.avg_ms ?? "0");
    if (!Number.isFinite(avgMs) || avgMs <= 0) {
      return 0;
    }

    return Number((1000 / avgMs).toFixed(2));
  });
}
