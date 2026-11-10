import { useState } from "react";

import { api } from "../lib/api";

const datasets = [
  {
    name: "Retail Sales",
    filename: "sales_data.csv",
    description: "Penjualan, harga, diskon, promosi, dan permintaan.",
  },
  {
    name: "Retail Inventory",
    filename: "retail_store_inventory.csv",
    description: "Persediaan historis, penjualan, dan demand forecast.",
  },
];

export default function DataManager({ source, year, summary, onImported }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      setError("Pilih file CSV terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await api.upload("/data/import/", formData);

      setImportResult(result);
      onImported(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white">Dataset ritel</h3>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Data dibatasi pada kategori Clothing.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {datasets.map((dataset) => (
          <div
            key={dataset.name}
            className="rounded-lg border border-zinc-800 bg-[#111114] p-5"
          >
            <h4 className="font-medium text-white">{dataset.name}</h4>

            <p className="mt-2 text-sm text-zinc-400">{dataset.description}</p>

            <p className="mt-4 font-mono text-xs text-zinc-500">
              {dataset.filename}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
        <h3 className="font-medium text-white">Data yang sedang dipilih</h3>

        <div className="mt-4 space-y-2 text-sm text-zinc-400">
          <p>
            Sumber:{" "}
            <span className="text-zinc-200">
              {source === "inventory" ? "Retail Inventory" : "Retail Sales"}
            </span>
          </p>

          <p>
            Tahun: <span className="text-zinc-200">{year}</span>
          </p>

          <p>
            Status:{" "}
            <span className="text-zinc-200">
              {summary?.available
                ? "Data tersedia"
                : "Data belum tersedia untuk periode ini"}
            </span>
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-zinc-800 bg-[#111114] p-5"
      >
        <h3 className="font-medium text-white">Impor CSV</h3>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Pilih dataset ritel yang ingin diimpor. Data lama dari sumber yang
          sama akan diganti.
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          required
          onChange={(event) => {
            setFile(event.target.files?.[0] || null);
            setError("");
            setImportResult(null);
          }}
          className="mt-5 block w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-300 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-white"
        />

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 rounded-md bg-white px-5 py-2.5 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "Mengimpor data..." : "Impor dataset"}
        </button>

        {importResult && (
          <div
            role="status"
            className="mt-5 rounded-md border border-zinc-700 bg-zinc-900 p-4"
          >
            <h4 className="text-sm font-medium text-white">
              Dataset berhasil diimpor
            </h4>

            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-zinc-500">Total baris</p>

                <p className="mt-1 font-medium text-zinc-200">
                  {Number(importResult.total_rows).toLocaleString("id-ID")}
                </p>
              </div>

              <div>
                <p className="text-zinc-500">Data Clothing</p>

                <p className="mt-1 font-medium text-zinc-200">
                  {Number(importResult.imported_rows).toLocaleString("id-ID")}
                </p>
              </div>

              <div>
                <p className="text-zinc-500">Kategori lain</p>

                <p className="mt-1 font-medium text-zinc-200">
                  {Number(importResult.ignored_rows).toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            {importResult.corrected_forecasts > 0 && (
              <p className="mt-4 border-t border-zinc-700 pt-4 text-sm leading-6 text-zinc-300">
                Sebanyak{" "}
                {Number(importResult.corrected_forecasts).toLocaleString(
                  "id-ID",
                )}{" "}
                nilai Demand Forecast negatif disesuaikan menjadi 0.
              </p>
            )}
          </div>
        )}
      </form>

      <div className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
        <h3 className="font-medium text-white">Batasan data</h3>

        <p className="mt-2 text-sm leading-7 text-zinc-400">
          Dataset tidak memiliki penanda khusus untuk stok pakaian musim
          sebelumnya. Inventory Level merupakan catatan persediaan historis,
          bukan stok akhir yang dapat dijumlahkan antarperiode.
        </p>

        <p className="mt-3 text-sm leading-7 text-zinc-400">
          Pada Retail Inventory, prakiraan permintaan negatif disesuaikan
          menjadi nol saat impor.
        </p>
      </div>
    </div>
  );
}
