import { describe, expect, it } from "vitest";

import { parseCreateStoryInput } from "../../lib/story-contract";
import { resetStoryStoreForTest, storyStore } from "../../lib/story-store";

describe("story-store privacy and minimal collection", () => {
  it("creates story as private by default", () => {
    resetStoryStoreForTest();

    const parsed = parseCreateStoryInput({
      title: "1978 年进城工作",
      year: 1978,
      summary: "第一次离家到城市打工。"
    });

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const story = storyStore.create("user-a", parsed.data);
    expect(story.visibility).toBe("private");
    expect(story.ownerId).toBe("user-a");
  });

  it("rejects fields outside minimal collection allowlist", () => {
    resetStoryStoreForTest();

    const parsed = parseCreateStoryInput({
      title: "Unexpected payload",
      year: 1978,
      summary: "payload",
      unauthorized_notes: "should not be collected"
    });

    expect(parsed.ok).toBe(false);
    if (parsed.ok) {
      return;
    }
    expect(parsed.error).toContain("Unexpected field");
  });

  it("deletes story and removes timeline index visibility", () => {
    resetStoryStoreForTest();

    const parsed = parseCreateStoryInput({
      title: "1982 年返乡",
      year: 1982,
      summary: "返乡后重新开始。"
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const created = storyStore.create("user-a", parsed.data);
    expect(storyStore.getTimeline("user-a")).toHaveLength(1);

    const deleted = storyStore.delete("user-a", created.storyId);
    expect(deleted).toBe(true);
    expect(storyStore.get("user-a", created.storyId)).toBeNull();
    expect(storyStore.getTimeline("user-a")).toEqual([]);
  });
});
