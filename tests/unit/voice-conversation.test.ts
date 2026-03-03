import { describe, expect, it } from "vitest";

import {
  MAX_VOICE_ROUNDS,
  buildAgentReply,
  createTurn,
  getNextUserRound,
  getUserRoundCount,
  isVoiceGoalMet,
  normalizeTranscript
} from "../../lib/voice/conversation";

describe("voice conversation helpers", () => {
  it("normalizes transcript whitespace", () => {
    expect(normalizeTranscript("  我   想起了   青年时代  ")).toBe("我 想起了 青年时代");
  });

  it("builds guided reply from transcript and round", () => {
    const reply = buildAgentReply("我 1978 年去了上海工作", 2);
    expect(reply).toContain("我记下了");
    expect(reply).toContain("关键的人物");
  });

  it("counts user rounds and checks voice goal", () => {
    const sessionId = "session-a";
    const turns = [
      createTurn({ sessionId, speaker: "user", round: 1, transcript: "第一段" }),
      createTurn({ sessionId, speaker: "agent", round: 1, transcript: "第一段回复" }),
      createTurn({ sessionId, speaker: "user", round: 2, transcript: "第二段" }),
      createTurn({ sessionId, speaker: "agent", round: 2, transcript: "第二段回复" }),
      createTurn({ sessionId, speaker: "user", round: 3, transcript: "第三段" }),
      createTurn({ sessionId, speaker: "agent", round: 3, transcript: "第三段回复" }),
      createTurn({ sessionId, speaker: "user", round: 4, transcript: "第四段" }),
      createTurn({ sessionId, speaker: "agent", round: 4, transcript: "第四段回复" }),
      createTurn({ sessionId, speaker: "user", round: MAX_VOICE_ROUNDS, transcript: "第五段" }),
      createTurn({ sessionId, speaker: "agent", round: MAX_VOICE_ROUNDS, transcript: "第五段回复" })
    ];

    expect(getUserRoundCount(turns)).toBe(MAX_VOICE_ROUNDS);
    expect(getNextUserRound(turns)).toBe(MAX_VOICE_ROUNDS + 1);
    expect(isVoiceGoalMet(turns)).toBe(true);
  });

  it("rejects invalid turn payload", () => {
    expect(() =>
      createTurn({
        sessionId: "session-a",
        speaker: "user",
        round: 0,
        transcript: "invalid"
      })
    ).toThrow("round must be a positive integer");
  });
});
