import { useContext, useMemo } from "react";
import { AppContext } from "../../App";
import VerificationIndicator from "../../components/VerificationIndicator";

function OfficerPendingVerificationsPage() {
  const { complaints, user } = useContext(AppContext);
  const pending = useMemo(
    () => complaints.filter((item) => (item.assignedOfficerEmail ? item.assignedOfficerEmail === user?.email : true) && (item.status === "Pending" || item.status === "Resolved")),
    [complaints, user?.email]
  );

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Officer Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Pending Verifications</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">Complaints waiting for verification signals from IVR, GPS, and photo proof.</p>
      </div>

      <div className="grid gap-4">
        {pending.map((complaint) => (
          <article key={complaint.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{complaint.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{complaint.department}</p>
              </div>
              <p className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{complaint.status}</p>
            </div>
            <div className="mt-5">
              <VerificationIndicator verification={complaint.verification} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default OfficerPendingVerificationsPage;
