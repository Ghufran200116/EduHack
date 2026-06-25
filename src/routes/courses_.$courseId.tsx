import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DIMENSIONS, type DimensionKey } from "@/lib/dimensions";
import { Logo } from "@/components/Logo";
import { Donut } from "@/lib/donut";
import { FEEDBACK_QUESTIONS } from "@/lib/feedbackQuestions";
import { Lock, ArrowLeft, MessageSquareHeart, Copy, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/courses_/$courseId")({
  head: () => ({ meta: [{ title: "Course insights — EduHack" }] }),
  component: CourseDetail,
});

interface Course { id: string; name: string; semester: string; join_code: string }
interface Agg {
  enrolled_count: number; profiled_count: number; consenting_count: number; unlocked: boolean;
  visual: number; kinesthetic: number; auditory: number; read_write: number; social: number;
}
interface FeedbackRow { question_key: string; answer_key: string; dominant_dimension: string; count: number }

const SUGGESTIONS: Record<DimensionKey, { material: string[]; method: string[] }> = {
  visual: {
    material: [
      "Add diagrams, mind-maps, and short explainer videos before dense text.",
      "Use color-coded slides and infographic summaries at the end of each topic.",
    ],
    method: [
      "Sketch concepts live on a whiteboard instead of reading them off slides.",
      "Pause for 30 seconds after each visual to let students annotate it.",
    ],
  },
  kinesthetic: {
    material: [
      "Replace one lecture per week with a hands-on lab or build session.",
      "Provide downloadable worksheets students can physically fill in.",
    ],
    method: [
      "Open each topic with a 5-minute experiment before the explanation.",
      "Let students learn by breaking and fixing a working example.",
    ],
  },
  auditory: {
    material: [
      "Publish short audio recaps (5–7 min) after each lecture.",
      "Curate one external podcast episode per topic as optional listening.",
    ],
    method: [
      "Build in think-pair-share moments so students verbalize ideas.",
      "Run a 10-minute live Q&A at the end — not as homework.",
    ],
  },
  read_write: {
    material: [
      "Provide structured note templates and one-page chapter summaries.",
      "Share a reading list with curated articles ranked by depth.",
    ],
    method: [
      "Assign short reflective write-ups instead of multiple-choice quizzes.",
      "Ask students to rewrite a concept in their own words before exercises.",
    ],
  },
  social: {
    material: [
      "Design group project briefs with clear individual roles.",
      "Set up a class channel for peer Q&A — moderated, not graded.",
    ],
    method: [
      "Use pair-programming or peer-review weekly.",
      "Have students teach a topic back to a partner before assessment.",
    ],
  },
};

