import { RefreshCcw } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { AppContext } from "../../App";
import StatusBadge from "../../components/StatusBadge";
import { triggerOfficerVerificationCall } from "../../services/backendApi";

function OfficerResolvedComplaintsPage() {
  const { complaints, user, refreshComplaints } = useContext(AppContext);
  const [workingId, setWorkingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const resolvedComplaints = useMemo(
    () => complaints.filter((item) => {
      const belongsToOfficer = !user?.id || item.assignedOfficerId === user.id || item.assignedToId === user.id;
      const isResolvedState = item.status === "Resolved" || item.status === "Verified" || item.status === "Reopened" || item.status === "Failed";
      return belongsToOfficer && isResolvedState;
    }),
    [complaints, user?.id]
  );

  const callAgain = async (complaintId) => {
    setError("");
    setMessage("");
    setWorkingId(complaintId);

    try {
      await triggerOfficerVerificationCall(complaintId);
      await refreshComplaints();
      setMessage("IVR call triggered again for the complaint.");
    } catch (requestError) {
      setError(requestError.message || "Unable to trigger IVR call again.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Officer Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Resolved Complaints</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">Stored complaints after officer resolution, with a separate follow-up tab for IVR re-calls.</p>
      </div>

      {message ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-4">
        {resolvedComplaints.map((complaint) => {
          const canTriggerAgain = complaint.status === "Resolved" && complaint.verificationStatus === "Pending";

          return (
            <article key={complaint.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">{complaint.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{complaint.department}</p>
                </div>
                <StatusBadge status={complaint.status} />
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                <p><span className="font-semibold text-slate-900">Complaint ID:</span> {complaint.id}</p>
                <p><span className="font-semibold text-slate-900">Resolved:</span> {complaint.resolvedAt || complaint.createdAt}</p>
                <p><span className="font-semibold text-slate-900">Verification:</span> {complaint.verificationStatus}</p>
              </div>

              <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{complaint.description}</p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                {canTriggerAgain ? (
                  <button
                    type="button"
                    onClick={() => callAgain(complaint.id)}
                    disabled={workingId === complaint.id}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-800 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-800/20 transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCcw size={16} />
                    {workingId === complaint.id ? "Calling Again..." : "Call Again"}
                  </button>
                ) : null}
                <span className="text-xs text-slate-500">Resolved complaints are stored in MongoDB and can be revisited from this tab.</span>
              </div>
            </article>
          );
        })}
      </div>

      {!resolvedComplaints.length ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-card">
          No resolved complaints are available yet.
        </div>
      ) : null}
    </section>
  );
}

export default OfficerResolvedComplaintsPage;