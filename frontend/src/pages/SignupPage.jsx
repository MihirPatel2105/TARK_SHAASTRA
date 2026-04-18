import { UserPlus2 } from "lucide-react";
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../App";
import { getHomePath } from "../services/authStore";
import { signupCitizen } from "../services/backendApi";

const initialForm = { name: "", email: "", phone: "", password: "" };

function SignupPage() {
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
    if (!form.name || !form.email || !form.phone || !form.password) {
      setError("Complete every field before continuing.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const session = await signupCitizen({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password
      });

      login(session.user, session.token);
      navigate(getHomePath(session.user?.role));
    } catch (submitError) {
      setError(submitError.message || "Unable to create account right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleCards = [
    { role: "Citizen", title: "Citizen", description: "File complaints and track your grievance lifecycle.", icon: UserPlus2 }
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#eef5f1_100%)] px-4 py-8 sm:px-8">
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.12)] lg:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-gradient-to-br from-emerald-700 via-slate-900 to-blue-700 p-8 text-white sm:p-10">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">Create a citizen account</p>
          <h1 className="mt-8 text-5xl font-bold leading-tight">Join the Verified Grievance System</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-emerald-50">
            Citizen accounts are created here directly using the backend signup API and can submit new grievances immediately after login.
          </p>

          <div className="mt-8 grid gap-4">
            {roleCards.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.role} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-white/15 p-2.5">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-sm text-emerald-50/90">{item.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-8 sm:p-10">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-slate-900">Create Account</h2>
            <p className="mt-2 text-slate-500">Clean signup with explicit role selection.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <input
              name="name"
              type="text"
              placeholder="Full name"
              value={form.name}
              onChange={onChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400"
            />
            <input
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={onChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400"
            />
            <input
              name="phone"
              type="tel"
              inputMode="numeric"
              placeholder="Mobile number"
              value={form.phone}
              onChange={onChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={onChange}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400"
            />

            {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-emerald-700 px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800"
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-5 text-sm text-slate-600">
            Already registered? <Link to="/login" className="font-semibold text-emerald-700">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
