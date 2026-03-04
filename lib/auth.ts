import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_TTL_MS = 5 * 60 * 1000;

function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function isSignatureValid(expectedHex: string, actualHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");

  if (expected.length === 0 || actual.length === 0 || expected.length !== actual.length) {
    return false;
  }

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

  const timestamp = Number(timestampHeader);
  if (!Number.isInteger(timestamp)) {
    return null;
  }

  const ageMs = Math.abs(Date.now() - timestamp);
  if (ageMs > SIGNATURE_TTL_MS) {
    return null;
  }

  const payload = `${normalized}.${timestamp}`;
  const expectedSignature = signPayload(authSecret, payload);
  if (!isSignatureValid(expectedSignature, signatureHeader)) {
    return null;
  }

  return normalized;
}
