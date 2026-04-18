import { AlertTriangle } from "lucide-react";

function NotificationBanner({ message }) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
      <p className="leading-6">{message}</p>
    </div>
  );
}

export default NotificationBanner;
