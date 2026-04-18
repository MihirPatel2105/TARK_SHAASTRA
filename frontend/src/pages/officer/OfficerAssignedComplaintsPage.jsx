import { CheckCircle2, MapPin } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { AppContext } from "../../App";
import StatusBadge from "../../components/StatusBadge";

function OfficerAssignedComplaintsPage() {
  const { complaints, user, updateComplaint } = useContext(AppContext);
  const [message, setMessage] = useState("");

  const assigned = useMemo(
    () => complaints.filter((item) => (item.assignedOfficerEmail ? item.assignedOfficerEmail === user?.email : true)),
    [complaints, user?.email]
  );

  const markResolved = (complaint) => {
    const date = new Date().toISOString().slice(0, 10);
    updateComplaint(complaint.id, {
      status: "Resolved",
      resolvedAt: date,
      timeline: [...(complaint.timeline || []), { label: "Resolved by Officer", date }]
    });
    setMessage(`${complaint.id} marked as resolved.`);
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Officer Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Assigned Complaints</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">List of complaints assigned to your officer account.</p>
      </div>

      {message ? <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p> : null}

      <div className="grid gap-4">
        {assigned.map((complaint) => (
          <article key={complaint.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">{complaint.title}</h3>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500"><MapPin size={14} />{complaint.location?.area || "Unknown area"}</p>
              </div>
              <StatusBadge status={complaint.status} />
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">{complaint.description}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => markResolved(complaint)} className="rounded-2xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">Mark as Resolved</button>
              <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600"><CheckCircle2 size={15} /> Assigned</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default OfficerAssignedComplaintsPage;
