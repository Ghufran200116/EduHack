import { Link } from "@tanstack/react-router";
import logoImg from "@/assets/logo.jpeg";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" className={`inline-flex items-center gap-2 font-extrabold text-xl text-foreground ${className}`}>
      <img src={logoImg} alt="" aria-hidden className="h-9 w-9 rounded-2xl object-cover shadow-sm" />
      <span>EduHack</span>
    </Link>
  );
}
