import { Activity, BadgeCheck, BarChart3, Mail, Shield, UserCircle2, Users } from "lucide-react";
import { useContext, useMemo } from "react";
import { AppContext } from "../../App";

function AdminProfilePage() {
  const { user, complaints } = useContext(AppContext);

  const stats = useMemo(() => {
    const total = complaints.length;
    const verified = complaints.filter((item) => item.status === "Verified").length;
    const pending = complaints.filter((item) => item.status === "Pending" || item.status === "In Progress").length;
    const reopened = complaints.filter((item) => item.status === "Reopened" || item.status === "Failed").length;
    return { total, verified, pending, reopened };
  }, [complaints]);

  const completionRate = stats.total ? Math.round((stats.verified / stats.total) * 100) : 0;

  return (
    <section className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Admin Profile</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">{user?.name || "System Admin"}</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">Governance summary for complaint lifecycle, verification quality, and operational load.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Complaints</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Verified</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.verified}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">In Queue</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">{stats.pending}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reopened/Failed</p>
          <p className="mt-2 text-3xl font-bold text-rose-700">{stats.reopened}</p>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900">
            <UserCircle2 size={20} className="text-indigo-700" />
            <h3 className="text-xl font-semibold">Administrator Details</h3>
          </div>
          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <p className="flex items-center gap-2"><Mail size={15} className="text-slate-500" /> {user?.email || "Not available"}</p>
            <p className="flex items-center gap-2"><Shield size={15} className="text-slate-500" /> Role: {user?.role || "Admin"}</p>
            <p className="flex items-center gap-2"><Users size={15} className="text-slate-500" /> Department: {user?.department || "Central Administration"}</p>
            <p className="flex items-center gap-2"><Activity size={15} className="text-slate-500" /> Points: {user?.points ?? 0}</p>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Governance Snapshot</h3>
          <div className="mt-4 space-y-4 text-sm text-slate-700">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Verification Completion</p>
              <p className="mt-1 flex items-center gap-2 text-indigo-700"><BarChart3 size={14} /> {completionRate}% verified</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Quality Status</p>
              <p className="mt-1 flex items-center gap-2 text-emerald-700"><BadgeCheck size={14} /> Monitoring active across all complaints</p>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

export default AdminProfilePage;
