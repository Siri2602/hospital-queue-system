import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import api from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "./AuthContext";

const QueueContext = createContext(null);

export function QueueProvider({ children }) {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [paused, setPaused] = useState(false);
  const [activity, setActivity] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [settings, setSettings] = useState({});
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const speak = useCallback((token, room) => {
    if (settingsRef.current.voice_enabled !== "true") return;
    try {
      const text = `Token number ${token}, please proceed to ${room || "the consultation room"}.`;
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = settingsRef.current.voice_language || "en-US";
      utter.volume = Number(settingsRef.current.voice_volume ?? 1);
      window.speechSynthesis?.cancel();
      window.speechSynthesis?.speak(utter);
      if (settingsRef.current.voice_auto_repeat === "true") {
        setTimeout(() => {
          const repeat = new SpeechSynthesisUtterance(text);
          repeat.lang = utter.lang;
          repeat.volume = utter.volume;
          window.speechSynthesis?.speak(repeat);
        }, 3500);
      }
    } catch {
      /* speech synthesis unavailable */
    }
  }, []);

  const refresh = useCallback(async () => {
    const [queueRes, deptRes, docRes, settingsRes] = await Promise.all([
      api.get("/queue"),
      api.get("/departments"),
      api.get("/doctors"),
      api.get("/settings"),
    ]);
    setPatients(queueRes.data.patients);
    setPaused(queueRes.data.paused);
    setActivity(queueRes.data.activity);
    setDepartments(deptRes.data.departments);
    setDoctors(docRes.data.doctors);
    setSettings(settingsRes.data.settings);
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));

    const socket = getSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onQueueUpdate = (data) => {
      setPatients(data.patients);
      setPaused(data.paused);
      if (data.activity) setActivity(data.activity);
      if (data.announcement) speak(data.announcement.token, data.announcement.room);
    };
    const onSettings = (data) => setSettings(data.settings);
    const onDeptUpdate = () => {
      api.get("/departments").then((r) => setDepartments(r.data.departments));
    };
    const onDocUpdate = () => {
      api.get("/doctors").then((r) => setDoctors(r.data.doctors));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("queue-updated", onQueueUpdate);
    socket.on("settings-updated", onSettings);
    socket.on("departments-updated", onDeptUpdate);
    socket.on("doctors-updated", onDocUpdate);
    setConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("queue-updated", onQueueUpdate);
      socket.off("settings-updated", onSettings);
      socket.off("departments-updated", onDeptUpdate);
      socket.off("doctors-updated", onDocUpdate);
    };
  }, [user, refresh, speak]);

  return (
    <QueueContext.Provider
      value={{ patients, paused, activity, departments, doctors, settings, connected, loading, refresh }}
    >
      {children}
    </QueueContext.Provider>
  );
}

export const useQueue = () => useContext(QueueContext);
