import { LogOut, UserCircle2 } from "lucide-react";
import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../App";
import { getHomePath } from "../services/authStore";

const profileRoutes = {
  Citizen: "/citizen/profile",
  Officer: "/officer/profile",
  Admin: "/admin/profile"
};

function Navbar() {
  const { user, logout } = useContext(AppContext);
  const navigate = useNavigate();
  const homePath = getHomePath(user?.role);
  const profilePath = profileRoutes[user?.role] || "/login";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <button type="button" onClick={() => navigate(homePath)} className="text-left">
          <span className="block text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Verified Grievance System</span>
          <span className="brand-gradient block text-2xl font-bold leading-tight sm:text-3xl">Agentic Civic OS</span>
        </button>

        <div className="flex items-center gap-3">
          <Link
            to={profilePath}
            className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            title="Open profile"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-blue-700 shadow-sm ring-1 ring-blue-100">
              <UserCircle2 size={16} />
            </span>
            {user?.role || "Citizen"}
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
