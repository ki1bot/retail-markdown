import { useEffect, useState } from "react";

import { api } from "../lib/api";

import { formatNumber } from "../lib/format";

const baseline = {
  stock: "30000",

  price: "71.4916455479",

  weekly_average: "10523",

  demand_ratio: "0.50",

  hpp_ratio: "0.60",

  elasticity: "-2.0",
};

const fields = [
  {
    name: "stock",
    label: "Stok yang akan dihabiskan",
    min: "1",
    max: "1000000",
    step: "1",
    help: "Jumlah stok awal untuk skenario markdown.",
  },

  {
    name: "price",
    label: "Harga referensi rata-rata",
    min: "0.000001",
    step: "0.0000000001",
    help: "Rata-rata Price Retail Sales kategori Clothing dengan presisi perhitungan.",
  },

  {
    name: "weekly_average",
    label: "Rata-rata unit terjual per minggu",
    min: "1",
    max: "1000000",
    step: "1",
    help: "Dihitung dari total Units Sold 2023 dibagi rentang hari, dikali tujuh.",
  },

  {
    name: "demand_ratio",
    label: "Rasio permintaan dasar",
    min: "0.10",
    max: "2.00",
    step: "0.01",
    help: "Proporsi rata-rata penjualan mingguan sebagai permintaan dasar.",
  },

  {
    name: "hpp_ratio",
    label: "Rasio harga pokok (HPP)",
    min: "0.00",
    max: "1.00",
    step: "0.01",
    help: "Proporsi HPP terhadap harga referensi.",
  },
];

function buildDefaultForm(summary) {
  if (!summary?.available) {
    return baseline;
  }

  return {
    ...baseline,

    price: String(summary.average_price || baseline.price),

    weekly_average: String(summary.weekly_average || baseline.weekly_average),
  };
}

function Metric({ label, value, detail }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4">
      <p className="text-xs text-zinc-500">{label}</p>

      <p className="mt-2 break-words text-xl font-semibold text-white">
        {value}
      </p>

      {detail && <p className="mt-1 text-xs text-zinc-600">{detail}</p>}
    </div>
  );
}

