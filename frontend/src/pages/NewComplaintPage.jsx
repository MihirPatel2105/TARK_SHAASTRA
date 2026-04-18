import { CheckCircle2, LocateFixed, UploadCloud } from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../App";
import { createComplaint } from "../services/backendApi";
import { departments } from "../services/mockData";

const initialForm = { title: "", description: "", department: departments[0], location: "", image: null };

function NewComplaintPage() {
  const { addComplaint, user } = useContext(AppContext);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setField("location", `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      },
      () => setError("Unable to fetch your location. Please enter manually.")
    );
  };

  const submitComplaint = async () => {
    if (!form.image || !form.title || !form.description || !form.department || !form.location) {
      setError("Please fill all mandatory fields and upload an image.");
      return;
    }

    const [latText, lngText] = form.location.split(",").map((part) => part.trim());
    const lat = Number(latText);
    const lng = Number(lngText);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError("Location must be in 'lat, lng' format.");
      return;
    }

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
              <input type="text" placeholder="Location (lat, lng)" value={form.location} onChange={(event) => setField("location", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900" />
              <button type="button" onClick={fetchLocation} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 font-semibold text-slate-700">
                <LocateFixed size={16} /> Auto Locate
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
