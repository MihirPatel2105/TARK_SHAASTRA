import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import RoleLayout from "./components/layout/RoleLayout";
import { clearSession, getHomePath, loadStoredUser, normalizeRole, saveSession } from "./services/authStore";
import { fetchAdminComplaints, fetchMyComplaints, fetchNearbyComplaints, fetchOfficerComplaints } from "./services/backendApi";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import CitizenDashboardPage from "./dashboards/Citizen/CitizenDashboard";
import MapPage from "./pages/citizen/MapPage";
import NewComplaintPage from "./pages/citizen/NewComplaintPage";
import CitizenProfilePage from "./pages/citizen/ProfilePage";
import TrackComplaintPage from "./pages/citizen/TrackComplaintPage";
import ResolvedComplaintsPage from "./pages/citizen/ResolvedComplaintsPage";
import ComplaintDetailsPage from "./pages/citizen/ComplaintDetailsPage";
import OfficerDashboardPage from "./dashboards/Officer/OfficerDashboard";
import OfficerAssignedComplaintsPage from "./pages/officer/OfficerAssignedComplaintsPage";
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

  const login = (nextUser, token) => {
    const userRecord = { ...nextUser, role: normalizeRole(nextUser.role) };
    saveSession({ user: userRecord, token });
    setUser(userRecord);
  };

  const logout = () => {
    clearSession();
    setUser(null);
    setComplaints([]);
  };

  const refreshComplaints = useCallback(async () => {
    if (!user) {
      setComplaints([]);
      return [];
    }

    const role = normalizeRole(user.role);
    let rows = [];

    if (role === "Citizen") {
      rows = await fetchMyComplaints();
    } else if (role === "Officer") {
      rows = await fetchOfficerComplaints();
    } else if (role === "Admin") {
      rows = await fetchAdminComplaints();
    }

    setComplaints(rows);
    return rows;
  }, [user]);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      try {
        const rows = await refreshComplaints();
        if (isCancelled) {
          return;
        }

        setComplaints(rows);
      } catch {
        if (!isCancelled) {
          setComplaints([]);
        }
      }
    };

    load();

    const timer = window.setInterval(() => {
      load();
    }, 10000);

    return () => {
      isCancelled = true;
      window.clearInterval(timer);
    };
  }, [refreshComplaints]);

  const addComplaint = (complaint) => {
    setComplaints((previous) => [complaint, ...previous.filter((item) => item.id !== complaint.id)]);
  };

  const updateComplaint = (complaintId, patch) => {
    setComplaints((previous) =>
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
      setComplaints((previous) => {
        const merged = new Map(previous.map((item) => [item.id, item]));
        apiComplaints.forEach((item) => merged.set(item.id, item));
        return Array.from(merged.values());
      });
    }
    return apiComplaints;
  }, []);

  const departmentOptions = useMemo(
    () => Array.from(new Set(complaints.map((item) => item.department).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [complaints]
  );

  const statusOptions = useMemo(
    () => Array.from(new Set(complaints.map((item) => item.status).filter(Boolean))),
    [complaints]
  );

  const value = useMemo(
    () => ({
      user,
      complaints,
      departmentOptions,
      statusOptions,
      login,
      logout,
      addComplaint,
      updateComplaint,
      refreshComplaints,
      syncNearbyComplaints
    }),
    [user, complaints, departmentOptions, statusOptions, refreshComplaints, syncNearbyComplaints]
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
          <Route path="profile" element={<CitizenProfilePage />} />
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
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="complaints" element={<AdminComplaintsPage />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? getHomePath(user.role) : "/login"} replace />} />
      </Routes>
    </AppContext.Provider>
  );
}

export default App;
