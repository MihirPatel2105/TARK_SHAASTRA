import { useContext } from "react";
import { Outlet } from "react-router-dom";
import { AppContext } from "../../App";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";

function RoleLayout() {
  const { user } = useContext(AppContext);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-900">
      <Navbar />
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 lg:px-8">
        <Sidebar role={user?.role} />
        <main className="min-w-0 flex-1 rounded-2xl border border-slate-300 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default RoleLayout;
