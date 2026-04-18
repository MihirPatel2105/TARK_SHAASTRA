import { useContext } from "react";
import { Outlet } from "react-router-dom";
import { AppContext } from "../../App";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";

function RoleLayout() {
  const { user } = useContext(AppContext);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.09),_transparent_36%),linear-gradient(180deg,#f8fafc_0%,#eef4fb_100%)] text-slate-900">
      <Navbar />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8">
        <Sidebar role={user?.role} />
        <main className="min-w-0 flex-1 rounded-[2rem] border border-slate-200 bg-white/85 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default RoleLayout;
