import { useEffect, useState } from "react";

import { api } from "../lib/api";

import { formatNumber } from "../lib/format";

const datasets = [
  {
    id: "sales",
    name: "Retail Sales",
    group: "Clothing · Optimasi markdown",
    filename: "sales_data.csv",

    description:
      "Penjualan aktual, harga, diskon, promosi, dan permintaan historis untuk analisis penjualan pakaian.",
  },

  {
    id: "inventory",
    name: "Retail Inventory",
    group: "Clothing · Analisis inventori",
    filename: "retail_store_inventory.csv",

    description:
      "Tingkat persediaan, penjualan, pemesanan, dan demand forecast untuk kategori Clothing.",
  },

  {
    id: "warehouse_sales",
    name: "Retail and Warehouse Sales",
    group: "Dataset tambahan · Analisis terpisah",
    filename: "Retail and wherehouse Sale.csv",

    description:
      "Supplier, item, tipe produk, retail sales, retail transfers, dan warehouse sales. Tidak digunakan untuk estimasi elastisitas pakaian.",
  },
];

function DatasetCard({ dataset, data, loading }) {
  const rows = data?.rows ?? 0;

  const available = rows > 0;

  const isWarehouse = dataset.id === "warehouse_sales";

  let period = "-";

  if (isWarehouse && data?.years?.length) {
    period =
      data.years.length > 1
        ? `${data.years[0]}–${data.years[data.years.length - 1]}`
        : String(data.years[0]);
  } else if (data?.first_date && data?.last_date) {
    period = `${data.first_date} sampai ${data.last_date}`;
  }

  return (
    <article className="min-w-0 rounded-lg border border-zinc-800 bg-[#111114] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-600">
            {dataset.group}
          </p>

          <h4 className="mt-1 font-medium text-white">{dataset.name}</h4>

          <p className="mt-2 text-sm leading-6 text-zinc-400">
            {dataset.description}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-md border px-2.5 py-1 text-xs ${
            loading
              ? "border-zinc-700 text-zinc-400"
              : available
                ? "border-emerald-900 bg-emerald-950/30 text-emerald-300"
                : "border-zinc-700 bg-zinc-900 text-zinc-400"
          }`}
        >
          {loading
            ? "Memeriksa..."
            : available
              ? "Sudah diimpor"
              : "Belum diimpor"}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-zinc-500">
            {isWarehouse ? "Total baris" : "Observasi Clothing"}
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
            {loading ? "-" : formatNumber(rows)}
          </p>
        </div>

        <div>
          <p className="text-xs text-zinc-500">
            {isWarehouse ? "Supplier / item unik" : "Toko / produk"}
          </p>

          <p className="mt-2 text-lg font-medium text-white">
            {loading
              ? "-"
              : isWarehouse
                ? `${formatNumber(data?.suppliers)} / ${formatNumber(data?.products)}`
                : `${formatNumber(data?.stores)} / ${formatNumber(data?.products)}`}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-zinc-800 pt-4">
        <p className="text-xs text-zinc-500">
          {isWarehouse ? "Tahun tersedia" : "Periode data"}
        </p>

        <p className="mt-2 text-sm text-zinc-300">{loading ? "-" : period}</p>

        {isWarehouse && data?.months?.length > 0 && (
          <p className="mt-1 text-xs text-zinc-500">
            Bulan tersedia: {data.months.join(", ")}
          </p>
        )}
      </div>

      <p className="mt-4 break-all font-mono text-xs text-zinc-500">
        {dataset.filename}
      </p>
    </article>
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

  async function refreshStatus() {
    setStatusLoading(true);

    try {
      const response = await api.get("/data/status/");

      setDatasetStatus(response.datasets);

      setStatusError("");
    } catch (err) {
      setStatusError(err.message);
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    api

      .get("/data/status/")

      .then((response) => {
        if (active) {
          setDatasetStatus(response.datasets);

          setStatusError("");
        }
      })

      .catch((err) => {
        if (active) {
          setStatusError(err.message);
        }
      })

      .finally(() => {
        if (active) {
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

    const form = event.currentTarget;

    setLoading(true);

    setError("");

    setImportResult(null);

    try {
      const formData = new FormData();

      formData.append("file", file);

      const result = await api.upload("/data/import/", formData);

      setImportResult(result);

      setFile(null);

      form.reset();

      await refreshStatus();

      onImported?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white">Tiga sumber dataset</h3>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
          Unggah file CSV satu per satu. Backend mendeteksi jenis dataset
          melalui struktur kolom. Retail Sales dan Retail Inventory digunakan
          untuk analisis Clothing, sedangkan Retail and Warehouse Sales disimpan
          dan dianalisis dalam modul terpisah.
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

      <div className="grid gap-4 xl:grid-cols-3">
        {datasets.map((dataset) => (
          <DatasetCard
            key={dataset.id}
            dataset={dataset}
            data={datasetStatus?.[dataset.id]}
            loading={statusLoading}
          />
        ))}
      </div>

      <section className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
        <h3 className="font-medium text-white">
          Data Clothing yang sedang dipilih
        </h3>

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
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-zinc-800 bg-[#111114] p-5"
      >
        <h3 className="font-medium text-white">Impor file CSV</h3>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Pilih salah satu file CSV di atas. Batas ukuran unggahan 12 MB.
          Mengimpor ulang satu dataset hanya mengganti data pada sumber
          tersebut; dua dataset lainnya tidak dihapus.
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

        {file && (
          <p className="mt-2 text-xs text-zinc-500">
            File dipilih: {file.name} ·{" "}
            {formatNumber(Math.ceil(file.size / 1024))} KB
          </p>
        )}

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
          disabled={loading || !file}
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
              {importResult.message || "Impor berhasil"}
            </h4>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <p className="text-xs text-zinc-500">Sumber terdeteksi</p>

                <p className="mt-1 text-sm font-medium text-white">
                  {importResult.source}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">Total baris</p>

                <p className="mt-1 text-lg font-medium text-white">
                  {formatNumber(importResult.total_rows)}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">Berhasil diimpor</p>

                <p className="mt-1 text-lg font-medium text-white">
                  {formatNumber(importResult.imported_rows)}
                </p>
              </div>

              <div>
                <p className="text-xs text-zinc-500">Baris diabaikan</p>

                <p className="mt-1 text-lg font-medium text-white">
                  {formatNumber(importResult.ignored_rows)}
                </p>
              </div>
            </div>

            {importResult.source === "warehouse_sales" && (
              <div className="mt-4 border-t border-zinc-700 pt-4">
                <p className="text-xs font-medium text-zinc-300">
                  Pemeriksaan kualitas data
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {[
                    ["Supplier kosong", importResult.missing_supplier],

                    ["Retail Sales kosong", importResult.missing_retail_sales],

                    [
                      "Retail Sales negatif",
                      importResult.negative_retail_sales,
                    ],

                    [
                      "Retail Transfers negatif",
                      importResult.negative_retail_transfers,
                    ],

                    [
                      "Warehouse Sales negatif",
                      importResult.negative_warehouse_sales,
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-xs text-zinc-500">{label}</p>

                      <p className="mt-1 text-base font-medium text-white">
                        {formatNumber(value)}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  Nilai negatif dipertahankan sebagai data sumber. Retail Sales
                  kosong disimpan sebagai NULL dan supplier kosong disimpan
                  sebagai teks kosong.
                </p>
              </div>
            )}

            {importResult.source !== "warehouse_sales" && (
              <div className="mt-4 border-t border-zinc-700 pt-4">
                <p className="text-xs text-zinc-500">
                  Demand Forecast negatif yang disesuaikan menjadi nol
                </p>

                <p className="mt-1 text-base font-medium text-white">
                  {formatNumber(importResult.corrected_forecasts)}
                </p>
              </div>
            )}
          </div>
        )}
      </form>

      <section className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
        <h3 className="font-medium text-white">Pemisahan fungsi dataset</h3>

        <div className="mt-3 space-y-3 text-sm leading-6 text-zinc-400">
          <p>
            <strong className="text-zinc-200">Retail Sales:</strong> sumber
            utama untuk melihat hubungan diskon, harga, penjualan aktual, dan
            permintaan pada kategori Clothing.
          </p>

          <p>
            <strong className="text-zinc-200">Retail Inventory:</strong> sumber
            pendukung untuk melihat kondisi persediaan dan demand forecast pada
            kategori Clothing.
          </p>

          <p>
            <strong className="text-zinc-200">
              Retail and Warehouse Sales:
            </strong>{" "}
            sumber tambahan untuk analisis supplier, jenis item, retail sales,
            transfer, dan warehouse sales. Dataset ini tidak memiliki variabel
            harga pakaian dan diskon sehingga tidak digunakan untuk menghitung
            elastisitas atau rekomendasi markdown.
          </p>
        </div>
      </section>
    </div>
  );
}
