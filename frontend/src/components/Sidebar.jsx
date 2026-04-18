import { FileCheck2, ListChecks, MapPinned, PlusCircle, LayoutDashboard, ShieldCheck, ClipboardList, BarChart3, UploadCloud, UserCog, UserCircle2 } from "lucide-react";
import { NavLink } from "react-router-dom";

const linksByRole = {
  Citizen: [
    { to: "/citizen/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/citizen/map", label: "View Complaints on Map", icon: MapPinned },
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
    <aside className="w-full rounded-lg border border-blue-200 bg-white shadow-sm">
      <div className="border-b border-blue-200 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">{role} Workspace</p>
      </div>
      <nav className="flex gap-2 overflow-x-auto p-3">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `inline-flex min-w-max items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  isActive ? "bg-blue-800 text-white" : "border border-blue-200 text-slate-700 hover:bg-blue-50"
                }`
              }
            >
              <Icon size={16} />
              {link.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
