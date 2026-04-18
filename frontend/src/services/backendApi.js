import { loadAuthToken, loadStoredUser, normalizeRole } from "./authStore";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

function withNetworkMessage(error) {
  // Browser fetch throws TypeError for DNS/CORS/offline/server-down cases.
  if (error instanceof TypeError) {
    const friendly = new Error(
      `Unable to reach backend at ${API_BASE_URL}. Start backend server and try again.`
    );
    friendly.cause = error;
    throw friendly;
  }

  throw error;
}

async function apiFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    withNetworkMessage(error);
  }
}

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
  const coordinates = complaint.coordinates || complaint.location?.coordinates || [];
  const hasCoordinates = Array.isArray(coordinates) && coordinates.length === 2;
  const [lng = null, lat = null] = hasCoordinates ? coordinates : [null, null];
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
    source: complaint.source || "APP_TEXT",
    locationStatus: complaint.location_status || "AVAILABLE",
    locationText: complaint.location_text || null,
    citizenPhone: complaint.citizen_phone || null,
    transcriptText: complaint.ivr_metadata?.transcript_text || null,
    recordingUrl: complaint.ivr_metadata?.recording_url || null,
    createdAt: created,
    resolvedAt: resolved,
    location: {
      lat: hasCoordinates ? Number(lat) : null,
      lng: hasCoordinates ? Number(lng) : null,
      area: complaint.location_name || complaint.location_text || (hasCoordinates ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` : "Location pending")
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
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const message = data?.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

function buildAuthHeaders(baseHeaders = {}) {
  const token = loadAuthToken();
  const user = loadStoredUser();
  const headers = { ...baseHeaders };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (user?.id) {
    headers["x-user-id"] = user.id;
  }

  return headers;
}

function toUiUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id || user._id,
    name: user.name,
    email: user.email,
    role: normalizeRole(user.role),
    department: user.department || null,
    location: user.location,
    points: user.points
  };
}

export async function loginUser(payload) {
  const response = await apiFetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await parseResponse(response);

  return {
    message: data?.message,
    token: data?.token,
    user: toUiUser(data?.user)
  };
}

export async function signupCitizen(payload) {
  const response = await apiFetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await parseResponse(response);

  return {
    message: data?.message,
    token: data?.token,
    user: toUiUser(data?.user)
  };
}

export async function createComplaint(payload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  const response = await apiFetch(`${API_BASE_URL}/complaints`, {
    method: "POST",
    headers: buildAuthHeaders(),
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

  const response = await apiFetch(`${API_BASE_URL}/complaints/nearby?${params.toString()}`);
  const data = await parseResponse(response);
  return (data.complaints || []).map(toUiComplaint);
}

export async function fetchOfficerComplaints(status) {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await apiFetch(`${API_BASE_URL}/officer/complaints${query}`, {
    headers: buildAuthHeaders()
  });
  const data = await parseResponse(response);
  return (data.complaints || []).map(toUiComplaint);
}

export async function fetchOfficerNeedsLocationComplaints(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await apiFetch(`${API_BASE_URL}/officer/complaints/needs-location${query}`, {
    headers: buildAuthHeaders()
  });

  const data = await parseResponse(response);
  return (data.complaints || []).map(toUiComplaint);
}

export async function triggerOfficerLocationFollowup(complaintId, payload = {}) {
  const response = await apiFetch(`${API_BASE_URL}/officer/complaints/${complaintId}/trigger-location-ivr`, {
    method: "POST",
    headers: buildAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(payload)
  });

  const data = await parseResponse(response);
  return toUiComplaint(data.complaint);
}

export async function startOfficerComplaint(complaintId) {
  const response = await apiFetch(`${API_BASE_URL}/officer/complaints/${complaintId}/start`, {
    method: "POST",
    headers: buildAuthHeaders()
  });
  const data = await parseResponse(response);
  return toUiComplaint(data.complaint);
}

export async function resolveOfficerComplaint(complaintId, payload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  const response = await apiFetch(`${API_BASE_URL}/officer/complaints/${complaintId}/resolve`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: formData
  });

  const data = await parseResponse(response);
  return toUiComplaint(data.complaint);
}

export async function fetchAdminComplaints(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await apiFetch(`${API_BASE_URL}/admin/complaints${query}`, {
    headers: buildAuthHeaders()
  });
  const data = await parseResponse(response);
  return (data.complaints || []).map(toUiComplaint);
}

export async function fetchAdminDashboard(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await apiFetch(`${API_BASE_URL}/admin/dashboard${query}`, {
    headers: buildAuthHeaders()
  });
  return parseResponse(response);
}

export async function verifyAdminComplaint(complaintId, verificationStatus) {
  const body = verificationStatus ? { verification_status: verificationStatus } : {};
  const response = await apiFetch(`${API_BASE_URL}/admin/complaints/${complaintId}/verify`, {
    method: "POST",
    headers: buildAuthHeaders({
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(body)
  });

  const data = await parseResponse(response);
  return toUiComplaint(data.complaint);
}
