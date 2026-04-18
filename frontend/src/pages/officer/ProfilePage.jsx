import { Activity, BadgeCheck, ClipboardList, Mail, MapPin, Shield, UserCircle2 } from "lucide-react";
import { useContext, useMemo } from "react";
import { AppContext } from "../../App";

function OfficerProfilePage() {
  const { user, complaints } = useContext(AppContext);

  const stats = useMemo(() => {
    const assignedCases = complaints.filter((item) => item.assignedOfficerId === user?.id || item.assignedToId === user?.id);
    const assigned = assignedCases.length;
    const resolved = assignedCases.filter((item) => item.status === "Resolved").length;
    const verified = assignedCases.filter((item) => item.status === "Verified").length;
    const attention = assignedCases.filter((item) => item.status === "Reopened" || item.status === "Failed").length;
    return { assigned, resolved, verified, attention };
  }, [complaints, user?.id]);

  const latest = complaints.filter((item) => item.assignedOfficerId === user?.id || item.assignedToId === user?.id).slice(0, 6);

  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] bg-gradient-to-br from-emerald-700 via-slate-900 to-cyan-700 p-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
        <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">Officer Profile</p>
        <h2 className="mt-6 text-4xl font-bold leading-tight">{user?.name || "Field Officer"}</h2>
        <p className="mt-3 text-emerald-100">Operational overview for assigned work, verification outcomes, and resolution performance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
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
        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex items-center gap-2 text-slate-900">
            <UserCircle2 size={20} className="text-emerald-700" />
            <h3 className="text-xl font-semibold">Officer Details</h3>
          </div>
          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <p className="flex items-center gap-2"><Mail size={15} className="text-slate-500" /> {user?.email || "Not available"}</p>
            <p className="flex items-center gap-2"><UserCircle2 size={15} className="text-slate-500" /> {user?.phone || "Mobile number not available"}</p>
            <p className="flex items-center gap-2"><Shield size={15} className="text-slate-500" /> Role: {user?.role || "Officer"}</p>
            <p className="flex items-center gap-2"><MapPin size={15} className="text-slate-500" /> Department: {user?.department || "Operations"}</p>
            <p className="flex items-center gap-2"><Activity size={15} className="text-slate-500" /> Points: {user?.points ?? 0}</p>
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
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
