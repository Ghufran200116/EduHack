import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import { BookOpen, Presentation } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "EduHack — Find your learning style" },
    { name: "description", content: "Sign in or sign up to discover how you learn best, or get anonymized class insights as an educator." },
  ]}),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<"student" | "educator" | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [institution, setInstitution] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already signed in
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      navigate({ to: p?.role === "educator" ? "/courses" : "/onboarding", replace: true });
    });
  }, [navigate]);

  const canSubmit = role && email && password && (mode === "login" || (name && confirm === password));

  const goAfterAuth = async (userId: string) => {
    const { data: p } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    navigate({ to: p?.role === "educator" ? "/courses" : "/onboarding", replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return toast.error("Pick a role first");
    setLoading(true);
    try {
      if (mode === "signup") {
        if (password !== confirm) throw new Error("Passwords don't match");
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { name, role, institution: institution || null, subject: subject || null },
          },
        });
        if (error) throw error;
        // Ensure profile row exists (trigger usually does it)
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id, name, email, role,
            institution: institution || null, subject: subject || null,
          });
          await goAfterAuth(data.user.id);
        } else {
          toast.success("Check your inbox to confirm your email.");
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Make sure role is correct, in case profile was created with default
        await supabase.from("profiles").update({ role }).eq("id", data.user.id);
        await goAfterAuth(data.user.id);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!role) return toast.error("Pick a role first");
    sessionStorage.setItem("eduhack:pendingRole", role);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) return toast.error("Google sign-in failed");
    if (result.redirected) return;
    // tokens returned — set role and route
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, name: data.user.user_metadata?.name ?? "", email: data.user.email ?? "", role });
      await goAfterAuth(data.user.id);
    }
  };

  // Handle pending role after OAuth redirect
  useEffect(() => {
    const pending = sessionStorage.getItem("eduhack:pendingRole") as "student" | "educator" | null;
    if (!pending) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      sessionStorage.removeItem("eduhack:pendingRole");
      await supabase.from("profiles").upsert({ id: data.user.id, name: data.user.user_metadata?.name ?? "", email: data.user.email ?? "", role: pending });
      const target = pending === "educator" ? "/courses" : "/onboarding";
      navigate({ to: target, replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Brand panel */}
      <aside className="relative overflow-hidden bg-primary text-primary-foreground p-8 md:p-12 flex flex-col justify-between">
        <Logo className="text-primary-foreground" />
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
            Find your learning profile. <span className="text-sun">Grow your way.</span>
          </h1>
          <p className="mt-4 text-base/relaxed opacity-90">
            A friendly chatbot helps you see your mix of learning tendencies — never a label, never a box.
          </p>
        </div>
        {/* concentric rings */}
        <svg aria-hidden viewBox="0 0 400 400" className="absolute -right-16 -bottom-16 h-[420px] w-[420px] opacity-70">
          {[180, 140, 100, 60, 20].map((r) => (
            <circle key={r} cx="200" cy="200" r={r} fill="none" stroke="#F2C200" strokeWidth="6" />
          ))}
        </svg>
        <p className="relative z-10 text-sm opacity-80">Your profile is private by default.</p>
      </aside>

      {/* Form panel */}
      <main className="p-6 md:p-12 flex items-center">
        <div className="w-full max-w-md mx-auto">
          <div className="md:hidden mb-6"><Logo /></div>

          <div className="flex gap-2 mb-6 text-sm font-semibold">
            <button onClick={() => setMode("login")} className={`px-4 py-2 rounded-full ${mode === "login" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>Log in</button>
            <button onClick={() => setMode("signup")} className={`px-4 py-2 rounded-full ${mode === "signup" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>Sign up</button>
          </div>

          <p className="text-sm font-semibold mb-3">First, I'm a…</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <RoleCard active={role === "student"} onClick={() => setRole("student")} icon={<BookOpen className="h-5 w-5" />} label="Student" />
            <RoleCard active={role === "educator"} onClick={() => setRole("educator")} icon={<Presentation className="h-5 w-5" />} label="Educator" />
          </div>

          <form onSubmit={handleSubmit} className={`space-y-4 ${!role ? "opacity-40 pointer-events-none" : ""}`}>
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" required={mode === "signup"} />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {mode === "signup" && (
              <>
                <div>
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="institution">Institution (optional)</Label>
                  <Input id="institution" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="e.g. Lovable Uni" />
                </div>
                {role === "educator" && (
                  <div>
                    <Label htmlFor="subject">Subject / Department (optional)</Label>
                    <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Computer Science" />
                  </div>
                )}
              </>
            )}
            <Button type="submit" disabled={!canSubmit || loading} className="w-full h-11 text-base font-bold rounded-2xl">
              {loading ? "Just a sec…" : mode === "login" ? "Log in" : "Create my account"}
            </Button>
          </form>

          <div className={`mt-4 ${!role ? "opacity-40 pointer-events-none" : ""}`}>
            <Button type="button" variant="outline" onClick={handleGoogle} className="w-full h-11 rounded-2xl font-semibold">
              Continue with Google
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
            Your role determines what you see — students get a personal learning profile, educators get anonymized class insights.
          </p>
        </div>
      </main>
    </div>
  );
}

function RoleCard({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border-2 px-4 py-4 text-left transition flex items-center gap-3 ${active ? "border-primary bg-accent text-accent-foreground" : "border-border hover:border-foreground/30"}`}>
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>{icon}</span>
      <span className="font-bold">I'm a {label}</span>
    </button>
  );
}
