import { Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../App";
import { useTranslation } from "../hooks/useTranslation";
import { getHomePath } from "../services/authStore";
import { loginUser, requestPasswordResetOtp, resetPasswordWithOtp } from "../services/backendApi";

const initialForm = { email: "", password: "" };
const initialResetForm = { email: "", otp: "", password: "", confirmPassword: "" };

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useContext(AppContext);
  const { t } = useTranslation();
  const [form, setForm] = useState(initialForm);
  const [resetForm, setResetForm] = useState(initialResetForm);
  const [error, setError] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [resetStep, setResetStep] = useState("request");
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);

  const onChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    setError("");
  };

  const onResetChange = (event) => {
    setResetForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    setResetError("");
    setResetMessage("");
  };

  const openForgotPassword = () => {
    setResetForm((prev) => ({ ...initialResetForm, email: form.email.trim() || prev.email }));
    setResetStep("request");
    setResetError("");
    setResetMessage("");
    setIsForgotOpen(true);
  };

  const closeForgotPassword = () => {
    setIsForgotOpen(false);
    setResetStep("request");
    setResetError("");
    setResetMessage("");
    setResetForm(initialResetForm);
  };

  const onRequestOtp = async (event) => {
    event?.preventDefault?.();

    if (!resetForm.email) {
      setResetError("Enter your email address.");
      return;
    }

    setIsResetSubmitting(true);

    try {
      const response = await requestPasswordResetOtp({ email: resetForm.email.trim().toLowerCase() });
      setResetMessage(response.message || "OTP sent to your email.");
      setResetStep("reset");
    } catch (submitError) {
      const isBackendUnavailable = String(submitError?.message || "").includes("Unable to reach backend");

      if (isBackendUnavailable) {
        setResetError("Backend is offline. Start backend and MongoDB, then try again.");
      } else {
        setResetError(submitError.message || "Unable to send OTP. Please try again.");
      }
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const onResetPassword = async (event) => {
    event.preventDefault();

    if (!resetForm.email || !resetForm.otp || !resetForm.password || !resetForm.confirmPassword) {
      setResetError("Enter email, OTP, new password, and confirm password.");
      return;
    }

    if (resetForm.password !== resetForm.confirmPassword) {
      setResetError("Password and confirm password must match.");
      return;
    }

    setIsResetSubmitting(true);

    try {
      const response = await resetPasswordWithOtp({
        email: resetForm.email.trim().toLowerCase(),
        otp: resetForm.otp.trim(),
        password: resetForm.password,
        confirmPassword: resetForm.confirmPassword
      });

      setResetMessage(response.message || "Password updated successfully.");
      closeForgotPassword();
    } catch (submitError) {
      const isBackendUnavailable = String(submitError?.message || "").includes("Unable to reach backend");

      if (isBackendUnavailable) {
        setResetError("Backend is offline. Start backend and MongoDB, then try again.");
      } else {
        setResetError(submitError.message || "Unable to reset password. Please try again.");
      }
    } finally {
      setIsResetSubmitting(false);
    }
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
          {/* Login Card */}
          <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
            {/* Card Header */}
            <div className="border-b border-slate-200 bg-gradient-to-r from-blue-900 to-blue-800 px-6 py-6 sm:px-8">
              <h2 className="text-2xl font-bold text-white">Sign In</h2>
              <p className="mt-1 text-sm text-blue-100">Enter your credentials to access the portal</p>
            </div>

            {/* Card Body */}
            <div className="p-6 sm:p-8">
              <form onSubmit={onSubmit} className="space-y-5">
                {/* Email Field */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    Email Address <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                    <UserRound size={18} className="text-slate-500" />
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

                {/* Password Field */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-900">
                    Password <span className="text-red-600">*</span>
                  </label>
                  <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200">
                    <Lock size={18} className="text-slate-500" />
                    <input
                      name="password"
                      type={isPasswordVisible ? "text" : "password"}
                      value={form.password}
                      onChange={onChange}
                      placeholder="••••••••"
                      className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setIsPasswordVisible((prev) => !prev)}
                      className="rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                    >
                      {isPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password Link */}
                <div className="text-right">
                  <button
                    type="button"
                    onClick={openForgotPassword}
                    className="text-sm font-semibold text-blue-700 transition hover:text-blue-900 hover:underline"
                  >
                    Forgot your password?
                  </button>
                </div>

                {/* Error Message */}
                {error ? (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <strong>Error:</strong> {error}
                  </div>
                ) : null}

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-gradient-to-r from-blue-900 to-blue-800 px-4 py-3.5 text-base font-semibold text-white transition hover:from-blue-950 hover:to-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </button>

                {/* Sign Up Link */}
                <div className="border-t border-slate-200 pt-4 text-center text-sm">
                  <p className="text-slate-700">
                    New to the portal?{" "}
                    <Link to="/signup" className="font-semibold text-blue-700 transition hover:text-blue-900 hover:underline">
                      Create an account
                    </Link>
                  </p>
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>

      {isForgotOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.75rem] bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.35)] sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                  <KeyRound size={14} />
                  Reset Password
                </div>
                <h3 className="mt-3 text-2xl font-bold text-slate-900">{resetStep === "request" ? "Send OTP to email" : "Enter OTP and set new password"}</h3>
                <p className="mt-1 text-sm text-slate-500">We will email a one-time code to verify your account before changing the password.</p>
              </div>
              <button
                type="button"
                onClick={closeForgotPassword}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close reset password dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={resetStep === "request" ? onRequestOtp : onResetPassword} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3">
                  <Mail size={18} className="text-slate-400" />
                  <input
                    name="email"
                    type="email"
                    value={resetForm.email}
                    onChange={onResetChange}
                    placeholder="name@domain.com"
                    className="w-full bg-transparent text-slate-900 outline-none placeholder:text-slate-400"
                  />
                </div>
              </label>

              {resetStep === "reset" ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">OTP</span>
                    <input
                      name="otp"
                      type="text"
                      value={resetForm.otp}
                      onChange={onResetChange}
                      placeholder="Enter OTP from email"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">New Password</span>
                    <input
                      name="password"
                      type="password"
                      value={resetForm.password}
                      onChange={onResetChange}
                      placeholder="Create a new password"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</span>
                    <input
                      name="confirmPassword"
                      type="password"
                      value={resetForm.confirmPassword}
                      onChange={onResetChange}
                      placeholder="Confirm the new password"
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </label>
                </>
              ) : null}

              {resetMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{resetMessage}</div> : null}
              {resetError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{resetError}</div> : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isResetSubmitting}
                  className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isResetSubmitting ? (resetStep === "request" ? "Sending OTP..." : "Updating Password...") : (resetStep === "request" ? "Send OTP" : "Reset Password")}
                </button>

                {resetStep === "reset" ? (
                  <button
                    type="button"
                    onClick={onRequestOtp}
                    className="rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Resend OTP
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default LoginPage;
