export default function StatusTag({ good, children }) {
  const classes = good
    ? "border-emerald-900 bg-emerald-950/30 text-emerald-300"
    : "border-amber-900 bg-amber-950/30 text-amber-300";

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${classes}`}
    >
      {children}
    </span>
  );
}
