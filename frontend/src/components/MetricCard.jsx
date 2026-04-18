function MetricCard({ label, value, helper, accent = "blue" }) {
  const accentMap = {
    blue: "from-blue-600 to-cyan-500",
    green: "from-emerald-600 to-green-500",
    red: "from-rose-600 to-orange-500",
    yellow: "from-amber-600 to-yellow-500"
  };

  return (
    <article className="rounded-3xl border border-blue-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 h-1.5 w-16 rounded-full bg-gradient-to-r ${accentMap[accent] || accentMap.blue}`} />
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">{label}</p>
      <p className="mt-3 text-4xl font-bold text-slate-900">{value}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </article>
  );
}

export default MetricCard;
