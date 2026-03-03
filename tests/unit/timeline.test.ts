import { describe, expect, it } from "vitest";

import {
  SAMPLE_STORIES,
  buildTimelineIndex,
  buildTimelineStoryIndex,
  formatStoryYear,
  getStoriesForYear,
  getStoryYears,
  getTimelineYears
} from "../../lib/timeline";

describe("timeline helpers", () => {
  it("returns single year for point binding", () => {
    expect(getStoryYears({ year: 1978 })).toEqual([1978]);
  });

  it("returns inclusive year range for range binding", () => {
    expect(getStoryYears({ startYear: 1984, endYear: 1986 })).toEqual([1984, 1985, 1986]);
  });

  it("normalizes reverse year range", () => {
    expect(getStoryYears({ startYear: 1986, endYear: 1984 })).toEqual([1984, 1985, 1986]);
  });

  it("builds sorted timeline years from mixed stories", () => {
    expect(getTimelineYears(SAMPLE_STORIES)).toEqual([1978, 1984, 1985, 1986, 1995]);
  });

  it("filters stories by selected year including range coverage", () => {
    const result = getStoriesForYear(SAMPLE_STORIES, 1985);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("story-1984-night-school");
  });

  it("keeps timeline index and story mapping consistent", () => {
    const index = buildTimelineIndex(SAMPLE_STORIES);
    expect(index[1978]).toEqual(["story-1978-first-job"]);
    expect(index[1984]).toEqual(["story-1984-night-school"]);
    expect(index[1985]).toEqual(["story-1984-night-school"]);
    expect(index[1986]).toEqual(["story-1984-night-school"]);
    expect(index[1995]).toEqual(["story-1995-shop"]);
  });

  it("builds story index grouped by year for O(1) year lookups", () => {
    const index = buildTimelineStoryIndex(SAMPLE_STORIES);
    expect(index[1978]?.map((story) => story.id)).toEqual(["story-1978-first-job"]);
    expect(index[1985]?.map((story) => story.id)).toEqual(["story-1984-night-school"]);
    expect(index[1995]?.map((story) => story.id)).toEqual(["story-1995-shop"]);
  });

  it("formats year binding for detail view", () => {
    expect(formatStoryYear({ year: 1995 })).toBe("1995");
    expect(formatStoryYear({ startYear: 1984, endYear: 1986 })).toBe("1984-1986");
    expect(formatStoryYear({ startYear: 1984, endYear: 1984 })).toBe("1984");
  });
});
