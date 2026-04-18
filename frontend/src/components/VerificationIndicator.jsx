import { CheckCircle2, CircleX } from "lucide-react";

const Flag = ({ label, ok }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <div className={`mt-2 flex items-center gap-1.5 text-sm font-semibold ${ok ? "text-emerald-700" : "text-rose-700"}`}>
      {ok ? <CheckCircle2 size={16} /> : <CircleX size={16} />}
      {ok ? "Yes" : "No"}
    </div>
  </div>
);

function VerificationIndicator({ verification }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Flag label="GPS Match" ok={Boolean(verification?.gpsMatch)} />
      <Flag label="Photo Uploaded" ok={Boolean(verification?.photoUploaded)} />
    </div>
  );
}

export default VerificationIndicator;
