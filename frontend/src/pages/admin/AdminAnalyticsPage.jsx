import { useContext, useMemo } from "react";
import { AppContext } from "../../App";

function AdminAnalyticsPage() {
  const { complaints } = useContext(AppContext);

  const rows = useMemo(() => {
    const grouped = complaints.reduce((acc, complaint) => {
      const current = acc[complaint.department] || { total: 0, verified: 0, failed: 0 };
      current.total += 1;
      if (complaint.status === "Verified") current.verified += 1;
      if (complaint.status === "Failed") current.failed += 1;
      acc[complaint.department] = current;
      return acc;
    }, {});

    return Object.entries(grouped).map(([department, data]) => ({
      department,
      verified: Math.round((data.verified / data.total) * 100),
      failed: Math.round((data.failed / data.total) * 100)
    }));
  }, [complaints]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Admin Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Department Analytics</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">See how each department performs under verification and final status checks.</p>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-card">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-5 py-4 font-semibold">Department</th>
              <th className="px-5 py-4 font-semibold">Verified %</th>
              <th className="px-5 py-4 font-semibold">Failed %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.department}>
                <td className="px-5 py-4 font-medium text-slate-900">{row.department}</td>
                <td className="px-5 py-4 text-emerald-700">{row.verified}%</td>
                <td className="px-5 py-4 text-rose-700">{row.failed}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default AdminAnalyticsPage;
