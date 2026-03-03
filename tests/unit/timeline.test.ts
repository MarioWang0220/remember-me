import { describe, expect, it } from "vitest";

import {
  MAX_STORY_YEAR_SPAN,
  SAMPLE_STORIES,
  buildTimelineIndex,
  buildTimelineStoryIndex,
  formatStoryYear,
  getStoriesForYear,
  getStoryYears,
  getTimelineYears,
  resolveSelectedYear
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

  it("returns empty years for invalid year values", () => {
    expect(getStoryYears({ year: Number.NaN })).toEqual([]);
    expect(getStoryYears({ startYear: Number.NaN, endYear: 1986 })).toEqual([]);
  });

  it("supports large reverse ranges", () => {
    const years = getStoryYears({ startYear: 2000, endYear: 1900 });
    expect(years).toHaveLength(101);
    expect(years[0]).toBe(1900);
    expect(years[100]).toBe(2000);
  });

  it("returns empty years for oversized range to avoid expansion blowup", () => {
    expect(getStoryYears({ startYear: 1900, endYear: 1900 + MAX_STORY_YEAR_SPAN })).toEqual([]);
  });

  it("builds sorted timeline years from mixed stories", () => {
    expect(getTimelineYears(SAMPLE_STORIES)).toEqual([1978, 1984, 1985, 1986, 1995]);
  });

  it("returns empty timeline years for empty stories", () => {
    expect(getTimelineYears([])).toEqual([]);
  });

  it("filters stories by selected year including range coverage", () => {
    const result = getStoriesForYear(SAMPLE_STORIES, 1985);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("story-1984-night-school");
  });

  it("returns empty stories for invalid selected year", () => {
    expect(getStoriesForYear(SAMPLE_STORIES, Number.NaN)).toEqual([]);
  });

  it("filters out stories with oversized ranges from year lookup", () => {
    const stories = [
      ...SAMPLE_STORIES,
      {
        id: "oversized-range",
        title: "超大跨度",
        summary: "用于边界测试",
        details: "不应进入时间线索引",
        yearBinding: { startYear: 1000, endYear: 1000 + MAX_STORY_YEAR_SPAN }
      }
    ];

    expect(getStoriesForYear(stories, 1100)).toHaveLength(0);
    expect(getTimelineYears(stories)).toEqual([1978, 1984, 1985, 1986, 1995]);
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

  it("resolves selected year with fallback when timeline years change", () => {
    expect(resolveSelectedYear(undefined, [1978, 1984])).toBe(1978);
    expect(resolveSelectedYear(1984, [1978, 1984])).toBe(1984);
    expect(resolveSelectedYear(1995, [1978, 1984])).toBe(1978);
    expect(resolveSelectedYear(1995, [])).toBeUndefined();
  });

  it("formats year binding for detail view", () => {
    expect(formatStoryYear({ year: 1995 })).toBe("1995");
    expect(formatStoryYear({ startYear: 1984, endYear: 1986 })).toBe("1984-1986");
    expect(formatStoryYear({ startYear: 1984, endYear: 1984 })).toBe("1984");
    expect(formatStoryYear({ year: Number.NaN })).toBe("未知年份");
  });
});
