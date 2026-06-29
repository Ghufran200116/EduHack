import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DIMENSIONS } from "@/lib/dimensions";
import { Logo } from "@/components/Logo";
import { Lock, Plus, Copy, Check, MoreVertical, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/courses")({
  head: () => ({ meta: [{ title: "My courses — EduHack" }] }),
  component: CoursesPage,
});

interface Course { id: string; name: string; semester: string; join_code: string; owner_id: string | null; archived_at: string | null }
interface Agg {
  enrolled_count: number; profiled_count: number; consenting_count: number; unlocked: boolean;
  visual: number; kinesthetic: number; auditory: number; read_write: number; social: number;
}

function CoursesPage() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [aggs, setAggs] = useState<Record<string, Agg>>({});
  const [open, setOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/", replace: true });
    if (!loading && profile && profile.role !== "educator") navigate({ to: "/profile", replace: true });
  }, [loading, user, profile, navigate]);

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("courses")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as unknown as Course[];
    setCourses(list);
    const entries = await Promise.all(list.map(async (c) => {
      const { data: agg } = await supabase.rpc("get_course_aggregate", { _course_id: c.id });
      return [c.id, (agg?.[0] ?? null) as Agg | null] as const;
    }));
    const map: Record<string, Agg> = {};
    for (const [id, a] of entries) if (a) map[id] = a;
    setAggs(map);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [user]);

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/" }); };

  const activeCourses = courses.filter((c) => !c.archived_at);
  const archivedCourses = courses.filter((c) => c.archived_at);

  return (
    <div className="min-h-screen bg-background">
      <header className="px-6 py-4 border-b flex items-center justify-between">
        <Logo />
        <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground">Sign out</button>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold">My courses</h1>
            <p className="mt-2 text-muted-foreground">Anonymized class learning mix — never individual students.</p>
          </div>
          <AddCourseDialog open={open} setOpen={setOpen} onCreated={refresh} />
        </div>

        {courses.length === 0 ? (
          <div className="mt-10 rounded-3xl border-2 border-dashed p-10 text-center bg-card">
            <h2 className="font-extrabold text-lg">No courses yet</h2>
            <p className="text-sm text-muted-foreground mt-1">Create your first course and share its join code with students.</p>
            <Button onClick={() => setOpen(true)} className="mt-5 rounded-2xl font-bold"><Plus className="h-4 w-4 mr-1" />Add course</Button>
          </div>
        ) : activeCourses.length === 0 ? (
          <div className="mt-10 rounded-3xl border-2 border-dashed p-10 text-center bg-card">
            <h2 className="font-extrabold text-lg">All your courses are archived</h2>
            <p className="text-sm text-muted-foreground mt-1">Unarchive one below, or add a new course.</p>
          </div>
        ) : (
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeCourses.map((c) => {
              const a = aggs[c.id];
              const pct = a && a.enrolled_count > 0 ? Math.round((a.profiled_count / a.enrolled_count) * 100) : 0;
              const unlocked = a?.unlocked ?? false;
              const inner = (
                <div className="rounded-3xl border-2 bg-card p-5 hover:border-primary transition cursor-pointer h-full flex flex-col">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-lg">{c.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.semester}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!unlocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                      <CourseMenu course={c} onChanged={refresh} />
                    </div>
                  </div>
                  <JoinCodeChip code={c.join_code} />
                  <div className="mt-3 text-xs text-muted-foreground">
                    {a ? `${a.profiled_count} of ${a.enrolled_count} students profiled · ${pct}%` : "—"}
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-4 flex-1 flex items-end">
                    {unlocked ? (
                      <StackedMini a={a!} />
                    ) : (
                      <div className="w-full rounded-2xl bg-muted text-muted-foreground text-xs px-3 py-3 text-center font-semibold">
                        Insights unlock at 5 participating students
                      </div>
                    )}
                  </div>
                </div>
              );
              return (
                <Link key={c.id} to="/courses/$courseId" params={{ courseId: c.id }} className="block h-full">{inner}</Link>
              );
            })}
          </div>
        )}

        {archivedCourses.length > 0 && (
          <div className="mt-10">
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:underline"
            >
              {showArchived ? "Hide" : "Show"} archived courses ({archivedCourses.length})
            </button>
            {showArchived && (
              <div className="mt-4 space-y-2">
                {archivedCourses.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 bg-muted/30">
                    <div>
                      <span className="font-bold text-sm">{c.name}</span>
                      <span className="text-muted-foreground text-xs"> · {c.semester}</span>
                    </div>
                    <CourseMenu course={c} onChanged={refresh} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function CourseMenu({ course, onChanged }: { course: Course; onChanged: () => void }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const archive = async () => {
    const { error } = await supabase.from("courses").update({ archived_at: new Date().toISOString() } as any).eq("id", course.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Course archived");
    onChanged();
  };

  const unarchive = async () => {
    const { error } = await supabase.from("courses").update({ archived_at: null } as any).eq("id", course.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Course unarchived");
    onChanged();
  };

  const remove = async () => {
    setBusy(true);
    const { error } = await supabase.from("courses").delete().eq("id", course.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Course deleted");
    onChanged();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Course options"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {course.archived_at ? (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); unarchive(); }}>
              <ArchiveRestore className="h-4 w-4 mr-2" /> Unarchive
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); archive(); }}>
              <Archive className="h-4 w-4 mr-2" /> Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setConfirmOpen(true); }} className="text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{course.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the course along with all student enrollments and feedback. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {busy ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function JoinCodeChip({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Join code copied");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="mt-3 inline-flex items-center gap-2 self-start rounded-full bg-accent text-accent-foreground px-3 py-1 text-xs font-bold hover:opacity-90">
      Join code: <span className="tracking-wider">{code}</span>
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function AddCourseDialog({ open, setOpen, onCreated }: { open: boolean; setOpen: (v: boolean) => void; onCreated: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [semester, setSemester] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ name: string; code: string } | null>(null);

  const reset = () => { setName(""); setSemester(""); setCreated(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("courses")
      .insert({ name: name.trim(), semester: semester.trim(), owner_id: user.id } as any)
      .select("name, join_code")
      .single();
    setSaving(false);
    if (error || !data) { toast.error(error?.message ?? "Could not create course"); return; }
    setCreated({ name: (data as any).name, code: (data as any).join_code });
    onCreated();
  };

  const copy = () => {
    if (!created) return;
    navigator.clipboard.writeText(created.code);
    toast.success("Join code copied");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button className="rounded-2xl font-bold"><Plus className="h-4 w-4 mr-1" />Add course</Button>
      </DialogTrigger>
      <DialogContent>
        {!created ? (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader><DialogTitle>New course</DialogTitle></DialogHeader>
            <div>
              <Label htmlFor="cname">Course name</Label>
              <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Data & Information Analysis" required />
            </div>
            <div>
              <Label htmlFor="csem">Semester</Label>
              <Input id="csem" value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="Spring 2026" required />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={saving || !name.trim() || !semester.trim()} className="rounded-2xl font-bold">
                {saving ? "Creating…" : "Create course"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 text-center">
            <DialogHeader><DialogTitle>Course created 🎉</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Share this code with your students:</p>
            <div className="mx-auto inline-flex flex-col items-center gap-3 rounded-3xl border-2 bg-accent text-accent-foreground px-8 py-6">
              <div className="text-3xl font-extrabold tracking-widest">{created.code}</div>
              <div className="text-xs font-semibold opacity-80">{created.name}</div>
            </div>
            <div className="flex justify-center gap-2">
              <Button onClick={copy} variant="outline" className="rounded-2xl font-bold"><Copy className="h-4 w-4 mr-1" />Copy code</Button>
              <Button onClick={() => { setOpen(false); reset(); }} className="rounded-2xl font-bold">Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StackedMini({ a }: { a: Agg }) {
  const vals = DIMENSIONS.map((d) => ({ d, v: (a as any)[d.key] as number }));
  const total = vals.reduce((s, x) => s + x.v, 0) || 1;
  return (
    <div className="w-full">
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {vals.map(({ d, v }) => (
          <div key={d.key} style={{ width: `${(v / total) * 100}%`, backgroundColor: d.hex }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10px] font-semibold text-muted-foreground">
        {vals.map(({ d }) => (
          <span key={d.key} className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: d.hex }} />{d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
