import bcrypt from "bcrypt";
import crypto from "crypto";

const PBKDF2_KEY_LEN = 64;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

function verifyPbkdf2Password(password: string, storedHash: string) {
  const [iterationsRaw, digest, salt, hashHex] = storedHash.split(":");
  const iterations = Number(iterationsRaw);
  if (!iterations || !digest || !salt || !hashHex) return false;

  const derived = crypto
    .pbkdf2Sync(password, salt, iterations, PBKDF2_KEY_LEN, digest)
    .toString("hex");

  const left = Buffer.from(hashHex, "hex");
  const right = Buffer.from(derived, "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export async function verifyPassword(password: string, storedHash: string) {
  if (!storedHash) return false;
  if (storedHash.startsWith("$2a$") || storedHash.startsWith("$2b$")) {
    return bcrypt.compare(password, storedHash);
  }
  return verifyPbkdf2Password(password, storedHash);
}

