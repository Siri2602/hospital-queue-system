import React, { useState } from "react";
import { Play, Pause, RefreshCw, Clock, Volume2 } from "lucide-react";
import api, { apiErrorMessage } from "../../lib/api";
import { Card, Toggle, Spinner } from "../ui";
import { useToast } from "../ToastContext";

export default function QueueControls({ paused, avgTime, voiceOn }) {
  const showToast = useToast();
  const [busy, setBusy] = useState(false);
  const [time, setTime] = useState(avgTime);

  const toggleQueue = async () => {
    setBusy(true);
    try {
      await api.post(`/queue/${paused ? "resume" : "pause"}`);
    } catch (err) {
      showToast(apiErrorMessage(err), "danger");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    try {
      await api.post("/queue/reset");
      showToast("Queue reset", "primary");
    } catch (err) {
      showToast(apiErrorMessage(err), "danger");
    } finally {
      setBusy(false);
    }
  };

  const commitAvgTime = async (val) => {
    const minutes = Math.max(1, Math.min(60, Number(val) || 1));
    setTime(minutes);
    try {
      await api.put("/settings", { avg_consult_minutes: String(minutes) });
    } catch (err) {
      showToast(apiErrorMessage(err), "danger");
    }
  };

  const toggleVoice = async (val) => {
    try {
      await api.put("/settings", { voice_enabled: String(val) });
    } catch (err) {
      showToast(apiErrorMessage(err), "danger");
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <button onClick={toggleQueue} disabled={busy} className="btn-secondary">
            {busy ? <Spinner size={15} /> : paused ? <><Play size={15} /> Resume queue</> : <><Pause size={15} /> Pause queue</>}
          </button>
          <button onClick={reset} disabled={busy} className="btn-ghost">
            <RefreshCw size={15} /> Reset queue
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Clock size={15} /> Avg. consult time
            <input
              type="number" min={1} max={60} value={time}
              onChange={(e) => commitAvgTime(e.target.value)}
              className="input w-16 px-2 py-1 text-center" aria-label="Average consultation time in minutes"
            />
            <span>min</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Volume2 size={15} /> Voice announcements
            <Toggle checked={voiceOn} onChange={toggleVoice} label="Voice announcements" />
          </label>
        </div>
      </div>
    </Card>
  );
}
