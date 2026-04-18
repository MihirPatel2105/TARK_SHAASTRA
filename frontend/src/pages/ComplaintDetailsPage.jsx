import { ArrowLeft } from "lucide-react";
import { useContext } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../App";
import StatusBadge from "../components/StatusBadge";
import Timeline from "../components/Timeline";
import VerificationIndicator from "../components/VerificationIndicator";

function ComplaintDetailsPage() {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const { complaints } = useContext(AppContext);

  const complaint = complaints.find((item) => item.id === complaintId);

  if (!complaint) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
        <p className="text-slate-700">Complaint not found.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <button type="button" onClick={() => navigate("/citizen/track")} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700">
        <ArrowLeft size={16} /> Back to Track Complaint
      </button>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">{complaint.title}</h2>
            <p className="mt-2 text-slate-500">{complaint.department}</p>
          </div>
          <StatusBadge status={complaint.status} />
        </div>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{complaint.description}</p>

        <div className="mt-6 grid gap-3 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
          <p><span className="font-semibold text-slate-900">Complaint ID:</span> {complaint.id}</p>
          <p><span className="font-semibold text-slate-900">Submitted on:</span> {complaint.createdAt}</p>
          <p><span className="font-semibold text-slate-900">Resolution date:</span> {complaint.resolvedAt || "Not resolved yet"}</p>
          <p><span className="font-semibold text-slate-900">Area:</span> {complaint.location?.area || "Unknown"}</p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
        <h3 className="text-lg font-semibold text-slate-900">Verification Status</h3>
        <div className="mt-4">
          <VerificationIndicator verification={complaint.verification} />
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
        <h3 className="text-lg font-semibold text-slate-900">Evidence Images</h3>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Your Uploaded Image</p>
            {complaint.imageUrl ? (
              <img
                src={complaint.imageUrl}
                alt={`Uploaded by citizen for ${complaint.title}`}
                className="mt-3 max-h-72 w-full rounded-xl object-cover"
              />
            ) : (
              <p className="mt-3 text-sm text-slate-500">No citizen image available.</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-900">Officer Resolution Image</p>
            {complaint.resolvedImageUrl ? (
              <img
                src={complaint.resolvedImageUrl}
                alt={`Resolution uploaded by officer for ${complaint.title}`}
                className="mt-3 max-h-72 w-full rounded-xl object-cover"
              />
            ) : (
              <p className="mt-3 text-sm text-slate-500">Resolution image not uploaded yet.</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
        <h3 className="text-lg font-semibold text-slate-900">Complaint Timeline</h3>
        <Timeline items={complaint.timeline} />
      </div>
    </section>
  );
}

export default ComplaintDetailsPage;
