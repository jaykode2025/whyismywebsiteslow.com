import { createHash, randomBytes } from "node:crypto";

export function generateId(length = 12) {
  return randomBytes(12).toString("base64url").slice(0, length);
}

export function generateToken() {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateExpiringToken(expiresInHours: number = 24) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  return {
    token,
    expiresAt: expiresAt.toISOString(),
    isValid: () => new Date() < expiresAt
  };
}

