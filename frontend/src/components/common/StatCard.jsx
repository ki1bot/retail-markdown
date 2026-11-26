export default function StatCard({ label, value, detail }) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-[#111114] p-5">
      <p className="text-sm text-zinc-400">{label}</p>

      <p className="mt-3 break-words text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>

      {detail && (
        <p className="mt-2 text-xs leading-5 text-zinc-500">{detail}</p>
      )}
    </section>
  );
}
