export type StoryStatus = "draft" | "in_progress" | "completed";
export type StoryVisibility = "private" | "public";

export interface CreateStoryInput {
  title: string;
  year: number;
  summary: string;
  status: StoryStatus;
}

export interface StoryRecord extends CreateStoryInput {
  storyId: string;
  ownerId: string;
  visibility: StoryVisibility;
  createdAt: string;
  updatedAt: string;
}

type ParseSuccess<T> = { ok: true; data: T };
type ParseFailure = { ok: false; error: string };

const ALLOWED_CREATE_KEYS = new Set(["title", "year", "summary", "status"]);
const ALLOWED_STATUS: ReadonlySet<StoryStatus> = new Set(["draft", "in_progress", "completed"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseCreateStoryInput(payload: unknown): ParseSuccess<CreateStoryInput> | ParseFailure {
  if (!isObject(payload)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  for (const key of Object.keys(payload)) {
    if (!ALLOWED_CREATE_KEYS.has(key)) {
      return { ok: false, error: `Unexpected field: ${key}` };
    }
  }

  const title = payload.title;
  if (typeof title !== "string" || title.trim().length === 0) {
    return { ok: false, error: "title is required." };
  }

  const summary = payload.summary;
  if (typeof summary !== "string" || summary.trim().length === 0) {
    return { ok: false, error: "summary is required." };
  }

  const year = payload.year;
  if (typeof year !== "number" || !Number.isInteger(year) || year < 1000 || year > 9999) {
    return { ok: false, error: "year must be a 4-digit integer." };
  }

  const status = payload.status;
  if (typeof status !== "undefined" && (typeof status !== "string" || !ALLOWED_STATUS.has(status as StoryStatus))) {
    return { ok: false, error: "status must be draft, in_progress, or completed." };
  }

  return {
    ok: true,
    data: {
      title: title.trim(),
      year,
      summary: summary.trim(),
      status: (status as StoryStatus | undefined) ?? "draft"
    }
  };
}
