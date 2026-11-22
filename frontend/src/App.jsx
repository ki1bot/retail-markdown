import { useEffect, useState } from "react";

import { api } from "./lib/api";

import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import DataManager from "./components/DataManager";
import Simulator from "./components/Simulator";
import History from "./components/History";
import WarehouseDashboard from "./components/WarehouseDashboard";

export default function App() {
  const [page, setPage] = useState("dashboard");

  const [source, setSource] = useState("inventory");

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
        }
      })

      .catch((error) => {
        if (active) {
          setSummary(null);

          setSummaryError(error.message);
        }
      })

      .finally(() => {
        if (active) {
          setLoadingSummary(false);
        }
      });

    return () => {
      active = false;
    };
  }, [source, year, reloadKey]);

  function handleNavigate(nextPage) {
    let nextSource = source;

    let nextYear = year;

    if (nextPage === "dashboard") {
      nextSource = "inventory";
    }

    if (nextPage === "analysis") {
      nextSource = "sales";
    }

    if (nextPage === "simulator") {
      nextSource = "sales";

      nextYear = 2023;
    }

    if (nextSource !== source || nextYear !== year) {
      setLoadingSummary(true);

      setSummary(null);

      setSummaryError("");
    }

    setSource(nextSource);

    setYear(nextYear);

    setPage(nextPage);
  }

  function handleSourceChange(value) {
    if (!["sales", "inventory"].includes(value)) {
      return;
    }

    setSource(value);

    setPage(value === "inventory" ? "dashboard" : "analysis");

    setSummary(null);

    setSummaryError("");

    setLoadingSummary(true);
  }

  function handleYearChange(value) {
    if (page === "simulator") {
      setPage("analysis");
    }

    setYear(value);

    setSummary(null);

    setSummaryError("");

    setLoadingSummary(true);
  }

  function handleImport(result) {
    setLoadingSummary(true);

    setSummary(null);

    setSummaryError("");

    setReloadKey((value) => value + 1);

    if (result.source === "warehouse_sales") {
      setPage("warehouse");

      return;
    }

    if (["sales", "inventory"].includes(result.source)) {
      setSource(result.source);

      setYear(2023);

      setSummary(null);

      setSummaryError("");

      setLoadingSummary(true);

      setPage(result.source === "sales" ? "analysis" : "dashboard");
    }
  }

  let content = null;

  if (page === "dashboard") {
    content = (
      <Dashboard
        summary={summary}
        loading={loadingSummary}
        error={summaryError}
        source={source}
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
        source={source}
        mode="analysis"
        onOpenData={() => setPage("data")}
      />
    );
  }

  if (page === "simulator") {
    content = <Simulator onOpenData={() => setPage("data")} />;
  }

  if (page === "warehouse") {
    content = <WarehouseDashboard onOpenData={() => setPage("data")} />;
  }

  if (page === "history") {
    content = <History />;
  }

  if (page === "data") {
    content = (
      <DataManager
        source={source}
        year={year}
        summary={summary}
        onImported={handleImport}
      />
    );
  }

  return (
    <Layout
      page={page}
      onNavigate={handleNavigate}
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
