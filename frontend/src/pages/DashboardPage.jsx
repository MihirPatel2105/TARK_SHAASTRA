import { ArrowRight, CheckCircle2, MapPinned, PlusCircle, ListChecks } from "lucide-react";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../App";
import DashboardCard from "../components/DashboardCard";
import MetricCard from "../components/MetricCard";

const cards = [
  { title: "View Complaints on Map", description: "Inspect mapped complaints with department and status filters.", icon: MapPinned, colorClass: "bg-blue-600", path: "/citizen/map" },
  { title: "New Complaint", description: "Submit a new complaint with required image evidence.", icon: PlusCircle, colorClass: "bg-emerald-600", path: "/citizen/new-complaint" },
  { title: "Track Complaint", description: "Review your complaint status, timeline, and verification outcome.", icon: ListChecks, colorClass: "bg-amber-600", path: "/citizen/track" },
  { title: "Resolved Complaints", description: "View verified complaints that are fully closed.", icon: CheckCircle2, colorClass: "bg-rose-600", path: "/citizen/resolved" }
];

function DashboardPage() {
  const navigate = useNavigate();
  const { complaints, user } = useContext(AppContext);
  const citizenComplaints = complaints.filter((item) => !item.citizenEmail || item.citizenEmail === user?.email);
  const verifiedCount = citizenComplaints.filter((item) => item.status === "Verified").length;
  const reopenedCount = citizenComplaints.filter((item) => item.status === "Reopened" || item.status === "Failed").length;
  const pendingCount = citizenComplaints.filter((item) => item.status === "Pending" || item.status === "Resolved").length;
  const fakeReports = citizenComplaints.filter((item) => item.scoring?.fakeComplaintFlag || item.status === "Failed");
  const pointsFromComplaints = citizenComplaints.reduce((sum, item) => sum + Number(item.scoring?.citizenPointsDelta || 0), 0);
  const totalCitizenPoints = Number(user?.points || 0) + pointsFromComplaints;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="My Complaints" value={citizenComplaints.length} helper="Complaints linked to your account" accent="blue" />
        <MetricCard label="Verified" value={verifiedCount} helper="Closed after validation" accent="green" />
        <MetricCard label="Citizen Points" value={totalCitizenPoints} helper="Rewards and penalties from outcomes" accent="yellow" />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Quick Actions</h2>
            <p className="text-sm text-slate-500">The four primary citizen workflows.</p>
          </div>
          <ArrowRight className="hidden text-blue-400 md:block" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {cards.map((card) => (
            <DashboardCard key={card.title} {...card} onClick={() => navigate(card.path)} />
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Fake Complaint Reports</h2>
            <p className="mt-1 text-sm text-slate-600">Reports appear here when an officer marks a complaint fake and an email report is sent.</p>
          </div>
          <p className="rounded-full bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700">Citizen email updated</p>
        </div>

        {fakeReports.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {fakeReports.slice(0, 4).map((item) => (
              <article key={item.id} className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Fake Report</p>
                    <h3 className="mt-1 text-lg font-semibold text-slate-900">{item.title}</h3>
                  </div>
                  <p className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-rose-700">{item.status}</p>
                </div>
                <p className="mt-3 text-sm text-slate-700"><span className="font-semibold text-slate-900">Complaint ID:</span> {item.id}</p>
                <p className="mt-1 text-sm text-slate-700"><span className="font-semibold text-slate-900">Department:</span> {item.department}</p>
                <p className="mt-1 text-sm text-slate-700"><span className="font-semibold text-slate-900">IVR Call Number:</span> {item.ivrTargetPhone || item.citizenPhone || "Not available"}</p>
                <p className="mt-1 text-sm text-slate-700"><span className="font-semibold text-slate-900">Reason:</span> {item.scoring?.scoreReason || "Marked as fake after verification"}</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">A detailed email report has been sent to your registered email address.</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No fake complaint reports are available yet.</p>
        )}
      </section>
    </div>
  );
}

export default DashboardPage;
