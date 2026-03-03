import type { ConversationTurn } from "./conversation";

const archiveBySession = new Map<string, ConversationTurn[]>();

export function saveTurn(turn: ConversationTurn): ConversationTurn[] {
  const current = archiveBySession.get(turn.sessionId) ?? [];
  const next = [...current, turn];
  archiveBySession.set(turn.sessionId, next);
  return next;
}

export function getTurnsBySession(sessionId: string): ConversationTurn[] {
  return [...(archiveBySession.get(sessionId) ?? [])];
}

export function clearSessionTurns(sessionId: string): void {
  archiveBySession.delete(sessionId);
}

export function resetArchiveStore(): void {
  archiveBySession.clear();
}
