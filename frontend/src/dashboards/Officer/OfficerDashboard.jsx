import { ClipboardList, FileCheck2, MapPin, RefreshCcw, ShieldCheck, UploadCloud } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { AppContext } from "../../App";
import DashboardCard from "../../components/DashboardCard";
import MetricCard from "../../components/MetricCard";

const DEFAULT_CENTER = [28.6139, 77.209];

function markerColor(status) {
  if (status === "Verified") return "#16a34a";
  if (status === "Resolved") return "#0284c7";
  if (status === "Reopened" || status === "Failed") return "#e11d48";
  return "#2563eb";
}

function OfficerDashboardPage() {
  const navigate = useNavigate();
  const { complaints, user, refreshComplaints } = useContext(AppContext);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    let isMounted = true;

    const syncComplaints = async () => {
      setIsRefreshing(true);
      try {
        await refreshComplaints();
      } catch {
        // Keep the dashboard usable even if a refresh fails temporarily.
      } finally {
        if (isMounted) {
          setIsRefreshing(false);
        }
      }
    };

    syncComplaints();
    const intervalId = window.setInterval(syncComplaints, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [refreshComplaints, user]);

  // Officer complaints from backend are already scoped to officer department/queue.
  const assigned = complaints;
  const resolved = assigned.filter((item) => item.status === "Resolved" || item.status === "Verified");
  const awaiting = assigned.filter((item) => item.status === "Pending" || item.status === "Resolved" || item.status === "In Progress");

  const cards = [
    { title: "Assigned Complaints", description: "Review complaints assigned to your desk.", icon: ClipboardList, colorClass: "bg-blue-600", path: "/officer/assigned" },
    { title: "Upload Proof", description: "Submit evidence and GPS confirmation.", icon: UploadCloud, colorClass: "bg-emerald-600", path: "/officer/proof" },
    { title: "Pending Verifications", description: "See items waiting for citizen confirmation.", icon: ShieldCheck, colorClass: "bg-amber-600", path: "/officer/verifications" },
    { title: "Resolved Complaints", description: "Review stored resolved cases and trigger follow-up calls.", icon: FileCheck2, colorClass: "bg-sky-700", path: "/officer/resolved" }
  ];

  return (
    <section className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Assigned" value={assigned.length} helper="Open cases in your queue" accent="blue" />
        <MetricCard label="Resolved" value={resolved.length} helper="Resolved or verified items" accent="green" />
        <MetricCard label="Awaiting Verification" value={awaiting.length} helper="Still waiting for confirmation" accent="yellow" />
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2 text-slate-900">
          <MapPin size={18} className="text-blue-700" />
          <h2 className="text-xl font-semibold">Assigned Complaints Map</h2>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <MapContainer center={DEFAULT_CENTER} zoom={11} className="h-[360px] w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {assigned.map((item) => (
              <CircleMarker
                key={item.id}
                center={[Number(item.location?.lat || 0), Number(item.location?.lng || 0)]}
                pathOptions={{
                  color: markerColor(item.status),
                  fillColor: markerColor(item.status),
                  fillOpacity: 0.85
                }}
                radius={8}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{item.title}</p>
                    <p>{item.department}</p>
                    <p>Status: {item.status}</p>
                    <p>Area: {item.location?.area || "Unknown"}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
    </section>
  );
}

export default OfficerDashboardPage;
