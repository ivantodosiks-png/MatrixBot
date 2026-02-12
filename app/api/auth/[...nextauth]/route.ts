import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

if (!process.env.NEXTAUTH_URL) {
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (host) {
    const normalizedHost = host.startsWith("http") ? host : `https://${host}`;
    process.env.NEXTAUTH_URL = normalizedHost;
  }
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
