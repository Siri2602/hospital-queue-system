import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Stethoscope, Sun, Moon, Wifi, WifiOff, LogOut, Download } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useQueue } from "../context/QueueContext";
import { IconButton, cx } from "./ui";
import { API_BASE } from "../lib/api";

const NAV_BY_ROLE = {
  admin: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/display", label: "Patient display" },
    { to: "/analytics", label: "Analytics" },
    { to: "/settings", label: "Settings" },
  ],
  receptionist: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/display", label: "Patient display" },
    { to: "/analytics", label: "Analytics" },
    { to: "/settings", label: "Settings" },
  ],
  doctor: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/display", label: "Patient display" },
  ],
  display: [{ to: "/display", label: "Patient display" }],
};

export default function Layout() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { settings, connected } = useQueue();
  const navigate = useNavigate();

  const tabs = NAV_BY_ROLE[user?.role] || [];
  const hospitalName = settings.hospital_name || "Hospital Queue System";

  const exportCSV = () => {
    const token = localStorage.getItem("hq-token");
    fetch(`${API_BASE}/api/export/csv`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `queue-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors duration-500">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg)]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-white">
              <Stethoscope size={18} />
            </div>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold leading-tight truncate text-[var(--text)]">{hospitalName}</p>
              <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                {connected ? (
                  <><Wifi size={11} className="text-[var(--success)]" /> Live &middot; All systems synced</>
                ) : (
                  <><WifiOff size={11} className="text-[var(--danger)]" /> Reconnecting&hellip;</>
                )}
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 rounded-2xl bg-[var(--surface-2)] p-1">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                className={({ isActive }) =>
                  cx(
                    "relative rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300",
                    isActive ? "bg-[var(--card)] text-[var(--text)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"
                  )
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {(user?.role === "admin" || user?.role === "receptionist") && (
              <button onClick={exportCSV} className="btn-ghost hidden sm:flex">
                <Download size={15} /> Export CSV
              </button>
            )}
            <IconButton icon={theme === "dark" ? Sun : Moon} label="Toggle theme" onClick={toggleTheme} />
            <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-soft)] text-sm font-semibold text-[var(--primary)] sm:flex" title={user?.name}>
              {user?.name?.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <IconButton icon={LogOut} label="Sign out" onClick={() => { logout(); navigate("/login"); }} />
          </div>
        </div>

        <div className="flex md:hidden gap-1 overflow-x-auto px-4 pb-2">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                cx(
                  "shrink-0 rounded-xl px-3.5 py-1.5 text-sm font-medium transition-all duration-300",
                  isActive ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
