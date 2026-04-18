import { useContext, useMemo } from "react";
import { AppContext } from "../App";
import StatusBadge from "../components/StatusBadge";
import VerificationIndicator from "../components/VerificationIndicator";

function ResolvedComplaintsPage() {
  const { complaints, user } = useContext(AppContext);
  const resolved = useMemo(
    () => complaints.filter((item) => (item.citizenEmail ? item.citizenEmail === user?.email : true) && item.status === "Verified"),
    [complaints, user?.email]
  );

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Citizen Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Resolved Complaints</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">History of complaints that are resolved and citizen-verified.</p>
      </div>

      <div className="grid gap-4">
        {resolved.length ? (
          resolved.map((complaint) => (
            <article key={complaint.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{complaint.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{complaint.department}</p>
                </div>
                <StatusBadge status={complaint.status} />
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <p><span className="font-semibold text-slate-900">Date:</span> {complaint.resolvedAt || complaint.createdAt}</p>
                <p><span className="font-semibold text-slate-900">Final result:</span> Verified after citizen confirmation</p>
              </div>

              <div className="mt-5">
                <VerificationIndicator verification={complaint.verification} />
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-card">No resolved complaints available.</div>
        )}
      </div>
    </section>
  );
}

export default ResolvedComplaintsPage;
