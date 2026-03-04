import { NextRequest, NextResponse } from "next/server";

import { getRequestUserId } from "../../../lib/auth";
import { parseCreateStoryInput } from "../../../lib/story-contract";
import { storyStore } from "../../../lib/story-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({ stories: storyStore.list(userId) }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = parseCreateStoryInput(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const story = storyStore.create(userId, parsed.data);
  return NextResponse.json({ story }, { status: 201 });
}
