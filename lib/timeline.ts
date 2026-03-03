export type StoryYearBinding =
  | {
      year: number;
    }
  | {
      startYear: number;
      endYear: number;
    };

export type Story = {
  id: string;
  title: string;
  summary: string;
  details: string;
  yearBinding: StoryYearBinding;
};

export const SAMPLE_STORIES: Story[] = [
  {
    id: "story-1978-first-job",
    title: "第一次进城工作",
    summary: "1978 年离开家乡进入纺织厂，从学徒做起。",
    details:
      "那年秋天我坐了 9 个小时的绿皮火车进城，在纺织厂轮班三个月后终于转正，这是我人生第一次真正独立。",
    yearBinding: { year: 1978 }
  },
  {
    id: "story-1984-night-school",
    title: "在乡镇办夜校",
    summary: "1984 到 1986 年连续三年组织夜校扫盲班。",
    details:
      "白天种田，晚上借祠堂教识字，三年里一共办了 11 期夜校，后来很多人都能自己写信了。",
    yearBinding: { startYear: 1984, endYear: 1986 }
  },
  {
    id: "story-1995-shop",
    title: "开第一家小店",
    summary: "1995 年在集市旁开了杂货小店。",
    details:
      "为了照顾家里老人，我把工厂工作改成了开店。虽然利润不高，但一家人终于能一起吃晚饭。",
    yearBinding: { year: 1995 }
  }
];

function isValidYear(year: number): boolean {
  return Number.isInteger(year) && Number.isFinite(year);
}

function getNormalizedRange(binding: { startYear: number; endYear: number }): {
  start: number;
  end: number;
} | null {
  const start = Math.min(binding.startYear, binding.endYear);
  const end = Math.max(binding.startYear, binding.endYear);

  if (!isValidYear(start) || !isValidYear(end)) {
    return null;
  }

  return { start, end };
}

export function includesYear(binding: StoryYearBinding, year: number): boolean {
  if (!isValidYear(year)) {
    return false;
  }

  if ("year" in binding) {
    return isValidYear(binding.year) && binding.year === year;
  }

  const normalizedRange = getNormalizedRange(binding);
  if (!normalizedRange) {
    return false;
  }

  const { start, end } = normalizedRange;
  return year >= start && year <= end;
}

export function getStoryYears(binding: StoryYearBinding): number[] {
  if ("year" in binding) {
    return isValidYear(binding.year) ? [binding.year] : [];
  }

  const normalizedRange = getNormalizedRange(binding);
  if (!normalizedRange) {
    return [];
  }

  const { start, end } = normalizedRange;
  const years: number[] = [];

  for (let year = start; year <= end; year += 1) {
    years.push(year);
  }

  return years;
}

export function formatStoryYear(binding: StoryYearBinding): string {
  if ("year" in binding) {
    return isValidYear(binding.year) ? `${binding.year}` : "未知年份";
  }

  const normalizedRange = getNormalizedRange(binding);
  if (!normalizedRange) {
    return "未知年份";
  }

  const { start, end } = normalizedRange;

  if (start === end) {
    return `${start}`;
  }

  return `${start}-${end}`;
}

export function getTimelineYears(stories: Story[]): number[] {
  const years = new Set<number>();

  for (const story of stories) {
    for (const year of getStoryYears(story.yearBinding)) {
      years.add(year);
    }
  }

  return [...years].sort((a, b) => a - b);
}

export function getStoriesForYear(stories: Story[], year: number): Story[] {
  return stories.filter((story) => includesYear(story.yearBinding, year));
}

export function buildTimelineIndex(stories: Story[]): Record<number, string[]> {
  const timelineStoryIndex = buildTimelineStoryIndex(stories);
  const index: Record<number, string[]> = {};

  for (const [year, storiesForYear] of Object.entries(timelineStoryIndex)) {
    index[Number(year)] = storiesForYear.map((story) => story.id);
  }

  return index;
}

export function buildTimelineStoryIndex(stories: Story[]): Record<number, Story[]> {
  const index: Record<number, Story[]> = {};

  for (const story of stories) {
    for (const year of getStoryYears(story.yearBinding)) {
      if (!index[year]) {
        index[year] = [];
      }
      index[year].push(story);
    }
  }

  return index;
}
