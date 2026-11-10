const navigation = [
  {
    id: "dashboard",
    label: "Ringkasan",
  },
  {
    id: "analysis",
    label: "Analisis",
  },
  {
    id: "simulator",
    label: "Simulasi",
  },
  {
    id: "history",
    label: "Riwayat",
  },
  {
    id: "data",
    label: "Data",
  },
];

const titles = {
  dashboard: "Ringkasan penjualan",
  analysis: "Analisis data",
  simulator: "Simulasi diskon",
  history: "Riwayat simulasi",
  data: "Kelola dataset",
};

export default function Layout({
  page,
  onNavigate,
  source,
  onSourceChange,
  year,
  onYearChange,
  availableYears,
  children,
}) {
  const years = availableYears.length ? availableYears : [2022, 2023, 2024];

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-zinc-100">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-zinc-800 bg-[#0d0d0f] lg:w-60 lg:border-b-0 lg:border-r">
          <div className="border-b border-zinc-800 px-6 py-6">
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Retail Markdown
            </h1>

            <p className="mt-1 text-xs text-zinc-500">
              Optimasi diskon pakaian
            </p>
          </div>

          <nav className="flex flex-wrap gap-1 px-3 py-4 lg:block lg:space-y-1">
            {navigation.map((item) => {
              const active = page === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`w-auto rounded-md px-4 py-2.5 text-left text-sm transition lg:block lg:w-full ${
                    active
                      ? "bg-zinc-800 font-medium text-white"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="w-full border-b border-zinc-800 px-4 py-5 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {titles[page]}
                </h2>

                <p className="mt-1 text-xs text-zinc-500">Kategori Clothing</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={source}
                  onChange={(event) => onSourceChange(event.target.value)}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500"
                >
                  <option value="sales">Retail Sales</option>
                  <option value="inventory">Retail Inventory</option>
                </select>

                <select
                  value={year}
                  onChange={(event) => onYearChange(Number(event.target.value))}
                  className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500"
                >
                  {[...new Set([...years, year])]
                    .sort((a, b) => a - b)
                    .map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </header>

          <main className="w-full min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
