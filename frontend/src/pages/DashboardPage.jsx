import { ArrowRight, CheckCircle2, MapPinned, PlusCircle, ShieldCheck, Users, ListChecks } from "lucide-react";
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
    </div>
  );
}

export default DashboardPage;
