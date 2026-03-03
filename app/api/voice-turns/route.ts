import { getTurnsBySession, saveTurn } from "../../../lib/voice/archive-store";
import { createTurn, normalizeTranscript, type Speaker } from "../../../lib/voice/conversation";

interface TurnPayload {
  sessionId?: string;
  speaker?: Speaker;
  round?: number;
  transcript?: string;
}

function isSpeaker(value: unknown): value is Speaker {
  return value === "user" || value === "agent";
}

export async function POST(request: Request): Promise<Response> {
  let payload: TurnPayload;

  try {
    payload = (await request.json()) as TurnPayload;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  const sessionId = normalizeTranscript(payload.sessionId ?? "");
  if (!sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  if (!isSpeaker(payload.speaker)) {
    return Response.json({ error: "speaker must be 'user' or 'agent'" }, { status: 400 });
  }

  const round = payload.round;
  if (typeof round !== "number" || !Number.isInteger(round) || round < 1) {
    return Response.json({ error: "round must be a positive integer" }, { status: 400 });
  }

  const transcript = normalizeTranscript(payload.transcript ?? "");
  if (!transcript) {
    return Response.json({ error: "transcript is required" }, { status: 400 });
  }

  const turn = createTurn({
    sessionId,
    speaker: payload.speaker,
    round,
    transcript
  });

  const turns = saveTurn(turn);
  return Response.json({
    sessionId,
    turn,
    totalTurns: turns.length
  });
}

export async function GET(request: Request): Promise<Response> {
  const sessionId = normalizeTranscript(new URL(request.url).searchParams.get("sessionId") ?? "");
  if (!sessionId) {
    return Response.json({ error: "sessionId is required" }, { status: 400 });
  }

  const turns = getTurnsBySession(sessionId);
  const userRounds = turns.reduce((count, turn) => (turn.speaker === "user" ? count + 1 : count), 0);

  return Response.json({
    sessionId,
    turns,
    totalTurns: turns.length,
    userRounds
  });
}
