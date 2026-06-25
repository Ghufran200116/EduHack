import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { QUESTIONS, type Choice } from "@/lib/questions";
import { EMPTY_SCORES, type DimensionScores } from "@/lib/dimensions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/chat")({
  head: () => ({ meta: [{ title: "Chat — EduHack" }] }),
  component: ChatPage,
});

type Msg =
  | { from: "bot"; text: string }
  | { from: "user"; text: string };

function ChatPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [idx, setIdx] = useState(0);
  const [messages, setMessages] = useState<Msg[]>([
    { from: "bot", text: "Hi! I'm your EduHack study-buddy 🤖✊ I've got 12 quick questions — no right or wrong. Ready?" },
  ]);
  const [scores, setScores] = useState<DimensionScores>(EMPTY_SCORES);
  const [textInput, setTextInput] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/", replace: true }); }, [loading, user, navigate]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, idx]);

  // Bot asks the next question
  useEffect(() => {
    if (idx >= QUESTIONS.length || done) return;
    const q = QUESTIONS[idx];
    setMessages((m) => [...m, { from: "bot", text: q.prompt }]);
  }, [idx, done]);

  const currentQ = QUESTIONS[idx];

  const finish = async (finalScores: DimensionScores) => {
    if (!user) return;
    setSaving(true);
    const total = Object.values(finalScores).reduce((a, b) => a + b, 0) || 1;
    const norm: DimensionScores = {
      visual: Math.round((finalScores.visual / total) * 100),
      kinesthetic: Math.round((finalScores.kinesthetic / total) * 100),
      auditory: Math.round((finalScores.auditory / total) * 100),
      read_write: Math.round((finalScores.read_write / total) * 100),
      social: Math.round((finalScores.social / total) * 100),
    };
    await supabase.from("dimension_scores").upsert({
      user_id: user.id, ...norm, updated_at: new Date().toISOString(),
    });
    setDone(true);
    setMessages((m) => [...m, { from: "bot", text: "This is a snapshot of your preferences, not a box — it can change as you do." }]);
    setTimeout(() => navigate({ to: "/profile" }), 1800);
  };

  const handleChoice = async (choice: Choice) => {
    if (!user) return;
    setMessages((m) => [...m, { from: "user", text: choice.label }]);
    await supabase.from("profiling_answers").upsert({
      user_id: user.id, question_id: currentQ.id, answer: choice.label,
    }, { onConflict: "user_id,question_id" });
    const next: DimensionScores = { ...scores };
    for (const [k, v] of Object.entries(choice.weights)) {
      next[k as keyof DimensionScores] += v as number;
    }
    setScores(next);
    const nextIdx = idx + 1;
    if (nextIdx >= QUESTIONS.length) {
      await finish(next);
    } else {
      setIdx(nextIdx);
    }
  };

  const inferWeights = (text: string): Partial<DimensionScores> => {
    const t = text.toLowerCase();
    const w: Partial<DimensionScores> = {};
    const add = (k: keyof DimensionScores, n: number) => { w[k] = (w[k] ?? 0) + n; };
    // keyword heuristics
    const map: Array<[RegExp, keyof DimensionScores, number]> = [
      [/\b(see|watch|video|diagram|picture|visual|color|sketch|map|chart|image)\b/, "visual", 2],
      [/\b(do|build|make|hands?-?on|practice|move|walk|try|experiment|lab|prototype)\b/, "kinesthetic", 2],
      [/\b(listen|hear|talk|podcast|audio|sound|music|discuss|explain out loud|voice)\b/, "auditory", 2],
      [/\b(read|write|notes?|book|essay|list|bullet|article|journal|text)\b/, "read_write", 2],
      [/\b(friend|group|team|together|class(mate)?s?|people|peer|teach|share)\b/, "social", 2],
    ];
    for (const [re, k, n] of map) if (re.test(t)) add(k, n);
    // also match against this question's choice labels
    for (const c of currentQ.choices) {
      const tokens = c.label.toLowerCase().split(/\W+/).filter((x) => x.length > 3);
      if (tokens.some((tok) => t.includes(tok))) {
        for (const [k, v] of Object.entries(c.weights)) add(k as keyof DimensionScores, v as number);
      }
    }
    // fallback: small even nudge so the answer still counts
    if (Object.keys(w).length === 0) {
      add("visual", 1); add("kinesthetic", 1); add("auditory", 1); add("read_write", 1); add("social", 1);
    }
    return w;
  };

  const handleText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || !user) return;
    const val = textInput.trim();
    setMessages((m) => [...m, { from: "user", text: val }]);
    await supabase.from("profiling_answers").upsert({
      user_id: user.id, question_id: currentQ.id, answer: val,
    }, { onConflict: "user_id,question_id" });
    const weights = inferWeights(val);
    const next: DimensionScores = { ...scores };
    for (const [k, v] of Object.entries(weights)) {
      next[k as keyof DimensionScores] += v as number;
    }
    setScores(next);
    setTextInput("");
    const nextIdx = idx + 1;
    if (nextIdx >= QUESTIONS.length) {
      await finish(next);
    } else {
      setIdx(nextIdx);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-4 border-b flex items-center justify-between">
        <Logo />
        {!done && (
          <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
            <span>Question {Math.min(idx + 1, QUESTIONS.length)} of {QUESTIONS.length}</span>
            <Progress value={(idx / QUESTIONS.length) * 100} className="w-32" />
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === "bot" ? "justify-start" : "justify-end"}`}>
              {m.from === "bot" && <BotAvatar />}
              <div className={`max-w-[80%] ${m.from === "bot" ? "chat-bubble-bot ml-2" : "chat-bubble-user"} text-[15px] leading-relaxed`}>
                {m.text}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </main>

      {!done && currentQ && (
        <footer className="border-t bg-card">
          <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground">Pick a suggestion or write your own answer 👇</p>
            <div className="flex flex-wrap gap-2">
              {currentQ.choices.map((c) => (
                <button key={c.label} onClick={() => handleChoice(c)} className="rounded-full border-2 border-border bg-background hover:border-primary hover:bg-accent px-4 py-2 text-sm font-semibold transition">
                  {c.label}
                </button>
              ))}
            </div>
            <form onSubmit={handleText} className="flex gap-2">
              <Input value={textInput} onChange={(e) => setTextInput(e.target.value)} placeholder="Type your own answer…" />
              <Button type="submit" disabled={!textInput.trim() || saving} className="rounded-2xl font-bold">Send</Button>
            </form>
          </div>
        </footer>
      )}
    </div>
  );
}

function BotAvatar() {
  return (
    <span aria-hidden className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-2xl text-white shadow-sm" style={{ backgroundColor: "#2D7DD2" }}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12c0-2 1.5-3 3-3s3 1 3 3v3" />
        <path d="M10 12c0-2 1.5-3 3-3s3 1 3 3" />
        <path d="M16 12c0-1.7 1.3-3 3-3" />
        <path d="M7 12v4a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4v-4" />
      </svg>
    </span>
  );
}
