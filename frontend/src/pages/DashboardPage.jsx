import { ArrowRight, Bell, CheckCircle2, MapPinned, PlusCircle, ShieldCheck, Users, ListChecks } from "lucide-react";
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

  const featureCards = [
    { icon: ShieldCheck, title: "Verification First", description: "No case is treated as final until IVR, GPS, and photo checks align.", color: "bg-blue-50 text-blue-700" },
    { icon: Bell, title: "Action Alerts", description: "See reopened or pending cases immediately in the dashboard flow.", color: "bg-amber-50 text-amber-700" },
    { icon: Users, title: "Role Clarity", description: "Citizen actions are isolated from officer and admin workflows.", color: "bg-emerald-50 text-emerald-700" }
  ];

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-700 via-slate-900 to-cyan-700 p-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.12)] sm:p-10">
        <div className="max-w-3xl">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">Citizen Workspace</p>
          <h1 className="mt-6 text-5xl font-bold leading-tight">Citizen Dashboard</h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-sky-100">
            File grievances, track status, and verify that every closure passes real-world checks before it is considered final.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" onClick={() => navigate("/citizen/new-complaint")} className="rounded-2xl bg-white px-6 py-3 font-semibold text-blue-800">Log New Complaint</button>
            <button type="button" onClick={() => navigate("/citizen/track")} className="rounded-2xl border border-white/70 px-6 py-3 font-semibold text-white">Track Complaints</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="My Complaints" value={citizenComplaints.length} helper="Complaints linked to your account" accent="blue" />
        <MetricCard label="Verified" value={verifiedCount} helper="Closed after validation" accent="green" />
        <MetricCard label="Citizen Points" value={totalCitizenPoints} helper="Rewards and penalties from outcomes" accent="yellow" />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {featureCards.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
              <div className={`inline-flex rounded-2xl p-3 ${item.color}`}>
                <Icon size={22} />
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </article>
          );
        })}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Quick Actions</h2>
            <p className="text-sm text-slate-500">The four primary citizen workflows.</p>
          </div>
          <ArrowRight className="hidden text-slate-400 md:block" />
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
