import { FileCheck2, ListChecks, MapPinned, PlusCircle, LayoutDashboard, ShieldCheck, ClipboardList, BarChart3, UploadCloud, UserCog, UserCircle2 } from "lucide-react";
import { NavLink } from "react-router-dom";

const linksByRole = {
  Citizen: [
    { to: "/citizen/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/citizen/profile", label: "Profile", icon: UserCircle2 },
    { to: "/citizen/map", label: "View Complaints on Map", icon: MapPinned },
    { to: "/citizen/new-complaint", label: "New Complaint", icon: PlusCircle },
    { to: "/citizen/track", label: "Track Complaint", icon: ListChecks },
    { to: "/citizen/resolved", label: "Resolved Complaints", icon: FileCheck2 }
  ],
  Officer: [
    { to: "/officer/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/officer/profile", label: "Profile", icon: UserCircle2 },
    { to: "/officer/assigned", label: "Assigned Complaints", icon: ClipboardList },
    { to: "/officer/proof", label: "Upload Proof", icon: UploadCloud },
    { to: "/officer/verifications", label: "Pending Verifications", icon: ShieldCheck }
  ],
  Admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/profile", label: "Profile", icon: UserCircle2 },
    { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/admin/complaints", label: "Complaint Table", icon: UserCog }
  ]
};

function Sidebar({ role = "Citizen" }) {
  const links = linksByRole[role] || linksByRole.Citizen;

  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-white md:w-80 md:border-b-0 md:border-r">
      <div className="border-b border-slate-200 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{role} Workspace</p>
        <p className="mt-1 text-sm text-slate-600">Clean government workflow, role specific tools, single source of truth.</p>
      </div>
      <nav className="grid gap-2 p-4">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  isActive ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-700 hover:bg-slate-100"
                }`
              }
            >
              <Icon size={18} />
              {link.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
