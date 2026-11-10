import { useEffect, useState } from "react";

import { api } from "./lib/api";

import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import DataManager from "./components/DataManager";
import Simulator from "./components/Simulator";
import History from "./components/History";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [source, setSource] = useState("sales");
  const [year, setYear] = useState(2023);

  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
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
  }, [source, year, reloadKey]);

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

  function handleImport(result) {
    setSource(result.source);
    setYear(2023);
    setSummary(null);
    setSummaryError("");
    setLoadingSummary(true);
    setReloadKey((value) => value + 1);
    setPage("dashboard");
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
    content = <DataManager summary={summary} onImported={handleImport} />;
  }

  return (
    <Layout
      page={page}
      onNavigate={setPage}
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
