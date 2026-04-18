import { PhoneCall, MonitorPlay } from "lucide-react";

function IVRPage() {
  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card lg:p-12">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <PhoneCall size={36} />
        </div>
        <h2 className="mt-6 text-3xl font-bold text-slate-900">IVR Complaint System</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Call our toll-free number to register a grievance effortlessly.
        </p>

        <div className="mt-10 inline-flex items-center gap-4 rounded-full border-2 border-emerald-300 bg-emerald-50 px-8 py-4">
          <PhoneCall className="text-emerald-700" size={28} />
          <span className="text-3xl font-bold tracking-wider text-emerald-800">1800-11-2233</span>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl gap-6 text-left sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <MonitorPlay className="mb-4 text-blue-600" size={24} />
            <h3 className="font-semibold text-slate-900">Multilingual Interface</h3>
            <p className="mt-2 text-sm text-slate-600">
              Our automated system speaks Hindi, English, and regional languages to assist you without barriers.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <ShieldCheck className="mb-4 text-emerald-600" size={24} />
            <h3 className="font-semibold text-slate-900">Voice Analytics</h3>
            <p className="mt-2 text-sm text-slate-600">
              Your voice issue gets automatically translated, parsed, and assigned to the right department.
            </p>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-8 text-sm text-slate-500">
          Note: IVR call functionality will be integrated with the backend shortly.
        </div>
      </div>
    </div>
  );
}

// Temporary import fallback for the icon not imported above
import { ShieldCheck } from "lucide-react";

export default IVRPage;
