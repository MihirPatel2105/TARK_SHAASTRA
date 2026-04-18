import { CheckCircle2, LocateFixed, UploadCloud } from "lucide-react";
import { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "../../App";
import { resolveOfficerComplaint } from "../../services/backendApi";

function OfficerProofUploadPage() {
  const { complaints, refreshComplaints } = useContext(AppContext);
  const officerCases = useMemo(
    () =>
      complaints.filter((item) => item.status === "Pending" || item.status === "In Progress" || item.status === "Resolved"),
    [complaints]
  );
  const [complaintId, setComplaintId] = useState("");
  const [photo, setPhoto] = useState(null);
  const [gps, setGps] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!officerCases.length) {
      setComplaintId("");
      return;
    }

    setComplaintId((previousId) => {
      const stillExists = officerCases.some((item) => item.id === previousId);
      return stillExists ? previousId : officerCases[0].id;
    });
  }, [officerCases]);

  const submit = async () => {
    if (!complaintId || !photo || !gps) {
      setMessage("Select a complaint, attach a photo, and capture GPS before submitting.");
      return;
    }

    const [latText, lngText] = gps.split(",").map((part) => part.trim());
    const officerLat = Number(latText);
    const officerLng = Number(lngText);

    if (Number.isNaN(officerLat) || Number.isNaN(officerLng)) {
      setMessage("GPS must be in 'lat, lng' format.");
      return;
    }

    setIsSubmitting(true);

    try {
      await resolveOfficerComplaint(complaintId, {
        image: photo,
        officer_lat: officerLat,
        officer_lng: officerLng
      });
      await refreshComplaints();
      setMessage("Evidence submitted and complaint resolution updated from backend.");
      setPhoto(null);
    } catch (error) {
      setMessage(error.message || "Unable to submit evidence.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const captureGps = () => {
    if (!navigator.geolocation) {
      setGps("28.61390, 77.20900");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setGps(`${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`),
      () => setGps("28.61390, 77.20900")
    );
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Officer Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Upload Proof</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">Attach photo evidence and capture GPS coordinates for resolution verification.</p>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
        {!officerCases.length ? (
          <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No complaints are available in your officer queue for proof upload.
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <select
            value={complaintId}
            onChange={(event) => setComplaintId(event.target.value)}
            disabled={!officerCases.length}
            className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {officerCases.map((item) => <option key={item.id} value={item.id}>{item.id} - {item.title}</option>)}
          </select>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <UploadCloud size={16} />
              <input type="file" accept="image/*" className="hidden" disabled={!officerCases.length} onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
            {photo ? photo.name : "Upload photo proof"}
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input value={gps} readOnly placeholder="GPS location" className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-900" />
          <button type="button" onClick={captureGps} disabled={!officerCases.length} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
            <LocateFixed size={16} /> Capture GPS
          </button>
        </div>

        <button type="button" onClick={submit} disabled={isSubmitting || !officerCases.length} className="mt-4 rounded-2xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-700/20 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? "Submitting..." : "Submit Evidence"}
        </button>

        {message ? <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</p> : null}
        <p className="mt-4 text-sm text-slate-500">Submitting evidence sets photo and GPS verification flags for the complaint.</p>
      </div>
    </section>
  );
}

export default OfficerProofUploadPage;
