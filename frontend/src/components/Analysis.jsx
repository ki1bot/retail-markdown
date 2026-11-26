import { useEffect, useState } from "react";

import { api } from "../lib/api";
import { formatNumber } from "../lib/format";

import StatCard from "./common/StatCard";
import Panel from "./common/Panel";
import StatusTag from "./common/StatusTag";

export default function Analysis() {
  const [year, setYear] = useState(2023);

  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    api
      .get(`/data/elasticity/?year=${year}`)
      .then((data) => {
        if (active) {
          setResult(data);
          setError("");
        }
      })
      .catch((err) => {
        if (active) {
          setResult(null);
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [year]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/30 p-5 text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (loading || !result || result.year !== year) {
    return (
      <p className="text-sm text-zinc-400">Mengestimasi elastisitas harga...</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-400">
            {result.source_file} · {result.category}
          </p>

          <p className="mt-1 text-xs text-zinc-500">{result.evaluation_note}</p>
        </div>

        <label className="flex items-center gap-2 text-xs text-zinc-500">
          Tahun
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
          >
            {[2022, 2023, 2024].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <StatusTag good={result.reliable}>
          {result.reliable
            ? "Regresi layak dipakai"
            : "Simulasi memakai asumsi"}
        </StatusTag>

        <span className="text-xs text-zinc-500">
          {formatNumber(result.sample_size)} observasi positif
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Elastisitas hasil regresi"
          value={formatNumber(result.elasticity_estimated, 4)}
          detail="Koefisien β1 dari regresi Log-Log."
        />

        <StatCard
          label="R² training"
          value={formatNumber(result.train_r2, 4)}
          detail="Ambang minimum yang digunakan 0,10."
        />

        <StatCard
          label="R² testing"
          value={formatNumber(result.test_r2, 4)}
          detail="Pengujian pada 20% periode paling akhir."
        />

        <StatCard
          label="Elastisitas untuk simulasi"
          value={formatNumber(result.elasticity_used, 2)}
          detail={
            result.reliable
              ? "Menggunakan hasil regresi."
              : "Menggunakan asumsi dari makalah."
          }
        />
      </div>

      <Panel
        title="Persamaan model"
        subtitle="Model menggunakan harga aktual setelah diskon dan kolom Demand."
      >
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-4 font-mono text-sm text-emerald-300">
          {result.equation}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-zinc-500">Data training</p>

            <p className="mt-1 text-lg font-semibold text-white">
              {formatNumber(result.train_size)}
            </p>
          </div>

          <div>
            <p className="text-xs text-zinc-500">Data testing</p>

            <p className="mt-1 text-lg font-semibold text-white">
              {formatNumber(result.test_size)}
            </p>
          </div>

          <div>
            <p className="text-xs text-zinc-500">Harga referensi rata-rata</p>

            <p className="mt-1 text-lg font-semibold text-white">
              {formatNumber(result.reference_price, 2)}
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
