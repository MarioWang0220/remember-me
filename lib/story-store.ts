import { CreateStoryInput, StoryRecord } from "./story-contract";

export interface TimelineEntry {
  year: number;
  storyIds: string[];
  highlightCount: number;
}

class StoryStore {
  private stories = new Map<string, StoryRecord>();
  private timelineByOwner = new Map<string, Map<number, Set<string>>>();

  create(ownerId: string, input: CreateStoryInput): StoryRecord {
    const now = new Date().toISOString();
    const storyId = `story_${crypto.randomUUID()}`;
    const story: StoryRecord = {
      ...input,
      storyId,
      ownerId,
      visibility: "private",
      createdAt: now,
      updatedAt: now
    };

    this.stories.set(storyId, story);
    this.addToTimeline(ownerId, input.year, storyId);
    return story;
  }

  list(ownerId: string): StoryRecord[] {
    return Array.from(this.stories.values())
      .filter((story) => story.ownerId === ownerId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  get(ownerId: string, storyId: string): StoryRecord | null {
    const story = this.stories.get(storyId);
    if (!story || story.ownerId !== ownerId) {
      return null;
    }
    return story;
  }

  delete(ownerId: string, storyId: string): boolean {
    const story = this.get(ownerId, storyId);
    if (!story) {
      return false;
    }

    this.stories.delete(storyId);
    this.removeFromTimeline(ownerId, story.year, storyId);
    return true;
  }

  getTimeline(ownerId: string): TimelineEntry[] {
    const ownerTimeline = this.timelineByOwner.get(ownerId);
    if (!ownerTimeline) {
      return [];
    }

    return Array.from(ownerTimeline.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([year, storyIdSet]) => {
        const storyIds = Array.from(storyIdSet.values());
        return {
          year,
          storyIds,
          highlightCount: storyIds.length
        };
      });
  }

  reset(): void {
    this.stories.clear();
    this.timelineByOwner.clear();
  }

  private addToTimeline(ownerId: string, year: number, storyId: string): void {
    const ownerTimeline = this.timelineByOwner.get(ownerId) ?? new Map<number, Set<string>>();
    const storySet = ownerTimeline.get(year) ?? new Set<string>();

    storySet.add(storyId);
    ownerTimeline.set(year, storySet);
    this.timelineByOwner.set(ownerId, ownerTimeline);
  }

  private removeFromTimeline(ownerId: string, year: number, storyId: string): void {
    const ownerTimeline = this.timelineByOwner.get(ownerId);
    if (!ownerTimeline) {
      return;
    }

    const storySet = ownerTimeline.get(year);
    if (!storySet) {
      return;
    }

    storySet.delete(storyId);
    if (storySet.size === 0) {
      ownerTimeline.delete(year);
    } else {
      ownerTimeline.set(year, storySet);
    }

    if (ownerTimeline.size === 0) {
      this.timelineByOwner.delete(ownerId);
    } else {
      this.timelineByOwner.set(ownerId, ownerTimeline);
    }
  }
}

export const storyStore = new StoryStore();

export function resetStoryStoreForTest(): void {
  storyStore.reset();
}
