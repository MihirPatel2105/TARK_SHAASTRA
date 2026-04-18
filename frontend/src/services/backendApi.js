import { loadAuthToken, loadStoredUser, normalizeRole } from "./authStore";
import { mockComplaints } from "./mockData";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
const LOCAL_COMPLAINTS_KEY = "vgs_complaints";
const API_RETRY_BACKOFF_MS = 15000;

let apiBlockedUntil = 0;

function buildUnavailableResponse() {
  return new Response(
    JSON.stringify({ message: `Unable to reach backend at ${API_BASE_URL}. Start backend server and try again.` }),
    {
      status: 503,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}

function cloneComplaint(complaint) {
  return {
    ...complaint,
    location: complaint.location ? { ...complaint.location } : complaint.location,
    verification: complaint.verification ? { ...complaint.verification } : complaint.verification,
    scoring: complaint.scoring ? { ...complaint.scoring } : complaint.scoring,
    timeline: Array.isArray(complaint.timeline) ? complaint.timeline.map((entry) => ({ ...entry })) : []
  };
}

function loadLocalComplaints() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_COMPLAINTS_KEY));
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map(cloneComplaint);
    }
  } catch {
    // Ignore malformed local data and fall through to seeded records.
  }

  return mockComplaints.map(cloneComplaint);
}

function saveLocalComplaints(complaints) {
  localStorage.setItem(LOCAL_COMPLAINTS_KEY, JSON.stringify(complaints));
}

function normalizeGrievanceType(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "_");
}

function complaintMatchesGrievanceType(complaint, grievanceType) {
  if (!grievanceType) {
    return true;
  }

  const complaintType = normalizeGrievanceType(complaint.grievanceType || complaint.grievance_type);
  return complaintType === normalizeGrievanceType(grievanceType);
}

