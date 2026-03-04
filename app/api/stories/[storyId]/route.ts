import { NextRequest, NextResponse } from "next/server";

import { getRequestUserId } from "../../../../lib/auth";
import { storyStore } from "../../../../lib/story-store";

export const dynamic = "force-dynamic";

function getStoryId(params: { storyId?: string }): string | null {
  if (!params.storyId) {
    return null;
  }

  const storyId = params.storyId.trim();
  return storyId.length > 0 ? storyId : null;
}

export async function GET(request: NextRequest, context: { params: { storyId?: string } }) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const storyId = getStoryId(context.params);
  if (!storyId) {
    return NextResponse.json({ error: "storyId is required." }, { status: 400 });
  }

  const story = storyStore.get(userId, storyId);
  if (!story) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  return NextResponse.json({ story }, { status: 200 });
}

export async function DELETE(request: NextRequest, context: { params: { storyId?: string } }) {
  const userId = getRequestUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const storyId = getStoryId(context.params);
  if (!storyId) {
    return NextResponse.json({ error: "storyId is required." }, { status: 400 });
  }

  const deleted = storyStore.delete(userId, storyId);
  if (!deleted) {
    return NextResponse.json({ error: "Story not found." }, { status: 404 });
  }

  return NextResponse.json({ deleted: true }, { status: 200 });
}
