import React, { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { Stethoscope, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/ui";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={location.state?.from?.pathname || "/dashboard"} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);
    if (res.success) navigate("/dashboard");
    else setError(res.error);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-4 text-[var(--text)]">
      <div className="w-full max-w-md animate-rise">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-white">
            <Stethoscope size={22} />
          </div>
          <h1 className="font-display text-2xl font-semibold">Hospital Queue System</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Sign in to manage patient flow</p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-card)]">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Email</label>
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  id="email" type="email" value={email} autoComplete="username"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@hospital.test" className="input pl-9"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Password</label>
              <div className="relative">
                <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  id="password" type={showPw ? "text" : "password"} value={password} autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" className="input pl-9 pr-9"
                />
                <button
                  type="button" onClick={() => setShowPw((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text)]"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && <p role="alert" className="text-sm text-[var(--danger)] animate-fade-in">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? <Spinner size={15} /> : "Sign in"}
            </button>
          </form>

          <div className="mt-5 rounded-xl bg-[var(--surface-2)] p-3 text-xs text-[var(--text-muted)]">
            <p className="mb-1 font-medium text-[var(--text)]">Demo accounts</p>
            <p>Admin — admin@hospital.test / Admin@123</p>
            <p>Receptionist — reception@hospital.test / Reception@123</p>
            <p>Doctor — doctor@hospital.test / Doctor@123</p>
            <p>Display — display@hospital.test / Display@123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