function complaintMatchesRadius(complaint, lat, lng, radius) {
  const complaintLat = Number(complaint.location?.lat ?? complaint.location?.coordinates?.[1] ?? NaN);
  const complaintLng = Number(complaint.location?.lng ?? complaint.location?.coordinates?.[0] ?? NaN);

  if (!Number.isFinite(complaintLat) || !Number.isFinite(complaintLng) || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(complaintLat - lat);
  const dLng = toRadians(complaintLng - lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat)) * Math.cos(toRadians(complaintLat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const distanceMeters = 2 * earthRadiusMeters * Math.asin(Math.sqrt(a));

  return distanceMeters <= radius;
}

function updateLocalComplaint(complaintId, updater) {
  const complaints = loadLocalComplaints();
  const nextComplaints = complaints.map((complaint) => (complaint.id === complaintId ? updater(cloneComplaint(complaint)) : complaint));
  saveLocalComplaints(nextComplaints);

  const updated = nextComplaints.find((complaint) => complaint.id === complaintId);
  return updated ? cloneComplaint(updated) : null;
}

function createLocalComplaintFromPayload(payload) {
  const grievanceType = payload.grievance_type || normalizeGrievanceType(payload.department);
  const createdAt = new Date().toISOString().slice(0, 10);
  const complaint = cloneComplaint({
    id: `local-${Date.now()}`,
    grievanceId: payload.grievance_id || `GRV-${Date.now()}`,
    title: payload.title,
    description: payload.description,
    department: payload.department,
    grievanceType,
    status: "Pending",
    verificationStatus: "Pending",
    source: payload.source || "APP_IMAGE",
    locationStatus: payload.source === "APP_TEXT" ? "NEEDS_LOCATION" : "AVAILABLE",
    createdAt,
    resolvedAt: null,
    createdById: payload.created_by || loadStoredUser()?.id || null,
    citizenEmail: loadStoredUser()?.email || null,
    citizenPhone: payload.citizen_phone || loadStoredUser()?.phone || null,
    assignedOfficerId: payload.assign_officer_id || null,
    assignedToId: payload.assign_officer_id || null,
    imageUrl: null,
    resolvedImageUrl: null,
    location: {
      lat: Number(payload.lat || 0),
      lng: Number(payload.lng || 0),
      area: payload.location_text || `${Number(payload.lat || 0).toFixed(5)}, ${Number(payload.lng || 0).toFixed(5)}`
    },
    verification: {
      gpsMatch: true,
      photoUploaded: true
    },
    scoring: {
      citizenPointsDelta: 0,
      departmentPointsDelta: 0,
      scoreReason: "Created locally while backend was unavailable",
      fakeComplaintFlag: false
    },
    timeline: [{ label: "Complaint Submitted", date: createdAt }]
  });

  return complaint;
}

function fallbackIfServerError(error, fallbackValue) {
  if (error && typeof error.status === "number" && error.status >= 500) {
    return fallbackValue;
  }

  if (error instanceof TypeError) {
    return fallbackValue;
  }

  throw error;
}

function withNetworkMessage(error) {
  // Browser fetch throws TypeError for DNS/CORS/offline/server-down cases.
  if (error instanceof TypeError) {
    return buildUnavailableResponse();
  }

  throw error;
}

async function apiFetch(url, options) {
  if (Date.now() < apiBlockedUntil) {
    return buildUnavailableResponse();
  }

  try {
    const response = await fetch(url, options);
    if (response.ok) {
      apiBlockedUntil = 0;
    }
    return response;
  } catch (error) {
    const mapped = withNetworkMessage(error);
    if (mapped instanceof Response) {
      apiBlockedUntil = Date.now() + API_RETRY_BACKOFF_MS;
      return mapped;
    }
    throw mapped;
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
    grievanceId: complaint.grievance_id || null,
    title: complaint.title,
    description: complaint.description,
    department: complaint.department,
    grievanceType: complaint.grievance_type || null,
    status: titleCaseStatus(complaint.status),
    verificationStatus: titleCaseStatus(complaint.verification_status),
    source: complaint.source || "APP_TEXT",
    locationStatus: complaint.location_status || "AVAILABLE",
    createdAt: created,
    resolvedAt: resolved,
    createdById: complaint.created_by || null,
    citizenEmail: complaint.citizen_email || null,
    citizenPhone: complaint.citizen_phone || null,
    assignedOfficerId: complaint.assigned_officer || null,
    assignedToId: complaint.assigned_to || null,
    imageUrl: complaint.image_url || complaint.imageUrl || null,
    resolvedImageUrl: complaint.resolved_image || complaint.resolvedImageUrl || null,
    location: {
      lat: Number(lat || 0),
      lng: Number(lng || 0),
      area: complaint.location_name || `${Number(lat || 0).toFixed(5)}, ${Number(lng || 0).toFixed(5)}`
    },
    verification: {
      gpsMatch: Number(complaint.gps_match_flag) === 1,
      photoUploaded: Number(complaint.photo_uploaded) === 1
    },
    scoring: {
      citizenPointsDelta: Number(complaint.scoring?.citizen_points_delta || 0),
      departmentPointsDelta: Number(complaint.scoring?.department_points_delta || 0),
      scoreReason: complaint.scoring?.score_reason || null,
      fakeComplaintFlag: Number(complaint.scoring?.fake_complaint_flag || 0) === 1
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

  // Only include Bearer token if it's a valid JWT (format: xxx.yyy.zzz)
  // Valid JWTs have exactly 3 parts separated by dots
  if (token && typeof token === 'string' && token.includes('.')) {
    const parts = token.split('.');
    if (parts.length === 3 && parts.every(p => p.length > 0)) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  // Always include user ID as fallback auth method
  // Backend accepts both Bearer tokens AND x-user-id headers
  if (user?.id) {
    headers["x-user-id"] = String(user.id);
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
    phone: user.phone || null,
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

  try {
    const data = await parseResponse(response);

    return {
      message: data?.message,
      token: data?.token,
      user: toUiUser(data?.user)
    };
  } catch (error) {
    return fallbackIfServerError(error, {
      message: "Citizen account created locally",
      token: "demo-token",
      user: toUiUser({
        id: `local-${Date.now()}`,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        role: "citizen",
        department: null,
        location: null,
        points: 0
      })
    });
  }
}

export async function createComplaint(payload) {
  const normalizedPayload = {
    ...payload,
    department: String(payload.department || "").trim(),
    grievance_type: normalizeGrievanceType(payload.grievance_type || payload.grievanceType)
  };

  if (normalizedPayload.source === "APP_TEXT") {
    const response = await apiFetch(`${API_BASE_URL}/complaints/text`, {
      method: "POST",
      headers: buildAuthHeaders({
        "Content-Type": "application/json"
      }),
      body: JSON.stringify(normalizedPayload)
    });

    try {
      const data = await parseResponse(response);
      return toUiComplaint(data.complaint);
    } catch (error) {
      return fallbackIfServerError(error, createLocalComplaintFromPayload(normalizedPayload));
    }
  }

  const formData = new FormData();
  Object.entries(normalizedPayload).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });

  const response = await apiFetch(`${API_BASE_URL}/complaints`, {
    method: "POST",
    headers: buildAuthHeaders(),
    body: formData
  });

  try {
    const data = await parseResponse(response);
    return toUiComplaint(data.complaint);
  } catch (error) {
    return fallbackIfServerError(error, createLocalComplaintFromPayload(normalizedPayload));
  }
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
  try {
    const data = await parseResponse(response);
    return (data.complaints || []).map(toUiComplaint);
  } catch (error) {
    return fallbackIfServerError(
      error,
      loadLocalComplaints()
        .filter((complaint) => complaintMatchesGrievanceType(complaint, grievanceType))
        .filter((complaint) => complaintMatchesRadius(complaint, Number(lat), Number(lng), Number(radius)))
    );
  }
}

export async function fetchMyComplaints() {
  const response = await apiFetch(`${API_BASE_URL}/complaints/mine`, {
    headers: buildAuthHeaders()
  });
  try {
    const data = await parseResponse(response);
    return (data.complaints || []).map(toUiComplaint);
  } catch (error) {
    const currentUser = loadStoredUser();
    return fallbackIfServerError(
      error,
      loadLocalComplaints().filter((complaint) => {
        if (!currentUser?.id) {
          return true;
        }

        return complaint.createdById === currentUser.id || complaint.citizenEmail === currentUser.email || complaint.citizenPhone === currentUser.phone;
      })
    );
  }
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
  try {
    const data = await parseResponse(response);
    return (data.complaints || []).map(toUiComplaint);
  } catch (error) {
    return fallbackIfServerError(
      error,
      loadLocalComplaints()
        .filter((complaint) => !status || normalizeGrievanceType(complaint.status) === normalizeGrievanceType(status) || String(complaint.status || "").toLowerCase() === String(status || "").toLowerCase())
        .filter((complaint) => ["Pending", "In Progress", "Resolved"].includes(complaint.status))
    );
  }
}

export async function startOfficerComplaint(complaintId) {
  const response = await apiFetch(`${API_BASE_URL}/officer/complaints/${complaintId}/start`, {
    method: "POST",
    headers: buildAuthHeaders()
  });
  try {
    const data = await parseResponse(response);
    return toUiComplaint(data.complaint);
  } catch (error) {
    return fallbackIfServerError(error, updateLocalComplaint(complaintId, (complaint) => ({
      ...complaint,
      status: "In Progress",
      timeline: [...(complaint.timeline || []), { label: "Officer Started Work", date: new Date().toISOString().slice(0, 10) }]
    })));
  }
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

  try {
    const data = await parseResponse(response);
    return toUiComplaint(data.complaint);
  } catch (error) {
    return fallbackIfServerError(error, updateLocalComplaint(complaintId, (complaint) => ({
      ...complaint,
      status: "Resolved",
      verificationStatus: "Verified",
      verification: { ...(complaint.verification || {}), photoUploaded: true, gpsMatch: true },
      timeline: [...(complaint.timeline || []), { label: "Officer Evidence Submitted", date: new Date().toISOString().slice(0, 10) }]
    })));
  }
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
  try {
    const data = await parseResponse(response);
    return (data.complaints || []).map(toUiComplaint);
  } catch (error) {
    return fallbackIfServerError(error, loadLocalComplaints());
  }
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
  try {
    return await parseResponse(response);
  } catch (error) {
    return fallbackIfServerError(error, {
      total: loadLocalComplaints().length,
      verified: loadLocalComplaints().filter((item) => item.status === "Verified").length,
      failed: loadLocalComplaints().filter((item) => item.status === "Failed").length,
      reopened: loadLocalComplaints().filter((item) => item.status === "Reopened").length,
      complaints: loadLocalComplaints()
    });
  }
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

  try {
    const data = await parseResponse(response);
    return toUiComplaint(data.complaint);
  } catch (error) {
    return fallbackIfServerError(error, updateLocalComplaint(complaintId, (complaint) => ({
      ...complaint,
      status: verificationStatus === "FAILED" ? "Failed" : verificationStatus === "REOPENED" ? "Reopened" : "Verified",
      verificationStatus: verificationStatus === "FAILED" ? "Failed" : verificationStatus === "REOPENED" ? "Reopened" : "Verified",
      timeline: [...(complaint.timeline || []), { label: `Admin Decision: ${verificationStatus || "Verified"}`, date: new Date().toISOString().slice(0, 10) }]
    })));
  }
}

