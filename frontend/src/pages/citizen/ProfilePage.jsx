import { Activity, Mail, MapPin, ShieldCheck, UserCircle2 } from "lucide-react";
import { useContext, useMemo } from "react";
import { AppContext } from "../../App";

function ProfilePage() {
  const { user, complaints } = useContext(AppContext);

  const myComplaints = useMemo(
    () => complaints.filter((item) => !item.citizenEmail || item.citizenEmail === user?.email),
    [complaints, user?.email]
  );

  const stats = useMemo(() => {
    const total = myComplaints.length;
    const verified = myComplaints.filter((item) => item.status === "Verified").length;
    const pending = myComplaints.filter((item) => item.status === "Pending" || item.status === "Resolved").length;
    const reopened = myComplaints.filter((item) => item.status === "Reopened" || item.status === "Failed").length;
    const earnedPoints = myComplaints.reduce((sum, item) => sum + Number(item.scoring?.citizenPointsDelta || 0), 0);

    return { total, verified, pending, reopened, earnedPoints };
  }, [myComplaints]);

  const latest = myComplaints.slice(0, 5);

  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] bg-gradient-to-br from-blue-700 via-slate-900 to-cyan-700 p-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
        <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">Citizen Profile</p>
        <h2 className="mt-6 text-4xl font-bold leading-tight">{user?.name || "Citizen User"}</h2>
        <p className="mt-3 text-sky-100">Manage your account overview and track your grievance activity at a glance.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total Complaints</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{stats.total}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Verified</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{stats.verified}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Pending</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">{stats.pending}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Needs Attention</p>
          <p className="mt-2 text-3xl font-bold text-rose-700">{stats.reopened}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card md:col-span-2 xl:col-span-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Points Summary</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{Number(user?.points || 0) + stats.earnedPoints}</p>
          <p className="mt-1 text-sm text-slate-600">Base profile points: {Number(user?.points || 0)} | Workflow score delta: {stats.earnedPoints}</p>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex items-center gap-2 text-slate-900">
            <UserCircle2 size={20} className="text-blue-700" />
            <h3 className="text-xl font-semibold">Account Details</h3>
          </div>
          <div className="mt-5 space-y-3 text-sm text-slate-700">
            <p className="flex items-center gap-2"><Mail size={15} className="text-slate-500" /> {user?.email || "Not available"}</p>
            <p className="flex items-center gap-2"><ShieldCheck size={15} className="text-slate-500" /> Role: {user?.role || "Citizen"}</p>
            <p className="flex items-center gap-2"><MapPin size={15} className="text-slate-500" /> Department: {user?.department || "Citizen Services"}</p>
            <p className="flex items-center gap-2"><Activity size={15} className="text-slate-500" /> Points: {user?.points ?? 0}</p>
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
          <h3 className="text-xl font-semibold text-slate-900">Recent Complaint Activity</h3>
          {latest.length ? (
            <div className="mt-4 divide-y divide-slate-200">
              {latest.map((item) => (
                <div key={item.id} className="py-3">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.department} | {item.status}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No complaints yet. Submit a complaint to start tracking activity.</p>
          )}
        </article>
      </div>
    </section>
  );
}

export default ProfilePage;
