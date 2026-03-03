"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  MAX_VOICE_ROUNDS,
  buildAgentReply,
  createSessionId,
  createTurn,
  getNextUserRound,
  getUserRoundCount,
  isVoiceGoalMet,
  normalizeTranscript,
  type ConversationTurn
} from "../../lib/voice/conversation";

const LOCAL_ARCHIVE_KEY = "remember-me.voice-archive";

interface LocalArchiveSnapshot {
  sessionId: string;
  turns: ConversationTurn[];
}

interface SpeechRecognitionResultAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike extends Event {
  error?: string;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface VoiceWindow extends Window {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const voiceWindow = window as VoiceWindow;
  return voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition ?? null;
}

function isConversationTurn(input: unknown): input is ConversationTurn {
  if (!input || typeof input !== "object") {
    return false;
  }

  const candidate = input as Partial<ConversationTurn>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.sessionId === "string" &&
    (candidate.speaker === "user" || candidate.speaker === "agent") &&
    typeof candidate.round === "number" &&
    typeof candidate.transcript === "string" &&
    typeof candidate.createdAt === "string"
  );
}

function readLocalArchive(): LocalArchiveSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_ARCHIVE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<LocalArchiveSnapshot>;
    if (!parsed || typeof parsed.sessionId !== "string" || !Array.isArray(parsed.turns)) {
      return null;
    }

    const turns = parsed.turns.filter((turn) => isConversationTurn(turn));
    return { sessionId: parsed.sessionId, turns };
  } catch {
    return null;
  }
}

function writeLocalArchive(snapshot: LocalArchiveSnapshot): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(LOCAL_ARCHIVE_KEY, JSON.stringify(snapshot));
}

async function speakText(text: string): Promise<void> {
  if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") {
    return;
  }

  await new Promise<void>((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  });
}

