import { ArrowRight } from "lucide-react";

function DashboardCard({ title, description, icon: Icon, colorClass, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full rounded-3xl border border-blue-200 bg-white p-6 text-left shadow-sm transition hover:border-blue-300 hover:bg-blue-50/40"
    >
      <div className="flex items-center justify-between">
        <div className={`rounded-2xl border border-blue-200 p-3.5 ${colorClass}`}>
          <Icon size={22} className="text-white" />
        </div>
        <ArrowRight className="text-blue-400 transition group-hover:translate-x-1" />
      </div>

      <h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </button>
  );
}

export default DashboardCard;
