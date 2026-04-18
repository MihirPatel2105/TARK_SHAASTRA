import { Lock, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Government Header */}
      <div className="border-b border-slate-300 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue-900 bg-gradient-to-br from-orange-400 to-green-600">
                <ShieldCheck size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Verified Grievance System</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-[calc(100vh-100px)] items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl">
          {/* Signup Card */}
          <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
            {/* Card Header */}
            <div className="border-b border-slate-200 bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-6 sm:px-8">
              <h2 className="text-2xl font-bold text-white">Create Account</h2>
              <p className="mt-1 text-sm text-blue-100">Register as a citizen to file and track grievances</p>
            </div>

            {/* Card Body */}
            <div className="p-6 sm:p-8">
              <form onSubmit={onSubmit} className="space-y-5">
                {/* Name Field */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    Full Name <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                    <UserRound size={18} className="text-slate-500" />
                    <input
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={onChange}
                      placeholder="Enter your full name"
                      className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    Email Address <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                    <Mail size={18} className="text-slate-500" />
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={onChange}
                      placeholder="your.email@example.com"
                      className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                {/* Phone Field */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    Mobile Number <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                    <Phone size={18} className="text-slate-500" />
                    <input
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      value={form.phone}
                      onChange={onChange}
                      placeholder="Enter mobile number"
                      className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    Password <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                    <Lock size={18} className="text-slate-500" />
                    <input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={onChange}
                      placeholder="Create a password"
                      className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-500"
                      required
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error ? (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <strong>Error:</strong> {error}
                  </div>
                ) : null}

                {/* Create Account Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-gradient-to-r from-blue-900 to-blue-800 px-4 py-3.5 text-base font-semibold text-white transition hover:from-blue-950 hover:to-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </button>

                {/* Login Link */}
                <div className="border-t border-slate-200 pt-4 text-center text-sm">
                  <p className="text-slate-700">
                    Already registered?{" "}
                    <Link to="/login" className="font-semibold text-blue-700 transition hover:text-blue-900 hover:underline">
                      Sign In
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;
