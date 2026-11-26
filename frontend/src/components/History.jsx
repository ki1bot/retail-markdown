import { useEffect, useState } from "react";

import { api } from "../lib/api";
import { formatDate, formatNumber } from "../lib/format";

import Panel from "./common/Panel";
import StatusTag from "./common/StatusTag";

export default function History() {
  const [items, setItems] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    api
      .get("/history/")
      .then((data) => {
        if (active) {
          setItems(data);
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

  if (loading) {
    return <p className="text-sm text-zinc-400">Memuat riwayat simulasi...</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-900 bg-red-950/30 p-5 text-sm text-red-300">
        {error}
      </div>
    );
  }

  return (
    <Panel
      title="30 simulasi terbaru"
      subtitle="Riwayat tersimpan di PostgreSQL."
    >
      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">
          Belum ada simulasi. Jalankan simulasi dari menu Simulasi Diskon.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-zinc-800 text-xs text-zinc-500">
              <tr>
                <th className="px-3 py-3">Waktu</th>

                <th className="px-3 py-3 text-right">Stok awal</th>

                <th className="px-3 py-3">Rencana diskon</th>

                <th className="px-3 py-3 text-right">Laba kotor</th>

                <th className="px-3 py-3 text-right">Sisa stok</th>

                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => {
                const result = item.result_data;
                const input = item.input_data;

                return (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-800/70 last:border-0"
                  >
                    <td className="px-3 py-4 text-zinc-400">
                      {formatDate(item.created_at)}
                    </td>

                    <td className="px-3 py-4 text-right text-zinc-300">
                      {formatNumber(input.stock)}
                    </td>

                    <td className="px-3 py-4 text-zinc-200">
                      {result.best_plan.map((value) => `${value}%`).join(" / ")}
                    </td>

                    <td className="px-3 py-4 text-right text-zinc-200">
                      {formatNumber(result.total_profit, 2)}
                    </td>

                    <td className="px-3 py-4 text-right text-zinc-300">
                      {formatNumber(result.remaining)}
                    </td>

                    <td className="px-3 py-4">
                      <StatusTag good={result.stock_cleared}>
                        {result.stock_cleared ? "Stok habis" : "Belum habis"}
                      </StatusTag>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
