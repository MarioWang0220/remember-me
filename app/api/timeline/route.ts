import { NextRequest, NextResponse } from "next/server";

import { getRequestUserId } from "../../../lib/auth";
import { storyStore } from "../../../lib/story-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({ timeline: storyStore.getTimeline(userId) }, { status: 200 });
}
