import React from "react";
import { Card, EmptyState, cx } from "../ui";
import { Activity } from "lucide-react";

const DOT_TONE = {
  primary: "bg-[var(--primary)]",
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
  info: "bg-[var(--info)]",
};

export default function ActivityFeed({ items }) {
  return (
    <Card className="p-5">
      <h3 className="font-display text-base font-semibold text-[var(--text)] mb-3">Activity feed</h3>
      <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto pr-1">
        {items.length === 0 && <EmptyState icon={Activity} title="No activity yet" />}
        {items.map((it) => (
          <div key={it.id} className="flex items-start gap-2.5 animate-fade-in">
            <span className={cx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", DOT_TONE[it.tone] || DOT_TONE.primary)} />
            <div>
              <p className="text-sm text-[var(--text)] leading-snug">{it.text}</p>
              <p className="text-xs text-[var(--text-muted)]">{new Date(it.created_at * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
