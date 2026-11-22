import { useEffect, useState } from "react";

import { api } from "../lib/api";

import { formatNumber, monthNames } from "../lib/format";

function StatCard({ label, value, detail }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
      <p className="text-sm text-zinc-400">{label}</p>

      <p className="mt-3 break-words text-2xl font-semibold text-white">
        {formatNumber(value, 2)}
      </p>

      {detail && <p className="mt-2 text-xs text-zinc-500">{detail}</p>}
    </section>
  );
}

function Panel({ title, subtitle, children }) {
  return (
    <section className="min-w-0 rounded-lg border border-zinc-800 bg-[#111114] p-5">
      <div className="mb-5">
        <h3 className="font-medium text-white">{title}</h3>

        {subtitle && (
          <p className="mt-1 text-xs leading-5 text-zinc-500">{subtitle}</p>
        )}
      </div>

      {children}
    </section>
  );
}

function MonthlyBars({ data, field, title }) {
  const max = Math.max(
    1,
    ...data.map((item) => Math.abs(Number(item[field] ?? 0))),
  );

  return (
    <Panel
      title={title}
      subtitle="Hanya bulan yang tercatat pada file sumber yang ditampilkan."
    >
      {data.length === 0 ? (
        <p className="text-sm text-zinc-500">Tidak ada data bulanan.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {data.map((item) => {
            const value = Number(item[field] ?? 0);

            const height = Math.max(2, (Math.abs(value) / max) * 100);

            const isNegative = value < 0;

            return (
              <div
                key={item.month}
                className="flex min-w-0 flex-col items-center"
              >
                <p
                  className={`mb-2 text-center text-xs ${
                    isNegative ? "text-amber-300" : "text-zinc-400"
                  }`}
                >
                  {formatNumber(value, 0)}
                </p>

                <div className="flex h-36 w-full items-end justify-center border-b border-zinc-800">
                  <div
                    className={`w-full max-w-12 rounded-t-sm ${
                      isNegative ? "bg-amber-500/70" : "bg-emerald-500/70"
                    }`}
                    style={{
                      height: `${height}%`,
                    }}
                    title={`${
                      monthNames[item.month - 1]
                    }: ${formatNumber(value, 2)}`}
                  />
                </div>

                <p className="mt-2 text-xs text-zinc-400">
                  {monthNames[item.month - 1]}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function TypeTable({ rows }) {
  return (
    <Panel
      title="Analisis berdasarkan tipe item"
      subtitle="Agregasi berdasarkan ITEM TYPE."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-zinc-800 text-zinc-500">
            <tr>
              <th className="px-3 py-3 font-medium">Item type</th>

              <th className="px-3 py-3 text-right font-medium">Baris</th>

              <th className="px-3 py-3 text-right font-medium">Item unik</th>

              <th className="px-3 py-3 text-right font-medium">Retail sales</th>

              <th className="px-3 py-3 text-right font-medium">
                Retail transfers
              </th>

              <th className="px-3 py-3 text-right font-medium">
                Warehouse sales
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((item) => (
              <tr
                key={item.item_type}
                className="border-b border-zinc-800/70 last:border-0"
              >
                <td className="px-3 py-3 font-medium text-zinc-200">
                  {item.item_type}
                </td>

                <td className="px-3 py-3 text-right text-zinc-400">
                  {formatNumber(item.rows)}
                </td>

                <td className="px-3 py-3 text-right text-zinc-400">
                  {formatNumber(item.products)}
                </td>

                <td className="px-3 py-3 text-right text-zinc-300">
                  {formatNumber(item.retail_sales, 2)}
                </td>

                <td className="px-3 py-3 text-right text-zinc-300">
                  {formatNumber(item.retail_transfers, 2)}
                </td>

                <td className="px-3 py-3 text-right text-zinc-300">
                  {formatNumber(item.warehouse_sales, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function SupplierTable({ rows }) {
  return (
    <Panel
      title="10 supplier teratas"
      subtitle="Diurutkan berdasarkan total Warehouse Sales tertinggi."
    >
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Tidak ada data supplier.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-zinc-800 text-zinc-500">
              <tr>
                <th className="px-3 py-3 font-medium">Supplier</th>

                <th className="px-3 py-3 text-right font-medium">Baris</th>

                <th className="px-3 py-3 text-right font-medium">
                  Retail sales
                </th>

                <th className="px-3 py-3 text-right font-medium">
                  Warehouse sales
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((item) => (
                <tr
                  key={item.supplier}
                  className="border-b border-zinc-800/70 last:border-0"
                >
                  <td className="max-w-[280px] px-3 py-3 text-zinc-200">
                    {item.supplier}
                  </td>

                  <td className="px-3 py-3 text-right text-zinc-400">
                    {formatNumber(item.rows)}
                  </td>

                  <td className="px-3 py-3 text-right text-zinc-300">
                    {formatNumber(item.retail_sales, 2)}
                  </td>

                  <td className="px-3 py-3 text-right text-zinc-300">
                    {formatNumber(item.warehouse_sales, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function ItemTable({ rows }) {
  return (
    <Panel
      title="10 item teratas"
      subtitle="Diurutkan berdasarkan total Warehouse Sales tertinggi."
    >
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">Tidak ada data item.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-zinc-800 text-zinc-500">
              <tr>
                <th className="px-3 py-3 font-medium">Item code</th>

                <th className="px-3 py-3 font-medium">Deskripsi</th>

                <th className="px-3 py-3 font-medium">Tipe</th>

                <th className="px-3 py-3 text-right font-medium">
                  Warehouse sales
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((item) => (
                <tr
                  key={`${item.item_code}-${item.item_description}`}
                  className="border-b border-zinc-800/70 last:border-0"
                >
                  <td className="px-3 py-3 text-zinc-200">{item.item_code}</td>

                  <td className="max-w-[320px] px-3 py-3 text-zinc-300">
                    {item.item_description}
                  </td>

                  <td className="px-3 py-3 text-zinc-400">{item.item_type}</td>

                  <td className="px-3 py-3 text-right text-zinc-200">
                    {formatNumber(item.warehouse_sales, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

function EmptyState({ onOpenData }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-[#111114] px-6 py-14 text-center">
      <h3 className="text-lg font-medium text-white">
        Dataset Warehouse Sales belum diimpor
      </h3>

      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-400">
        Unggah file Retail and wherehouse Sale.csv melalui halaman Kelola
        Dataset untuk membuka analisis supplier, item, dan distribusi.
      </p>

      <button
        type="button"
        onClick={onOpenData}
        className="mt-5 rounded-md bg-white px-5 py-2.5 text-sm font-medium text-black hover:bg-zinc-200"
      >
        Buka Kelola Dataset
      </button>
    </div>
  );
}

export default function WarehouseDashboard({ onOpenData }) {
  const [summary, setSummary] = useState(null);

  const [year, setYear] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const query = year ? `?year=${year}` : "";

    api

      .get(`/data/warehouse-summary/${query}`)

      .then((response) => {
        if (!active) return;

        setSummary(response);

        setError("");
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

  function handleYearChange(value) {
    setLoading(true);

    setYear(value);
  }

  if (loading && !summary) {
    return (
      <p className="text-sm text-zinc-400">
        Memuat Retail and Warehouse Sales...
      </p>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-red-900 bg-red-950/30 p-5 text-sm text-red-300"
      >
        {error}
      </div>
    );
  }

  if (!summary?.available) {
    return <EmptyState onOpenData={onOpenData} />;
  }

  const monthsLabel = (summary.quality?.observed_months || [])

    .map((month) => monthNames[month - 1])

    .join(", ");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-zinc-400">
            {formatNumber(summary.rows)} baris ·{" "}
            {formatNumber(summary.suppliers_count)} supplier ·{" "}
            {formatNumber(summary.products_count)} item unik
          </p>

          <p className="mt-1 text-xs text-zinc-500">
            Tahun {summary.year} · Bulan tersedia: {monthsLabel || "-"}
          </p>
        </div>

        {summary.available_years?.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-zinc-500">
            Tahun
            <select
              value={year ?? summary.year}
              onChange={(event) => handleYearChange(Number(event.target.value))}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
            >
              {summary.available_years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Retail Sales"
          value={summary.retail_sales}
          detail="Total kolom RETAIL SALES"
        />

        <StatCard
          label="Retail Transfers"
          value={summary.retail_transfers}
          detail="Total kolom RETAIL TRANSFERS"
        />

        <StatCard
          label="Warehouse Sales"
          value={summary.warehouse_sales}
          detail="Total kolom WAREHOUSE SALES"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <MonthlyBars
          data={summary.monthly}
          field="retail_sales"
          title="Retail Sales per bulan"
        />

        <MonthlyBars
          data={summary.monthly}
          field="retail_transfers"
          title="Retail Transfers per bulan"
        />

        <MonthlyBars
          data={summary.monthly}
          field="warehouse_sales"
          title="Warehouse Sales per bulan"
        />
      </div>

      <TypeTable rows={summary.item_types || []} />

      <div className="grid gap-5 xl:grid-cols-2">
        <SupplierTable rows={summary.suppliers_top || []} />

        <ItemTable rows={summary.items_top || []} />
      </div>

      <Panel title="Kualitas dan keterbatasan dataset">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            ["Supplier kosong", summary.quality?.missing_supplier],

            ["Retail Sales kosong", summary.quality?.missing_retail_sales],

            ["Retail Sales negatif", summary.quality?.negative_retail_sales],

            [
              "Retail Transfers negatif",
              summary.quality?.negative_retail_transfers,
            ],

            [
              "Warehouse Sales negatif",
              summary.quality?.negative_warehouse_sales,
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-md border border-zinc-800 bg-zinc-950 p-3"
            >
              <p className="text-xs text-zinc-500">{label}</p>

              <p className="mt-1 text-lg font-medium text-white">
                {formatNumber(value)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-2 text-sm leading-6 text-zinc-400">
          <p>{summary.interpretation_note}</p>
        </div>
      </Panel>
    </div>
  );
}
