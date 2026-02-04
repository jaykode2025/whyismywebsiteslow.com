import { createHash, randomBytes } from "node:crypto";

export function generateId(length = 6) {
  return randomBytes(8).toString("base64url").slice(0, length);
}

export function generateToken() {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

