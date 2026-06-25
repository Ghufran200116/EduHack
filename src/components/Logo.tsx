import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2 font-extrabold text-xl text-foreground ${className}`}>
      <span aria-hidden className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        {/* fist-bump glyph */}
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12c0-2 1.5-3 3-3s3 1 3 3v3" />
          <path d="M10 12c0-2 1.5-3 3-3s3 1 3 3" />
          <path d="M16 12c0-1.7 1.3-3 3-3" />
          <path d="M7 12v4a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4v-4" />
        </svg>
      </span>
      <span>EduHack</span>
    </Link>
  );
}
