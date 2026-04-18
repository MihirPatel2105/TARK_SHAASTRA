import { Lock, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../App";
import { getHomePath } from "../services/authStore";
import { loginUser } from "../services/backendApi";

const initialForm = { email: "", password: "" };

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useContext(AppContext);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    setError("");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!form.email || !form.password) {
      setError("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await loginUser({
        email: form.email.trim().toLowerCase(),
        password: form.password
      });

      login(session.user, session.token);
      navigate(getHomePath(session.user?.role));
    } catch (submitError) {
      const isBackendUnavailable = String(submitError?.message || "").includes("Unable to reach backend");

      if (isBackendUnavailable) {
        setError("Backend is offline. Start backend and MongoDB, then try again.");
      } else {
        setError(submitError.message || "Unable to log in. Please verify your credentials.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_30%),linear-gradient(180deg,#f8fafc_0%,#edf4fb_100%)] px-4 py-8 sm:px-8">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.12)] lg:grid-cols-[1.15fr_0.95fr]">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-slate-900 to-cyan-700 p-8 text-white sm:p-10">
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold">
              <Sparkles size={14} />
              Multi-Role Government Portal
            </div>
            <h1 className="mt-8 max-w-xl text-5xl font-bold leading-tight">Verified Grievance System - Agentic Civic OS</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-sky-100">
              Login once and enter a role-specific workspace for citizens, officers, or administrators. Complaint closure is never final until verification passes.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {["Complaint", "Resolution", "Verification"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 backdrop-blur-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100/80">Workflow</p>
                  <p className="mt-2 text-lg font-semibold">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Log In</h2>
              <p className="text-sm text-slate-500">Email and password only</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3">
                <UserRound size={18} className="text-slate-400" />
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={onChange}
                  placeholder="name@domain.com"
                  className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3">
                <Lock size={18} className="text-slate-400" />
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={onChange}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-blue-700 px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:bg-blue-800"
            >
              {isSubmitting ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-600">
            New user? <Link to="/signup" className="font-semibold text-blue-700">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
