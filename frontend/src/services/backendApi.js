const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/$/, "");

function titleCaseStatus(status) {
  const raw = String(status || "").toUpperCase();
  if (raw === "PENDING") {
    return "Pending";
  }
  if (raw === "VERIFIED") {
    return "Verified";
  }
  if (raw === "REOPENED") {
    return "Reopened";
  }
  return raw
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function toUiComplaint(complaint) {
  const coordinates = complaint.coordinates || complaint.location?.coordinates || [0, 0];
  const [lng, lat] = coordinates;
  const created = complaint.created_at ? new Date(complaint.created_at).toISOString().slice(0, 10) : "--";
  const resolved = complaint.resolved_at ? new Date(complaint.resolved_at).toISOString().slice(0, 10) : null;

  const timeline = [{ label: "Complaint Submitted", date: created }];
  if (resolved) {
    timeline.push({ label: "Marked Resolved", date: resolved });
  }
  if (titleCaseStatus(complaint.status) === "Verified" && complaint.verified_at) {
    timeline.push({ label: "Final Decision: Verified", date: new Date(complaint.verified_at).toISOString().slice(0, 10) });
  }
  if (titleCaseStatus(complaint.status) === "Reopened") {
    timeline.push({ label: "Final Decision: Reopened", date: resolved || created });
  }

  return {
    id: complaint.id || complaint._id,
    title: complaint.title,
    description: complaint.description,
    department: complaint.department,
    status: titleCaseStatus(complaint.status),
    createdAt: created,
    resolvedAt: resolved,
    location: {
      lat: Number(lat || 0),
      lng: Number(lng || 0),
      area: complaint.location_name || `${Number(lat || 0).toFixed(5)}, ${Number(lng || 0).toFixed(5)}`
    },
    verification: {
      ivrResponse: Number(complaint.ivr_response) === 2 ? "Yes" : "No",
      gpsMatch: Number(complaint.gps_match_flag) === 1,
      photoUploaded: Number(complaint.photo_uploaded) === 1
    },
    timeline
  };
}

async function parseResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export async function createUser(payload) {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return parseResponse(response);
}

export async function createComplaint(payload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  const response = await fetch(`${API_BASE_URL}/complaints`, {
    method: "POST",
    body: formData
  });

  const data = await parseResponse(response);
  return toUiComplaint(data.complaint);
}

export async function fetchNearbyComplaints({ lat, lng, radius = 2000, grievanceType }) {
  const params = new URLSearchParams({
    lat: String(lat),
    lng: String(lng),
    radius: String(radius)
  });

  if (grievanceType) {
    params.set("grievance_type", grievanceType);
  }

  const response = await fetch(`${API_BASE_URL}/complaints/nearby?${params.toString()}`);
  const data = await parseResponse(response);
  return (data.complaints || []).map(toUiComplaint);
}
