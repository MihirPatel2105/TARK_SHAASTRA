import { LogOut, UserCircle2 } from "lucide-react";
import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../App";
import { useTranslation } from "../hooks/useTranslation";
import { getHomePath } from "../services/authStore";

const profileRoutes = {
  Citizen: "/citizen/profile",
  Officer: "/officer/profile",
  Admin: "/admin/profile"
};

function Navbar() {
  const { user, logout } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const homePath = getHomePath(user?.role);
  const profilePath = profileRoutes[user?.role] || "/login";

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <button type="button" onClick={() => navigate(homePath)} className="text-left">
          <span className="block text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Verified Grievance System</span>
          <span className="block text-xl font-bold leading-tight text-slate-900 sm:text-2xl">Dashboard</span>
        </button>

        <div className="flex items-center gap-3">
          <Link
            to={profilePath}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            title="Open profile"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <UserCircle2 size={16} />
            </span>
            {user?.role || "Citizen"}
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <LogOut size={16} />
            {t("Logout")}
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
