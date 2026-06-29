import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DIMENSIONS, STUDY_TIPS, type DimensionKey, EMPTY_SCORES, type DimensionScores } from "@/lib/dimensions";
import { LearningFingerprint } from "@/lib/fingerprint";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FEEDBACK_QUESTIONS } from "@/lib/feedbackQuestions";
import { MessageSquareHeart } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Your learning profile — EduHack" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [scores, setScores] = useState<DimensionScores | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/", replace: true }); }, [loading, user, navigate]);
  useEffect(() => {
    if (!user) return;
    supabase.from("dimension_scores").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!data) { setScores(EMPTY_SCORES); return; }
      setScores({
        visual: data.visual, kinesthetic: data.kinesthetic, auditory: data.auditory,
        read_write: data.read_write, social: data.social,
      });
    });
  }, [user]);

  if (!scores) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading your fingerprint…</div>;

  const sorted = [...DIMENSIONS].sort((a, b) => scores[b.key] - scores[a.key]);
  const top = sorted.slice(0, 2);
  const headline = `You lean ${top[0].label.toLowerCase()}, with strong ${top[1].label.toLowerCase()} support.`;
  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/" }); };

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-4 border-b flex items-center justify-between">
        <Logo />
        <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground">Sign out</button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-bold uppercase tracking-wide">Your learning fingerprint</span>
          <h1 className="mt-3 text-3xl md:text-4xl font-extrabold">{headline}</h1>
          <p className="mt-2 text-muted-foreground">A blend across five dimensions — not a single label. It can shift over time.</p>
        </div>

        <div className="mt-8 grid md:grid-cols-2 gap-8 items-center">
          <div className="flex justify-center">
            <LearningFingerprint scores={scores} size={360} />
          </div>
          <div className="space-y-3">
            {sorted.map((d) => {
              const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
              const pct = Math.round((scores[d.key] / total) * 100);
              return (
                <div key={d.key} className="rounded-2xl border-2 p-4 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.hex }} />
                      <span className="font-extrabold">{d.label}</span>
                    </div>
                    <span className="font-bold">{pct}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{d.blurb}</p>
                  <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: d.hex }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <section className="mt-12">
          <h2 className="text-2xl font-extrabold">Study tips for you</h2>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {top.flatMap((d) => STUDY_TIPS[d.key].map((t, i) => <TipCard key={d.key + i} dimKey={d.key} text={t} />))}
          </div>
        </section>

        <JoinCourseSection />

        <div className="mt-10 flex flex-wrap gap-3">
          <Link to="/chat"><Button variant="outline" className="rounded-2xl font-bold">Edit my answers</Button></Link>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Private by default. Educators only see anonymized class aggregates — and only if you opted in.
        </p>
      </main>
    </div>
  );
}

function TipCard({ dimKey, text }: { dimKey: DimensionKey; text: string }) {
  const d = DIMENSIONS.find((x) => x.key === dimKey)!;
  return (
    <div className="rounded-2xl p-4 border-2" style={{ borderColor: d.hex, backgroundColor: `${d.hex}14` }}>
      <span className="text-xs font-extrabold uppercase tracking-wide" style={{ color: d.hex }}>{d.label}</span>
      <p className="mt-1 text-sm font-semibold">{text}</p>
    </div>
  );
}

function JoinCourseSection() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<{ id: string; name: string; semester: string }[]>([]);

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("enrollments")
      .select("course_id, courses(id, name, semester)")
      .eq("user_id", user.id);
    const list = (data ?? [])
      .map((r: any) => r.courses)
      .filter(Boolean) as { id: string; name: string; semester: string }[];
    setCourses(list);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user]);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError(null); setJoining(true);
    const { data, error: rpcErr } = await supabase.rpc("join_course_by_code" as any, { _code: code.trim() });
    setJoining(false);
    if (rpcErr) { setError("That join code didn't match any course. Double-check with your educator."); return; }
    const joined = (data as any)?.[0];
    if (joined) {
      toast.success(`You've joined ${joined.course_name}.`);
      setCode("");
      refresh();
    }
  };

  return (
    <section className="mt-12 rounded-3xl border-2 bg-card p-6">
      <h2 className="text-xl font-extrabold">Join a course</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Got a join code from your educator? Paste it below — you can join as many courses as you like.
      </p>
      <form onSubmit={join} className="mt-4 flex flex-wrap gap-2 items-start">
        <div className="flex-1 min-w-[200px]">
          <Input
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
            placeholder="e.g. DIA-7K2X"
            className="font-mono tracking-widest uppercase"
          />
          {error && <p className="mt-1 text-xs text-destructive font-semibold">{error}</p>}
        </div>
        <Button type="submit" disabled={joining || !code.trim()} className="h-10 rounded-2xl font-bold">
          {joining ? "Joining…" : "Join"}
        </Button>
      </form>

      {courses.length > 0 && (
        <div className="mt-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-muted-foreground">My courses</p>
          <ul className="mt-2 space-y-2">
            {courses.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-2.5 bg-background">
                <div className="text-sm">
                  <span className="font-extrabold">{c.name}</span>
                  <span className="text-muted-foreground"> · {c.semester}</span>
                </div>
                <FeedbackDialog courseId={c.id} courseName={c.name} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function FeedbackDialog({ courseId, courseName }: { courseId: string; courseName: string }) {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const entries = Object.entries(answers)
      .map(([qk, v]) => [qk, v.trim()] as const)
      .filter(([, v]) => !!v);
    if (entries.length === 0) { toast.error("Pick at least one answer"); return; }
    setSaving(true);
    for (const [qk, ak] of entries) {
      const { error } = await supabase.rpc("submit_course_feedback" as any, {
        _course_id: courseId, _question_key: qk, _answer_key: ak,
      });
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    setSaving(false);
    toast.success("Thanks — your feedback was sent anonymously.");
    setOpen(false);
    setAnswers({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full font-bold gap-1.5">
          <MessageSquareHeart className="h-3.5 w-3.5" /> Give feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Anonymous feedback · {courseName}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Your educator sees only aggregated answers grouped by learning style — never your name or profile.
        </p>
        <div className="space-y-5 mt-2">
          {FEEDBACK_QUESTIONS.map((q) => (
            <div key={q.key}>
              <p className="font-extrabold text-sm">{q.prompt}</p>
              {q.type === "text" ? (
                <Textarea
                  value={answers[q.key] ?? ""}
                  onChange={(e) => setAnswers((s) => ({ ...s, [q.key]: e.target.value }))}
                  placeholder="Optional — write whatever's on your mind…"
                  className="mt-2 rounded-2xl"
                  rows={3}
                />
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.options.map((opt) => {
                    const selected = answers[q.key] === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setAnswers((s) => ({ ...s, [q.key]: opt.key }))}
                        className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold transition ${selected ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:border-primary"}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)} className="rounded-2xl font-bold">Cancel</Button>
          <Button onClick={submit} disabled={saving} className="rounded-2xl font-bold">
            {saving ? "Sending…" : "Send anonymously"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
