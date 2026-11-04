import { useEffect, useState } from "react";

const initialForm = {
  stock: 30000,
  price: 71.491646,
  weekly_average: 10523,
  demand_ratio: 0.5,
  hpp_ratio: 0.6,
};

const fields = [
  {
    name: "stock",
    label: "Stok awal",
    step: "1",
    min: "1",
  },
  {
    name: "price",
    label: "Harga referensi",
    step: "0.000001",
    min: "0.000001",
  },
  {
    name: "weekly_average",
    label: "Rata-rata penjualan mingguan",
    step: "1",
    min: "1",
  },
  {
    name: "demand_ratio",
    label: "Rasio permintaan dasar",
    step: "0.01",
    min: "0.1",
    max: "2",
  },
  {
    name: "hpp_ratio",
    label: "Rasio HPP",
    step: "0.01",
    min: "0",
    max: "1",
  },
];

function formatNumber(value, digits = 0) {
  return Number(value ?? 0).toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

async function readHistory() {
  const response = await fetch("/api/history/");

  if (!response.ok) {
    throw new Error("Riwayat simulasi tidak dapat dimuat.");
  }

  return response.json();
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    readHistory()
      .then(setHistory)
      .catch(() => setHistory([]));
  }, []);

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
      const response = await fetch("/api/optimize/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || JSON.stringify(data));
      }

      setResult(data);

      const updatedHistory = await readHistory();
      setHistory(updatedHistory);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Retail Markdown Optimizer
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Dynamic Markdown Price Optimization
            </p>
          </div>

          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            Prototipe CRISP-DM
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-10">
        <section>
          <h2 className="text-3xl font-semibold tracking-tight">
            Simulasi Diskon Mingguan
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Bandingkan kombinasi diskon selama empat minggu untuk menghabiskan
            stok pakaian dengan laba kotor simulasi tertinggi.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <h3 className="text-lg font-semibold">Parameter Simulasi</h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Ubah parameter untuk melihat pengaruhnya terhadap rekomendasi
              diskon.
            </p>

            <div className="mt-6 space-y-5">
              {fields.map((field) => (
                <div key={field.name}>
                  <label
                    htmlFor={field.name}
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    {field.label}
                  </label>

                  <input
                    id={field.name}
                    name={field.name}
                    type="number"
                    required
                    step={field.step}
                    min={field.min}
                    max={field.max}
                    value={form[field.name]}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-600"
                  />
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm leading-7 text-slate-600">
              <p>Target: 4 minggu</p>
              <p>Elastisitas asumsi: -2</p>
              <p>Pilihan diskon: 0% sampai 25%</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Menghitung simulasi..." : "Jalankan Optimasi"}
            </button>

            {error && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                {error}
              </div>
            )}
          </form>

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">Total unit terjual</p>

                <p className="mt-3 text-2xl font-semibold">
                  {result ? formatNumber(result.total_sold) : "-"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">Sisa stok</p>

                <p className="mt-3 text-2xl font-semibold">
                  {result ? formatNumber(result.remaining) : "-"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <p className="text-sm text-slate-500">Laba kotor simulasi</p>

                <p className="mt-3 text-2xl font-semibold">
                  {result ? formatNumber(result.total_profit, 2) : "-"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-lg font-semibold">Hasil Optimasi</h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Jadwal diskon dengan laba kotor tertinggi di antara kombinasi
                yang berhasil menghabiskan stok.
              </p>

              {result ? (
                <>
                  <div className="mt-6 flex flex-wrap gap-3">
                    {result.best_plan.map((discount, index) => (
                      <div
                        key={index}
                        className="rounded-lg border border-slate-200 px-4 py-3"
                      >
                        <p className="text-xs text-slate-500">
                          Minggu {index + 1}
                        </p>

                        <p className="mt-1 text-xl font-semibold">
                          {discount}%
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-200 text-slate-500">
                        <tr>
                          <th className="px-3 py-3 font-medium">Minggu</th>
                          <th className="px-3 py-3 font-medium">Diskon</th>
                          <th className="px-3 py-3 font-medium">Permintaan</th>
                          <th className="px-3 py-3 font-medium">Terjual</th>
                          <th className="px-3 py-3 font-medium">Sisa stok</th>
                          <th className="px-3 py-3 font-medium">Laba kotor</th>
                        </tr>
                      </thead>

                      <tbody>
                        {result.schedule.map((row) => (
                          <tr
                            key={row.week}
                            className="border-b border-slate-100"
                          >
                            <td className="px-3 py-4">{row.week}</td>
                            <td className="px-3 py-4">{row.discount}%</td>
                            <td className="px-3 py-4">
                              {formatNumber(row.demand)}
                            </td>
                            <td className="px-3 py-4">
                              {formatNumber(row.sold)}
                            </td>
                            <td className="px-3 py-4">
                              {formatNumber(row.remaining)}
                            </td>
                            <td className="px-3 py-4">
                              {formatNumber(row.profit, 2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-6 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-slate-500">Kombinasi diuji</p>
                      <p className="mt-1 font-semibold">
                        {formatNumber(result.tested_plans)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">
                        Kombinasi memenuhi target
                      </p>
                      <p className="mt-1 font-semibold">
                        {formatNumber(result.feasible_plans)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">
                        Laba diskon tetap 20%
                      </p>
                      <p className="mt-1 font-semibold">
                        {result.comparison.fixed_plan_feasible
                          ? formatNumber(result.comparison.fixed_plan_profit, 2)
                          : "Target tidak tercapai"}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-slate-500">Selisih laba</p>
                      <p className="mt-1 font-semibold">
                        {result.comparison.profit_improvement !== null
                          ? formatNumber(
                              result.comparison.profit_improvement,
                              2,
                            )
                          : "-"}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm leading-7 text-slate-500">
                  Masukkan parameter dan klik Jalankan Optimasi untuk
                  menampilkan hasil.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold">Riwayat Simulasi</h3>

          <p className="mt-2 text-sm text-slate-500">
            Sepuluh simulasi terakhir yang tersimpan di PostgreSQL.
          </p>

          {history.length === 0 ? (
            <p className="mt-6 text-sm text-slate-500">
              Belum ada riwayat simulasi.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-500">
                  <tr>
                    <th className="px-3 py-3 font-medium">Waktu</th>
                    <th className="px-3 py-3 font-medium">Stok awal</th>
                    <th className="px-3 py-3 font-medium">Diskon optimal</th>
                    <th className="px-3 py-3 font-medium">Laba kotor</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((record) => (
                    <tr key={record.id} className="border-b border-slate-100">
                      <td className="px-3 py-4">
                        {new Date(record.created_at).toLocaleString("id-ID")}
                      </td>

                      <td className="px-3 py-4">
                        {formatNumber(record.input_data.stock)}
                      </td>

                      <td className="px-3 py-4">
                        {record.result_data.best_plan
                          .map((value) => `${value}%`)
                          .join(" - ")}
                      </td>

                      <td className="px-3 py-4">
                        {formatNumber(record.result_data.total_profit, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h3 className="font-semibold text-amber-950">Keterbatasan Model</h3>

          <p className="mt-3 text-sm leading-7 text-amber-900">
            Hasil website merupakan simulasi berbasis asumsi elastisitas harga
            dan harga pokok produk. Rekomendasi belum divalidasi menggunakan
            data operasional toko sebenarnya dan tidak boleh dianggap sebagai
            prediksi keuntungan yang pasti.
          </p>
        </section>
      </main>
    </div>
  );
}

export default App;
