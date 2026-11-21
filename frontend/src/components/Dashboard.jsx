import { formatNumber, monthNames } from "../lib/format";

const chartColors = {
  primary: "#e4e4e7",

  secondary: "#38bdf8",

  tertiary: "#f59e0b",

  green: "#34d399",

  purple: "#a78bfa",

  muted: "#71717a",
};

function Panel({ title, subtitle, children, className = "" }) {
  return (
    <section
      className={`min-w-0 rounded-xl border border-zinc-800 bg-[#111114] p-5 ${className}`}
    >
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

function StatCard({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#111114] p-5">
      <p className="text-sm text-zinc-400">{label}</p>

      <p className="mt-3 break-words text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>

      {detail && <p className="mt-2 text-xs text-zinc-500">{detail}</p>}
    </div>
  );
}

function EmptyData({ source, year, onOpenData }) {
  const datasetName =
    source === "inventory" ? "Retail Inventory" : "Retail Sales";

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#111114] px-6 py-14 text-center">
      <h3 className="text-lg font-medium text-white">Dataset belum tersedia</h3>

      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-zinc-400">
        Impor file {datasetName} terlebih dahulu. Dashboard hanya menampilkan
        kategori Clothing untuk tahun {year}, mengikuti filter pada laporan
        Power BI.
      </p>

      <button
        type="button"
        onClick={onOpenData}
        className="mt-6 rounded-md bg-white px-4 py-2.5 text-sm font-medium text-black hover:bg-zinc-200"
      >
        Buka halaman dataset
      </button>
    </div>
  );
}

function Legend({ series }) {
  return (
    <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2">
      {series.map((item) => (
        <span
          key={item.key}
          className="flex items-center gap-2 text-xs text-zinc-400"
        >
          <span
            className="h-2.5 w-2.5 rounded-sm"
            style={{
              backgroundColor: item.color,
            }}
          />

          {item.label}
        </span>
      ))}
    </div>
  );
}

function LineChart({
  data,

  series,

  labelKey = "month",

  allowNegative = false,

  valueSuffix = "",
}) {
  const width = 780;

  const height = 290;

  const left = 64;

  const right = 18;

  const top = 18;

  const bottom = 48;

  const plotWidth = width - left - right;

  const plotHeight = height - top - bottom;

  const values = data.flatMap((item) =>
    series

      .map((entry) => Number(item[entry.key]))

      .filter((value) => Number.isFinite(value)),
  );

  const minValue = allowNegative ? Math.min(0, ...values) : 0;

  const maxValue = Math.max(1, ...values);

  const range = Math.max(1, maxValue - minValue);

  const x = (index) =>
    left +
    (data.length <= 1
      ? plotWidth / 2
      : (index / (data.length - 1)) * plotWidth);

  const y = (value) => top + ((maxValue - value) / range) * plotHeight;

  const zeroY = y(0);

  function labelFor(item) {
    if (labelKey === "month") {
      return monthNames[Number(item.month) - 1] || "";
    }

    return String(item[labelKey] ?? "");
  }

  return (
    <div className="w-full">
      <Legend series={series} />

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Grafik tren berdasarkan bulan"
        className="h-auto w-full overflow-visible"
      >
        {[0, 1, 2, 3, 4].map((step) => {
          const value = maxValue - (range * step) / 4;

          const yPos = y(value);

          return (
            <g key={step}>
              <line
                x1={left}
                x2={width - right}
                y1={yPos}
                y2={yPos}
                stroke="#27272a"
                strokeDasharray="3 5"
              />

              <text
                x={left - 10}
                y={yPos + 4}
                fill="#71717a"
                fontSize="10"
                textAnchor="end"
              >
                {formatNumber(value, 0)}
                {valueSuffix}
              </text>
            </g>
          );
        })}

        {allowNegative && (
          <line
            x1={left}
            x2={width - right}
            y1={zeroY}
            y2={zeroY}
            stroke="#a1a1aa"
            strokeDasharray="4 4"
          />
        )}

        {series.map((entry) => {
          const points = data

            .map((item, index) => ({
              x: x(index),

              y: Number.isFinite(Number(item[entry.key]))
                ? y(Number(item[entry.key]))
                : null,
            }))

            .filter((point) => point.y !== null);

          const path = points

            .map(
              (point, index) =>
                `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
            )

            .join(" ");

          return (
            <g key={entry.key}>
              <path
                d={path}
                fill="none"
                stroke={entry.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {points.map((point, index) => (
                <circle
                  key={`${entry.key}-${index}`}
                  cx={point.x}
                  cy={point.y}
                  r="3.2"
                  fill={entry.color}
                  stroke="#111114"
                  strokeWidth="1.5"
                />
              ))}
            </g>
          );
        })}

        {data.map((item, index) => (
          <text
            key={index}
            x={x(index)}
            y={height - 17}
            fill="#71717a"
            fontSize="10"
            textAnchor="middle"
          >
            {labelFor(item)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function GroupedBarChart({
  data,

  series,

  labelKey = "discount",

  valueSuffix = "",

  allowNegative = false,
}) {
  const width = 780;

  const height = 300;

  const left = 64;

  const right = 18;

  const top = 18;

  const bottom = 50;

  const plotWidth = width - left - right;

  const plotHeight = height - top - bottom;

  const values = data.flatMap((item) =>
    series.map((entry) => Number(item[entry.key] ?? 0)),
  );

  const minValue = allowNegative ? Math.min(0, ...values) : 0;

  const maxValue = Math.max(1, ...values);

  const range = Math.max(1, maxValue - minValue);

  const y = (value) => top + ((maxValue - value) / range) * plotHeight;

  const zeroY = y(0);

  const groupWidth = data.length ? plotWidth / data.length : plotWidth;

  const innerGroupWidth = groupWidth * 0.72;

  const barWidth = Math.min(
    28,

    innerGroupWidth / Math.max(series.length, 1) - 3,
  );

  function labelFor(item) {
    if (labelKey === "discount") {
      return `${item.discount}%`;
    }

    if (labelKey === "month") {
      return monthNames[Number(item.month) - 1] || "";
    }

    return String(item[labelKey] ?? "");
  }

  return (
    <div className="w-full">
      <Legend series={series} />

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Grafik batang perbandingan"
        className="h-auto w-full overflow-visible"
      >
        {[0, 1, 2, 3, 4].map((step) => {
          const value = maxValue - (range * step) / 4;

          const yPos = y(value);

          return (
            <g key={step}>
              <line
                x1={left}
                x2={width - right}
                y1={yPos}
                y2={yPos}
                stroke="#27272a"
                strokeDasharray="3 5"
              />

              <text
                x={left - 10}
                y={yPos + 4}
                fill="#71717a"
                fontSize="10"
                textAnchor="end"
              >
                {formatNumber(value, 0)}
                {valueSuffix}
              </text>
            </g>
          );
        })}

        <line
          x1={left}
          x2={width - right}
          y1={zeroY}
          y2={zeroY}
          stroke="#52525b"
        />

        {data.map((item, index) => {
          const groupStart =
            left + index * groupWidth + (groupWidth - innerGroupWidth) / 2;

          return (
            <g key={index}>
              {series.map((entry, seriesIndex) => {
                const value = Number(item[entry.key] ?? 0);

                const valueY = y(value);

                const barHeight = Math.abs(zeroY - valueY);

                const xPos = groupStart + seriesIndex * (barWidth + 3);

                return (
                  <rect
                    key={entry.key}
                    x={xPos}
                    y={Math.min(valueY, zeroY)}
                    width={barWidth}
                    height={Math.max(1, barHeight)}
                    rx="3"
                    fill={entry.color}
                  >
                    <title>
                      {`${labelFor(item)} · ${entry.label}: ${formatNumber(value, 2)}${valueSuffix}`}
                    </title>
                  </rect>
                );
              })}

              <text
                x={left + index * groupWidth + groupWidth / 2}
                y={height - 17}
                fill="#a1a1aa"
                fontSize="11"
                textAnchor="middle"
              >
                {labelFor(item)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function HorizontalBarChart({ products }) {
  const maximum = Math.max(
    1,

    ...products.map((item) => Number(item.sold)),
  );

  return (
    <div className="space-y-4">
      {products.map((item, index) => (
        <div key={item.product_id}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="text-zinc-300">
              <span className="mr-2 text-zinc-600">{index + 1}.</span>

              {item.product_id}
            </span>

            <span className="tabular-nums text-zinc-400">
              {formatNumber(item.sold)}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-sky-400"
              style={{
                width: (Number(item.sold) / maximum) * 100 + "%",
              }}
            />
          </div>
        </div>
      ))}

      {!products.length && (
        <p className="text-sm text-zinc-500">Belum ada data produk.</p>
      )}
    </div>
  );
}

function ScatterChart({ points, totalRows }) {
  const width = 780;

  const height = 310;

  const left = 62;

  const right = 18;

  const top = 18;

  const bottom = 48;

  const plotWidth = width - left - right;

  const plotHeight = height - top - bottom;

  const prices = points.map((point) => Number(point.price));

  const units = points.map((point) => Number(point.units_sold));

  const minX = Math.min(0, ...prices);

  const maxX = Math.max(1, ...prices);

  const minY = Math.min(0, ...units);

  const maxY = Math.max(1, ...units);

  const x = (value) => left + ((value - minX) / (maxX - minX)) * plotWidth;

  const y = (value) =>
    top + plotHeight - ((value - minY) / (maxY - minY)) * plotHeight;

  const discountColors = {
    0: "#a1a1aa",

    5: "#60a5fa",

    10: "#38bdf8",

    15: "#34d399",

    20: "#fbbf24",

    25: "#c084fc",
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
        {Object.entries(discountColors).map(([discount, color]) => (
          <span
            key={discount}
            className="flex items-center gap-2 text-xs text-zinc-400"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: color,
              }}
            />
            Diskon {discount}%
          </span>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Scatter plot harga dan unit terjual"
        className="h-auto w-full overflow-visible"
      >
        {[0, 1, 2, 3, 4].map((step) => {
          const value = maxY - ((maxY - minY) * step) / 4;

          const yPos = y(value);

          return (
            <g key={step}>
              <line
                x1={left}
                x2={width - right}
                y1={yPos}
                y2={yPos}
                stroke="#27272a"
                strokeDasharray="3 5"
              />

              <text
                x={left - 9}
                y={yPos + 4}
                fill="#71717a"
                fontSize="10"
                textAnchor="end"
              >
                {formatNumber(value)}
              </text>
            </g>
          );
        })}

        {points.map((point, index) => (
          <circle
            key={index}
            cx={x(Number(point.price))}
            cy={y(Number(point.units_sold))}
            r="2.6"
            fill={discountColors[point.discount] || "#a1a1aa"}
            opacity="0.65"
          >
            <title>
              {`Harga ${formatNumber(point.price, 2)} · Unit terjual ${formatNumber(point.units_sold)} · Diskon ${point.discount}%`}
            </title>
          </circle>
        ))}

        <text
          x={width / 2}
          y={height - 8}
          fill="#a1a1aa"
          fontSize="11"
          textAnchor="middle"
        >
          Harga rata-rata (satuan dataset)
        </text>

        <text
          x="14"
          y={height / 2}
          fill="#a1a1aa"
          fontSize="11"
          textAnchor="middle"
          transform={`rotate(-90 14 ${height / 2})`}
        >
          Unit terjual
        </text>
      </svg>

      <p className="mt-2 text-xs text-zinc-600">
        Menampilkan {formatNumber(points.length)} titik sampel dari{" "}
        {formatNumber(totalRows)} observasi. Sampel digunakan agar grafik tetap
        responsif.
      </p>
    </div>
  );
}

function DataHeading({ summary }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm text-zinc-400">
          Tahun {summary.year} · {formatNumber(summary.rows)} observasi Clothing
        </p>

        <p className="mt-1 text-xs text-zinc-500">
          {summary.first_date} sampai {summary.last_date}
        </p>
      </div>

      <p className="text-xs text-zinc-500">
        {formatNumber(summary.stores)} toko ·{" "}
        {formatNumber(summary.products_count)} produk
      </p>
    </div>
  );
}

function SalesAnalysis({ summary }) {
  const salesSeries = [
    {
      key: "sold",

      label: "Unit terjual",

      color: chartColors.primary,
    },

    {
      key: "demand",

      label: "Demand",

      color: chartColors.secondary,
    },
  ];

  const discountSeries = [
    {
      key: "average_sold",

      label: "Rata-rata unit terjual",

      color: chartColors.primary,
    },

    {
      key: "average_demand",

      label: "Rata-rata demand",

      color: chartColors.secondary,
    },
  ];

  return (
    <div className="space-y-6">
      <DataHeading summary={summary} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Tren penjualan dan permintaan pakaian"
          subtitle="Total unit terjual dibandingkan total Demand setiap bulan."
          className="xl:col-span-2"
        >
          <LineChart data={summary.monthly} series={salesSeries} />
        </Panel>

        <Panel
          title="Rata-rata penjualan berdasarkan diskon"
          subtitle="Rata-rata unit terjual dan Demand per observasi pada setiap tingkat diskon."
        >
          <GroupedBarChart
            data={summary.discounts}
            series={discountSeries}
            labelKey="discount"
          />
        </Panel>

        <Panel
          title="Selisih permintaan dan penjualan"
          subtitle="Demand dikurangi Units Sold. Selisih ini bukan otomatis lost sales."
        >
          <GroupedBarChart
            data={summary.monthly}
            series={[
              {
                key: "gap",

                label: "Demand − Unit terjual",

                color: chartColors.tertiary,
              },
            ]}
            labelKey="month"
          />
        </Panel>
      </div>
    </div>
  );
}

function InventoryDashboard({ summary }) {
  const monthlySales = [
    {
      key: "sold",

      label: "Total unit terjual",

      color: chartColors.primary,
    },
  ];

  return (
    <div className="space-y-6">
      <DataHeading summary={summary} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total unit terjual"
          value={formatNumber(summary.sold)}
          detail="Akumulasi Units Sold"
        />

        <StatCard
          label="Demand forecast"
          value={formatNumber(summary.demand, 2)}
          detail="Akumulasi Demand Forecast"
        />

        <StatCard
          label="Rata-rata harga"
          value={formatNumber(summary.average_price, 2)}
          detail="Satuan nilai dataset"
        />

        <StatCard
          label="Rata-rata inventory level"
          value={formatNumber(summary.average_inventory, 2)}
          detail="Rata-rata snapshot observasi, bukan stok akhir"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          title="Total unit terjual berdasarkan produk"
          subtitle="Sepuluh Product ID dengan akumulasi penjualan tertinggi."
        >
          <HorizontalBarChart products={summary.products} />
        </Panel>

        <Panel
          title="Total unit terjual per bulan"
          subtitle="Akumulasi Units Sold pada setiap bulan."
        >
          <LineChart data={summary.monthly} series={monthlySales} />
        </Panel>

        <Panel
          title="Pertumbuhan penjualan bulanan"
          subtitle="Perubahan persentase Units Sold dibandingkan bulan sebelumnya."
        >
          <GroupedBarChart
            data={summary.monthly.filter(
              (item) => item.sales_growth_pct !== null,
            )}
            series={[
              {
                key: "sales_growth_pct",

                label: "Pertumbuhan penjualan",

                color: chartColors.secondary,
              },
            ]}
            labelKey="month"
            valueSuffix="%"
            allowNegative
          />
        </Panel>

        <Panel
          title="Rata-rata unit terjual berdasarkan diskon"
          subtitle="Rata-rata Units Sold pada setiap tingkat Discount."
        >
          <GroupedBarChart
            data={summary.discounts}
            series={[
              {
                key: "average_sold",

                label: "Rata-rata unit terjual",

                color: chartColors.primary,
              },
            ]}
            labelKey="discount"
          />
        </Panel>

        <Panel
          title="Stok akhir bulan"
          subtitle="Jumlah Inventory Level dari observasi terakhir setiap pasangan toko-produk pada tiap bulan."
        >
          <LineChart
            data={summary.monthly}
            series={[
              {
                key: "inventory_end_stock",

                label: "Stok akhir bulan",

                color: chartColors.green,
              },
            ]}
          />
        </Panel>

        <Panel
          title="Hubungan harga dan unit terjual"
          subtitle="Setiap titik sampel menunjukkan harga, unit terjual, dan tingkat diskon."
        >
          <ScatterChart
            points={summary.scatter_points}
            totalRows={summary.scatter_total_rows}
          />
        </Panel>
      </div>
    </div>
  );
}

export default function Dashboard({
  summary,

  loading,

  error,

  source,

  mode,

  onOpenData,
}) {
  if (loading && !summary) {
    return (
      <p className="text-sm text-zinc-400">
        Memuat data {source === "inventory" ? "inventori" : "penjualan"}...
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
    return (
      <EmptyData
        source={source}
        year={summary?.year || 2023}
        onOpenData={onOpenData}
      />
    );
  }

  if (mode === "analysis") {
    return <SalesAnalysis summary={summary} />;
  }

  return <InventoryDashboard summary={summary} />;
}
