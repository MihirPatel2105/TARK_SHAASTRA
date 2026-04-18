const USER_KEY = "vgs_user";
const TOKEN_KEY = "vgs_token";

const demoUsers = [
  {
    role: "Citizen",
    name: "Citizen Demo Account",
    email: "citizen.demo@vgs.gov.in",
    phone: "9876543210",
    password: "Citizen@123"
  },
  {
    role: "Officer",
    name: "Officer Demo Account",
    email: "officer.demo@vgs.gov.in",
    phone: "9988776655",
    password: "Officer@123"
  },
  {
    role: "Admin",
    name: "Admin Demo Account",
    email: "admin.demo@vgs.gov.in",
    phone: "9123456780",
    password: "Admin@123"
  }
];

const roleRoutes = {
  Citizen: "/citizen/dashboard",
  Officer: "/officer/dashboard",
  Admin: "/admin/dashboard"
};

function safeParse(value, fallback) {
  try {
    return JSON.parse(value) ?? fallback;
  } catch {
    return fallback;
  }
}

export function normalizeRole(role) {
  const value = String(role || "").trim().toLowerCase();
  if (value === "officer") return "Officer";
  if (value === "admin") return "Admin";
  return "Citizen";
}

export function getHomePath(role) {
  return roleRoutes[normalizeRole(role)] || roleRoutes.Citizen;
}

export function loadStoredUser() {
  return safeParse(localStorage.getItem(USER_KEY), null);
}

export function saveStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem(USER_KEY);
}

export function loadAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveAuthToken(token) {
  if (!token) {
    return;
  }

  localStorage.setItem(TOKEN_KEY, String(token));
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function saveSession({ user, token }) {
  if (user) {
    saveStoredUser({ ...user, role: normalizeRole(user.role) });
  }

  if (token) {
    saveAuthToken(token);
  }
}

export function clearSession() {
  clearStoredUser();
  clearAuthToken();
}

export function authenticateDemoUser(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const matched = demoUsers.find(
    (item) => item.email.toLowerCase() === normalizedEmail && item.password === password
  );

  if (!matched) {
    return null;
  }

  return {
    id: `demo-${normalizeRole(matched.role).toLowerCase()}`,
    name: matched.name,
    email: matched.email,
    role: matched.role,
    phone: matched.phone
  };
}
