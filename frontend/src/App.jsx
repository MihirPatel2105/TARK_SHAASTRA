import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RoleLayout from "./components/layout/RoleLayout";
import { clearSession, getHomePath, loadStoredUser, normalizeRole, saveSession } from "./services/authStore";
import { fetchAdminComplaints, fetchMyComplaints, fetchNearbyComplaints, fetchOfficerComplaints } from "./services/backendApi";
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
import OfficerNeedsLocationPage from "./pages/officer/OfficerNeedsLocationPage";
import OfficerProofUploadPage from "./pages/officer/OfficerProofUploadPage";
import OfficerPendingVerificationsPage from "./pages/officer/OfficerPendingVerificationsPage";
import OfficerProfilePage from "./pages/officer/ProfilePage";
import AdminDashboardPage from "./dashboards/Admin/AdminDashboard";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminComplaintsPage from "./pages/admin/AdminComplaintsPage";
import AdminProfilePage from "./pages/admin/ProfilePage";

export const AppContext = createContext(null);

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
  const [user, setUser] = useState(() => loadStoredUser());
  const [complaints, setComplaints] = useState([]);
  const [isRefreshingComplaints, setIsRefreshingComplaints] = useState(false);

  const persistComplaints = useCallback((nextComplaintsOrUpdater) => {
    setComplaints((previous) => {
      return typeof nextComplaintsOrUpdater === "function" ? nextComplaintsOrUpdater(previous) : nextComplaintsOrUpdater;
    });
  }, []);

  const refreshComplaints = useCallback(async () => {
    if (!user) {
      setComplaints([]);
      return;
    }

    setIsRefreshingComplaints(true);

    try {
      const role = normalizeRole(user.role);

      if (role === "Citizen") {
        const rows = await fetchMyComplaints();
        setComplaints(rows);
        return;
      }

      if (role === "Officer") {
        const rows = await fetchOfficerComplaints();
        setComplaints(rows);
        return;
      }

      if (role === "Admin") {
        const rows = await fetchAdminComplaints();
        setComplaints(rows);
        return;
      }

      setComplaints([]);
    } catch (error) {
      console.error("Failed to refresh complaints:", error);
    } finally {
      setIsRefreshingComplaints(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setComplaints([]);
      return undefined;
    }

    refreshComplaints();
    const timerId = window.setInterval(refreshComplaints, 10000);
    return () => window.clearInterval(timerId);
  }, [user, refreshComplaints]);

  const login = (nextUser, token) => {
    const userRecord = { ...nextUser, role: normalizeRole(nextUser.role) };
    saveSession({ user: userRecord, token });
    setUser(userRecord);
  };

  const logout = () => {
    clearSession();
    setUser(null);
  };

  const syncNearbyComplaints = useCallback(async ({ lat, lng, radius = 2000, grievanceType } = {}) => {
    const apiComplaints = await fetchNearbyComplaints({ lat, lng, radius, grievanceType });
    if (apiComplaints.length) {
      persistComplaints(apiComplaints);
    }
    return apiComplaints;
  }, [persistComplaints]);

  const value = useMemo(
    () => ({ user, complaints, login, logout, syncNearbyComplaints, refreshComplaints, isRefreshingComplaints }),
    [user, complaints, syncNearbyComplaints, refreshComplaints, isRefreshingComplaints]
  );

  return (
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
          <Route path="map" element={<MapPage workspaceLabel="Officer Workspace" />} />
          <Route path="assigned" element={<OfficerAssignedComplaintsPage />} />
          <Route path="needs-location" element={<OfficerNeedsLocationPage />} />
          <Route path="proof" element={<OfficerProofUploadPage />} />
          <Route path="verifications" element={<OfficerPendingVerificationsPage />} />
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
          <Route path="map" element={<MapPage workspaceLabel="Admin Workspace" />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="complaints" element={<AdminComplaintsPage />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? getHomePath(user.role) : "/login"} replace />} />
      </Routes>
    </AppContext.Provider>
  );
}

export default App;
