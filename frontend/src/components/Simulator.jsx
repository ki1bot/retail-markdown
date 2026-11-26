import { useEffect, useState } from "react";

import { api } from "../lib/api";
import { formatNumber } from "../lib/format";

import StatCard from "./common/StatCard";
import Panel from "./common/Panel";
import StatusTag from "./common/StatusTag";

const initialForm = {
  stock: 30000,
  weeks: 4,
  reference_price: 0,
  weekly_average_units_sold: 0,
  unit_cost_ratio: 0.6,
  demand_ratio: 0.5,
  elasticity: -2,
};

const discountOptions = [0, 5, 10, 15, 20, 25];

export default function Simulator() {
  const [form, setForm] = useState(initialForm);

  const [model, setModel] = useState(null);

  const [loadingDefaults, setLoadingDefaults] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [result, setResult] = useState(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      api.get("/data/summary/?year=2023"),
      api.get("/data/elasticity/?year=2023"),
    ])
      .then(([summary, elasticity]) => {
        if (!active) return;

        setModel(elasticity);

        setForm((current) => ({
          ...current,
          reference_price: summary.average_price,
          weekly_average_units_sold: summary.weekly_average_units_sold,
          elasticity: elasticity.elasticity_used,
        }));

        setError("");
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingDefaults(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setError("");
    setResult(null);

    try {
      const payload = {
        stock: Number(form.stock),

        weeks: Number(form.weeks),

        reference_price: Number(form.reference_price),

        weekly_average_units_sold: Number(form.weekly_average_units_sold),

        unit_cost_ratio: Number(form.unit_cost_ratio),

        demand_ratio: Number(form.demand_ratio),

        elasticity: Number(form.elasticity),

        discount_options: discountOptions,
      };

      const response = await api.post("/optimize/", payload);

      setResult(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingDefaults) {
    return (
      <p className="text-sm text-zinc-400">Menyiapkan parameter simulasi...</p>
    );
  }

  return (
    <div className="space-y-6">
      {model && (
        <div className="flex flex-wrap items-center gap-3">
          <StatusTag good={model.reliable}>
            {model.reliable
              ? "Elastisitas dari regresi"
              : "Elastisitas asumsi -2,0"}
          </StatusTag>

          <span className="text-xs text-zinc-500">
            Estimasi regresi: {formatNumber(model.elasticity_estimated, 4)}
            {" · "}
            R² training: {formatNumber(model.train_r2, 4)}
          </span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Panel
          title="Parameter simulasi"
          subtitle="Nilai awal mengikuti pendekatan dalam makalah. Ubah sesuai skenario yang ingin diuji."
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs text-zinc-400">Stok awal (unit)</span>

                <input
                  type="number"
                  min="1"
                  max="1000000"
                  value={form.stock}
                  onChange={(event) => updateField("stock", event.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs text-zinc-400">Horizon (minggu)</span>

                <select
                  value={form.weeks}
                  onChange={(event) => updateField("weeks", event.target.value)}
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
                >
                  {[1, 2, 3, 4, 5, 6].map((value) => (
                    <option key={value} value={value}>
                      {value} minggu
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-zinc-400">Harga referensi</span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.reference_price}
                  onChange={(event) =>
                    updateField("reference_price", event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs text-zinc-400">
                  Rata-rata penjualan mingguan
                </span>

                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.weekly_average_units_sold}
                  onChange={(event) =>
                    updateField("weekly_average_units_sold", event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs text-zinc-400">
                  Rasio harga pokok (HPP)
                </span>

                <input
                  type="number"
                  min="0"
                  max="0.99"
                  step="0.01"
                  value={form.unit_cost_ratio}
                  onChange={(event) =>
                    updateField("unit_cost_ratio", event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
                  required
                />
              </label>

              <label className="block">
                <span className="text-xs text-zinc-400">Faktor permintaan</span>

                <input
                  type="number"
                  min="0.1"
                  max="2"
                  step="0.05"
                  value={form.demand_ratio}
                  onChange={(event) =>
                    updateField("demand_ratio", event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
                  required
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs text-zinc-400">
                  Elastisitas yang dipakai
                </span>

                <input
                  type="number"
                  min="-5"
                  max="-0.1"
                  step="0.1"
                  value={form.elasticity}
                  onChange={(event) =>
                    updateField("elasticity", event.target.value)
                  }
                  className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
                  required
                />

                <span className="mt-1 block text-xs text-zinc-600">
                  Nilai negatif. Nilai awal berasal dari hasil pemeriksaan
                  model.
                </span>
              </label>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs text-zinc-400">
                Alternatif diskon yang diuji
              </p>

              <p className="mt-2 text-sm font-medium text-white">
                {discountOptions.map((value) => `${value}%`).join(" · ")}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
            >
              {submitting
                ? "Menghitung kombinasi..."
                : "Jalankan optimasi diskon"}
            </button>
          </form>
        </Panel>

        <div className="space-y-4">
          {!result ? (
            <Panel
              title="Hasil optimasi"
              subtitle="Hasil simulasi akan muncul setelah parameter dijalankan."
            >
              <div className="py-14 text-center">
                <p className="text-sm text-zinc-500">
                  Belum ada hasil simulasi pada sesi ini.
                </p>
              </div>
            </Panel>
          ) : (
            <>
              <Panel title="Rekomendasi diskon mingguan">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-zinc-500">
                      Kombinasi diskon terbaik
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-white">
                      {result.best_plan.map((value) => `${value}%`).join(" / ")}
                    </p>
                  </div>

                  <StatusTag good={result.stock_cleared}>
                    {result.stock_cleared
                      ? "Stok habis"
                      : "Target belum tercapai"}
                  </StatusTag>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <StatCard
                    label="Laba kotor simulasi"
                    value={formatNumber(result.total_profit, 2)}
                    detail="Satuan nilai pada dataset."
                  />

                  <StatCard
                    label="Sisa stok"
                    value={formatNumber(result.remaining)}
                    detail={`${formatNumber(result.total_sold)} unit terjual dalam simulasi.`}
                  />
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="border-b border-zinc-800 text-xs text-zinc-500">
                      <tr>
                        <th className="px-3 py-3">Minggu</th>

                        <th className="px-3 py-3 text-right">Diskon</th>

                        <th className="px-3 py-3 text-right">Harga jual</th>

                        <th className="px-3 py-3 text-right">
                          Estimasi terjual
                        </th>

                        <th className="px-3 py-3 text-right">Sisa stok</th>

                        <th className="px-3 py-3 text-right">Laba kotor</th>
                      </tr>
                    </thead>

                    <tbody>
                      {result.schedule.map((item) => (
                        <tr
                          key={item.week}
                          className="border-b border-zinc-800/70 last:border-0"
                        >
                          <td className="px-3 py-3 text-zinc-300">
                            {item.week}
                          </td>

                          <td className="px-3 py-3 text-right text-white">
                            {item.discount}%
                          </td>

                          <td className="px-3 py-3 text-right text-zinc-300">
                            {formatNumber(item.selling_price, 2)}
                          </td>

                          <td className="px-3 py-3 text-right text-zinc-300">
                            {formatNumber(item.estimated_sold)}
                          </td>

                          <td className="px-3 py-3 text-right text-zinc-300">
                            {formatNumber(item.remaining_stock)}
                          </td>

                          <td className="px-3 py-3 text-right text-zinc-300">
                            {formatNumber(item.gross_profit, 2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel title="Perbandingan dengan diskon tetap 20%">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-zinc-500">
                      Laba kotor diskon tetap
                    </p>

                    <p className="mt-2 text-xl font-semibold text-white">
                      {formatNumber(result.fixed_comparison.total_profit, 2)}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      Sisa stok:{" "}
                      {formatNumber(result.fixed_comparison.remaining)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500">
                      Perubahan laba kotor
                    </p>

                    <p className="mt-2 text-xl font-semibold text-white">
                      {result.fixed_comparison.profit_improvement === null
                        ? "Tidak dapat dibandingkan"
                        : formatNumber(
                            result.fixed_comparison.profit_improvement,
                            2,
                          )}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500">
                      {result.fixed_comparison.improvement_percent === null
                        ? "Strategi diskon tetap tidak menghabiskan stok."
                        : `${formatNumber(
                            result.fixed_comparison.improvement_percent,
                            2,
                          )}% dibandingkan diskon tetap.`}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-5 text-zinc-500">
                  {result.interpretation} Optimasi menguji{" "}
                  {formatNumber(result.tested_plans)} kombinasi, dengan{" "}
                  {formatNumber(result.feasible_plans)}
                  kombinasi yang menghabiskan stok.
                </p>
              </Panel>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
