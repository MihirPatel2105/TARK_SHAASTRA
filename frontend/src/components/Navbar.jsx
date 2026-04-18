import { LogOut } from "lucide-react";
import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../App";
import { getHomePath } from "../services/authStore";

function Navbar() {
  const { user, logout } = useContext(AppContext);
  const navigate = useNavigate();
  const homePath = getHomePath(user?.role);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <button type="button" onClick={() => navigate(homePath)} className="text-left">
          <span className="block text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Verified Grievance System</span>
          <span className="brand-gradient block text-2xl font-bold leading-tight sm:text-3xl">Agentic Civic OS</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 sm:block">
            {user?.name || "Guest"}
          </div>
          <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">{user?.role || "Citizen"}</div>
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
