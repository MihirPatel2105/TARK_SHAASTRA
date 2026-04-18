import { demoCredentials } from "./demoCredentials";

const USER_KEY = "vgs_user";
const REGISTERED_USERS_KEY = "vgs_registered_users";

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

export function loadRegisteredUsers() {
  return safeParse(localStorage.getItem(REGISTERED_USERS_KEY), []);
}

export function saveRegisteredUsers(users) {
  localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(users));
}

export function registerUser(user) {
  const nextUser = {
    name: user.name.trim(),
    email: user.email.trim().toLowerCase(),
    phone: user.phone.trim(),
    password: user.password,
    role: normalizeRole(user.role)
  };

  const users = loadRegisteredUsers().filter((item) => item.email !== nextUser.email);
  users.push(nextUser);
  saveRegisteredUsers(users);
  return nextUser;
}

export function authenticateUser(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const localUser = loadRegisteredUsers().find(
    (item) => item.email === normalizedEmail && item.password === password
  );
  if (localUser) {
    return {
      name: localUser.name,
      email: localUser.email,
      phone: localUser.phone,
      role: localUser.role
    };
  }

  const matchedDemo = Object.values(demoCredentials).find(
    (item) => item.email.toLowerCase() === normalizedEmail && item.password === password
  );
  if (!matchedDemo) {
    return null;
  }

  return {
    name: matchedDemo.name,
    email: matchedDemo.email,
    phone: matchedDemo.phone,
    role: matchedDemo.role
  };
}
