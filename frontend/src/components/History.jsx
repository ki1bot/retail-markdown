import { useEffect, useState } from "react";

import { api } from "../lib/api";
import { formatDate, formatNumber } from "../lib/format";

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const response = await api.get("/history/");

        if (active) {
          setHistory(response);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-zinc-400">Memuat riwayat...</p>;
  }

  if (error) {
    return <p className="text-sm text-red-300">{error}</p>;
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-[#111114] p-5">
      <h3 className="font-medium text-white">Simulasi tersimpan</h3>

      <p className="mt-2 text-sm text-zinc-400">
        Menampilkan 20 simulasi terbaru.
      </p>

      {history.length === 0 ? (
        <p className="mt-8 text-sm text-zinc-500">
          Belum ada simulasi yang tersimpan.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 text-zinc-500">
              <tr>
                <th className="px-3 py-3 font-medium">Waktu</th>
                <th className="px-3 py-3 font-medium">Stok</th>
                <th className="px-3 py-3 font-medium">Diskon</th>
                <th className="px-3 py-3 text-right font-medium">Laba kotor</th>
                <th className="px-3 py-3 text-right font-medium">Sisa stok</th>
              </tr>
            </thead>

            <tbody>
              {history.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-zinc-800/70 last:border-0"
                >
                  <td className="px-3 py-4 text-zinc-400">
                    {formatDate(item.created_at)}
                  </td>

                  <td className="px-3 py-4 text-zinc-200">
                    {formatNumber(item.result_data.stock)}
                  </td>

                  <td className="px-3 py-4 text-zinc-200">
                    {item.result_data.best_plan
                      .map((value) => `${value}%`)
                      .join(" / ")}
                  </td>

                  <td className="px-3 py-4 text-right text-zinc-200">
                    {formatNumber(item.result_data.total_profit, 2)}
                  </td>

                  <td className="px-3 py-4 text-right text-zinc-400">
                    {formatNumber(item.result_data.remaining)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
