import { CheckCircle2, LocateFixed, UploadCloud } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../App";
import { createComplaint } from "../services/backendApi";
import { departments } from "../services/mockData";

const initialForm = { title: "", description: "", department: departments[0], location: "", image: null };

const LOCATION_ERROR_TEXT = "Location must be in 'lat, lng' format (example: 22.69050, 72.86175) or DMS format (example: 22°41'25.8\"N 72°51'42.3\"E).";

const dmsToDecimal = (degrees, minutes, seconds, direction) => {
  const base = Number(degrees) + Number(minutes) / 60 + Number(seconds) / 3600;
  const sign = direction === "S" || direction === "W" ? -1 : 1;
  return Number((base * sign).toFixed(6));
};

const parseLocationInput = (locationText) => {
  if (!locationText?.trim()) {
    return null;
  }

  const normalized = locationText.trim();

  // Accept decimal coordinates such as "22.69050, 72.86175"
  const decimalMatch = normalized.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (decimalMatch) {
    const lat = Number(decimalMatch[1]);
    const lng = Number(decimalMatch[2]);
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng };
    }
  }

  // Accept DMS coordinates such as 22°41'25.8"N 72°51'42.3"E
  const dmsMatch = normalized
    .toUpperCase()
    .match(/(\d{1,3})\D+(\d{1,2})\D+(\d{1,2}(?:\.\d+)?)\D*([NS])\D+(\d{1,3})\D+(\d{1,2})\D+(\d{1,2}(?:\.\d+)?)\D*([EW])/);

  if (dmsMatch) {
    const lat = dmsToDecimal(dmsMatch[1], dmsMatch[2], dmsMatch[3], dmsMatch[4]);
    const lng = dmsToDecimal(dmsMatch[5], dmsMatch[6], dmsMatch[7], dmsMatch[8]);
    return { lat, lng };
  }

  return null;
};

function NewComplaintPage() {
  const { addComplaint, user } = useContext(AppContext);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (!form.image) {
      setPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(form.image);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [form.image]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const fetchLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported in your browser.");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setField("location", `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        setIsLocating(false);
      },
      (geoError) => {
        setIsLocating(false);
        if (geoError.code === 1) {
          setError("Location permission denied. Enable location access in browser site settings and try again.");
          return;
        }
        if (geoError.code === 2) {
          setError("Position unavailable. Move to an open area or check your device location services.");
          return;
        }
        setError("Unable to fetch your location. Please enter coordinates manually.");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  };

  const submitComplaint = async () => {
    if (!form.image || !form.title || !form.description || !form.department || !form.location) {
      setError("Please fill all mandatory fields and upload an image.");
      return;
    }

    const parsedLocation = parseLocationInput(form.location);
    if (!parsedLocation) {
      setError(LOCATION_ERROR_TEXT);
      return;
    }

    const { lat, lng } = parsedLocation;

    setIsSubmitting(true);

    try {
      const apiComplaint = await createComplaint({
        grievance_id: `GRV-${Date.now()}`,
        title: form.title,
        description: form.description,
        department: form.department,
        grievance_type: form.department.toLowerCase().replace(/\s+/g, "_"),
        lat,
        lng,
        image: form.image,
        created_by: user?.id
      });

      addComplaint(apiComplaint);
      setSuccess("Complaint submitted to backend successfully.");
    } catch (submitError) {
      const suggestions = submitError?.payload?.duplicate_suggestions;
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        setError(`${submitError.message} (${suggestions.length} nearby suggestion(s) found)`);
      } else {
        setError(submitError.message || "Unable to submit complaint.");
      }
      return;
    } finally {
      setIsSubmitting(false);
    }

    setForm(initialForm);
    setStep(1);
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Citizen Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Register New Complaint</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">Upload evidence first, then fill complaint details. The design stays clean, readable, and government-style.</p>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
        <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-600">
          <span className={`rounded-full px-4 py-2 ${step === 1 ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700"}`}>1. Upload</span>
          <span className={`rounded-full px-4 py-2 ${step === 2 ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-700"}`}>2. Details</span>
        </div>

        {step === 1 ? (
          <div>
            <label className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-blue-300 hover:bg-blue-50/40">
              <UploadCloud className="mb-3 text-slate-500" size={34} />
              <span className="text-base font-semibold text-slate-900">Upload complaint image</span>
              <span className="mt-1 text-sm text-slate-500">Image is mandatory for complaint submission.</span>
              <input type="file" accept="image/*" className="hidden" onChange={(event) => setField("image", event.target.files?.[0] || null)} />
            </label>

            {preview ? <img src={preview} alt="Complaint preview" className="mt-4 h-56 w-full rounded-3xl object-cover" /> : null}

            <button type="button" onClick={() => (form.image ? setStep(2) : setError("Please upload an image to continue."))} className="mt-4 rounded-2xl bg-blue-700 px-5 py-3 font-semibold text-white">
              Continue
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            <input type="text" placeholder="Complaint Title" value={form.title} onChange={(event) => setField("title", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900" />
            <textarea placeholder="Description" value={form.description} onChange={(event) => setField("description", event.target.value)} rows={5} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900" />
            <select value={form.department} onChange={(event) => setField("department", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900">
              {departments.map((dep) => <option key={dep}>{dep}</option>)}
            </select>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input type="text" placeholder="Location (22.69050, 72.86175)" value={form.location} onChange={(event) => setField("location", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900" />
              <button type="button" onClick={fetchLocation} disabled={isLocating} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
                <LocateFixed size={16} /> {isLocating ? "Locating..." : "Auto Locate"}
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setStep(1)} className="rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700">Back</button>
              <button type="button" onClick={submitComplaint} disabled={isSubmitting} className="rounded-2xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-700/20">
                {isSubmitting ? "Submitting..." : "Submit Complaint"}
              </button>
            </div>
          </div>
        )}

        {error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {success ? <p className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 size={16} />{success}</p> : null}
      </div>
    </section>
  );
}

export default NewComplaintPage;
