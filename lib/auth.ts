import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_TTL_MS = 5 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 30 * 1000;
const HMAC_SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/i;

function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function isHexSignature(signature: string): boolean {
  return HMAC_SHA256_HEX_PATTERN.test(signature);
}

function isSignatureValid(expectedHex: string, actualHex: string): boolean {
  if (expectedHex.length !== actualHex.length) {
    return false;
  }

  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");
  return timingSafeEqual(expected, actual);
}

export function getRequestUserId(request: NextRequest): string | null {
  const authSecret = process.env.AUTH_SHARED_SECRET;
  if (!authSecret) {
    return null;
  }

  const userId = request.headers.get("x-user-id");
  const timestampHeader = request.headers.get("x-auth-timestamp");
  const signatureHeader = request.headers.get("x-auth-signature");
  if (!userId || !timestampHeader || !signatureHeader) {
    return null;
  }

  const normalized = userId.trim();
  if (normalized.length === 0) {
    return null;
  }

  const normalizedTimestamp = timestampHeader.trim();
  if (!/^\d+$/.test(normalizedTimestamp)) {
    return null;
  }

  const timestamp = Number(normalizedTimestamp);
  if (!Number.isSafeInteger(timestamp)) {
    return null;
  }

  const normalizedSignature = signatureHeader.trim();
  if (!isHexSignature(normalizedSignature)) {
    return null;
  }

  const now = Date.now();
  const ageMs = now - timestamp;
  if (ageMs > SIGNATURE_TTL_MS) {
    return null;
  }
  if (timestamp - now > MAX_FUTURE_SKEW_MS) {
    return null;
  }

  const payload = `${normalized}.${normalizedTimestamp}`;
  const expectedSignature = signPayload(authSecret, payload);
  if (!isSignatureValid(expectedSignature, normalizedSignature.toLowerCase())) {
    return null;
  }

  return normalized;
}
