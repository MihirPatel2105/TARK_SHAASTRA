import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RoleLayout from "./components/layout/RoleLayout";
import { LanguageProvider } from "./context/LanguageContext";
import { clearSession, getHomePath, loadAuthToken, loadStoredUser, normalizeRole, saveSession } from "./services/authStore";
import { fetchAdminComplaints, fetchMyComplaints, fetchNearbyComplaints, fetchOfficerComplaints } from "./services/backendApi";
import { departmentOptions, mockComplaints } from "./services/mockData";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import CitizenDashboardPage from "./dashboards/Citizen/CitizenDashboard";
import MapPage from "./pages/citizen/MapPage";
import ProfilePage from "./pages/citizen/ProfilePage";
import NewComplaintPage from "./pages/citizen/NewComplaintPage";
import TrackComplaintPage from "./pages/citizen/TrackComplaintPage";
import ResolvedComplaintsPage from "./pages/citizen/ResolvedComplaintsPage";
import ComplaintDetailsPage from "./pages/citizen/ComplaintDetailsPage";
import OfficerDashboardPage from "./dashboards/Officer/OfficerDashboard";
import OfficerAssignedComplaintsPage from "./pages/officer/OfficerAssignedComplaintsPage";
import OfficerIvrComplaintsPage from "./pages/officer/OfficerIvrComplaintsPage";
import OfficerProofUploadPage from "./pages/officer/OfficerProofUploadPage";
import OfficerPendingVerificationsPage from "./pages/officer/OfficerPendingVerificationsPage";
import OfficerResolvedComplaintsPage from "./pages/officer/OfficerResolvedComplaintsPage";
import OfficerProfilePage from "./pages/officer/ProfilePage";
import AdminDashboardPage from "./dashboards/Admin/AdminDashboard";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminComplaintsPage from "./pages/admin/AdminComplaintsPage";
import AdminProfilePage from "./pages/admin/ProfilePage";

export const AppContext = createContext(null);

const COMPLAINTS_KEY = "vgs_complaints";

const loadLocal = (key, fallback) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};

const ProtectedRoute = ({ user, allowedRoles, children }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(normalizeRole(user.role))) {
    return <Navigate to={getHomePath(user.role)} replace />;
  }

  return children;
};

function App() {
  const [user, setUser] = useState(() => {
    const storedUser = loadStoredUser();
    const token = loadAuthToken();

    if (storedUser && token && typeof token === 'string' && token.includes('.')) {
      const parts = token.split('.');
      if (parts.length === 3 && parts.every(p => p.length > 0)) {
        return storedUser;
      }
    }
    clearSession();
    return null;
  });
  const [complaints, setComplaints] = useState(() => {
    const storedComplaints = loadLocal(COMPLAINTS_KEY, null);
    if (Array.isArray(storedComplaints) && storedComplaints.length > 0) {
      return storedComplaints;
    }

    // Seed static records once so dashboards and tables are not empty on first run.
    const seededComplaints = mockComplaints.map((item) => ({
      ...item,
      location: item.location ? { ...item.location } : undefined,
      verification: item.verification ? { ...item.verification } : undefined,
      timeline: Array.isArray(item.timeline) ? item.timeline.map((entry) => ({ ...entry })) : []
    }));
    localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(seededComplaints));
    return seededComplaints;
  });

  const persistComplaints = useCallback((nextComplaintsOrUpdater) => {
    setComplaints((previous) => {
      const nextComplaints =
        typeof nextComplaintsOrUpdater === "function" ? nextComplaintsOrUpdater(previous) : nextComplaintsOrUpdater;
      localStorage.setItem(COMPLAINTS_KEY, JSON.stringify(nextComplaints));
      return nextComplaints;
    });
  }, []);

  const refreshComplaints = useCallback(async () => {
    const role = normalizeRole(user?.role);

    let nextComplaints = [];
    if (role === "Admin") {
      nextComplaints = await fetchAdminComplaints();
    } else if (role === "Officer") {
      nextComplaints = await fetchOfficerComplaints();
    } else if (role === "Citizen") {
      nextComplaints = await fetchMyComplaints();
    }

    if (Array.isArray(nextComplaints)) {
      persistComplaints(nextComplaints);
      return nextComplaints;
    }

    return [];
  }, [persistComplaints, user?.role]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const token = loadAuthToken();
    // Only refresh if we have both a user AND a valid token
    if (!token || typeof token !== 'string' || !token.includes('.')) {
      return;
    }

    refreshComplaints().catch(() => {
      // Backend helpers already fall back to local data when unavailable.
    });
  }, [refreshComplaints, user]);

  const login = (nextUser, token) => {
    const userRecord = { ...nextUser, role: normalizeRole(nextUser.role) };
    saveSession({ user: userRecord, token });
    setUser(userRecord);
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  const addComplaint = (complaint) => {
    persistComplaints((previous) => [complaint, ...previous]);
  };

  const updateComplaint = (complaintId, patch) => {
    persistComplaints((previous) =>
      previous.map((complaint) =>
        complaint.id === complaintId
          ? { ...complaint, ...patch, verification: { ...complaint.verification, ...(patch.verification || {}) } }
          : complaint
      )
    );
  };

  const syncNearbyComplaints = useCallback(async ({ lat, lng, radius = 2000, grievanceType } = {}) => {
    const apiComplaints = await fetchNearbyComplaints({ lat, lng, radius, grievanceType });
    if (apiComplaints.length) {
      persistComplaints(apiComplaints);
    }
    return apiComplaints;
  }, [persistComplaints]);

  const value = useMemo(
    () => ({
      user,
      complaints,
      login,
      logout,
      addComplaint,
      updateComplaint,
      syncNearbyComplaints,
      refreshComplaints,
      departmentOptions
    }),
    [user, complaints, syncNearbyComplaints, refreshComplaints]
  );

  return (
    <LanguageProvider>
      <AppContext.Provider value={value}>
        <Routes>
        <Route path="/" element={<Navigate to={user ? getHomePath(user.role) : "/login"} replace />} />
        <Route path="/login" element={user ? <Navigate to={getHomePath(user.role)} replace /> : <LoginPage />} />
        <Route path="/signup" element={user ? <Navigate to={getHomePath(user.role)} replace /> : <SignupPage />} />

        <Route
          path="/citizen"
          element={
            <ProtectedRoute user={user} allowedRoles={["Citizen"]}>
              <RoleLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<CitizenDashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="new-complaint" element={<NewComplaintPage />} />
          <Route path="track" element={<TrackComplaintPage />} />
          <Route path="track/:complaintId" element={<ComplaintDetailsPage />} />
          <Route path="resolved" element={<ResolvedComplaintsPage />} />
        </Route>

        <Route
          path="/officer"
          element={
            <ProtectedRoute user={user} allowedRoles={["Officer"]}>
              <RoleLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<OfficerDashboardPage />} />
          <Route path="profile" element={<OfficerProfilePage />} />
          <Route path="assigned" element={<OfficerAssignedComplaintsPage />} />
          <Route path="ivr-complaints" element={<OfficerIvrComplaintsPage />} />
          <Route path="proof" element={<OfficerProofUploadPage />} />
          <Route path="verifications" element={<OfficerPendingVerificationsPage />} />
          <Route path="resolved" element={<OfficerResolvedComplaintsPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <ProtectedRoute user={user} allowedRoles={["Admin"]}>
              <RoleLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="profile" element={<AdminProfilePage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="complaints" element={<AdminComplaintsPage />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? getHomePath(user.role) : "/login"} replace />} />
      </Routes>
      </AppContext.Provider>
    </LanguageProvider>
  );
}

export default App;
