import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export function cx(...args) {
  return args.filter(Boolean).join(" ");
}

export function useAnimatedNumber(value, duration = 600) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    const to = value ?? 0;
    if (from === to) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

export function Card({ className, children, ...rest }) {
  return (
    <div
      className={cx(
        "rounded-2xl border bg-[var(--card)] border-[var(--border)] shadow-[var(--shadow-card)] transition-shadow duration-300 hover:shadow-[var(--shadow-card-hover)]",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Badge({ tone = "info", children }) {
  const toneMap = {
    primary: "bg-[var(--primary-soft)] text-[var(--primary)]",
    info: "bg-[var(--info-soft)] text-[var(--info)]",
    success: "bg-[var(--success-soft)] text-[var(--success)]",
    warning: "bg-[var(--warning-soft)] text-[var(--warning)]",
    danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
    neutral: "bg-[var(--surface-2)] text-[var(--text-muted)]",
  };
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium tracking-wide", toneMap[tone])}>
      {children}
    </span>
  );
}

export function IconButton({ icon: Icon, label, onClick, tone = "neutral", disabled, type = "button" }) {
  const toneMap = {
    neutral: "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
    primary: "text-[var(--primary)] hover:bg-[var(--primary-soft)]",
    success: "text-[var(--success)] hover:bg-[var(--success-soft)]",
    warning: "text-[var(--warning)] hover:bg-[var(--warning-soft)]",
    danger: "text-[var(--danger)] hover:bg-[var(--danger-soft)]",
  };
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2",
        toneMap[tone]
      )}
      style={{ "--tw-ring-color": "var(--primary)" }}
    >
      <Icon size={17} strokeWidth={2} />
    </button>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2",
        checked ? "bg-[var(--primary)]" : "bg-[var(--border-strong)]"
      )}
      style={{ "--tw-ring-color": "var(--primary)" }}
    >
      <span
        className={cx(
          "inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-transform duration-300",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

export function Field({ label, htmlFor, children, hint }) {
  return (
    <div>
      {label && <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">{label}</label>}
      {children}
      {hint && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

export function Select({ id, value, onChange, options, getValue, getLabel, placeholder }) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input appearance-none pr-9 cursor-pointer"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={getValue ? getValue(o) : o} value={getValue ? getValue(o) : o}>
            {getLabel ? getLabel(o) : o}
          </option>
        ))}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, suffix = "", tone = "primary", delay = 0 }) {
  const animated = useAnimatedNumber(value);
  const toneMap = {
    primary: "text-[var(--primary)] bg-[var(--primary-soft)]",
    success: "text-[var(--success)] bg-[var(--success-soft)]",
    warning: "text-[var(--warning)] bg-[var(--warning-soft)]",
    info: "text-[var(--info)] bg-[var(--info-soft)]",
    danger: "text-[var(--danger)] bg-[var(--danger-soft)]",
  };
  return (
    <Card className="p-5 animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-muted)]">{label}</span>
        <span className={cx("flex h-9 w-9 items-center justify-center rounded-xl", toneMap[tone])}>
          <Icon size={17} />
        </span>
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tabular-nums text-[var(--text)]">
        {animated}{suffix}
      </div>
    </Card>
  );
}

export function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-[var(--text-muted)]">
      {Icon && <Icon size={28} className="opacity-40" />}
      <p className="text-sm font-medium text-[var(--text)]">{title}</p>
      {description && <p className="text-xs">{description}</p>}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={cx("skeleton", className)} />;
}

export function Spinner({ size = 16 }) {
  return (
    <svg
      className="animate-spin"
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="3"
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M22 12a10 10 0 0 1-10 10" strokeLinecap="round" />
    </svg>
  );
}
