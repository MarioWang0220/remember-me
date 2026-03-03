import { beforeEach, describe, expect, it } from "vitest";

import { GET, POST } from "../../app/api/voice-turns/route";
import { resetArchiveStore } from "../../lib/voice/archive-store";

describe("voice turns route", () => {
  beforeEach(() => {
    resetArchiveStore();
  });

  it("stores turns and returns archive summary", async () => {
    const sessionId = "session-route-1";

    const userResponse = await POST(
      new Request("http://localhost/api/voice-turns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          speaker: "user",
          round: 1,
          transcript: "我在 1978 年去了上海"
        })
      })
    );
    expect(userResponse.status).toBe(200);

    const agentResponse = await POST(
      new Request("http://localhost/api/voice-turns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          speaker: "agent",
          round: 1,
          transcript: "我记下了。还有哪些人参与了这件事？"
        })
      })
    );
    expect(agentResponse.status).toBe(200);

    const getResponse = await GET(new Request(`http://localhost/api/voice-turns?sessionId=${sessionId}`));
    expect(getResponse.status).toBe(200);
    const body = (await getResponse.json()) as {
      totalTurns: number;
      userRounds: number;
      turns: Array<{ speaker: string }>;
    };

    expect(body.totalTurns).toBe(2);
    expect(body.userRounds).toBe(1);
    expect(body.turns[0]?.speaker).toBe("user");
    expect(body.turns[1]?.speaker).toBe("agent");
  });

  it("returns 400 when payload is invalid", async () => {
    const response = await POST(
      new Request("http://localhost/api/voice-turns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: "",
          speaker: "user",
          round: 1,
          transcript: "hello"
        })
      })
    );

    expect(response.status).toBe(400);
  });

  it("archives readable transcripts across five full voice rounds", async () => {
    const sessionId = "session-route-5-rounds";
    const userTranscripts = [
      "  我  记得 1978 年刚到上海时很紧张  ",
      "第一份工作是在机械厂，师傅很照顾我",
      "最难的是夜班后还要照顾家里老人",
      "后来我坚持学技术，终于当上了班组长",
      "我希望晚辈记住，遇到困难先别放弃"
    ];

    for (let index = 0; index < userTranscripts.length; index += 1) {
      const round = index + 1;
      const userResponse = await POST(
        new Request("http://localhost/api/voice-turns", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId,
            speaker: "user",
            round,
            transcript: userTranscripts[index]
          })
        })
      );
      expect(userResponse.status).toBe(200);

      const agentResponse = await POST(
        new Request("http://localhost/api/voice-turns", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId,
            speaker: "agent",
            round,
            transcript: `我记下了第 ${round} 轮内容，请继续补充细节。`
          })
        })
      );
      expect(agentResponse.status).toBe(200);
    }

    const getResponse = await GET(new Request(`http://localhost/api/voice-turns?sessionId=${sessionId}`));
    expect(getResponse.status).toBe(200);
    const body = (await getResponse.json()) as {
      totalTurns: number;
      userRounds: number;
      turns: Array<{ speaker: string; round: number; transcript: string }>;
    };

    expect(body.totalTurns).toBe(10);
    expect(body.userRounds).toBe(5);
    expect(body.turns).toHaveLength(10);
    expect(body.turns[0]).toMatchObject({ speaker: "user", round: 1, transcript: "我 记得 1978 年刚到上海时很紧张" });
    expect(body.turns[9]).toMatchObject({ speaker: "agent", round: 5 });
    expect(body.turns.every((turn) => turn.transcript.length > 0)).toBe(true);
  });
});
