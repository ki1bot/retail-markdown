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

export default function DataManager({ summary, onImported }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      setError("Pilih file CSV terlebih dahulu.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await api.upload("/data/import/", formData);

      onImported(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white">Dataset ritel</h3>

        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Data diambil dari dataset ritel dan dibatasi pada kategori Clothing.
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
              {summary?.source === "inventory"
                ? "Retail Inventory"
                : "Retail Sales"}
            </span>
          </p>

          <p>
            Tahun:{" "}
            <span className="text-zinc-200">{summary?.year || 2023}</span>
          </p>

          <p>
            Status:{" "}
            <span className="text-zinc-200">
              {summary?.available ? "Data tersedia" : "Data belum tersedia"}
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
          Pilih salah satu dataset ritel. Impor ulang akan mengganti data dari
          sumber yang sama.
        </p>

        <input
          type="file"
          accept=".csv,text/csv"
          required
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          className="mt-5 block w-full rounded-md border border-zinc-700 bg-zinc-950 p-3 text-sm text-zinc-300 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-white"
        />

        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-5 rounded-md bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-zinc-200 disabled:opacity-50"
        >
          {loading ? "Mengimpor data..." : "Impor dataset"}
        </button>
      </form>

      <div className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
        <h3 className="font-medium text-white">Batasan data</h3>

        <p className="mt-2 text-sm leading-7 text-zinc-400">
          Dataset tidak memiliki penanda khusus untuk stok pakaian musim
          sebelumnya. Nilai Inventory Level merupakan catatan persediaan
          historis, bukan stok akhir toko yang dapat dijumlahkan antarperiode.
        </p>
      </div>
    </div>
  );
}
