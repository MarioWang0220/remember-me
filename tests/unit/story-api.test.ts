import { NextRequest } from "next/server";
import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";

import { DELETE as deleteStory, GET as getStory } from "../../app/api/stories/[storyId]/route";
import { GET as getStories, POST as createStory } from "../../app/api/stories/route";
import { GET as getTimeline } from "../../app/api/timeline/route";
import { resetStoryStoreForTest } from "../../lib/story-store";

interface RequestOptions {
  method: string;
  userId?: string;
  body?: unknown;
  tamperSignature?: boolean;
  malformedSignature?: boolean;
  timestampMs?: number;
}

const TEST_AUTH_SECRET = "unit-test-auth-secret";
const AUTH_SIGNATURE_TTL_MS = 5 * 60 * 1000;
const AUTH_MAX_FUTURE_SKEW_MS = 30 * 1000;

function buildSignature(userId: string, timestamp: string, secret: string): string {
  return createHmac("sha256", secret).update(`${userId}.${timestamp}`).digest("hex");
}

function buildRequest(url: string, options: RequestOptions): NextRequest {
  const headers = new Headers();
  if (options.userId) {
    const timestamp = (options.timestampMs ?? Date.now()).toString();
    const signature = buildSignature(options.userId, timestamp, TEST_AUTH_SECRET);
    let requestSignature = signature;
    if (options.tamperSignature) {
      requestSignature = `${signature}ff`;
    } else if (options.malformedSignature) {
      requestSignature = `${signature}zz`;
    }

    headers.set("x-user-id", options.userId);
    headers.set("x-auth-timestamp", timestamp);
    headers.set("x-auth-signature", requestSignature);
  }
  if (typeof options.body !== "undefined") {
    headers.set("content-type", "application/json");
  }

  return new NextRequest(url, {
    method: options.method,
    headers,
    body: typeof options.body === "undefined" ? undefined : JSON.stringify(options.body)
  });
}

describe("story api contracts", () => {
  beforeEach(() => {
    process.env.AUTH_SHARED_SECRET = TEST_AUTH_SECRET;
    resetStoryStoreForTest();
  });

  it("requires user identity for listing stories", async () => {
    const response = await getStories(buildRequest("http://localhost/api/stories", { method: "GET" }));
    expect(response.status).toBe(401);
  });

  it("rejects requests with invalid auth signature", async () => {
    const response = await getStories(
      buildRequest("http://localhost/api/stories", { method: "GET", userId: "owner-1", tamperSignature: true })
    );
    expect(response.status).toBe(401);
  });

  it("rejects requests with malformed auth signature encoding", async () => {
    const response = await getStories(
      buildRequest("http://localhost/api/stories", { method: "GET", userId: "owner-1", malformedSignature: true })
    );
    expect(response.status).toBe(401);
  });

  it("rejects requests with expired auth timestamp", async () => {
    const response = await getStories(
      buildRequest("http://localhost/api/stories", {
        method: "GET",
        userId: "owner-1",
        timestampMs: Date.now() - AUTH_SIGNATURE_TTL_MS - 1_000
      })
    );
    expect(response.status).toBe(401);
  });

  it("rejects requests with auth timestamp too far in the future", async () => {
    const response = await getStories(
      buildRequest("http://localhost/api/stories", {
        method: "GET",
        userId: "owner-1",
        timestampMs: Date.now() + AUTH_MAX_FUTURE_SKEW_MS + 1_000
      })
    );
    expect(response.status).toBe(401);
  });

  it("rejects requests when auth shared secret is missing", async () => {
    delete process.env.AUTH_SHARED_SECRET;
    const response = await getStories(buildRequest("http://localhost/api/stories", { method: "GET", userId: "owner-1" }));
    expect(response.status).toBe(401);
  });

  it("creates a story privately and hides it from other users", async () => {
    const createResponse = await createStory(
      buildRequest("http://localhost/api/stories", {
        method: "POST",
        userId: "owner-1",
        body: {
          title: "1978 年进城工作",
          year: 1978,
          summary: "第一次离家到城市打工。"
        }
      })
    );

    expect(createResponse.status).toBe(201);
    const createBody = (await createResponse.json()) as { story: { storyId: string; visibility: string } };
    expect(createBody.story.visibility).toBe("private");

    const ownerView = await getStory(
      buildRequest(`http://localhost/api/stories/${createBody.story.storyId}`, { method: "GET", userId: "owner-1" }),
      { params: Promise.resolve({ storyId: createBody.story.storyId }) }
    );
    expect(ownerView.status).toBe(200);

    const otherView = await getStory(
      buildRequest(`http://localhost/api/stories/${createBody.story.storyId}`, { method: "GET", userId: "owner-2" }),
      { params: Promise.resolve({ storyId: createBody.story.storyId }) }
    );
    expect(otherView.status).toBe(404);
  });

  it("rejects create payload fields outside minimal allowlist", async () => {
    const response = await createStory(
      buildRequest("http://localhost/api/stories", {
        method: "POST",
        userId: "owner-1",
        body: {
          title: "最小化采集校验",
          year: 1980,
          summary: "只收最小字段",
          extra_field: "not allowed"
        }
      })
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("Unexpected field");
  });

  it("deletes story and removes it from timeline index", async () => {
    const createResponse = await createStory(
      buildRequest("http://localhost/api/stories", {
        method: "POST",
        userId: "owner-1",
        body: {
          title: "1982 年返乡",
          year: 1982,
          summary: "返乡后重新开始。"
        }
      })
    );
    const createBody = (await createResponse.json()) as { story: { storyId: string } };

    const beforeTimeline = await getTimeline(
      buildRequest("http://localhost/api/timeline", { method: "GET", userId: "owner-1" })
    );
    expect(beforeTimeline.status).toBe(200);
    const beforeBody = (await beforeTimeline.json()) as { timeline: Array<{ year: number; storyIds: string[] }> };
    expect(beforeBody.timeline).toHaveLength(1);

    const deleteResponse = await deleteStory(
      buildRequest(`http://localhost/api/stories/${createBody.story.storyId}`, { method: "DELETE", userId: "owner-1" }),
      { params: Promise.resolve({ storyId: createBody.story.storyId }) }
    );
    expect(deleteResponse.status).toBe(200);

    const afterTimeline = await getTimeline(
      buildRequest("http://localhost/api/timeline", { method: "GET", userId: "owner-1" })
    );
    const afterBody = (await afterTimeline.json()) as { timeline: unknown[] };
    expect(afterBody.timeline).toEqual([]);
  });
});
