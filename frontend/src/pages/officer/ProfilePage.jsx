import { Activity, BadgeCheck, ClipboardList, Mail, MapPin, Shield, UserCircle2 } from "lucide-react";
import { useContext, useMemo } from "react";
import { AppContext } from "../../App";

function OfficerProfilePage() {
  const { user, complaints } = useContext(AppContext);

  const stats = useMemo(() => {
    const assigned = complaints.filter((item) => item.status === "Pending" || item.status === "In Progress" || item.status === "Resolved").length;
    const resolved = complaints.filter((item) => item.status === "Resolved").length;
    const verified = complaints.filter((item) => item.status === "Verified").length;
    const attention = complaints.filter((item) => item.status === "Reopened" || item.status === "Failed").length;
    return { assigned, resolved, verified, attention };
  }, [complaints]);

  const latest = complaints.slice(0, 6);

  return (
    <section className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Officer Profile</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">{user?.name || "Field Officer"}</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">Operational overview for assigned work, verification outcomes, and resolution performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Assigned</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.assigned}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resolved</p>
          <p className="mt-2 text-3xl font-bold text-blue-700">{stats.resolved}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Verified</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.verified}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Needs Attention</p>
          <p className="mt-2 text-3xl font-bold text-rose-700">{stats.attention}</p>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900">
            <UserCircle2 size={20} className="text-emerald-700" />
            <h3 className="text-xl font-semibold">Officer Details</h3>
          </div>
          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <p className="flex items-center gap-2"><Mail size={15} className="text-slate-500" /> {user?.email || "Not available"}</p>
            <p className="flex items-center gap-2"><Shield size={15} className="text-slate-500" /> Role: {user?.role || "Officer"}</p>
            <p className="flex items-center gap-2"><MapPin size={15} className="text-slate-500" /> Department: {user?.department || "Operations"}</p>
            <p className="flex items-center gap-2"><Activity size={15} className="text-slate-500" /> Points: {user?.points ?? 0}</p>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-900">Recent Assigned Activity</h3>
          {latest.length ? (
            <div className="mt-4 divide-y divide-slate-200">
              {latest.map((item) => (
                <div key={item.id} className="py-3">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><ClipboardList size={14} /> {item.department} | {item.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><BadgeCheck size={15} />No assignments yet.</p>
          )}
        </article>
      </div>
    </section>
  );
}

export default OfficerProfilePage;
