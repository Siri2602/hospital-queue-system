import React from "react";
import { Link } from "react-router-dom";
import { Stethoscope } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg)] px-4 text-center text-[var(--text)]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-white"><Stethoscope size={22} /></div>
      <h1 className="font-display text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-[var(--text-muted)]">The page you're looking for doesn't exist.</p>
      <Link to="/dashboard" className="btn-primary mt-2">Go to dashboard</Link>
    </div>
  );
}
