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
  user,
  page,
  onNavigate,
  onLogout,
  source,
  onSourceChange,
  year,
  onYearChange,
  availableYears,
  children,
}) {
  const years = availableYears.length ? availableYears : [2022, 2023, 2024];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-zinc-800 bg-[#0d0d0f] lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
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

          <div className="hidden border-t border-zinc-800 px-6 py-5 lg:block">
            <p className="truncate text-sm text-zinc-300">{user.username}</p>

            <p className="mt-1 text-xs text-zinc-500">
              {user.is_staff ? "Administrator" : "Pengguna"}
            </p>

            <button
              type="button"
              onClick={onLogout}
              className="mt-4 text-sm text-zinc-400 hover:text-white"
            >
              Keluar
            </button>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 px-5 py-5 md:px-8">
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

              <button
                type="button"
                onClick={onLogout}
                className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 lg:hidden"
              >
                Keluar
              </button>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-5 py-7 md:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
