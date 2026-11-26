import { formatNumber, monthNames } from "../../lib/format";

import Panel from "./Panel";

export default function MonthlyBarChart({ data }) {
  const maximum = Math.max(
    1,
    ...data.map((item) => Number(item.units_sold || 0)),
    ...data.map((item) => Number(item.demand || 0)),
  );

  return (
    <Panel
      title="Penjualan dan permintaan per bulan"
      subtitle="Data kategori Clothing dari sales_data.csv."
    >
      {data.length === 0 ? (
        <p className="text-sm text-zinc-500">Belum ada data bulanan.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 xl:grid-cols-6">
          {data.map((item) => (
            <div key={item.month} className="min-w-0">
              <div className="flex h-36 items-end gap-1 border-b border-zinc-800 px-1">
                <div
                  className="w-1/2 rounded-t bg-sky-500/80"
                  style={{
                    height: `${Math.max(
                      2,
                      (item.units_sold / maximum) * 100,
                    )}%`,
                  }}
                  title={`Unit terjual: ${formatNumber(item.units_sold)}`}
                />

                <div
                  className="w-1/2 rounded-t bg-emerald-500/80"
                  style={{
                    height: `${Math.max(2, (item.demand / maximum) * 100)}%`,
                  }}
                  title={`Demand: ${formatNumber(item.demand)}`}
                />
              </div>

              <p className="mt-2 text-center text-xs text-zinc-400">
                {monthNames[item.month - 1]}
              </p>

              <p className="mt-1 text-center text-[10px] text-zinc-600">
                {formatNumber(item.units_sold)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-4 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-sky-500" />
          Unit terjual
        </span>

        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
          Demand
        </span>
      </div>
    </Panel>
  );
}
