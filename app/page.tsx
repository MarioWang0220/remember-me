import VoiceSession from "./components/voice-session";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "linear-gradient(180deg, #f4f9f8 0%, #f8f5ef 100%)"
      }}
    >
      <VoiceSession />
    </main>
  );
}
