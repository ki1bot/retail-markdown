import { useEffect, useState } from "react";

import { api } from "../lib/api";

const datasets = [
  {
    id: "sales",
    name: "Retail Sales",
    filename: "sales_data.csv",
    description: "Penjualan, harga, diskon, dan permintaan historis.",
  },
  {
    id: "inventory",
    name: "Retail Inventory",
    filename: "retail_store_inventory.csv",
    description: "Persediaan, penjualan, dan prakiraan permintaan.",
  },
];

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString("id-ID");
}

function DatasetCard({ dataset, data, loading }) {
  const rows = data?.rows ?? 0;
  const available = rows > 0;

  return (
    <div className="min-w-0 rounded-lg border border-zinc-800 bg-[#111114] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="font-medium text-white">{dataset.name}</h4>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {dataset.description}
          </p>
        </div>

        <span
          className={`rounded-md border px-2.5 py-1 text-xs ${
            loading
              ? "border-zinc-700 text-zinc-400"
              : available
                ? "border-emerald-900 bg-emerald-950/30 text-emerald-300"
                : "border-zinc-700 bg-zinc-900 text-zinc-400"
          }`}
        >
          {loading ? "Memeriksa..." : available ? "Tersedia" : "Belum diimpor"}
        </span>
      </div>

      <div className="mt-6">
        <p className="text-xs text-zinc-500">Observasi Clothing</p>

        <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
          {loading ? "-" : formatNumber(rows)}
        </p>
      </div>

      <div className="mt-5 border-t border-zinc-800 pt-4">
        <p className="text-xs text-zinc-500">Periode data</p>

        <p className="mt-2 text-sm text-zinc-300">
          {available && data.first_date && data.last_date
            ? `${data.first_date} sampai ${data.last_date}`
            : "-"}
        </p>
      </div>

      <p className="mt-4 break-all font-mono text-xs text-zinc-500">
        {dataset.filename}
      </p>
    </div>
  );
}

export default function DataManager({ source, year, summary, onImported }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState(null);

  const [datasetStatus, setDatasetStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    let active = true;

    api
      .get("/data/status/")
      .then((response) => {
        if (active) {
          setDatasetStatus(response.datasets);
          setStatusError("");
          setStatusLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setStatusError(err.message);
          setStatusLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

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

      try {
        const response = await api.get("/data/status/");

        setDatasetStatus(response.datasets);
        setStatusError("");
      } catch (statusRequestError) {
        setStatusError(statusRequestError.message);
      }
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
          Data yang digunakan adalah kategori Clothing dari dua sumber dataset.
        </p>
      </div>

      {statusError && (
        <div
          role="alert"
          className="rounded-md border border-amber-900 bg-amber-950/20 px-4 py-3 text-sm text-amber-300"
        >
          Status dataset belum dapat diperbarui: {statusError}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {datasets.map((dataset) => (
          <DatasetCard
            key={dataset.id}
            dataset={dataset}
            data={datasetStatus?.[dataset.id]}
            loading={statusLoading}
          />
        ))}
      </div>

      <div className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
        <h3 className="font-medium text-white">Data yang sedang ditampilkan</h3>

        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-zinc-500">Sumber</p>

            <p className="mt-1 text-zinc-200">
              {source === "inventory" ? "Retail Inventory" : "Retail Sales"}
            </p>
          </div>

          <div>
            <p className="text-zinc-500">Tahun</p>

            <p className="mt-1 text-zinc-200">{year}</p>
          </div>

          <div>
            <p className="text-zinc-500">Status periode</p>

            <p className="mt-1 text-zinc-200">
              {summary?.available ? "Data tersedia" : "Data belum tersedia"}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-zinc-800 bg-[#111114] p-5"
      >
        <h3 className="font-medium text-white">Impor CSV</h3>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Unggah file Retail Sales atau Retail Inventory. Impor ulang akan
          mengganti data dari sumber yang sama.
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
            <h4 className="text-sm font-medium text-white">Impor berhasil</h4>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-zinc-500">Total baris</p>

                <p className="mt-1 text-lg font-medium text-white">
                  {formatNumber(importResult.total_rows)}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">Data Clothing</p>

                <p className="mt-1 text-lg font-medium text-white">
                  {formatNumber(importResult.imported_rows)}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">Kategori lain</p>

                <p className="mt-1 text-lg font-medium text-white">
                  {formatNumber(importResult.ignored_rows)}
                </p>
              </div>
            </div>

            {importResult.corrected_forecasts > 0 && (
              <p className="mt-4 border-t border-zinc-700 pt-4 text-sm leading-6 text-zinc-300">
                {formatNumber(importResult.corrected_forecasts)} nilai Demand
                Forecast negatif disesuaikan menjadi nol.
              </p>
            )}
          </div>
        )}
      </form>

      <div className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
        <h3 className="font-medium text-white">Catatan data</h3>

        <p className="mt-2 text-sm leading-7 text-zinc-400">
          Inventory Level menunjukkan persediaan pada waktu pencatatan dan tidak
          boleh dijumlahkan begitu saja antarperiode.
        </p>

        <p className="mt-3 text-sm leading-7 text-zinc-400">
          Nilai Demand Forecast negatif pada Retail Inventory disesuaikan
          menjadi nol saat impor. Perubahan tersebut merupakan langkah
          pembersihan data.
        </p>

        <p className="mt-3 text-sm leading-7 text-zinc-400">
          Dataset Retail and Warehouse Sale tidak digunakan untuk perhitungan
          pakaian karena tidak menyediakan kategori Clothing yang sesuai dengan
          penelitian ini.
        </p>
      </div>
    </div>
  );
}