function CourseDetail() {
  const { courseId } = Route.useParams();
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [agg, setAgg] = useState<Agg | null>(null);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/", replace: true });
    if (!loading && profile && profile.role !== "educator") navigate({ to: "/profile", replace: true });
  }, [loading, user, profile, navigate]);

  useEffect(() => {
    supabase.from("courses").select("*").eq("id", courseId).maybeSingle().then(({ data }) => setCourse(data as Course | null));
    supabase.rpc("get_course_aggregate", { _course_id: courseId }).then(({ data }) => {
      setAgg(((data as Agg[] | null)?.[0] ?? null));
    });
    supabase.rpc("get_course_feedback_aggregate" as any, { _course_id: courseId }).then(({ data }) => {
      setFeedback(((data ?? []) as any[]).map((r) => ({ ...r, count: Number(r.count) })));
    });
  }, [courseId]);

  if (!course || !agg) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;

  const pct = agg.enrolled_count > 0 ? Math.round((agg.profiled_count / agg.enrolled_count) * 100) : 0;
  const rawData = DIMENSIONS.map((d) => ({ key: d.key, label: d.label, value: (agg as any)[d.key] as number, color: d.hex }));
  const totalVal = rawData.reduce((s, x) => s + x.value, 0) || 1;
  const rows = rawData.map((d) => ({ ...d, pct: Math.round((d.value / totalVal) * 100) }));
  const topDims = [...rows].sort((a, b) => b.value - a.value).slice(0, 2);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-4 border-b flex items-center justify-between">
        <Logo />
        <Link to="/courses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All courses
        </Link>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">
        <p className="text-xs font-extrabold uppercase tracking-widest text-primary">Educator dashboard</p>
        <h1 className="mt-1 text-3xl md:text-4xl font-extrabold">{course.name}</h1>
        <p className="text-muted-foreground mt-1">{course.semester}</p>
        <p className="text-muted-foreground text-sm mt-0.5">{agg.profiled_count} of {agg.enrolled_count} students profiled · {pct}%</p>
        <button
          onClick={() => { navigator.clipboard.writeText(course.join_code); }}
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-3 py-1 text-xs font-bold hover:opacity-90"
        >
          Join code: <span className="tracking-wider">{course.join_code}</span> <Copy className="h-3.5 w-3.5" />
        </button>

        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          <Stat label="Enrolled" value={agg.enrolled_count} />
          <Stat label="Profiled" value={agg.profiled_count} />
          <Stat label="Completion" value={`${pct}%`} />
        </div>

        {!agg.unlocked ? (
          <div className="mt-10 rounded-3xl border-2 border-dashed p-10 text-center bg-card">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 font-extrabold text-lg">Insights unlock at 5 consenting students</h2>
            <p className="text-sm text-muted-foreground mt-1">
              We're at {agg.consenting_count}. Aggregates are gated server-side to protect privacy.
            </p>
          </div>
        ) : (
          <>
            <section className="mt-10 rounded-3xl border-2 bg-card p-6">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-xl font-extrabold">Learning preference distribution</h2>
                  <p className="text-sm text-muted-foreground">Aggregated across {agg.consenting_count} consenting students.</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" /> Anonymized & aggregated only
                </span>
              </div>

              <div className="mt-6 grid md:grid-cols-[auto_1fr] gap-8 items-center">
                <div className="flex justify-center">
                  <Donut
                    slices={rows}
                    centerLabel={String(agg.consenting_count)}
                    centerSub="students"
                  />
                </div>
                <ul className="space-y-2.5">
                  {rows.map((d) => (
                    <li key={d.key} className="flex items-center justify-between gap-3 text-sm">
                      <span className="inline-flex items-center gap-2 font-semibold">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.label}
                      </span>
                      <span className="font-extrabold tabular-nums" style={{ color: d.color }}>{d.pct}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-extrabold">Recommendations for your teaching</h2>
              <p className="text-sm text-muted-foreground">Generated from the strongest learning preferences in your class.</p>
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                {topDims.map((d) => (
                  <div key={d.key} className="rounded-2xl border-2 p-5 bg-card" style={{ borderColor: d.color }}>
                    <div className="text-xs font-extrabold uppercase tracking-wide" style={{ color: d.color }}>
                      {d.pct}% lean {d.label.toLowerCase()}
                    </div>
                    <h3 className="mt-1 font-extrabold">Teaching material</h3>
                    <ul className="mt-1 space-y-1 text-sm">
                      {SUGGESTIONS[d.key as DimensionKey].material.map((t, i) => (
                        <li key={i} className="flex gap-2"><span style={{ color: d.color }}>•</span>{t}</li>
                      ))}
                    </ul>
                    <h3 className="mt-3 font-extrabold">Teaching method</h3>
                    <ul className="mt-1 space-y-1 text-sm">
                      {SUGGESTIONS[d.key as DimensionKey].method.map((t, i) => (
                        <li key={i} className="flex gap-2"><span style={{ color: d.color }}>•</span>{t}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <FeedbackSection feedback={feedback} />
          </>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Data is anonymized and aggregated only — individual students are never shown.
        </p>
      </main>
    </div>
  );
}

function FeedbackSection({ feedback }: { feedback: FeedbackRow[] }) {
  const totalResponses = feedback.reduce((s, x) => s + x.count, 0);
  return (
    <section className="mt-10 rounded-3xl border-2 bg-card p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-primary/10 p-3 text-primary"><MessageSquareHeart className="h-5 w-5" /></div>
        <div>
          <h2 className="text-xl font-extrabold">Anonymous student feedback</h2>
          <p className="text-sm text-muted-foreground">
            Students answer short predefined questions. Responses are tagged only by their predominant learning style — never by identity.
          </p>
        </div>
      </div>

      {totalResponses === 0 ? (
        <div className="mt-6 rounded-2xl bg-muted/40 p-5 text-sm text-muted-foreground text-center">
          No feedback yet. Students can submit from their profile screen — share your join code to invite them.
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {FEEDBACK_QUESTIONS.map((q) => {
            const rowsForQ = feedback.filter((r) => r.question_key === q.key);
            if (rowsForQ.length === 0) return null;
            const qTotal = rowsForQ.reduce((s, x) => s + x.count, 0);
            return (
              <div key={q.key}>
                <h3 className="font-extrabold text-sm">{q.prompt}</h3>
                <p className="text-xs text-muted-foreground">{qTotal} response{qTotal === 1 ? "" : "s"}</p>
                <div className="mt-2 space-y-2">
                  {q.options.map((opt) => {
                    const slices = DIMENSIONS.map((d) => ({
                      dim: d,
                      n: rowsForQ.filter((r) => r.answer_key === opt.key && r.dominant_dimension === d.key).reduce((s, x) => s + x.count, 0),
                    }));
                    const optTotal = slices.reduce((s, x) => s + x.n, 0);
                    if (optTotal === 0) return null;
                    const pct = Math.round((optTotal / qTotal) * 100);
                    return (
                      <div key={opt.key} className="rounded-xl bg-muted/30 p-3">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>{opt.label}</span>
                          <span className="text-muted-foreground">{optTotal} · {pct}%</span>
                        </div>
                        <div className="mt-1.5 flex h-2.5 w-full overflow-hidden rounded-full bg-background">
                          {slices.filter((s) => s.n > 0).map(({ dim, n }) => (
                            <div key={dim.key} title={`${dim.label}: ${n}`}
                              style={{ width: `${(n / optTotal) * 100}%`, backgroundColor: dim.hex }} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-muted-foreground pt-2 border-t">
            <span>Bar colors:</span>
            {DIMENSIONS.map((d) => (
              <span key={d.key} className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.hex }} />{d.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border-2 p-5 bg-card">
      <div className="text-xs font-bold uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}