export default function Simulator({ onOpenData }) {
  const [context, setContext] = useState(null);

  const [loadingContext, setLoadingContext] = useState(true);

  const [contextError, setContextError] = useState("");

  const [form, setForm] = useState(baseline);

  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    api

      .get("/data/summary/?source=sales&year=2023")

      .then((response) => {
        if (!active) return;

        setContext(response);

        setContextError("");

        if (response.available) {
          setForm(buildDefaultForm(response));
        }
      })

      .catch((err) => {
        if (active) {
          setContextError(err.message);
        }
      })

      .finally(() => {
        if (active) {
          setLoadingContext(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,

      [name]: value,
    }));

    setResult(null);

    setError("");
  }

  function resetForm() {
    setForm(buildDefaultForm(context));

    setResult(null);

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!context?.available) {
      setError(
        "Impor Retail Sales terlebih dahulu sebelum menjalankan simulasi.",
      );

      return;
    }

    setLoading(true);

    setError("");

    setResult(null);

    try {
      const response = await api.post(
        "/optimize/",

        {
          ...form,

          source: "sales",

          year: 2023,
        },
      );

      setResult(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="max-w-3xl text-sm leading-6 text-zinc-400">
            Sistem membandingkan 1.296 kombinasi diskon untuk empat minggu.
            Rekomendasi dipilih dari kombinasi yang mampu menghabiskan stok
            dengan laba kotor simulasi tertinggi.
          </p>

          <p className="mt-2 text-xs text-zinc-500">
            Sumber parameter historis: Retail Sales · Clothing · 2023. Horizon
            simulasi: 4 minggu.
          </p>
        </div>

        <button
          type="button"
          onClick={resetForm}
          className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-900"
        >
          Kembalikan parameter awal
        </button>
      </div>

      {loadingContext && (
        <p className="text-sm text-zinc-400">
          Mengambil parameter dari Retail Sales 2023...
        </p>
      )}

      {contextError && (
        <div
          role="alert"
          className="rounded-md border border-amber-900 bg-amber-950/20 px-4 py-3 text-sm text-amber-300"
        >
          Data dasar belum dapat dibaca: {contextError}
        </div>
      )}

      {!loadingContext && !context?.available && (
        <div className="rounded-lg border border-amber-900/70 bg-amber-950/20 p-5">
          <h3 className="font-medium text-amber-200">
            Retail Sales 2023 belum diimpor
          </h3>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Simulasi menggunakan rata-rata harga dan penjualan dari dataset
            Retail Sales. Impor file sales_data.csv pada halaman Kelola Dataset
            agar parameter awal sesuai dengan Power BI.
          </p>

          <button
            type="button"
            onClick={onOpenData}
            className="mt-4 rounded-md bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200"
          >
            Buka Kelola Dataset
          </button>
        </div>
      )}

      {context?.available && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Observasi Clothing 2023"
            value={formatNumber(context.rows)}
            detail="Retail Sales"
          />

          <Metric
            label="Rata-rata harga referensi"
            value={formatNumber(context.average_price, 6)}
            detail="Satuan nilai dataset"
          />

          <Metric
            label="Rata-rata penjualan mingguan"
            value={formatNumber(context.weekly_average)}
            detail="Unit per minggu"
          />

          <Metric
            label="Rentang data"
            value="365 hari"
            detail={`${context.first_date} – ${context.last_date}`}
          />
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form
          onSubmit={handleSubmit}
          className="h-fit rounded-lg border border-zinc-800 bg-[#111114] p-5"
        >
          <div>
            <h3 className="font-medium text-white">Parameter simulasi</h3>

            <p className="mt-1 text-xs leading-5 text-zinc-500">
              Nilai awal diambil dari data 2023 dan asumsi pada makalah.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            {fields.map((field) => (
              <div key={field.name}>
                <label
                  htmlFor={field.name}
                  className="mb-2 block text-sm text-zinc-300"
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

                <p className="mt-1.5 text-xs leading-5 text-zinc-600">
                  {field.help}
                </p>
              </div>
            ))}

            <div>
              <label
                htmlFor="elasticity"
                className="mb-2 block text-sm text-zinc-300"
              >
                Elastisitas harga (asumsi)
              </label>

              <select
                id="elasticity"
                name="elasticity"
                value={form.elasticity}
                onChange={handleChange}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
              >
                <option value="-1.5">−1,5</option>

                <option value="-2.0">−2,0 (baseline makalah)</option>

                <option value="-2.5">−2,5</option>
              </select>
            </div>
          </div>

          <div className="mt-5 rounded-md border border-zinc-800 bg-zinc-950 p-3">
            <p className="text-xs font-medium text-zinc-300">
              Pilihan diskon yang diuji
            </p>

            <p className="mt-1 text-xs leading-5 text-zinc-500">
              0%, 5%, 10%, 15%, 20%, dan 25% pada setiap minggu.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-md border border-red-900 bg-red-950/30 p-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || loadingContext || !context?.available}
            className="mt-5 w-full rounded-md bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Menghitung..." : "Jalankan simulasi"}
          </button>
        </form>

        <div className="min-w-0 space-y-5">
          {result ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Unit terjual"
                  value={formatNumber(result.total_sold)}
                  detail="Dari stok awal"
                />

                <Metric
                  label="Sisa stok"
                  value={formatNumber(result.remaining)}
                  detail="Target akhir: 0 unit"
                />

                <Metric
                  label="Laba kotor simulasi"
                  value={formatNumber(result.total_profit, 2)}
                  detail="Satuan nilai dataset"
                />
              </div>

              <section className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
                <h3 className="font-medium text-white">
                  Rekomendasi diskon mingguan
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Kombinasi diskon yang memenuhi target penghabisan stok dengan
                  laba kotor tertinggi berdasarkan parameter yang digunakan.
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
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b border-zinc-800 text-zinc-500">
                      <tr>
                        <th className="px-3 py-3 font-medium">Minggu</th>

                        <th className="px-3 py-3 font-medium">Diskon</th>

                        <th className="px-3 py-3 text-right font-medium">
                          Harga setelah diskon
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Estimasi permintaan
                        </th>

                        <th className="px-3 py-3 text-right font-medium">
                          Unit terjual
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

                          <td className="px-3 py-4 text-right text-zinc-300">
                            {formatNumber(row.selling_price, 4)}
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
                  Perbandingan strategi diskon
                </h3>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Metric
                    label="Kombinasi diuji"
                    value={formatNumber(result.tested_plans)}
                  />

                  <Metric
                    label="Kombinasi memenuhi target"
                    value={formatNumber(result.feasible_plans)}
                  />

                  <Metric
                    label="Laba diskon tetap 20%"
                    value={formatNumber(result.comparison.fixed_plan_profit, 2)}
                    detail={
                      result.comparison.fixed_plan_feasible
                        ? "Stok habis dalam 4 minggu"
                        : "Stok belum habis dalam 4 minggu"
                    }
                  />

                  <Metric
                    label="Peningkatan laba simulasi"
                    value={
                      result.comparison.improvement_percent !== null
                        ? `${formatNumber(
                            result.comparison.improvement_percent,
                            2,
                          )}%`
                        : "Tidak dapat dihitung"
                    }
                    detail="Dibandingkan diskon tetap 20%"
                  />
                </div>
              </section>
            </>
          ) : (
            <section className="flex min-h-72 items-center justify-center rounded-lg border border-zinc-800 bg-[#111114] p-8">
              <div className="max-w-md text-center">
                <h3 className="font-medium text-zinc-200">
                  Belum ada hasil simulasi
                </h3>

                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  Pastikan Retail Sales 2023 sudah diimpor, kemudian jalankan
                  simulasi untuk membandingkan 1.296 kombinasi diskon.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
