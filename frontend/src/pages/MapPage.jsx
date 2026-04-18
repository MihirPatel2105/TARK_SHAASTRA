import { MapPin, RefreshCcw, SlidersHorizontal } from "lucide-react";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { AppContext } from "../App";

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };
const NEARBY_RADIUS_KM = 3;
const LOCATION_ACCURACY_TARGET_METERS = 100;

function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: onMapClick
  });

  return null;
}

function hasValidCoordinates(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return false;
  }

  return !(lat === 0 && lng === 0);
}

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

function markerColor(status) {
  if (status === "Pending") return "#1d4ed8";
  if (status === "In Progress") return "#f59e0b";
  if (status === "Verified") return "#16a34a";
  if (status === "Resolved") return "#0284c7";
  if (status === "Reopened" || status === "Failed") return "#e11d48";
  return "#2563eb";
}

function MapPage({ workspaceLabel = "Citizen Workspace" }) {
  const { complaints, departmentOptions, statusOptions, syncNearbyComplaints } = useContext(AppContext);
  const mapShellRef = useRef(null);
  const mapRef = useRef(null);

  const [department, setDepartment] = useState("All");
  const [status, setStatus] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncError, setSyncError] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [locationAccuracyMeters, setLocationAccuracyMeters] = useState(null);
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

      const bestFix = await new Promise((resolve, reject) => {
        let watchId = null;
        let settled = false;
        let bestPosition = null;

        const finish = (value, isError = false) => {
          if (settled) {
            return;
          }

          settled = true;
          if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
          }

          if (isError) {
            reject(value);
          } else {
            resolve(value);
          }
        };

        const timeoutId = window.setTimeout(() => {
          if (bestPosition) {
            finish(bestPosition);
            return;
          }

          finish(new Error("Unable to fetch your current location."), true);
        }, 12000);

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const accuracy = Number(position.coords?.accuracy || Number.POSITIVE_INFINITY);
            const bestAccuracy = Number(bestPosition?.coords?.accuracy || Number.POSITIVE_INFINITY);

            if (!bestPosition || accuracy < bestAccuracy) {
              bestPosition = position;
            }

            if (accuracy <= LOCATION_ACCURACY_TARGET_METERS) {
              window.clearTimeout(timeoutId);
              finish(position);
            }
          },
          (error) => {
            window.clearTimeout(timeoutId);
            finish(error, true);
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          }
        );
      });

      const accuracy = Number(bestFix.coords?.accuracy || 0);
      setLocationAccuracyMeters(Number.isFinite(accuracy) ? Math.round(accuracy) : null);
      setCurrentLocation({
        lat: Number(bestFix.coords.latitude),
        lng: Number(bestFix.coords.longitude)
      });

      if (Number.isFinite(accuracy) && accuracy > LOCATION_ACCURACY_TARGET_METERS) {
        setLocationError(`Location accuracy is ~${Math.round(accuracy)}m. Target is <= ${LOCATION_ACCURACY_TARGET_METERS}m.`);
      }
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

  const mapMarkers = useMemo(
    () =>
      filtered
        .map((item) => ({
          ...item,
          lat: Number(item.location?.lat),
          lng: Number(item.location?.lng)
        }))
        .filter((item) => hasValidCoordinates(item.lat, item.lng)),
    [filtered]
  );

  useEffect(() => {
    if (!mapRef.current) return;

    mapRef.current.invalidateSize();

    const center = mapRef.current.getCenter();
    if (hasValidCoordinates(center.lat, center.lng)) {
      return;
    }

    if (mapMarkers.length) {
      mapRef.current.setView([mapMarkers[0].lat, mapMarkers[0].lng], 11);
      return;
    }

    const fallbackCenter = currentLocation || DEFAULT_CENTER;
    mapRef.current.setView([fallbackCenter.lat, fallbackCenter.lng], 11);
  }, [isFullscreen, mapMarkers, currentLocation]);

  const selected = mapMarkers.find((item) => item.id === selectedId) || mapMarkers[0] || null;

  const pendingTotal = useMemo(
    () => filtered.filter((item) => item.status === "Pending").length,
    [filtered]
  );

  const pendingPlotted = useMemo(
    () => mapMarkers.filter((item) => item.status === "Pending").length,
    [mapMarkers]
  );

  const nearbyRows = useMemo(() => {
    if (!currentLocation) return [];

    return filtered
      .map((item) => {
        const lat = Number(item.location?.lat);
        const lng = Number(item.location?.lng);

        if (!hasValidCoordinates(lat, lng)) {
          return null;
        }

        return {
          ...item,
          distanceKm: haversineKm(currentLocation, { lat, lng })
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [filtered, currentLocation]);

  const nearbyWithinRadius = nearbyRows.filter((item) => item.distanceKm <= NEARBY_RADIUS_KM);
  const mapHeightClass = isFullscreen ? "h-screen" : "h-[70vh]";

  const focusComplaintsOnMap = () => {
    if (!mapRef.current || !mapMarkers.length) {
      return;
    }

    mapRef.current.setView([mapMarkers[0].lat, mapMarkers[0].lng], 11);
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{workspaceLabel}</p>
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
        <button type="button" onClick={focusComplaintsOnMap} className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
          Show Complaint Markers
        </button>
        {syncMessage ? <p className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">{syncMessage}</p> : null}
        {syncError ? <p className="rounded-full bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">{syncError}</p> : null}
        {locationError ? <p className="rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">{locationError}</p> : null}
        {currentLocation ? (
          <p className="rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700">
            You are here: {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
          </p>
        ) : null}
        {locationAccuracyMeters !== null ? (
          <p className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
            GPS accuracy: ~{locationAccuracyMeters}m (target {"<="} {LOCATION_ACCURACY_TARGET_METERS}m)
          </p>
        ) : null}
        <p className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
          Pending markers: {pendingPlotted}/{pendingTotal}
        </p>
      </div>

      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-2 block font-semibold text-slate-700">Department</span>
          <select value={department} onChange={(event) => setDepartment(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900">
            <option>All</option>
            {departmentOptions.map((dep) => (
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
          <div className={mapHeightClass}>
            <MapContainer
              center={currentLocation ? [currentLocation.lat, currentLocation.lng] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
              zoom={11}
              className="h-full w-full"
              zoomControl
              whenReady={(event) => {
                mapRef.current = event.target;
                const firstMarker = mapMarkers[0];
                const preferredCenter = firstMarker
                  ? [firstMarker.lat, firstMarker.lng]
                  : (currentLocation ? [currentLocation.lat, currentLocation.lng] : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]);
                event.target.setView(preferredCenter, 11);
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapClickHandler onMapClick={() => setSelectedId(null)} />

              {currentLocation ? (
                <>
                  <CircleMarker
                    center={[currentLocation.lat, currentLocation.lng]}
                    radius={6}
                    pathOptions={{
                      fillColor: "#ffffff",
                      fillOpacity: 1,
                      color: "#0ea5e9",
                      weight: 2
                    }}
                  />
                  <Circle
                    center={[currentLocation.lat, currentLocation.lng]}
                    radius={NEARBY_RADIUS_KM * 1000}
                    pathOptions={{
                      fillColor: "#0ea5e9",
                      fillOpacity: 0.12,
                      color: "#0ea5e9",
                      opacity: 0.6,
                      weight: 2
                    }}
                  />
                </>
              ) : null}

              {mapMarkers.map((item) => (
                <CircleMarker
                  key={item.id}
                  center={[item.lat, item.lng]}
                  radius={item.status === "Pending" ? 10 : 8}
                  pathOptions={{
                    fillColor: markerColor(item.status),
                    fillOpacity: 1,
                    color: selectedId === item.id ? "#0f172a" : "#ffffff",
                    weight: selectedId === item.id ? 3 : 2
                  }}
                  eventHandlers={{
                    click: () => setSelectedId(item.id)
                  }}
                />
              ))}
            </MapContainer>
          </div>

          <div className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><SlidersHorizontal size={16} /> Live filters active</div>
            <p className="mt-1 text-xs text-slate-500">Complaint markers powered by Leaflet + OpenStreetMap tiles</p>
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
