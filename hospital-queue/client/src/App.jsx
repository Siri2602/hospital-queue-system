import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { QueueProvider } from "./context/QueueContext";
import { ToastProvider } from "./components/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Display from "./pages/Display";
import Analytics from "./pages/Analytics";
import SettingsPage from "./pages/SettingsPage";
import TrackToken from "./pages/TrackToken";
import NotFound from "./pages/NotFound";

export default function App() {
  const { user } = useAuth();

  return (
    <ToastProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/track" element={<TrackToken />} />
        <Route path="/track/:token" element={<TrackToken />} />

        <Route
          element={
            <ProtectedRoute>
              <QueueProvider>
                <Layout />
              </QueueProvider>
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<ProtectedRoute roles={["admin", "receptionist", "doctor"]}><Dashboard /></ProtectedRoute>} />
          <Route path="/display" element={<Display />} />
          <Route path="/analytics" element={<ProtectedRoute roles={["admin", "receptionist"]}><Analytics /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute roles={["admin", "receptionist"]}><SettingsPage /></ProtectedRoute>} />
        </Route>

        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ToastProvider>
  );
}
