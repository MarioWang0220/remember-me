import { beforeEach, describe, expect, it } from "vitest";

import { clearSessionTurns, getTurnsBySession, resetArchiveStore, saveTurn } from "../../lib/voice/archive-store";
import { createTurn } from "../../lib/voice/conversation";

describe("voice archive store", () => {
  beforeEach(() => {
    resetArchiveStore();
  });

  it("saves and reads turns by session", () => {
    const sessionId = "session-1";
    const turn = createTurn({ sessionId, speaker: "user", round: 1, transcript: "我想起 1978 年" });

    saveTurn(turn);

    const turns = getTurnsBySession(sessionId);
    expect(turns).toHaveLength(1);
    expect(turns[0]?.transcript).toBe("我想起 1978 年");
  });

  it("isolates sessions and can clear one session", () => {
    const sessionA = "session-a";
    const sessionB = "session-b";

    saveTurn(createTurn({ sessionId: sessionA, speaker: "user", round: 1, transcript: "A1" }));
    saveTurn(createTurn({ sessionId: sessionB, speaker: "user", round: 1, transcript: "B1" }));

    clearSessionTurns(sessionA);

    expect(getTurnsBySession(sessionA)).toHaveLength(0);
    expect(getTurnsBySession(sessionB)).toHaveLength(1);
  });
});
