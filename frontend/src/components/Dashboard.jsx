import { useEffect, useState } from "react";

import { api } from "../lib/api";
import { formatNumber } from "../lib/format";

import StatCard from "./common/StatCard";
import Panel from "./common/Panel";
import MonthlyBarChart from "./common/MonthlyBarChart";

export default function Dashboard() {
  const [year, setYear] = useState(2023);

  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    api
      .get(`/data/summary/?year=${year}`)
      .then((data) => {
        if (active) {
          setSummary(data);
          setError("");
        }
      })
      .catch((err) => {
        if (active) {
          setSummary(null);
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

  if (loading || !summary || summary.year !== year) {
    return <p className="text-sm text-zinc-400">Memuat ringkasan dataset...</p>;
  }

  if (!summary.available) {
    return (
      <Panel title="Dataset utama belum tersedia">
        <p className="text-sm leading-6 text-zinc-400">
          Unggah sales_data.csv melalui menu Kelola Dataset untuk membuka
          ringkasan dan analisis kategori Clothing.
        </p>
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-400">
            {formatNumber(summary.rows)} observasi Clothing
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Periode {summary.date_start} sampai {summary.date_end}
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs text-zinc-500">
          Tahun data
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500"
          >
            {summary.available_years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Unit terjual"
          value={formatNumber(summary.units_sold)}
          detail="Akumulasi Units Sold pada kategori Clothing."
        />

        <StatCard
          label="Total demand"
          value={formatNumber(summary.demand)}
          detail="Akumulasi kolom Demand pada dataset."
        />

        <StatCard
          label="Rata-rata penjualan mingguan"
          value={formatNumber(summary.weekly_average_units_sold, 2)}
          detail="Menjadi dasar permintaan awal simulasi."
        />

        <StatCard
          label="Stok pada tanggal terakhir"
          value={formatNumber(summary.latest_stock)}
          detail={`Snapshot ${summary.latest_date}, bukan stok musim lalu yang sudah diverifikasi.`}
        />
      </div>

      <MonthlyBarChart data={summary.monthly} />

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Kondisi harga dan diskon"
          subtitle="Rata-rata berdasarkan observasi Clothing pada tahun terpilih."
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-zinc-500">Harga referensi</p>

              <p className="mt-2 text-xl font-semibold text-white">
                {formatNumber(summary.average_price, 2)}
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-500">Harga setelah diskon</p>

              <p className="mt-2 text-xl font-semibold text-white">
                {formatNumber(summary.average_effective_price, 2)}
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-500">Rata-rata diskon</p>

              <p className="mt-2 text-xl font-semibold text-white">
                {formatNumber(summary.average_discount, 2)}%
              </p>
            </div>

            <div>
              <p className="text-xs text-zinc-500">Nilai penjualan estimasi</p>

              <p className="mt-2 text-xl font-semibold text-white">
                {formatNumber(summary.estimated_revenue, 2)}
              </p>
            </div>
          </div>
        </Panel>

        <Panel
          title="Pemeriksaan kualitas data"
          subtitle="Pemeriksaan awal pada baris Clothing dan konsistensi ID produk."
        >
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-zinc-400">Nilai kosong</span>

              <span className="font-medium text-white">
                {formatNumber(summary.quality.missing_values)}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-zinc-400">Baris duplikat</span>

              <span className="font-medium text-white">
                {formatNumber(summary.quality.duplicate_rows)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-zinc-400">
                Product ID di beberapa kategori
              </span>

              <span className="font-medium text-amber-300">
                {formatNumber(
                  summary.quality.product_ids_in_multiple_categories,
                )}
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
