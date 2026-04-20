import { MapPin } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { AppContext } from "../../App";
import StatusBadge from "../../components/StatusBadge";
import { startOfficerComplaint } from "../../services/backendApi";

function OfficerAssignedComplaintsPage() {
  const { complaints, refreshComplaints } = useContext(AppContext);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState(null);
  const [districtFilter, setDistrictFilter] = useState("ALL");

  const districtOptions = useMemo(
    () => Array.from(new Set(complaints.map((item) => item.district).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [complaints]
  );

  const assigned = useMemo(
    () => complaints.filter((item) => {
      const activeWorkState = item.status === "Pending" || item.status === "In Progress";
      if (!activeWorkState) {
        return false;
      }

      const districtPass = districtFilter === "ALL" || item.district === districtFilter;
      return districtPass;
    }),
    [complaints, districtFilter]
  );

  const startWork = async (complaint) => {
    setMessage("");
    setError("");
    setWorkingId(complaint.id);

    try {
      await startOfficerComplaint(complaint.id);
      await refreshComplaints();
      setMessage(`${complaint.id} moved to in-progress.`);
    } catch (requestError) {
      setError(requestError.message || "Unable to start complaint work.");
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
        <div className="border-b border-slate-200 bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">Officer Workspace</p>
          <h2 className="mt-1 text-2xl font-bold text-white">Assigned Complaints</h2>
          <p className="mt-1 text-sm text-blue-100">Simple complaint list for quick triage and work start.</p>
        </div>

        <div className="p-6">
          <div className="grid gap-4 sm:grid-cols-1">
            <label className="text-sm">
              <span className="mb-2 block font-semibold text-slate-800">Filter by District</span>
              <select
                value={districtFilter}
                onChange={(event) => setDistrictFilter(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900"
              >
                <option value="ALL">All</option>
                {districtOptions.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {message ? <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}

      {!assigned.length ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No complaints are available in your officer queue.
        </p>
      ) : null}

      <div className="grid gap-4">
        {assigned.map((complaint) => (
          <article key={complaint.id} className="rounded-lg border border-slate-300 bg-white p-5 shadow-[0_6px_20px_rgba(0,0,0,0.04)]">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900">{complaint.title}</h3>
              <StatusBadge status={complaint.status} />
            </div>

            <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              <span className="rounded-full bg-slate-100 px-3 py-1">District: {complaint.district || "Unknown"}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1">Department: {complaint.department || "General"}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1"><MapPin size={12} /> {complaint.location?.area || "Unknown area"}</span>
            </div>

            <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">{complaint.description}</p>

            {complaint.imageUrl ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Citizen Uploaded Image</p>
                <img
                  src={complaint.imageUrl}
                  alt={`Complaint evidence for ${complaint.title}`}
                  className="max-h-56 w-full rounded-lg border border-slate-200 object-cover"
                />
              </div>
            ) : null}

            {complaint.resolvedImageUrl ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Officer Resolution Image</p>
                <img
                  src={complaint.resolvedImageUrl}
                  alt={`Resolution evidence for ${complaint.title}`}
                  className="max-h-56 w-full rounded-lg border border-slate-200 object-cover"
                />
              </div>
            ) : null}

            <div className="mt-4">
              <button
                type="button"
                onClick={() => startWork(complaint)}
                disabled={workingId === complaint.id || complaint.status !== "Pending"}
                className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {workingId === complaint.id ? "Starting..." : complaint.status === "Pending" ? "Start Work" : "Already Started"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default OfficerAssignedComplaintsPage;
