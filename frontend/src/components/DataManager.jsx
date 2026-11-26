import { useEffect, useState } from "react";

import { api } from "../lib/api";
import { formatNumber } from "../lib/format";

import Panel from "./common/Panel";
import StatusTag from "./common/StatusTag";

const datasetOrder = [
  "sales_data",
  "retail_store_inventory",
  "fashion_boutique",
  "retail_sales_apl",
  "retail_inventory_apl",
];

const metricLabels = {
  products: "Produk unik",
  stores: "Toko unik",
  clothing_rows: "Baris Clothing",
  units_sold: "Unit terjual",
  demand: "Total demand",
  stock_units: "Total stok",
  demand_forecast: "Demand forecast",
  average_markdown: "Rata-rata markdown",
  categories: "Kategori",
  missing_size: "Ukuran kosong",
  junior_apparel_rows: "Baris Junior Apparel",
  junior_apparel_stock: "Stok Junior Apparel",
  junior_apparel_units_net: "Unit bersih Junior Apparel",
  junior_apparel_return_rows: "Baris retur Junior Apparel",
  junior_apparel_sales_value: "Nilai penjualan Junior Apparel",
  junior_apparel_cogs: "COGS Junior Apparel",
  stock_statuses: "Jenis status stok",
};

export default function DataManager({ onDataChanged }) {
  const [statusData, setStatusData] = useState(null);

  const [selectedDataset, setSelectedDataset] = useState("sales_data");

  const [file, setFile] = useState(null);

  const [fileInputKey, setFileInputKey] = useState(0);

  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  async function refreshStatus() {
    setLoading(true);

    try {
      const response = await api.get("/data/status/");

      setStatusData(response.datasets);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    api
      .get("/data/status/")
      .then((response) => {
        if (active) {
          setStatusData(response.datasets);
          setError("");
        }
      })
      .catch((err) => {
        if (active) {
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
  }, []);

  async function handleUpload(event) {
    event.preventDefault();

    if (!file) {
      setError("Pilih file CSV terlebih dahulu.");
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();

      formData.append("dataset", selectedDataset);

      formData.append("file", file);

      const response = await api.upload("/data/upload/", formData);

      setMessage(response.message);

      setFile(null);

      setFileInputKey((value) => value + 1);

      await refreshStatus();

      onDataChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Status lima dataset"
        subtitle="Setiap file disimpan dan dianalisis sesuai struktur datanya. Dataset yang berbeda tidak otomatis digabung."
      >
        {loading ? (
          <p className="text-sm text-zinc-500">Memeriksa file CSV...</p>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {datasetOrder.map((key) => {
              const item = statusData?.[key];

              if (!item) return null;

              return (
                <article
                  key={key}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="font-medium text-white">{item.label}</h4>

                      <p className="mt-1 text-xs text-emerald-400">
                        {item.role}
                      </p>
                    </div>

                    <StatusTag good={item.available}>
                      {item.available
                        ? "Tersedia"
                        : item.error
                          ? "File tidak valid"
                          : "Belum diunggah"}
                    </StatusTag>
                  </div>

                  <p className="mt-3 text-sm leading-5 text-zinc-400">
                    {item.description}
                  </p>

                  <p className="mt-3 break-all font-mono text-[11px] text-zinc-600">
                    {item.filename}
                  </p>

                  {item.error && (
                    <p className="mt-3 text-xs leading-5 text-red-300">
                      {item.error}
                    </p>
                  )}

                  {item.available && (
                    <>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-zinc-500">Jumlah baris</p>

                          <p className="mt-1 text-lg font-semibold text-white">
                            {formatNumber(item.rows)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-zinc-500">Periode</p>

                          <p className="mt-1 text-sm text-zinc-200">
                            {item.period_start || "-"}
                            {" sampai "}
                            {item.period_end || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-zinc-800 pt-3">
                        {Object.entries(item.metrics || {}).map(
                          ([metric, value]) => (
                            <div key={metric} className="min-w-0">
                              <p className="text-[11px] text-zinc-600">
                                {metricLabels[metric] || metric}
                              </p>

                              <p className="mt-0.5 truncate text-sm text-zinc-300">
                                {typeof value === "number"
                                  ? formatNumber(
                                      value,
                                      Number.isInteger(value) ? 0 : 2,
                                    )
                                  : String(value)}
                              </p>
                            </div>
                          ),
                        )}
                      </div>
                    </>
                  )}

                  {item.notes?.length > 0 && (
                    <ul className="mt-4 list-disc space-y-1 pl-5 text-xs leading-5 text-zinc-500">
                      {item.notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel
        title="Unggah atau perbarui CSV"
        subtitle="Pilih jenis dataset, lalu unggah file CSV yang sesuai. Nama file di server akan disesuaikan otomatis."
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <label className="block">
            <span className="text-xs text-zinc-400">Jenis dataset</span>

            <select
              value={selectedDataset}
              onChange={(event) => {
                setSelectedDataset(event.target.value);
                setFile(null);
                setMessage("");
                setError("");
              }}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500"
            >
              <option value="sales_data">Sales Data</option>

              <option value="retail_store_inventory">
                Retail Store Inventory
              </option>

              <option value="fashion_boutique">Fashion Boutique</option>

              <option value="retail_sales_apl">Retail Sales APL</option>

              <option value="retail_inventory_apl">Retail Inventory APL</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs text-zinc-400">File CSV</span>

            <input
              key={fileInputKey}
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);

                setMessage("");
                setError("");
              }}
              className="mt-2 block w-full rounded-lg border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-300 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-white"
            />
          </label>

          {file && (
            <p className="text-xs text-zinc-500">
              {file.name}
              {" · "}
              {formatNumber(file.size / 1024 / 1024, 2)}
              {" MB"}
            </p>
          )}

          <p className="text-xs leading-5 text-zinc-600">
            Batas unggahan 160 MB per file. Mengunggah ulang dataset akan
            mengganti file sebelumnya untuk jenis dataset tersebut.
          </p>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {message && (
            <div
              role="status"
              className="rounded-lg border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-300"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Mengunggah dan menyimpan..." : "Unggah dataset"}
          </button>
        </form>
      </Panel>

      <Panel title="Pembagian fungsi dataset">
        <div className="space-y-3 text-sm leading-6 text-zinc-400">
          <p>
            <span className="font-medium text-zinc-200">sales_data.csv:</span>{" "}
            sumber utama regresi Log-Log karena memuat Demand, Price, Discount,
            Units Sold, dan Inventory Level untuk kategori Clothing.
          </p>

          <p>
            <span className="font-medium text-zinc-200">
              retail_store_inventory.csv:
            </span>{" "}
            pembanding terpisah. Kolom Demand Forecast tidak diperlakukan
            sebagai permintaan aktual.
          </p>

          <p>
            <span className="font-medium text-zinc-200">
              fashion_boutique_dataset.csv:
            </span>{" "}
            katalog stok dan markdown pakaian. Tidak digunakan untuk melatih
            elastisitas karena tidak memuat jumlah unit terjual.
          </p>

          <p>
            <span className="font-medium text-zinc-200">
              retail_sales_ml_apl.csv dan retail_inventory_ml_apl.csv:
            </span>{" "}
            sumber transaksi dan inventaris APL. Kelompok Junior Apparel
            dianalisis terpisah dari data Clothing utama.
          </p>
        </div>
      </Panel>
    </div>
  );
}
