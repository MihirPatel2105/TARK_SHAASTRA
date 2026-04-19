import { RefreshCcw, PhoneCall } from "lucide-react";
import { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "../../App";
import StatusBadge from "../../components/StatusBadge";
import { fetchOfficerIvrComplaints, syncOfficerIvrComplaints } from "../../services/backendApi";

const sourceLabel = {
  IVR_CALL: "IVR Call"
};

function OfficerIvrComplaintsPage() {
  const { complaints, refreshComplaints } = useContext(AppContext);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [ivrComplaints, setIvrComplaints] = useState([]);

  const loadIvrComplaints = async () => {
    const rows = await fetchOfficerIvrComplaints();
    setIvrComplaints(rows);
    return rows;
  };

  const sync = async () => {
    setError("");
    setMessage("");
    setIsSyncing(true);

    try {
      const result = await syncOfficerIvrComplaints();
      await refreshComplaints();
      const rows = await loadIvrComplaints();
      setMessage(`Synced ${result.importedCount || rows.length} IVR complaint(s) from MongoDB.`);
    } catch (requestError) {
      setError(requestError.message || "Unable to sync IVR complaints.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleComplaints = useMemo(() => {
    if (ivrComplaints.length > 0) {
      return ivrComplaints;
    }

    return complaints.filter((item) => String(item.source || "").toUpperCase() === "IVR_CALL");
  }, [complaints, ivrComplaints]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Officer Workspace</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">IVR Complaints</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Complaints imported from MongoDB IVR call records using caller number and transcript analysis.
          </p>
        </div>

        <button
          type="button"
          onClick={sync}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-800 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-800/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw size={16} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Syncing..." : "Sync IVR Calls"}
        </button>
      </div>

      {message ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}

      <div className="grid gap-4">
        {visibleComplaints.map((complaint) => (
          <article key={complaint.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <PhoneCall size={16} className="text-blue-700" />
                  <h3 className="text-xl font-semibold text-slate-900">{complaint.title}</h3>
                </div>
                <p className="mt-1 text-sm text-slate-500">{complaint.department}</p>
              </div>
              <StatusBadge status={complaint.status} />
            </div>

            <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
              <p><span className="font-semibold text-slate-900">Complaint ID:</span> {complaint.id}</p>
              <p><span className="font-semibold text-slate-900">Caller:</span> {complaint.citizenPhone || complaint.ivrCallerNumber || "Unknown"}</p>
              <p><span className="font-semibold text-slate-900">Source:</span> {sourceLabel[complaint.source] || complaint.source || "IVR Call"}</p>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700">
              <p className="font-semibold text-slate-900">IVR Transcript</p>
              <p className="mt-1">{complaint.description}</p>
            </div>

            {complaint.scoring?.scoreReason ? (
              <p className="mt-4 text-xs text-slate-500">{complaint.scoring.scoreReason}</p>
            ) : null}
          </article>
        ))}
      </div>

      {!visibleComplaints.length ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-card">
          No IVR complaints have been imported yet.
        </div>
      ) : null}
    </section>
  );
}

export default OfficerIvrComplaintsPage;
