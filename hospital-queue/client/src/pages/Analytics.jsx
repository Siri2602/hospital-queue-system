import React, { useEffect, useState } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Users, CheckCircle2, SkipForward, XCircle, AlertTriangle, TrendingUp, Download,
} from "lucide-react";
import api, { API_BASE } from "../lib/api";
import { Card, StatCard, Skeleton } from "../components/ui";
import { useAuth } from "../context/AuthContext";

export default function Analytics() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/analytics/summary").then((res) => setData(res.data));
  }, []);

  const downloadMonthly = () => {
    const token = localStorage.getItem("hq-token");
    const month = new Date().toISOString().slice(0, 7);
    fetch(`${API_BASE}/api/export/monthly-csv?month=${month}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `monthly-report-${month}.csv`; a.click();
        URL.revokeObjectURL(url);
      });
  };

  if (!data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const { totals, hourly, byDepartment, byDoctor, trend } = data;
  const chartColors = { primary: "var(--primary)", success: "var(--success)", teal: "var(--accent)" };

  return (
    <div className="space-y-6 animate-page-in">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-[var(--text)]">Analytics &amp; reporting</h2>
        {(user?.role === "admin" || user?.role === "receptionist") && (
          <button onClick={downloadMonthly} className="btn-secondary"><Download size={15} /> Monthly report (CSV)</button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} label="Total today" value={totals.total} tone="primary" />
        <StatCard icon={CheckCircle2} label="Completed" value={totals.completed} tone="success" />
        <StatCard icon={SkipForward} label="Skipped" value={totals.skipped} tone="warning" />
        <StatCard icon={XCircle} label="Cancelled" value={totals.cancelled} tone="danger" />
        <StatCard icon={AlertTriangle} label="Emergency" value={totals.emergency} tone="danger" />
        <StatCard icon={TrendingUp} label="Efficiency" value={totals.efficiency} suffix="%" tone="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display text-base font-semibold text-[var(--text)] mb-4">Patients by hour</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={hourly}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.primary} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={chartColors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(h) => `${h}:00`} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} labelFormatter={(h) => `${h}:00`} />
              <Area type="monotone" dataKey="patients" stroke={chartColors.primary} strokeWidth={2} fill="url(#areaFill)" animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-base font-semibold text-[var(--text)] mb-4">Patients by department</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDepartment}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="department" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="patients" fill={chartColors.teal} radius={[6, 6, 0, 0]} animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="font-display text-base font-semibold text-[var(--text)] mb-4">Average wait time trend (last 7 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} unit=" min" />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Line type="monotone" dataKey="avg_wait_minutes" name="Avg wait (min)" stroke={chartColors.success} strokeWidth={2.5} dot={{ r: 3 }} animationDuration={800} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-display text-base font-semibold text-[var(--text)] mb-4">Doctor performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-4 py-2">Doctor</th>
                <th className="px-4 py-2">Patients</th>
                <th className="px-4 py-2">Completed</th>
                <th className="px-4 py-2">Avg. consult time</th>
              </tr>
            </thead>
            <tbody>
              {byDoctor.map((d) => (
                <tr key={d.doctor} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-2.5 font-medium text-[var(--text)]">{d.doctor}</td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)]">{d.patients}</td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)]">{d.completed}</td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)]">{d.avg_consult_seconds ? `${Math.round(d.avg_consult_seconds / 60)} min` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
