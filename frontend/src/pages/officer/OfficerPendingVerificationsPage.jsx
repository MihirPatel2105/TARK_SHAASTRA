import { useContext, useMemo, useState } from "react";
import { AppContext } from "../../App";
import VerificationIndicator from "../../components/VerificationIndicator";
import { triggerOfficerVerificationCall } from "../../services/backendApi";

function OfficerPendingVerificationsPage() {
  const { complaints, user } = useContext(AppContext);
  const [triggeringId, setTriggeringId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const displayStatus = (complaint) => {
    if (complaint.verificationStatus === "Pending") {
      return "Pending";
    }
    return complaint.status;
  };

  const pending = useMemo(
    () => complaints.filter((item) => {
      const belongsToOfficer = item.assignedOfficerId === user?.id || item.assignedToId === user?.id;
      const isPendingVerification = item.status === "Pending" && item.verificationStatus === "Pending";
      return belongsToOfficer && isPendingVerification;
    }),
    [complaints, user?.id]
  );

  const triggerIvr = async (complaintId) => {
    setError("");
    setMessage("");
    setTriggeringId(complaintId);

    try {
      await triggerOfficerVerificationCall(complaintId);
      setMessage("IVR call triggered for the pending complaint.");
    } catch (exception) {
      setError(exception.message || "Unable to trigger IVR call.");
    } finally {
      setTriggeringId(null);
    }
  };

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
              <p className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">{displayStatus(complaint)}</p>
            </div>
            <div className="mt-5">
              <VerificationIndicator verification={complaint.verification} />
            </div>
            {complaint.verificationStatus === "Pending" ? (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => triggerIvr(complaint.id)}
                  disabled={triggeringId === complaint.id}
                  className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-600/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {triggeringId === complaint.id ? "Triggering IVR..." : "Trigger IVR"}
                </button>
                <p className="text-xs text-slate-500">Use this only for complaints still waiting for citizen verification.</p>
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {message ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
      {!pending.length ? <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">No pending verification complaints found.</p> : null}
    </section>
  );
}

export default OfficerPendingVerificationsPage;
