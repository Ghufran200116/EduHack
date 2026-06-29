import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — EduHack" }] }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [profileConsent, setProfileConsent] = useState(false);
  const [insightsConsent, setInsightsConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/", replace: true });
    if (!loading && profile?.role === "educator") navigate({ to: "/courses", replace: true });
  }, [loading, user, profile, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("consents").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) { setProfileConsent(data.profile_consent); setInsightsConsent(data.insights_consent); }
    });
  }, [user]);

  const start = async () => {
    if (!user || !profileConsent) return;
    setSaving(true);
    await supabase.from("consents").upsert({ user_id: user.id, profile_consent: true, insights_consent: insightsConsent, updated_at: new Date().toISOString() });
    navigate({ to: "/chat" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-4 border-b"><Logo /></header>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
          Hey{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""} 👋
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">
          EduHack helps you spot how you learn best — through a quick chat with our friendly bot.
        </p>

        <div className="mt-10 grid sm:grid-cols-3 gap-4">
          {[
            { n: "1", t: "Chat for ~3 min", d: "A short chat, no right or wrong answers." },
            { n: "2", t: "See your fingerprint", d: "A blend across five learning dimensions." },
            { n: "3", t: "Try the study tips", d: "Practical nudges tailored to your mix." },
          ].map((s) => (
            <div key={s.n} className="rounded-3xl border-2 p-5 bg-card">
              <div className="h-10 w-10 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold">{s.n}</div>
              <h3 className="mt-3 font-extrabold">{s.t}</h3>
              <p className="text-sm text-muted-foreground mt-1">{s.d}</p>
            </div>
          ))}
        </div>

        <section className="mt-12 rounded-3xl bg-card border-2 p-6 md:p-8 space-y-4">
          <h2 className="text-xl font-extrabold">Before we begin</h2>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={profileConsent} onCheckedChange={(v) => setProfileConsent(!!v)} className="mt-1" />
            <span>
              <span className="font-bold">Create my learning profile</span>
              <span className="block text-sm text-muted-foreground">Required to use EduHack. Stays private to you.</span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={insightsConsent} onCheckedChange={(v) => setInsightsConsent(!!v)} className="mt-1" />
            <span>
              <span className="font-bold">Share my anonymized data with class insights <span className="text-muted-foreground font-medium">(optional)</span></span>
              <span className="block text-sm text-muted-foreground">Helps your educators see the class learning mix — never your individual answers.</span>
            </span>
          </label>

          <Dialog>
            <DialogTrigger className="text-sm text-primary font-semibold underline-offset-4 hover:underline">What happens to my data?</DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Your data, simply</DialogTitle></DialogHeader>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li>• Your individual answers and scores are <b>only ever visible to you</b>.</li>
                <li>• Educators see <b>aggregated</b> class data, never single students.</li>
                <li>• Aggregates are only unlocked once <b>5+ consenting students</b> have profiled.</li>
                <li>• You can edit your answers any time — the profile is a snapshot, not a verdict.</li>
              </ul>
            </DialogContent>
          </Dialog>

          <div className="flex justify-center">
            <Button onClick={start} disabled={!profileConsent || saving} className="w-full sm:w-auto h-12 px-8 text-base font-bold rounded-2xl">
              Start
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
