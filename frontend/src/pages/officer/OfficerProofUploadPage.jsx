import { CheckCircle2, LocateFixed, UploadCloud } from "lucide-react";
import { useContext, useEffect, useMemo, useState } from "react";
import { AppContext } from "../../App";
import { resolveOfficerComplaint } from "../../services/backendApi";

function OfficerProofUploadPage() {
  const { complaints, refreshComplaints } = useContext(AppContext);
  const officerCases = useMemo(
    () =>
      complaints.filter(
        (item) => item.status === "Pending" || item.status === "In Progress" || item.status === "Reopened" || item.status === "Failed"
      ),
    [complaints]
  );
  const [complaintId, setComplaintId] = useState("");
  const [photo, setPhoto] = useState(null);
  const [gps, setGps] = useState("");
  const [message, setMessage] = useState("");
  const [activeAction, setActiveAction] = useState(null);

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

  const selectedComplaint = useMemo(
    () => officerCases.find((item) => item.id === complaintId) || null,
    [officerCases, complaintId]
  );

  const submit = async (markAsFake = false) => {
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

    setActiveAction(markAsFake ? "fake" : "evidence");

    try {
      await resolveOfficerComplaint(complaintId, {
        image: photo,
        officer_lat: officerLat,
        officer_lng: officerLng,
        fake_complaint: markAsFake ? 1 : 0,
        citizen_phone: selectedComplaint?.citizenPhone || undefined
      });
      await refreshComplaints();
      setMessage(markAsFake ? "Complaint marked as fake. Citizen points reduced." : "Evidence submitted. Complaint moved to Pending Verification and IVR was triggered.");
      setPhoto(null);
      setGps("");
    } catch (error) {
      setMessage(error.message || "Unable to submit evidence.");
    } finally {
      setActiveAction(null);
    }
  };

  const submitEvidence = () => submit(false);

  const submitFakeComplaint = async () => {
    const confirmed = window.confirm("Mark this complaint as fake? This will reduce citizen points and cannot be undone from this screen.");
    if (!confirmed) {
      return;
    }

    await submit(true);
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
            No complaints are available for proof upload right now.
          </p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
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

        {selectedComplaint ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Selected Complaint</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">{selectedComplaint.title}</h3>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Source: {String(selectedComplaint.source || "APP_TEXT").toUpperCase() === "IVR_CALL" ? "IVR Call" : "App Complaint"}</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{selectedComplaint.transcriptionText || selectedComplaint.ivrTranscriptionText || selectedComplaint.description}</p>
            {selectedComplaint.imageUrl ? (
              <img
                src={selectedComplaint.imageUrl}
                alt={`Uploaded by citizen: ${selectedComplaint.title}`}
                className="mt-3 max-h-64 w-full rounded-2xl border border-slate-200 object-cover"
              />
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input value={gps} readOnly placeholder="GPS location" className="rounded-2xl border border-slate-300 px-4 py-3 text-slate-900" />
          <button type="button" onClick={captureGps} disabled={!officerCases.length} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">
            <LocateFixed size={16} /> Capture GPS
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={submitEvidence} disabled={activeAction !== null || !officerCases.length} className="rounded-2xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-700/20 disabled:cursor-not-allowed disabled:opacity-60">
            {activeAction === "evidence" ? "Submitting..." : "Submit Evidence"}
          </button>
          <button type="button" onClick={submitFakeComplaint} disabled={activeAction !== null || !officerCases.length} className="rounded-2xl bg-rose-700 px-5 py-3 font-semibold text-white shadow-lg shadow-rose-700/20 disabled:cursor-not-allowed disabled:opacity-60">
            {activeAction === "fake" ? "Submitting..." : "Mark Fake Complaint"}
          </button>
        </div>

        {message ? <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{message}</p> : null}
        <p className="mt-4 text-sm text-slate-500">Photo proof is mandatory for both actions. Submit Evidence moves the case to Pending Verification and triggers IVR; Mark Fake Complaint deducts citizen points and finalizes it as failed.</p>
      </div>
    </section>
  );
}

export default OfficerProofUploadPage;
