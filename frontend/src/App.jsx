import { useEffect, useState } from "react";

import { api } from "./lib/api";

import Layout from "./components/Layout";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import DataManager from "./components/DataManager";
import Simulator from "./components/Simulator";
import History from "./components/History";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");

  const [page, setPage] = useState("dashboard");
  const [source, setSource] = useState("sales");
  const [year, setYear] = useState(2023);

  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        await api.get("/auth/csrf/");

        const response = await api.get("/auth/me/");

        if (active) {
          setUser(response.user);
        }
      } catch (error) {
        if (active) {
          setSessionError(error.message);
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    checkSession();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let active = true;

    api
      .get(`/data/summary/?source=${source}&year=${year}`)
      .then((response) => {
        if (active) {
          setSummary(response);
          setSummaryError("");
          setLoadingSummary(false);
        }
      })
      .catch((error) => {
        if (active) {
          setSummary(null);
          setSummaryError(error.message);
          setLoadingSummary(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user, source, year, reloadKey]);

  function handleSourceChange(value) {
    setSource(value);
    setSummary(null);
    setSummaryError("");
    setLoadingSummary(true);
  }

  function handleYearChange(value) {
    setYear(value);
    setSummary(null);
    setSummaryError("");
    setLoadingSummary(true);
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout/", {});

      setUser(null);
      setSummary(null);
      setPage("dashboard");
    } catch (error) {
      setSessionError(error.message);
    }
  }

  function handleLogin(authenticatedUser) {
    setUser(authenticatedUser);
    setSessionError("");
    setSummary(null);
    setLoadingSummary(true);
    setPage("dashboard");
    setReloadKey((value) => value + 1);
  }

  function handleImport(result) {
    setSource(result.source);
    setYear(2023);
    setSummary(null);
    setSummaryError("");
    setLoadingSummary(true);
    setReloadKey((value) => value + 1);
    setPage("dashboard");
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b] text-sm text-zinc-400">
        Memuat aplikasi...
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} initialError={sessionError} />;
  }

  let content = null;

  if (page === "dashboard") {
    content = (
      <Dashboard
        summary={summary}
        loading={loadingSummary}
        error={summaryError}
        mode="dashboard"
        onOpenData={() => setPage("data")}
      />
    );
  }

  if (page === "analysis") {
    content = (
      <Dashboard
        summary={summary}
        loading={loadingSummary}
        error={summaryError}
        mode="analysis"
        onOpenData={() => setPage("data")}
      />
    );
  }

  if (page === "simulator") {
    content = (
      <Simulator
        key={`${source}-${year}-${summary?.rows || 0}`}
        source={source}
        year={year}
        summary={summary}
      />
    );
  }

  if (page === "history") {
    content = <History />;
  }

  if (page === "data") {
    content = (
      <DataManager user={user} summary={summary} onImported={handleImport} />
    );
  }

  return (
    <Layout
      user={user}
      page={page}
      onNavigate={setPage}
      onLogout={handleLogout}
      source={source}
      onSourceChange={handleSourceChange}
      year={year}
      onYearChange={handleYearChange}
      availableYears={summary?.available_years || []}
    >
      {content}
    </Layout>
  );
}
