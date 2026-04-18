import { MapPin, RefreshCcw, SlidersHorizontal } from "lucide-react";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { CircleF, GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { AppContext } from "../App";
import { departments, statusOptions } from "../services/mockData";

const DEFAULT_CENTER = { lat: 28.6139, lng: 77.209 };
const NEARBY_RADIUS_KM = 3;
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MAP_CONTAINER_STYLE = { width: "100%", height: "100%" };

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
  const { complaints, syncNearbyComplaints } = useContext(AppContext);
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || ""
  });

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

  const onMapUnmount = () => {
    mapRef.current = null;
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

  const onMapLoad = (map) => {
    mapRef.current = map;
    const firstMarker = mapMarkers[0];
    const preferredCenter = firstMarker
      ? { lat: firstMarker.lat, lng: firstMarker.lng }
      : (currentLocation || DEFAULT_CENTER);
    map.setCenter(preferredCenter);
    map.setZoom(11);
  };

  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    const previousCenter = mapRef.current.getCenter()?.toJSON();
    window.google.maps.event.trigger(mapRef.current, "resize");

    if (previousCenter && hasValidCoordinates(previousCenter.lat, previousCenter.lng)) {
      mapRef.current.setCenter(previousCenter);
      return;
    }

    if (mapMarkers.length) {
      mapRef.current.setCenter({ lat: mapMarkers[0].lat, lng: mapMarkers[0].lng });
      return;
    }

    mapRef.current.setCenter(currentLocation || DEFAULT_CENTER);
  }, [isFullscreen, isLoaded, mapMarkers, currentLocation]);

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

    mapRef.current.setCenter({ lat: mapMarkers[0].lat, lng: mapMarkers[0].lng });
    mapRef.current.setZoom(11);
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
        <p className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700">
          Pending markers: {pendingPlotted}/{pendingTotal}
        </p>
      </div>

      {!GOOGLE_MAPS_API_KEY ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Add VITE_GOOGLE_MAPS_API_KEY in frontend/.env to enable Google Maps.
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          Google Maps failed to load: {loadError.message}. Verify API key, allowed referrers (localhost), and enabled billing.
        </div>
      ) : null}

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
          {loadError ? (
            <div className="flex h-[70vh] items-center justify-center px-6 text-center text-sm text-rose-700">
              Google Maps failed to load. Check API key restrictions and billing, then restart Vite.
            </div>
          ) : isLoaded ? (
            <div className={mapHeightClass}>
              <GoogleMap
                mapContainerStyle={MAP_CONTAINER_STYLE}
                center={currentLocation || DEFAULT_CENTER}
                zoom={11}
                options={{
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: false,
                  clickableIcons: false,
                  gestureHandling: "greedy"
                }}
                onLoad={onMapLoad}
                onUnmount={onMapUnmount}
                onClick={() => setSelectedId(null)}
              >
                {currentLocation ? (
                  <>
                    <MarkerF
                      position={currentLocation}
                      title="Your Current Location"
                      icon={{
                        path: window.google?.maps?.SymbolPath?.CIRCLE,
                        fillColor: "#ffffff",
                        fillOpacity: 1,
                        strokeColor: "#0ea5e9",
                        strokeOpacity: 1,
                        strokeWeight: 2,
                        scale: 7
                      }}
                      zIndex={1}
                    />
                    <CircleF
                      center={currentLocation}
                      radius={NEARBY_RADIUS_KM * 1000}
                      options={{
                        fillColor: "#0ea5e9",
                        fillOpacity: 0.12,
                        strokeColor: "#0ea5e9",
                        strokeOpacity: 0.6,
                        strokeWeight: 2
                      }}
                    />
                  </>
                ) : null}

                {mapMarkers.map((item) => (
                  <MarkerF
                    key={item.id}
                    position={{ lat: item.lat, lng: item.lng }}
                    onClick={() => setSelectedId(item.id)}
                    title={item.title}
                    zIndex={item.status === "Pending" ? 20 : 10}
                    icon={{
                      path: window.google?.maps?.SymbolPath?.CIRCLE,
                      fillColor: markerColor(item.status),
                      fillOpacity: 1,
                      strokeColor: "#ffffff",
                      strokeWeight: 2,
                      scale: item.status === "Pending" ? 10 : 8
                    }}
                  />
                ))}
              </GoogleMap>
            </div>
          ) : (
            <div className="flex h-[70vh] items-center justify-center px-6 text-center text-sm text-slate-500">
              Loading Google Maps...
            </div>
          )}

          <div className="pointer-events-none absolute left-4 top-4 rounded-2xl bg-white/90 px-4 py-3 shadow-sm backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><SlidersHorizontal size={16} /> Live filters active</div>
            <p className="mt-1 text-xs text-slate-500">Google Maps API with complaint markers</p>
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
