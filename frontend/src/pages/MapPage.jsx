import { MapPin, RefreshCcw, SlidersHorizontal } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { AppContext } from "../App";
import { departments, statusOptions } from "../services/mockData";

function MapPage() {
  const { complaints, syncNearbyComplaints } = useContext(AppContext);
  const [department, setDepartment] = useState("All");
  const [status, setStatus] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const loadNearbyFromBackend = async () => {
    setSyncMessage("");
    setSyncError("");
    setIsSyncing(true);

    const runSync = async (lat, lng) => {
      const rows = await syncNearbyComplaints({ lat, lng, radius: 3000 });
      setSyncMessage(rows.length ? `Synced ${rows.length} complaints from backend.` : "No nearby backend complaints found.");
    };

    try {
      if (!navigator.geolocation) {
        await runSync(28.6139, 77.209);
      } else {
        await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                await runSync(position.coords.latitude, position.coords.longitude);
                resolve();
              } catch (error) {
                reject(error);
              }
            },
            async () => {
              try {
                await runSync(28.6139, 77.209);
                resolve();
              } catch (error) {
                reject(error);
              }
            }
          );
        });
      }
    } catch (error) {
      setSyncError(error.message || "Failed to load complaints from backend.");
    } finally {
      setIsSyncing(false);
    }
  };

  const filtered = useMemo(
    () =>
      complaints.filter((item) => {
        const departmentPass = department === "All" || item.department === department;
        const statusPass = status === "All" || item.status === status;
        return departmentPass && statusPass;
      }),
    [complaints, department, status]
  );

  const selected = filtered.find((item) => item.id === selectedId) || filtered[0] || null;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Citizen Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Complaints Map</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">Filter complaints by department and status. Markers are placed in a clean visual map placeholder for rapid overview.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={loadNearbyFromBackend} disabled={isSyncing} className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-700/20">
          <RefreshCcw size={16} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Loading..." : "Load Nearby From Backend"}
        </button>
        {syncMessage ? <p className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">{syncMessage}</p> : null}
        {syncError ? <p className="rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">{syncError}</p> : null}
      </div>

      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-2 block font-semibold text-slate-700">Department</span>
          <select value={department} onChange={(event) => setDepartment(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900">
            <option>All</option>
            {departments.map((dep) => (
              <option key={dep}>{dep}</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-2 block font-semibold text-slate-700">Status</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900">
            <option>All</option>
            {statusOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
        <div className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.16),transparent_22%),radial-gradient(circle_at_70%_30%,rgba(16,185,129,0.18),transparent_18%),linear-gradient(180deg,#eff6ff_0%,#f8fafc_100%)] shadow-card">
          <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.06)_1px,transparent_1px)] [background-size:44px_44px]" />
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className="absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white bg-blue-700 shadow-lg shadow-blue-700/20"
              style={{ top: `${20 + (index % 5) * 14}%`, left: `${18 + (index % 4) * 19}%` }}
              aria-label={`Complaint marker ${item.title}`}
            />
          ))}
          <div className="absolute left-4 top-4 rounded-2xl bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><SlidersHorizontal size={16} /> Live filters active</div>
            <p className="mt-1 text-xs text-slate-500">Map placeholder with complaint pins</p>
          </div>
          <div className="absolute bottom-4 right-4 rounded-2xl bg-white/90 px-4 py-3 text-xs font-semibold text-slate-500 shadow-sm backdrop-blur">Markers show title, department, and status in the detail panel</div>
        </div>

        <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-2 text-slate-900">
            <MapPin size={18} className="text-blue-700" />
            <h3 className="text-lg font-semibold">Marker Details</h3>
          </div>
          {selected ? (
            <div className="mt-4 space-y-3 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Title:</span> {selected.title}</p>
              <p><span className="font-semibold text-slate-900">Department:</span> {selected.department}</p>
              <p><span className="font-semibold text-slate-900">Status:</span> {selected.status}</p>
              <p><span className="font-semibold text-slate-900">Area:</span> {selected.location?.area || "Unknown"}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No complaints for the selected filters.</p>
          )}
        </aside>
      </div>
    </section>
  );
}

export default MapPage;