export default function VoiceSession() {
  const [sessionId, setSessionId] = useState<string>(() => createSessionId());
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusText, setStatusText] = useState("点击“开始语音会话”后，即可全程语音进行回忆。");
  const [errorText, setErrorText] = useState<string | null>(null);
  const [archiveWarning, setArchiveWarning] = useState<string | null>(null);
  const [voiceSupport, setVoiceSupport] = useState({ asr: false, tts: false });
  const [serverArchiveSummary, setServerArchiveSummary] = useState({ totalTurns: 0, userRounds: 0 });

  const turnsRef = useRef<ConversationTurn[]>([]);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const userRounds = useMemo(() => getUserRoundCount(turns), [turns]);
  const reachedGoal = useMemo(() => isVoiceGoalMet(turns), [turns]);

  useEffect(() => {
    turnsRef.current = turns;
    writeLocalArchive({ sessionId, turns });
  }, [sessionId, turns]);

  const refreshArchiveSummary = useCallback(async (activeSessionId: string) => {
    const response = await fetch(`/api/voice-turns?sessionId=${encodeURIComponent(activeSessionId)}`);
    if (!response.ok) {
      throw new Error("failed_to_fetch_archive_summary");
    }
    const body = (await response.json()) as { totalTurns: number; userRounds: number };
    setServerArchiveSummary({
      totalTurns: body.totalTurns ?? 0,
      userRounds: body.userRounds ?? 0
    });
  }, []);

  useEffect(() => {
    setVoiceSupport({
      asr: Boolean(getSpeechRecognitionCtor()),
      tts: typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined"
    });

    const snapshot = readLocalArchive();
    if (!snapshot) {
      return;
    }

    setSessionId(snapshot.sessionId);
    setTurns(snapshot.turns);
    turnsRef.current = snapshot.turns;

    void refreshArchiveSummary(snapshot.sessionId).catch(() => {
      setArchiveWarning("已加载本地转写，但服务端存档摘要暂不可用。");
    });
  }, [refreshArchiveSummary]);

  const persistTurnToServer = useCallback(async (turn: ConversationTurn) => {
    const response = await fetch("/api/voice-turns", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        sessionId: turn.sessionId,
        speaker: turn.speaker,
        round: turn.round,
        transcript: turn.transcript
      })
    });
    if (!response.ok) {
      throw new Error("failed_to_archive_turn");
    }
  }, []);

  const resetConversation = useCallback(() => {
    recognitionRef.current?.stop();
    const nextSessionId = createSessionId();
    setSessionId(nextSessionId);
    setTurns([]);
    turnsRef.current = [];
    setErrorText(null);
    setArchiveWarning(null);
    setStatusText("新会话已创建，先点击“开始语音会话”，再进行语音输入。");
    setServerArchiveSummary({ totalTurns: 0, userRounds: 0 });
  }, []);

  const speakAgentMessage = useCallback(async (message: string) => {
    if (!voiceSupport.tts) {
      setErrorText("当前浏览器不支持语音播报（TTS），请更换到受支持的浏览器。");
      return;
    }
    setIsSpeaking(true);
    await speakText(message);
    setIsSpeaking(false);
  }, [voiceSupport.tts]);

  const handleRecognizedTranscript = useCallback(
    async (spokenText: string) => {
      const transcript = normalizeTranscript(spokenText);
      if (!transcript) {
        setStatusText("没有识别到清晰语音，请重试一次。");
        return;
      }

      setErrorText(null);
      setArchiveWarning(null);
      setStatusText("语音已转写，正在生成语音回复并存档。");

      const currentTurns = turnsRef.current;
      const round = getNextUserRound(currentTurns);
      const userTurn = createTurn({ sessionId, speaker: "user", round, transcript });
      const agentReply = buildAgentReply(transcript, round);
      const agentTurn = createTurn({ sessionId, speaker: "agent", round, transcript: agentReply });
      const nextTurns = [...currentTurns, userTurn, agentTurn];

      turnsRef.current = nextTurns;
      setTurns(nextTurns);

      try {
        await persistTurnToServer(userTurn);
        await persistTurnToServer(agentTurn);
        await refreshArchiveSummary(sessionId);
      } catch {
        setArchiveWarning("转写已保存在本地，服务端存档暂时失败，请稍后重试。");
      }

      setStatusText(
        round >= MAX_VOICE_ROUNDS
          ? `已完成 ${round} 轮语音对话，达到 MVP 验收要求。`
          : `第 ${round} 轮完成，请继续下一轮语音讲述。`
      );
      await speakAgentMessage(agentReply);
    },
    [persistTurnToServer, refreshArchiveSummary, sessionId, speakAgentMessage]
  );

  const startVoiceConversation = useCallback(async () => {
    if (!voiceSupport.tts) {
      setErrorText("当前浏览器不支持语音播报（TTS），无法完成全语音会话。");
      return;
    }
    setErrorText(null);
    setStatusText("系统语音已开始，请点击“开始语音输入”进行讲述。");
    await speakAgentMessage("您好，我们开始回忆吧。请先说一件您最难忘的往事。");
  }, [speakAgentMessage, voiceSupport.tts]);

  const startListening = useCallback(() => {
    if (!voiceSupport.asr) {
      setErrorText("当前浏览器不支持语音识别（ASR），请使用 Chrome 或 Edge 最新版。");
      return;
    }
    if (!voiceSupport.tts) {
      setErrorText("当前浏览器不支持语音播报（TTS），无法完成全语音闭环。");
      return;
    }

    if (isListening || isSpeaking) {
      return;
    }

    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) {
      setErrorText("无法初始化语音识别实例。");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "zh-CN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal || index === event.results.length - 1) {
          transcript += result[0]?.transcript ?? "";
        }
      }
      void handleRecognizedTranscript(transcript);
    };

    recognition.onerror = (event) => {
      setErrorText(`语音识别失败：${event.error ?? "unknown_error"}`);
      setStatusText("识别失败，请再次点击“开始语音输入”。");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    setErrorText(null);
    setStatusText("正在聆听，请开始说话。");
    setIsListening(true);
    recognitionRef.current = recognition;
    recognition.start();
  }, [handleRecognizedTranscript, isListening, isSpeaking, voiceSupport.asr, voiceSupport.tts]);

  return (
    <section
      style={{
        maxWidth: 920,
        margin: "0 auto",
        padding: 24,
        borderRadius: 24,
        backgroundColor: "#ffffff",
        boxShadow: "0 14px 40px rgba(18, 46, 67, 0.08)",
        fontFamily: "\"Noto Sans SC\", \"PingFang SC\", \"Microsoft YaHei\", sans-serif"
      }}
    >
      <h1 style={{ marginBottom: 8, color: "#1b4332" }}>Remember Me 语音回忆室</h1>
      <p style={{ marginTop: 0, marginBottom: 18, color: "#334155" }}>
        仅通过语音进行对话：用户说、系统回；每轮自动转写并存档。
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          marginBottom: 16
        }}
      >
        <div style={{ backgroundColor: "#ecfeff", padding: 12, borderRadius: 12 }}>
          <strong>目标轮次</strong>
          <div>{MAX_VOICE_ROUNDS} 轮语音</div>
        </div>
        <div style={{ backgroundColor: "#f1f5f9", padding: 12, borderRadius: 12 }}>
          <strong>已完成</strong>
          <div>{userRounds} 轮</div>
        </div>
        <div style={{ backgroundColor: "#f8fafc", padding: 12, borderRadius: 12 }}>
          <strong>服务端存档</strong>
          <div data-testid="server-archive-turns">{serverArchiveSummary.totalTurns} 条转写</div>
        </div>
        <div style={{ backgroundColor: "#f8fafc", padding: 12, borderRadius: 12 }}>
          <strong>会话状态</strong>
          <div>{reachedGoal ? "已达成 5 轮目标" : "进行中"}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <button type="button" onClick={startVoiceConversation} disabled={isSpeaking}>
          开始语音会话
        </button>
        <button
          type="button"
          onClick={startListening}
          disabled={isListening || isSpeaking || !voiceSupport.asr || !voiceSupport.tts}
        >
          {isListening ? "聆听中..." : "开始语音输入"}
        </button>
        <button type="button" onClick={resetConversation}>
          新建会话
        </button>
      </div>

      <p data-testid="voice-status" style={{ marginTop: 0, color: "#1e293b" }}>
        {statusText}
      </p>
      <p style={{ marginTop: 0, marginBottom: 12, color: "#475569" }}>会话 ID：{sessionId}</p>

      {!voiceSupport.asr && (
        <p style={{ marginTop: 0, marginBottom: 8, color: "#b45309" }}>
          当前浏览器不支持 ASR，语音输入不可用。
        </p>
      )}
      {!voiceSupport.tts && (
        <p style={{ marginTop: 0, marginBottom: 8, color: "#b45309" }}>
          当前浏览器不支持 TTS，语音播报不可用。
        </p>
      )}
      {errorText && (
        <p style={{ marginTop: 0, marginBottom: 8, color: "#dc2626" }} role="alert">
          {errorText}
        </p>
      )}
      {archiveWarning && (
        <p style={{ marginTop: 0, marginBottom: 8, color: "#b45309" }} role="status">
          {archiveWarning}
        </p>
      )}

      <div
        style={{
          marginTop: 18,
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          padding: 14,
          maxHeight: 360,
          overflowY: "auto"
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 18 }}>转写存档</h2>
        {turns.length === 0 ? (
          <p style={{ marginBottom: 0, color: "#64748b" }}>暂无转写记录，点击“开始语音输入”后将自动生成。</p>
        ) : (
          <ol style={{ paddingLeft: 20, marginBottom: 0 }} data-testid="transcript-list">
            {turns.map((turn) => (
              <li key={turn.id} style={{ marginBottom: 10 }}>
                <strong>
                  第 {turn.round} 轮 · {turn.speaker === "user" ? "用户" : "系统"}
                </strong>
                <div>{turn.transcript}</div>
                <small style={{ color: "#64748b" }}>{new Date(turn.createdAt).toLocaleString("zh-CN")}</small>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
