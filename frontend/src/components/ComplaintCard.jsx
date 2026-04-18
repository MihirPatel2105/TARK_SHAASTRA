import { CalendarDays, Landmark } from "lucide-react";
import StatusBadge from "./StatusBadge";

function ComplaintCard({ complaint, onOpen }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(complaint.id)}
      className="w-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">{complaint.title}</h3>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <Landmark size={14} />
            {complaint.department}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
            <CalendarDays size={14} />
            {complaint.createdAt}
          </p>
          {complaint.location?.area ? <p className="mt-2 text-sm text-slate-500">{complaint.location.area}</p> : null}
        </div>
        <StatusBadge status={complaint.status} />
      </div>
    </button>
  );
}

export default ComplaintCard;
