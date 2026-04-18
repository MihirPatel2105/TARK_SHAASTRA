import { ClipboardList, CheckCircle2, ShieldCheck, UploadCloud } from "lucide-react";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../../App";
import DashboardCard from "../../components/DashboardCard";
import MetricCard from "../../components/MetricCard";

function OfficerDashboardPage() {
  const navigate = useNavigate();
  const { complaints, user } = useContext(AppContext);
  const assigned = complaints.filter((item) => (item.assignedOfficerEmail ? item.assignedOfficerEmail === user?.email : true));
  const resolved = assigned.filter((item) => item.status === "Resolved" || item.status === "Verified");
  const awaiting = assigned.filter((item) => item.status === "Pending" || item.status === "Resolved");

  const cards = [
    { title: "Assigned Complaints", description: "Review complaints assigned to your desk.", icon: ClipboardList, colorClass: "bg-blue-600", path: "/officer/assigned" },
    { title: "Upload Proof", description: "Submit evidence and GPS confirmation.", icon: UploadCloud, colorClass: "bg-emerald-600", path: "/officer/proof" },
    { title: "Pending Verifications", description: "See items waiting for citizen confirmation.", icon: ShieldCheck, colorClass: "bg-amber-600", path: "/officer/verifications" }
  ];

  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] bg-gradient-to-br from-slate-900 via-blue-800 to-cyan-700 p-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
        <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">Officer Workspace</p>
        <h1 className="mt-6 text-5xl font-bold leading-tight">Welcome, {user?.name || "Officer"}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-sky-100">Resolve assigned complaints, upload proof, and keep the verification queue moving without hiding the final accountability step.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Assigned" value={assigned.length} helper="Open cases in your queue" accent="blue" />
        <MetricCard label="Resolved" value={resolved.length} helper="Resolved or verified items" accent="green" />
        <MetricCard label="Awaiting Verification" value={awaiting.length} helper="Still waiting for confirmation" accent="yellow" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <DashboardCard key={card.title} {...card} onClick={() => navigate(card.path)} />
        ))}
      </div>
    </section>
  );
}

export default OfficerDashboardPage;
