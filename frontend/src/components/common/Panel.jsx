export default function Panel({ title, subtitle, children, className = "" }) {
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
