import { formatNumber, monthNames } from "../lib/format";

function StatCard({ label, value, detail }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
      <p className="text-sm text-zinc-400">{label}</p>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>

      {detail && <p className="mt-2 text-xs text-zinc-500">{detail}</p>}
    </div>
  );
}

function EmptyData({ onOpenData }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-[#111114] px-6 py-14 text-center">
      <h3 className="text-lg font-medium text-white">
        Belum ada data untuk ditampilkan
      </h3>

      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
        Unggah dataset Retail Sales atau Retail Inventory untuk menampilkan
        laporan penjualan pakaian.
      </p>

      <button
        type="button"
        onClick={onOpenData}
        className="mt-6 rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-zinc-200"
      >
        Buka halaman data
      </button>
    </div>
  );
}

function MonthlyChart({ monthly }) {
  const maximum = Math.max(
    1,
    ...monthly.flatMap((item) => [Number(item.sold), Number(item.demand)]),
  );

  return (
    <section className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-medium text-white">Penjualan bulanan</h3>

          <p className="mt-1 text-xs text-zinc-500">
            Unit terjual dan permintaan berdasarkan dataset
          </p>
        </div>

        <div className="flex gap-4 text-xs text-zinc-400">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-white" />
            Terjual
          </span>

          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-zinc-600" />
            Permintaan
          </span>
        </div>
      </div>

      <div className="mt-8 grid h-64 grid-cols-12 gap-2 border-b border-zinc-800 pb-4">
        {monthly.map((item) => (
          <div
            key={item.month}
            className="flex min-w-0 flex-col items-center justify-end"
          >
            <div className="flex h-full w-full items-end justify-center gap-1">
              <div
                title={`Terjual: ${formatNumber(item.sold)}`}
                className="w-1/3 max-w-6 rounded-t-sm bg-white"
                style={{
                  height: `${(Number(item.sold) / maximum) * 100}%`,
                }}
              />

              <div
                title={`Permintaan: ${formatNumber(item.demand)}`}
                className="w-1/3 max-w-6 rounded-t-sm bg-zinc-600"
                style={{
                  height: `${(Number(item.demand) / maximum) * 100}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-12 gap-2 text-center text-[10px] text-zinc-500 sm:text-xs">
        {monthNames.map((month) => (
          <span key={month}>{month}</span>
        ))}
      </div>
    </section>
  );
}

function ProductTable({ products }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
      <h3 className="font-medium text-white">
        Produk dengan penjualan tertinggi
      </h3>

      <p className="mt-1 text-xs text-zinc-500">
        Berdasarkan ID produk pada dataset
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 text-zinc-500">
            <tr>
              <th className="py-3 font-medium">ID produk</th>
              <th className="py-3 text-right font-medium">Unit terjual</th>
              <th className="py-3 text-right font-medium">Observasi</th>
            </tr>
          </thead>

          <tbody>
            {products.map((item) => (
              <tr
                key={item.product_id}
                className="border-b border-zinc-800/70 last:border-0"
              >
                <td className="py-3 text-zinc-200">{item.product_id}</td>

                <td className="py-3 text-right text-zinc-200">
                  {formatNumber(item.sold)}
                </td>

                <td className="py-3 text-right text-zinc-400">
                  {formatNumber(item.rows)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DiscountTable({ discounts }) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
      <h3 className="font-medium text-white">Penjualan berdasarkan diskon</h3>

      <p className="mt-1 text-xs text-zinc-500">
        Data historis, bukan hasil simulasi
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-800 text-zinc-500">
            <tr>
              <th className="py-3 font-medium">Diskon</th>
              <th className="py-3 text-right font-medium">Observasi</th>
              <th className="py-3 text-right font-medium">Terjual</th>
              <th className="py-3 text-right font-medium">Permintaan</th>
              <th className="py-3 text-right font-medium">Rata-rata terjual</th>
            </tr>
          </thead>

          <tbody>
            {discounts.map((item) => (
              <tr
                key={item.discount}
                className="border-b border-zinc-800/70 last:border-0"
              >
                <td className="py-3 text-zinc-200">{item.discount}%</td>

                <td className="py-3 text-right text-zinc-400">
                  {formatNumber(item.rows)}
                </td>

                <td className="py-3 text-right text-zinc-200">
                  {formatNumber(item.sold)}
                </td>

                <td className="py-3 text-right text-zinc-200">
                  {formatNumber(item.demand)}
                </td>

                <td className="py-3 text-right text-zinc-300">
                  {formatNumber(item.rows ? item.sold / item.rows : 0, 2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function Dashboard({
  summary,
  loading,
  error,
  mode,
  onOpenData,
}) {
  if (loading && !summary) {
    return <p className="text-sm text-zinc-400">Memuat data penjualan...</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-900 bg-red-950/30 p-5 text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (!summary?.available) {
    return <EmptyData onOpenData={onOpenData} />;
  }

  if (mode === "analysis") {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-white">Analisis diskon</h3>

          <p className="mt-2 text-sm text-zinc-400">
            Perbandingan penjualan pada setiap tingkat diskon.
          </p>
        </div>

        <DiscountTable discounts={summary.discounts} />

        <div className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
          <h3 className="font-medium text-white">Catatan analisis</h3>

          <p className="mt-2 text-sm leading-7 text-zinc-400">
            Perbedaan penjualan pada tingkat diskon tertentu belum membuktikan
            hubungan sebab-akibat. Harga, promosi, musim, dan karakteristik
            produk juga dapat memengaruhi jumlah penjualan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-zinc-400">
          Data {summary.year} · {formatNumber(summary.rows)} observasi
        </p>

        <p className="mt-1 text-xs text-zinc-500">
          {summary.first_date} sampai {summary.last_date}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Unit terjual"
          value={formatNumber(summary.sold)}
          detail="Total pada periode terpilih"
        />

        <StatCard
          label={summary.source === "sales" ? "Permintaan" : "Demand forecast"}
          value={formatNumber(summary.demand)}
          detail="Nilai dalam dataset"
        />

        <StatCard
          label="Rata-rata harga"
          value={formatNumber(summary.average_price, 2)}
          detail="Satuan nilai dataset"
        />

        <StatCard
          label="Penjualan per minggu"
          value={formatNumber(summary.weekly_average)}
          detail="Rata-rata selama rentang tanggal data"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Jumlah toko" value={formatNumber(summary.stores)} />

        <StatCard
          label="ID produk"
          value={formatNumber(summary.products_count)}
        />
      </div>

      <MonthlyChart monthly={summary.monthly} />

      <ProductTable products={summary.products} />
    </div>
  );
}
