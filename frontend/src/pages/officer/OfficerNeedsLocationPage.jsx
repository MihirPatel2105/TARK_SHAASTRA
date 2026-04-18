import { LocateFixed, PhoneCall, RefreshCcw } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { AppContext } from "../../App";

function OfficerNeedsLocationPage() {
  const { complaints } = useContext(AppContext);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const rows = useMemo(
    () => complaints.filter((item) => item.locationStatus === "NEEDS_LOCATION" || item.locationStatus === "MISSING"),
    [complaints]
  );

  const refreshRows = () => {
    setMessage("Refresh the dashboard or assigned queues to see the latest locations.");
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Officer Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Needs Location Queue</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Complaints missing coordinates are queued here until a location is added.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Queue Size</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{rows.length}</p>
        </article>
        <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Action</p>
          <button
            type="button"
            onClick={refreshRows}
            disabled={isLoading}
            className="mt-2 inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
          >
            <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} />
            Refresh Queue
          </button>
        </article>
      </div>

      {message ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}
      {message ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

      <div className="grid gap-4">
        {rows.length === 0 ? (
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

            </article>
          ))
        )}
      </div>
    </section>
  );
}

export default OfficerNeedsLocationPage;
