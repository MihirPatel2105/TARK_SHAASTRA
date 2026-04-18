import { AlertTriangle, BarChart3, BadgeCheck, FileX, RotateCw } from "lucide-react";
import { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../../App";
import MetricCard from "../../components/MetricCard";

function AdminDashboardPage() {
  const navigate = useNavigate();
  const { complaints } = useContext(AppContext);

  const summary = useMemo(() => {
    const total = complaints.length;
    const verified = complaints.filter((item) => item.status === "Verified").length;
    const failed = complaints.filter((item) => item.status === "Failed").length;
    const reopened = complaints.filter((item) => item.status === "Reopened").length;
    return { total, verified, failed, reopened };
  }, [complaints]);

  const deptRows = useMemo(() => {
    const rows = complaints.reduce((acc, complaint) => {
      const current = acc[complaint.department] || { total: 0, verified: 0, failed: 0 };
      current.total += 1;
      if (complaint.status === "Verified") current.verified += 1;
      if (complaint.status === "Failed") current.failed += 1;
      acc[complaint.department] = current;
      return acc;
    }, {});

    return Object.entries(rows)
      .map(([department, data]) => ({
        department,
        verifiedPercent: Math.round((data.verified / data.total) * 100),
        failedPercent: Math.round((data.failed / data.total) * 100)
      }))
      .sort((a, b) => a.department.localeCompare(b.department));
  }, [complaints]);

  return (
    <section className="space-y-8">
      

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total Complaints" value={summary.total} helper="All complaints in the system" accent="blue" />
        <MetricCard label="Verified" value={summary.verified} helper="Passed GPS + photo checks" accent="green" />
        <MetricCard label="Failed" value={summary.failed} helper="Verification failed" accent="red" />
        <MetricCard label="Reopened" value={summary.reopened} helper="Returned for rework" accent="yellow" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex items-center gap-2 text-slate-900">
            <BarChart3 size={18} className="text-blue-700" />
            <h2 className="text-xl font-semibold">Department Performance</h2>
          </div>
          <div className="mt-5 space-y-4">
            {deptRows.map((row) => (
              <div key={row.department} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-slate-900">{row.department}</p>
                  <p className="text-sm text-slate-500">Verified {row.verifiedPercent}% | Failed {row.failedPercent}%</p>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${row.verifiedPercent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex items-center gap-2 text-slate-900">
            <RotateCw size={18} className="text-amber-700" />
            <h2 className="text-xl font-semibold">Verification Rules</h2>
          </div>
          <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
            <p className="rounded-2xl bg-slate-50 p-4">Complaint status can only become final after GPS and photo verification agree.</p>
            <p className="rounded-2xl bg-slate-50 p-4">Reopened items should immediately surface in citizen and officer workspaces.</p>
            <p className="rounded-2xl bg-slate-50 p-4">Failed items remain visible for oversight and improvement tracking.</p>
          </div>
        </article>
      </div>
    </section>
  );
}

export default AdminDashboardPage;
