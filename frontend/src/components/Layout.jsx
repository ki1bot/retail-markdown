const navigation = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Ringkasan bisnis",
  },
  {
    id: "analysis",
    label: "Analisis Elastisitas",
    description: "Regresi Log-Log",
  },
  {
    id: "simulator",
    label: "Simulasi Diskon",
    description: "Optimasi mingguan",
  },
  {
    id: "history",
    label: "Riwayat Simulasi",
    description: "Hasil tersimpan",
  },
];

const pageTitles = {
  dashboard: "Dashboard Ritel Pakaian",
  analysis: "Analisis Elastisitas Harga",
  simulator: "Dynamic Markdown Optimizer",
  history: "Riwayat Simulasi",
  data: "Kelola Dataset",
};

const pageSubtitles = {
  dashboard: "Ringkasan penjualan, permintaan, dan persediaan Clothing.",
  analysis:
    "Estimasi hubungan harga aktual dengan permintaan menggunakan regresi Log-Log.",
  simulator: "Pilih diskon mingguan berdasarkan stok, permintaan, dan margin.",
  history: "Simulasi yang sudah dijalankan dan disimpan ke database.",
  data: "Periksa status dan unggah kelima dataset CSV.",
};

export default function Layout({ page, onNavigate, children }) {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-zinc-800 bg-[#0d0d0f] lg:w-64 lg:border-b-0 lg:border-r">
          <div className="border-b border-zinc-800 px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
              Data Science Project
            </p>

            <h1 className="mt-2 text-lg font-semibold tracking-tight text-white">
              Retail Markdown
            </h1>

            <p className="mt-1 text-xs text-zinc-500">
              Dynamic Price Optimization
            </p>
          </div>

          <nav className="flex flex-wrap gap-1 p-3 lg:block lg:space-y-1">
            {navigation.map((item) => {
              const active = page === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-lg px-4 py-3 text-left transition lg:block lg:w-full ${
                    active
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                  }`}
                >
                  <span className="block text-sm font-medium">
                    {item.label}
                  </span>

                  <span className="mt-0.5 hidden text-xs text-zinc-500 lg:block">
                    {item.description}
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="border-b border-zinc-800 px-4 py-5 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-[1280px]">
              <h2 className="text-xl font-semibold text-white">
                {pageTitles[page]}
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                {pageSubtitles[page]}
              </p>
            </div>
          </header>

          <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
