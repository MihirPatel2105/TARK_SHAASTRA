import { LocateFixed, PhoneCall, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchOfficerNeedsLocationComplaints, triggerOfficerLocationFollowup } from "../../services/backendApi";

function OfficerNeedsLocationPage() {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState(null);

  const loadRows = async () => {
    setError("");
    setIsLoading(true);

    try {
      const data = await fetchOfficerNeedsLocationComplaints();
      setRows(data);
    } catch (loadError) {
      setError(loadError.message || "Failed to load missing-location complaints.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, []);

  const triggerFollowup = async (complaintId) => {
    setMessage("");
    setError("");
    setWorkingId(complaintId);

    try {
      const updated = await triggerOfficerLocationFollowup(complaintId);
      setRows((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      setMessage("IVR follow-up triggered for location collection.");
    } catch (triggerError) {
      setError(triggerError.message || "Unable to trigger location follow-up IVR.");
    } finally {
      setWorkingId(null);
    }
  };

  const ivrCount = useMemo(() => rows.filter((item) => item.source === "IVR_CALL").length, [rows]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Officer Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Needs Location / IVR Queue</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Complaints missing coordinates are queued here. Trigger IVR follow-up to collect location and continue assignment.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Queue Size</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{rows.length}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">IVR Source</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{ivrCount}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Action</p>
          <button
            type="button"
            onClick={loadRows}
            disabled={isLoading}
            className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} />
            Refresh Queue
          </button>
        </article>
      </div>

      {message ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-4">
        {isLoading ? (
          <article className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-card">Loading queue...</article>
        ) : rows.length === 0 ? (
          <article className="rounded-3xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-card">No complaints are waiting for location.</article>
        ) : (
          rows.map((complaint) => (
            <article key={complaint.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{complaint.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">Department: {complaint.department}</p>
                  <p className="mt-1 text-sm text-slate-600">Source: {complaint.source}</p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase text-amber-700">
                  {complaint.locationStatus || "MISSING"}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-700">{complaint.description}</p>
              {complaint.transcriptText ? (
                <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs text-slate-600">Transcript: {complaint.transcriptText}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <LocateFixed size={14} />
                  {complaint.locationText || "Location not yet captured"}
                </span>
                {complaint.citizenPhone ? (
                  <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <PhoneCall size={14} />
                    {complaint.citizenPhone}
                  </span>
                ) : null}
              </div>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => triggerFollowup(complaint.id)}
                  disabled={workingId === complaint.id}
                  className="rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  {workingId === complaint.id ? "Triggering..." : "Trigger IVR For Location"}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default OfficerNeedsLocationPage;
