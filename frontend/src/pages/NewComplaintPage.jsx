import { CheckCircle2, LocateFixed, PhoneCall, UploadCloud, Sparkles } from "lucide-react";
import { useContext, useEffect, useRef, useState } from "react";
import { AppContext } from "../App";
import { createComplaint, predictDepartment, predictComplaintDetails } from "../services/backendApi";
import { departmentOptions } from "../services/mockData";
import { getDistrictFromCoordinates } from "../utils/gujaratDistricts";
import { useTranslation } from "../hooks/useTranslation";

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

const buildFallbackTitle = (description) => {
  const text = String(description || "").trim();
  if (!text) {
    return "Complaint Reported";
  }
  const compact = text.replace(/\s+/g, " ");
  return compact.length > 60 ? `${compact.slice(0, 57)}...` : compact;
};

function NewComplaintPage() {
  const { addComplaint, refreshComplaints, user } = useContext(AppContext);
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState(initialForm);
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isPredictingDepartment, setIsPredictingDepartment] = useState(false);
  const [predictedDepartment, setPredictedDepartment] = useState(null);
  const [isPredictingDetails, setIsPredictingDetails] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [preview, setPreview] = useState("");

  const predictAndSetDepartment = async (imageUrl, textContent) => {
    setIsPredictingDepartment(true);
    setPredictedDepartment(null);
    
    try {
      const result = await predictDepartment(
        imageUrl ? { imageUrl } : textContent ? { text: textContent } : null
      );
      
      if (result?.predictedDepartment) {
        setPredictedDepartment(result.predictedDepartment);
        // Auto-populate the department field
        setForm((prev) => ({
          ...prev,
          department: result.predictedDepartment
        }));
        return result.predictedDepartment;
      }

      return null;
    } catch (err) {
      console.error("Failed to predict department:", err);
      return null;
    } finally {
      setIsPredictingDepartment(false);
    }
  };

  useEffect(() => {
    if (!form.image) {
      setPreview("");
      setImageDataUrl("");
      setPredictedDepartment(null);
      return;
    }

    const objectUrl = URL.createObjectURL(form.image);
    setPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [form.image]);

  useEffect(() => {
    if (mode === TEXT_MODE && form.description?.trim().length > 20) {
      const timeoutId = setTimeout(() => {
        predictAndSetDepartment(null, form.description);
      }, 800);
      
      return () => clearTimeout(timeoutId);
    }
  }, [form.description, mode]);

  useEffect(() => {
    if (mode === "APP_IMAGE" && imageDataUrl && form.description?.trim().length >= 10) {
      const timeoutId = setTimeout(() => {
        predictAndSetDepartment(imageDataUrl);
        predictAndSetDetails(imageDataUrl, form.description);
      }, 800);
      
      return () => clearTimeout(timeoutId);
    }
  }, [form.description, imageDataUrl, mode]);

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

  const handleImageSelection = (file) => {
    setField("image", file);

    if (!file) {
      setImageDataUrl("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(typeof reader.result === "string" ? reader.result : "");
    };
    reader.readAsDataURL(file);
  };

  const predictAndSetDetails = async (imageUrl, description) => {
    if (!imageUrl || !description || description.trim().length < 10) {
      return { predictedTitle: null, predictedGrievanceType: null };
    }

    setIsPredictingDetails(true);
    
    try {
      const result = await predictComplaintDetails(imageUrl, description);
      
      if (result?.predictedTitle || result?.predictedGrievanceType) {
        setForm((prev) => ({
          ...prev,
          title: result.predictedTitle || prev.title,
          grievanceType: result.predictedGrievanceType || prev.grievanceType
        }));
      }

      return {
        predictedTitle: result?.predictedTitle || null,
        predictedGrievanceType: result?.predictedGrievanceType || null
      };
    } catch (err) {
      console.error("Failed to predict complaint details:", err);
      return { predictedTitle: null, predictedGrievanceType: null };
    } finally {
      setIsPredictingDetails(false);
    }
  };

  const handleReviewAndSubmit = async () => {
    // Predict department and details on submit click
    try {
      let predictedDepartmentValue = null;
      let predictedTitleValue = null;
      let predictedGrievanceTypeValue = null;

      if (mode === "APP_IMAGE" && imageDataUrl) {
        predictedDepartmentValue = await predictAndSetDepartment(imageDataUrl);
        const predictedDetails = await predictAndSetDetails(imageDataUrl, form.description);
        predictedTitleValue = predictedDetails?.predictedTitle || null;
        predictedGrievanceTypeValue = predictedDetails?.predictedGrievanceType || null;
      } else if (mode === "TEXT_MODE" && form.description?.trim().length > 0) {
        predictedDepartmentValue = await predictAndSetDepartment(null, form.description);
      }

      // Ensure modal always shows non-empty values.
      const nextTitle = predictedTitleValue || form.title || buildFallbackTitle(form.description);
      const nextDepartment = predictedDepartmentValue || form.department || "General";
      const nextGrievanceType = predictedGrievanceTypeValue || form.grievanceType || "general";

      setForm((prev) => ({
        ...prev,
        title: nextTitle,
        department: nextDepartment,
        grievanceType: nextGrievanceType
      }));

      setShowConfirmation(true);
    } catch (err) {
      console.error("Error during prediction:", err);
      setError("Failed to predict values. Please try again.");
    }
  };

  const submitComplaint = async () => {
    const grievanceType = toGrievanceTypeValue(form.grievanceType) || "general";
    const resolvedPhone = (user?.phone || contactPhone || "").trim();
    const parsedLocation = parseLocationInput(form.location);

    if (!form.description) {
      setError("Please fill the description.");
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
        title: form.title.trim() || (mode === TEXT_MODE ? `Text complaint - ${form.grievanceType}` : `Complaint - ${form.grievanceType}`),
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
        // Auto-assign district based on coordinates
        payload.district = getDistrictFromCoordinates(parsedLocation.lat, parsedLocation.lng);
      } else {
        payload.citizen_phone = resolvedPhone;
        if (form.location?.trim()) {
          payload.location_text = form.location.trim();
        }
      }

      const apiComplaint = await createComplaint(payload);

      addComplaint(apiComplaint);
      await refreshComplaints();
      setSuccess(mode === TEXT_MODE ? t("Text complaint submitted successfully.") : t("Geo-tagged complaint submitted successfully."));
    } catch (submitError) {
      const suggestions = submitError?.payload?.duplicate_suggestions;
      if (Array.isArray(suggestions) && suggestions.length > 0) {
        const topIds = suggestions
          .slice(0, 3)
          .map((item) => item?.grievance_id || item?.id)
          .filter(Boolean)
          .join(", ");
        setError(`${submitError.message} (${suggestions.length} suggestion(s) found${topIds ? `: ${topIds}` : ""})`);
      } else {
        setError(submitError.message || "Unable to submit complaint.");
      }
      return;
    } finally {
      setIsSubmitting(false);
    }

    setForm(initialForm);
    setImageDataUrl("");
    setContactPhone(user?.phone || "");
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Citizen Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">{t("Register New Complaint")}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("Choose a complaint intake method")}</p>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
        <div className="grid gap-3 md:grid-cols-2">
          <button
            type="button"
            onClick={() => switchMode("APP_IMAGE")}
            className={`rounded-3xl border px-5 py-4 text-left transition ${mode === "APP_IMAGE" ? "border-blue-700 bg-blue-50 ring-1 ring-blue-700/20" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"}`}
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <UploadCloud size={16} /> {t("Add Geo-tagged image")}
            </span>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("Upload an image with AI auto-prediction")}</p>
          </button>

          <button
            type="button"
            onClick={() => switchMode(TEXT_MODE)}
            className={`rounded-3xl border px-5 py-4 text-left transition ${mode === TEXT_MODE ? "border-blue-700 bg-blue-50 ring-1 ring-blue-700/20" : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"}`}
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
              <PhoneCall size={16} /> {t("Text-based complaint")}
            </span>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("Register a complaint using text only")}</p>
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
                <span className="text-base font-semibold text-slate-900">{t("Upload geo-tagged complaint image")}</span>
                <span className="mt-1 text-sm text-slate-500">{t("Image must contain GPS data for validation")}</span>
                <span className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 shadow-sm">
                  {t("Choose Image")}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleImageSelection(event.target.files?.[0] || null)}
              />

              {preview ? (
                <div>
                  <img src={preview} alt="Complaint preview" className="h-56 w-full rounded-3xl object-cover" />
                </div>
              ) : null}
            </>
          ) : null}

          <div className="grid gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">{t("Description")} *</label>
                <textarea 
                  placeholder={t("Describe the issue in detail (min 10 characters)")} 
                  value={form.description} 
                  onChange={(event) => setField("description", event.target.value)} 
                  rows={mode === TEXT_MODE ? 6 : 5} 
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900" 
                />
                <p className="mt-1 text-xs text-slate-500">{t("This is required for accurate complaint analysis")}</p>
              </div>

            {mode === TEXT_MODE ? (
              <div className="grid gap-3">
                <input
                  type="tel"
                  placeholder={t("Registered mobile number")}
                  value={contactPhone}
                  onChange={(event) => {
                    setContactPhone(event.target.value);
                    setError("");
                    setSuccess("");
                  }}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900"
                />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <input type="text" placeholder="Location (22.69050, 72.86175)" value={form.location} onChange={(event) => setField("location", event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900" />
                <button type="button" onClick={fetchLocation} disabled={isLocating} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
                  <LocateFixed size={16} /> {isLocating ? t("Locating...") : t("Auto Locate")}
                </button>
              </div>
            )}

            {mode === TEXT_MODE ? (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">This intake path is text based. Enter the complaint details and submit without an image.</p>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setForm(initialForm)} className="rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700">Reset</button>
              <button 
                type="button" 
                onClick={handleReviewAndSubmit}
                disabled={
                  isSubmitting || 
                  (mode === "APP_IMAGE" && !form.image) ||
                  isPredictingDepartment ||
                  isPredictingDetails
                } 
                className="rounded-2xl bg-emerald-700 px-5 py-3 font-semibold text-white shadow-lg shadow-emerald-700/20 disabled:cursor-not-allowed disabled:opacity-60"
                title={
                  mode === "APP_IMAGE" && !form.image ? "Please upload an image first" :
                  isPredictingDepartment || isPredictingDetails ? "Predicting... please wait" :
                  ""
                }
              >
                {isSubmitting ? "Submitting..." : "Review & Submit"}
              </button>
            </div>
          </div>
        </div>

        {showConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl">
              <div className="border-b border-slate-200 px-6 py-4">
                <h3 className="text-xl font-bold text-slate-900">Confirm AI Predictions</h3>
                <p className="mt-1 text-sm text-slate-600">Please review the AI-predicted values:</p>
              </div>
              
              <div className="space-y-4 px-6 py-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-600">Title</p>
                  <p className="mt-1 text-base font-medium text-slate-900">{form.title}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-600">Department</p>
                  <p className="mt-1 text-base font-medium text-slate-900">{form.department}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-600">Grievance Type</p>
                  <p className="mt-1 text-base font-medium text-slate-900">{form.grievanceType}</p>
                </div>
              </div>
              
              <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 rounded-2xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  No, Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmation(false);
                    submitComplaint();
                  }}
                  disabled={isSubmitting}
                  className="flex-1 rounded-2xl bg-emerald-700 px-4 py-2 font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Yes, Submit
                </button>
              </div>
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
