import { LogOut, PhoneCall, PlusCircle, ShieldCheck, UserCircle2 } from "lucide-react";
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
    <header className="sticky top-0 z-30 border-b border-slate-300 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <button type="button" onClick={() => navigate(homePath)} className="flex items-center gap-4 text-left">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue-900 bg-gradient-to-br from-orange-400 to-green-600 text-white">
            <ShieldCheck size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Verified Grievance System</h1>
          </div>
        </button>

        <div className="flex items-center gap-3">
          {user?.role === "Citizen" ? (
            <div className="hidden border-r border-slate-300 pr-4 sm:flex sm:items-center sm:gap-3">
              <Link
                to="/citizen/new-complaint"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                title="Create a new complaint"
              >
                <PlusCircle size={16} />
                New Complaint
              </Link>
              <Link
                to="/citizen/ivr"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                title="Use IVR Call system"
              >
                <PhoneCall size={16} />
                IVR Call
              </Link>
            </div>
          ) : null}

          <Link
            to={profilePath}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            title="Open profile"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700">
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
