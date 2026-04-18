import { MapPin, RefreshCcw, SlidersHorizontal } from "lucide-react";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { AppContext } from "../App";
import { departments, statusOptions } from "../services/mockData";

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };
const NEARBY_RADIUS_KM = 3;

function haversineKm(a, b) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function FitToComplaints({ complaints, currentLocation }) {
  const map = useMap();

  if (!complaints.length && !currentLocation) {
    map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], 11);
    return null;
  }

  const bounds = complaints.map((item) => [Number(item.location?.lat || 0), Number(item.location?.lng || 0)]);
  if (currentLocation) {
    bounds.push([currentLocation.lat, currentLocation.lng]);
  }

  map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 });
  return null;
}

function ResizeMapOnLayoutChange({ resizeToken }) {
  const map = useMap();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      map.invalidateSize();
    }, 160);

    return () => window.clearTimeout(timeout);
  }, [map, resizeToken]);

  return null;
}

function markerColor(status) {
  if (status === "Verified") return "#16a34a";
  if (status === "Resolved") return "#0284c7";
  if (status === "Reopened" || status === "Failed") return "#e11d48";
  return "#2563eb";
}

function MapPage() {
  const { complaints, syncNearbyComplaints } = useContext(AppContext);
  const mapShellRef = useRef(null);

  const [department, setDepartment] = useState("All");
  const [status, setStatus] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const trackCurrentLocation = async () => {
    setLocationError("");
    setIsLocating(true);

    try {
      if (!navigator.geolocation) {
        throw new Error("Geolocation is not supported on this browser.");
      }

      const nextPosition = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      setCurrentLocation({
        lat: Number(nextPosition.coords.latitude),
        lng: Number(nextPosition.coords.longitude)
      });
    } catch (error) {
      setLocationError(error.message || "Unable to fetch your current location.");
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    trackCurrentLocation();
  }, []);

  const toggleFullscreen = async () => {
    if (!mapShellRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await mapShellRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Keep UX smooth if browser blocks fullscreen in restricted contexts.
    }
  };

  const loadNearbyFromBackend = async () => {
    setSyncMessage("");
    setSyncError("");
    setIsSyncing(true);

    const runSync = async (lat, lng) => {
      const rows = await syncNearbyComplaints({ lat, lng, radius: 3000 });
      setSyncMessage(rows.length ? `Synced ${rows.length} complaints from backend.` : "No nearby backend complaints found.");
    };

    try {
      if (currentLocation) {
        await runSync(currentLocation.lat, currentLocation.lng);
      } else {
        await runSync(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
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

  const nearbyRows = useMemo(() => {
    if (!currentLocation) return [];

    return filtered
      .map((item) => {
        const lat = Number(item.location?.lat || 0);
        const lng = Number(item.location?.lng || 0);
        return {
          ...item,
          distanceKm: haversineKm(currentLocation, { lat, lng })
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [filtered, currentLocation]);

  const nearbyWithinRadius = nearbyRows.filter((item) => item.distanceKm <= NEARBY_RADIUS_KM);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Citizen Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Complaints Map</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">Track your live location, view nearby complaints in real map tiles, and monitor distances with clear, professional filtering.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={trackCurrentLocation} disabled={isLocating} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          <MapPin size={16} className={isLocating ? "animate-pulse" : ""} />
          {isLocating ? "Tracking..." : "Track My Location"}
        </button>
        <button type="button" onClick={loadNearbyFromBackend} disabled={isSyncing} className="inline-flex items-center gap-2 rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-700/20">
          <RefreshCcw size={16} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Loading..." : "Load Nearby From Backend"}
        </button>
        <button type="button" onClick={toggleFullscreen} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          {isFullscreen ? "Exit Full Mode" : "Open Full Mode"}
        </button>
        {syncMessage ? <p className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">{syncMessage}</p> : null}
        {syncError ? <p className="rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">{syncError}</p> : null}
        {locationError ? <p className="rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">{locationError}</p> : null}
        {currentLocation ? (
          <p className="rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
            You are here: {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
          </p>
        ) : null}
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
        <div ref={mapShellRef} className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-slate-200 shadow-card">
          <MapContainer center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]} zoom={11} className={isFullscreen ? "h-screen w-full" : "h-[70vh] w-full"}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitToComplaints complaints={filtered} currentLocation={currentLocation} />
            <ResizeMapOnLayoutChange resizeToken={`${isFullscreen}-${filtered.length}-${Boolean(currentLocation)}`} />

            {currentLocation ? (
              <CircleMarker
                center={[currentLocation.lat, currentLocation.lng]}
                pathOptions={{ color: "#0f172a", fillColor: "#0ea5e9", fillOpacity: 0.95 }}
                radius={9}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">Your Current Location</p>
                    <p>{currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ) : null}

            {filtered.map((item) => (
              <CircleMarker
                key={item.id}
                center={[Number(item.location?.lat || 0), Number(item.location?.lng || 0)]}
                pathOptions={{ color: markerColor(item.status), fillColor: markerColor(item.status), fillOpacity: 0.85 }}
                radius={8}
                eventHandlers={{ click: () => setSelectedId(item.id) }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{item.title}</p>
                    <p>{item.department}</p>
                    <p>Status: {item.status}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>

          <div className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><SlidersHorizontal size={16} /> Live filters active</div>
            <p className="mt-1 text-xs text-slate-500">OpenStreetMap live tiles with complaint markers</p>
          </div>
          <div className="pointer-events-none absolute bottom-4 right-4 rounded-2xl bg-white/90 px-4 py-3 text-xs font-semibold text-slate-500 shadow-sm backdrop-blur">Click marker to inspect complaint details</div>
        </div>

        <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-2 text-slate-900">
            <MapPin size={18} className="text-blue-700" />
            <h3 className="text-lg font-semibold">Marker And Nearby Details</h3>
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

          <div className="mt-6 border-t border-slate-200 pt-4">
            <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Nearby Complaints</h4>
            <p className="mt-1 text-sm text-slate-600">
              {currentLocation
                ? `${nearbyWithinRadius.length} complaint(s) within ${NEARBY_RADIUS_KM} km of your current location.`
                : "Track your location to compute nearby complaints."}
            </p>

            {currentLocation && nearbyRows.length ? (
              <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
                {nearbyRows.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-left text-sm hover:border-blue-200 hover:bg-blue-50"
                  >
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-slate-600">{item.location?.area || "Unknown area"}</p>
                    <p className="font-medium text-blue-700">{item.distanceKm.toFixed(2)} km away</p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default MapPage;
