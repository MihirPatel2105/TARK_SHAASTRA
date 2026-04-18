import { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../App";
import ComplaintCard from "../components/ComplaintCard";
import NotificationBanner from "../components/NotificationBanner";

function TrackComplaintPage() {
  const { complaints, user } = useContext(AppContext);
  const navigate = useNavigate();

  const citizenComplaints = useMemo(
    () => complaints.filter((item) => !item.citizenEmail || item.citizenEmail === user?.email),
    [complaints, user?.email]
  );
  const reopened = citizenComplaints.find((item) => item.status === "Reopened" || item.status === "Failed");

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Citizen Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Track Complaint</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">Track progress and verification of all complaints submitted by you.</p>
      </div>

      {reopened ? <NotificationBanner message={`Alert: Complaint ${reopened.id} has been reopened for re-verification.`} /> : null}

      <div className="grid gap-4">
        {citizenComplaints.map((complaint) => (
          <ComplaintCard key={complaint.id} complaint={complaint} onOpen={(id) => navigate(`/citizen/track/${id}`)} />
        ))}
      </div>
    </section>
  );
}

export default TrackComplaintPage;
