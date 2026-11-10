import { useState } from "react";

import { api } from "../lib/api";
import { formatNumber } from "../lib/format";

const fields = [
  {
    name: "stock",
    label: "Stok yang akan dihabiskan",
    min: "1",
    max: "1000000",
    step: "1",
  },
  {
    name: "price",
    label: "Harga referensi",
    min: "0.000001",
    step: "0.000001",
  },
  {
    name: "weekly_average",
    label: "Rata-rata penjualan mingguan",
    min: "1",
    max: "1000000",
    step: "1",
  },
  {
    name: "demand_ratio",
    label: "Rasio permintaan dasar",
    min: "0.1",
    max: "2",
    step: "0.01",
  },
  {
    name: "hpp_ratio",
    label: "Rasio HPP",
    min: "0",
    max: "1",
    step: "0.01",
  },
];

export default function Simulator({ source, year, summary }) {
  const [form, setForm] = useState({
    stock: "30000",
    price: String(summary?.average_price || "71.491646"),
    weekly_average: String(summary?.weekly_average || "10523"),
    demand_ratio: "0.50",
    hpp_ratio: "0.60",
    elasticity: "-2.0",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await api.post("/optimize/", {
        ...form,
        source,
        year,
      });

      setResult(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm leading-6 text-zinc-400">
          Hitung kombinasi diskon untuk menghabiskan stok selama empat minggu.
        </p>

        <p className="mt-2 text-xs text-zinc-500">
          {summary?.available
            ? `Harga dan penjualan awal mengacu pada dataset ${year}.`
            : "Parameter awal menggunakan skenario dari makalah."}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-lg border border-zinc-800 bg-[#111114] p-5"
        >
          <h3 className="font-medium text-white">Parameter simulasi</h3>

          <div className="mt-6 space-y-5">
            {fields.map((field) => (
              <div key={field.name}>
                <label
                  htmlFor={field.name}
                  className="mb-2 block text-sm text-zinc-400"
                >
                  {field.label}
                </label>

                <input
                  id={field.name}
                  name={field.name}
                  type="number"
                  required
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={form[field.name]}
                  onChange={handleChange}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
                />
              </div>
            ))}

            <div>
              <label
                htmlFor="elasticity"
                className="mb-2 block text-sm text-zinc-400"
              >
                Elastisitas asumsi
              </label>

              <select
                id="elasticity"
                name="elasticity"
                value={form.elasticity}
                onChange={handleChange}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
              >
                <option value="-1.5">−1,5</option>
                <option value="-2.0">−2,0</option>
                <option value="-2.5">−2,5</option>
              </select>
            </div>
          </div>

          <p className="mt-5 text-xs leading-6 text-zinc-500">
            Pilihan diskon: 0%, 5%, 10%, 15%, 20%, 25%.
          </p>

          {error && (
            <div className="mt-4 rounded-md border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? "Menghitung..." : "Jalankan simulasi"}
          </button>
        </form>

        <div className="min-w-0 space-y-5">
          {result ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
                  <p className="text-sm text-zinc-400">Unit terjual</p>

                  <p className="mt-3 text-2xl font-semibold text-white">
                    {formatNumber(result.total_sold)}
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
                  <p className="text-sm text-zinc-400">Sisa stok</p>

                  <p className="mt-3 text-2xl font-semibold text-white">
                    {formatNumber(result.remaining)}
                  </p>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
                  <p className="text-sm text-zinc-400">Laba kotor</p>

                  <p className="mt-3 text-2xl font-semibold text-white">
                    {formatNumber(result.total_profit, 2)}
                  </p>

                  <p className="mt-2 text-xs text-zinc-500">
                    Satuan nilai dataset
                  </p>
                </div>
              </div>

              <section className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
                <h3 className="font-medium text-white">
                  Jadwal diskon terbaik
                </h3>

                <p className="mt-2 text-sm text-zinc-400">
                  Kombinasi yang memenuhi target stok dengan laba kotor
                  tertinggi.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {result.best_plan.map((discount, index) => (
                    <div
                      key={index}
                      className="rounded-md border border-zinc-800 bg-zinc-950 p-4"
                    >
                      <p className="text-xs text-zinc-500">
                        Minggu {index + 1}
                      </p>

                      <p className="mt-2 text-2xl font-semibold text-white">
                        {discount}%
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-zinc-800 text-zinc-500">
                      <tr>
                        <th className="px-3 py-3 font-medium">Minggu</th>
                        <th className="px-3 py-3 font-medium">Diskon</th>
                        <th className="px-3 py-3 text-right font-medium">
                          Permintaan
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Terjual
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Sisa stok
                        </th>
                        <th className="px-3 py-3 text-right font-medium">
                          Laba kotor
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {result.schedule.map((row) => (
                        <tr
                          key={row.week}
                          className="border-b border-zinc-800/70 last:border-0"
                        >
                          <td className="px-3 py-4 text-zinc-200">
                            {row.week}
                          </td>
                          <td className="px-3 py-4 text-zinc-200">
                            {row.discount}%
                          </td>
                          <td className="px-3 py-4 text-right text-zinc-400">
                            {formatNumber(row.demand)}
                          </td>
                          <td className="px-3 py-4 text-right text-zinc-200">
                            {formatNumber(row.sold)}
                          </td>
                          <td className="px-3 py-4 text-right text-zinc-400">
                            {formatNumber(row.remaining)}
                          </td>
                          <td className="px-3 py-4 text-right text-zinc-200">
                            {formatNumber(row.profit, 2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
                <h3 className="font-medium text-white">
                  Perbandingan strategi
                </h3>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-zinc-500">Kombinasi diuji</p>
                    <p className="mt-1 text-lg text-white">
                      {formatNumber(result.tested_plans)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">
                      Kombinasi memenuhi target
                    </p>
                    <p className="mt-1 text-lg text-white">
                      {formatNumber(result.feasible_plans)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">
                      Laba diskon tetap 20%
                    </p>
                    <p className="mt-1 text-lg text-white">
                      {formatNumber(result.comparison.fixed_plan_profit, 2)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-zinc-500">Peningkatan laba</p>
                    <p className="mt-1 text-lg text-white">
                      {result.comparison.improvement_percent !== null
                        ? `${formatNumber(
                            result.comparison.improvement_percent,
                            2,
                          )}%`
                        : "-"}
                    </p>
                  </div>
                </div>

                {!result.comparison.fixed_plan_feasible && (
                  <p className="mt-5 text-sm text-amber-300">
                    Diskon tetap 20% tidak mencapai target penghabisan stok.
                  </p>
                )}
              </section>

              <p className="text-xs leading-6 text-zinc-500">
                Hasil simulasi telah disimpan. Perhitungan ini menggunakan
                asumsi permintaan dan elastisitas, bukan prediksi yang sudah
                divalidasi dengan data toko nyata.
              </p>
            </>
          ) : (
            <section className="flex min-h-72 items-center justify-center rounded-lg border border-zinc-800 bg-[#111114] p-8">
              <div className="text-center">
                <h3 className="font-medium text-zinc-200">
                  Belum ada hasil simulasi
                </h3>

                <p className="mt-2 text-sm text-zinc-500">
                  Isi parameter lalu jalankan perhitungan.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
