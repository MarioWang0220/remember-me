export const MAX_VOICE_ROUNDS = 5;

export type Speaker = "user" | "agent";

export interface ConversationTurn {
  id: string;
  sessionId: string;
  speaker: Speaker;
  round: number;
  transcript: string;
  createdAt: string;
}

const GUIDING_QUESTIONS = [
  "这件事发生在什么时候、在哪里？",
  "当时最关键的人物是谁，您和他/她是什么关系？",
  "那一刻最难的挑战是什么，您是怎么挺过来的？",
  "经历这件事后，您最大的感受或变化是什么？",
  "如果把这段故事讲给晚辈，您最想让他们记住什么？"
];

export function normalizeTranscript(transcript: string): string {
  return transcript.replace(/\s+/g, " ").trim();
}

export function createSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function createTurnId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `turn-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function getUserRoundCount(turns: ConversationTurn[]): number {
  return turns.reduce((count, turn) => (turn.speaker === "user" ? count + 1 : count), 0);
}

export function getNextUserRound(turns: ConversationTurn[]): number {
  return getUserRoundCount(turns) + 1;
}

export function isVoiceGoalMet(turns: ConversationTurn[]): boolean {
  return getUserRoundCount(turns) >= MAX_VOICE_ROUNDS;
}

export function buildAgentReply(userTranscript: string, round: number): string {
  const cleanedTranscript = normalizeTranscript(userTranscript);
  const question = GUIDING_QUESTIONS[(Math.max(round, 1) - 1) % GUIDING_QUESTIONS.length];

  if (!cleanedTranscript) {
    return `我这次听得不够清楚，我们再试一次。${question}`;
  }

  const preview = cleanedTranscript.length > 64 ? `${cleanedTranscript.slice(0, 64)}…` : cleanedTranscript;
  return `我记下了：${preview}。${question}`;
}

export function createTurn(input: {
  sessionId: string;
  speaker: Speaker;
  round: number;
  transcript: string;
  createdAt?: string;
}): ConversationTurn {
  const sessionId = normalizeTranscript(input.sessionId);
  const transcript = normalizeTranscript(input.transcript);

  if (!sessionId) {
    throw new Error("sessionId is required");
  }
  if (!transcript) {
    throw new Error("transcript is required");
  }
  if (!Number.isInteger(input.round) || input.round < 1) {
    throw new Error("round must be a positive integer");
  }

  return {
    id: createTurnId(),
    sessionId,
    speaker: input.speaker,
    round: input.round,
    transcript,
    createdAt: input.createdAt ?? new Date().toISOString()
  };
}
