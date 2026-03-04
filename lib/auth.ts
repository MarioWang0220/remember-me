import { NextRequest } from "next/server";

export function getRequestUserId(request: NextRequest): string | null {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return null;
  }

  const normalized = userId.trim();
  return normalized.length > 0 ? normalized : null;
}
