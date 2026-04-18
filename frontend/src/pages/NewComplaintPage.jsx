import { CheckCircle2, LocateFixed, PhoneCall, UploadCloud } from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "../App";
import { createComplaint } from "../services/backendApi";
import { departmentOptions, grievanceTypes } from "../services/mockData";

const initialForm = { title: "", description: "", department: "", grievanceType: "", location: "", image: null };
const initialMode = "APP_IMAGE";
const TEXT_MODE = "APP_TEXT";

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

const toGrievanceTypeValue = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, "_");

function NewComplaintPage() {
  const { addComplaint, refreshComplaints, user } = useContext(AppContext);
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState(initialForm);
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
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

  useEffect(() => {
    if (form.department || !departmentOptions.length) {
      return;
    }

    setForm((previous) => ({ ...previous, department: departmentOptions[0] }));
  }, [departmentOptions, form.department]);

  useEffect(() => {
    if (form.grievanceType || !grievanceTypes.length) {
      return;
    }

    setForm((previous) => ({ ...previous, grievanceType: grievanceTypes[0] }));
  }, [form.grievanceType]);

  useEffect(() => {
    if (user?.phone && !contactPhone) {
      setContactPhone(user.phone);
    }
  }, [contactPhone, user?.phone]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setError("");
    setSuccess("");
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
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

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const submitComplaint = async () => {
    const grievanceType = toGrievanceTypeValue(form.grievanceType) || "general";
    const resolvedPhone = (user?.phone || contactPhone || "").trim();
    const parsedLocation = parseLocationInput(form.location);

    if (!form.title || !form.description || !form.department || !form.grievanceType) {
      setError("Please fill the complaint title, description, department, and grievance type.");
      return;
    }

    if (mode === "APP_IMAGE") {
      if (!form.image || !form.location) {
        setError("Please upload a geo-tagged image and add a location.");
        return;
      }

      if (!parsedLocation) {
        setError(LOCATION_ERROR_TEXT);
        return;
      }
    }

    if (mode === TEXT_MODE && !resolvedPhone) {
      setError("Please add a mobile number for text complaint registration.");
      return;
    }

    if (mode === "APP_IMAGE" && !parsedLocation) {
      setError(LOCATION_ERROR_TEXT);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        grievance_id: `GRV-${Date.now()}`,
        title: mode === TEXT_MODE && !form.title.trim() ? `Text complaint - ${form.grievanceType}` : form.title,
        description: form.description,
        department: form.department,
        grievance_type: grievanceType,
        source: mode,
        created_by: user?.id
      };

      if (mode === "APP_IMAGE") {
        payload.lat = parsedLocation.lat;
        payload.lng = parsedLocation.lng;
        payload.image = form.image;
      } else {
        payload.citizen_phone = resolvedPhone;
        if (form.location?.trim()) {
          payload.location_text = form.location.trim();
        }
      }

      const apiComplaint = await createComplaint(payload);

      addComplaint(apiComplaint);
      await refreshComplaints();
      setSuccess(mode === TEXT_MODE ? "Text complaint submitted successfully." : "Geo-tagged complaint submitted successfully.");
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
    setContactPhone(user?.phone || "");
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Citizen Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Register New Complaint</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">Choose a complaint intake method. Geo-tagged image is best for field evidence, while text-based complaint accepts details without image upload.</p>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => switchMode("APP_IMAGE")}
            className={`rounded-3xl border px-5 py-4 text-left transition ${mode === "APP_IMAGE" ? "border-blue-700 bg-blue-50 ring-1 ring-blue-700/20" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"}`}
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <UploadCloud size={16} /> Add Geo-tagged image
            </span>
            <p className="mt-2 text-sm leading-6 text-slate-600">Upload an image and use location coordinates for a precise complaint submission.</p>
          </button>

          <button
            type="button"
            onClick={() => switchMode(TEXT_MODE)}
            className={`rounded-3xl border px-5 py-4 text-left transition ${mode === TEXT_MODE ? "border-blue-700 bg-blue-50 ring-1 ring-blue-700/20" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"}`}
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <PhoneCall size={16} /> Text-based complaint
            </span>
            <p className="mt-2 text-sm leading-6 text-slate-600">Register a complaint using text only. No image upload is needed.</p>
          </button>
        </div>

        <div className="mt-6 grid gap-6">
          {mode === "APP_IMAGE" ? (
            <>
              <button
                type="button"
                onClick={openFilePicker}
                className="flex min-h-52 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-blue-300 hover:bg-blue-50/40"
              >
                <UploadCloud className="mb-3 text-slate-500" size={34} />
                <span className="text-base font-semibold text-slate-900">Upload geo-tagged complaint image</span>
                <span className="mt-1 text-sm text-slate-500">Image and location are mandatory for this mode.</span>
                <span className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 shadow-sm">
                  Choose Image
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => setField("image", event.target.files?.[0] || null)}
              />

              {preview ? <img src={preview} alt="Complaint preview" className="h-56 w-full rounded-3xl object-cover" /> : null}
            </>
          ) : null}

          <div className="grid gap-4">
            <input type="text" placeholder={mode === TEXT_MODE ? "Complaint title (optional for text complaint)" : "Complaint Title"} value={form.title} onChange={(event) => setField("title", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900" />
            <textarea placeholder={mode === TEXT_MODE ? "Describe the complaint in text" : "Description"} value={form.description} onChange={(event) => setField("description", event.target.value)} rows={mode === TEXT_MODE ? 6 : 5} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900" />

            <label className="text-sm font-medium text-slate-700">
              <span className="mb-2 block font-semibold text-slate-700">Department</span>
              <select
                value={form.department}
                onChange={(event) => setField("department", event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
              >
                {departmentOptions.map((dep) => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              <span className="mb-2 block font-semibold text-slate-700">Grievance Type</span>
              <select
                value={form.grievanceType}
                onChange={(event) => setField("grievanceType", event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
              >
                {grievanceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            {mode === TEXT_MODE ? (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input
                  type="tel"
                  placeholder="Registered mobile number"
                  value={contactPhone}
                  onChange={(event) => {
                    setContactPhone(event.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                />
                <button type="button" onClick={() => setError("Location is optional for text-based intake. Add one only if you know it.")} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 font-semibold text-slate-700">
                  <LocateFixed size={16} /> Optional Location
                </button>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input type="text" placeholder="Location (22.69050, 72.86175)" value={form.location} onChange={(event) => setField("location", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900" />
                <button type="button" onClick={fetchLocation} disabled={isLocating} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
                  <LocateFixed size={16} /> {isLocating ? "Locating..." : "Auto Locate"}
                </button>
              </div>
            )}

            {mode === TEXT_MODE ? (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">This intake path is text based. Enter the complaint details and submit without an image.</p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setForm(initialForm)} className="rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700">Reset</button>
              <button type="button" onClick={submitComplaint} disabled={isSubmitting} className="rounded-2xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-700/20">
                {isSubmitting ? "Submitting..." : mode === TEXT_MODE ? "Submit Text Complaint" : "Submit Geo-tagged Complaint"}
              </button>
            </div>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {success ? <p className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 size={16} />{success}</p> : null}
      </div>
    </section>
  );
}

export default NewComplaintPage;
