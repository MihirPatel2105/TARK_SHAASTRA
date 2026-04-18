const colorByStatus = {
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  Resolved: "border-sky-200 bg-sky-50 text-sky-700",
  Verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Failed: "border-rose-200 bg-rose-50 text-rose-700",
  Reopened: "border-orange-200 bg-orange-50 text-orange-700"
};

function StatusBadge({ status }) {
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${colorByStatus[status] || "border-slate-200 bg-slate-50 text-slate-700"}`}>{status}</span>;
}

export default StatusBadge;
