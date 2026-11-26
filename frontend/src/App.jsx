import { useState } from "react";

import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import Analysis from "./components/Analysis";
import Simulator from "./components/Simulator";
import History from "./components/History";
import DataManager from "./components/DataManager";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);

  function handleDatasetChanged() {
    setRefreshKey((value) => value + 1);
  }

  let content;

  if (page === "dashboard") {
    content = <Dashboard key={refreshKey} />;
  } else if (page === "analysis") {
    content = <Analysis key={refreshKey} />;
  } else if (page === "simulator") {
    content = <Simulator key={refreshKey} />;
  } else if (page === "history") {
    content = <History />;
  } else {
    content = <DataManager onDataChanged={handleDatasetChanged} />;
  }

  return (
    <Layout page={page} onNavigate={setPage}>
      {content}
    </Layout>
  );
}
