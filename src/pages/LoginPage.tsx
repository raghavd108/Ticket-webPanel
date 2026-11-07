import { useState, type FormEvent } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";

import {
  Eye,
  EyeOff,
  LockKeyhole,
  UserRound,
  ArrowRight,
  ShieldCheck,
  Building2,
} from "lucide-react";

import axios from "axios";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const { theme } = useTheme();

  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/dashboard";

  const clearMessage = () => {
    setMessage("");
    setIsSuccess(false);
  };

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    if (!userName.trim() || !password) {
      setMessage("Please enter your username and password.");
      setIsSuccess(false);
      return;
    }

    try {
      setLoading(true);
      clearMessage();

      await login(userName.trim(), password);

      setIsSuccess(true);
      setMessage("Login successful.");

      navigate(redirectTo, { replace: true });
    } catch (error: unknown) {
      setIsSuccess(false);

      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 400 || status === 401) {
          setMessage("Invalid username or password.");
        } else if (!error.response) {
          setMessage("Unable to connect to the server.");
        } else {
          setMessage(
            error.response.data?.message ||
              "Unable to login. Please try again.",
          );
        }
      } else {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to login. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 border-[3px] border-t-transparent rounded-full animate-spin"
            style={{
              borderColor: theme.primary,
              borderTopColor: "transparent",
            }}
          />
          <p className="text-sm" style={{ color: theme.muted }}>
            Preparing your workspace...
          </p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-8 sm:px-8"
      style={{ backgroundColor: theme.background }}
    >
      <div
        className="w-full max-w-[1100px] min-h-[650px] rounded-[28px] overflow-hidden shadow-[0_20px_80px_rgba(38,38,30,0.08)] grid grid-cols-1 lg:grid-cols-2"
        style={{ backgroundColor: theme.white }}
      >
        {/* LEFT BRAND PANEL */}
        <section
          className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 overflow-hidden"
          style={{ backgroundColor: theme.dark, color: theme.everWhite }}
        >
          {/* Decorative circles */}
          <div
            className="absolute -top-32 -right-32 w-96 h-96 rounded-full border"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          />
          <div
            className="absolute -top-20 -right-20 w-72 h-72 rounded-full border"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          />
          <div
            className="absolute -bottom-40 -left-32 w-96 h-96 rounded-full"
            style={{ backgroundColor: `${theme.primary}10` }}
          />

          <div className="relative z-10">
            {/* Company Logo */}
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg"
                style={{ backgroundColor: theme.everWhite }}
              >
                <img
                  src="/icon.png"
                  alt="SP Infocom"
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                <Building2
                  size={28}
                  style={{ color: theme.primary }}
                  className="hidden"
                />
              </div>

              <div>
                <h1 className="text-2xl font-bold tracking-[2px]">
                  SP<span style={{ color: theme.primaryDark }}>INFOCOM</span>
                </h1>
                <p
                  className="text-[10px] tracking-[3px] mt-1"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  MANAGEMENT PORTAL
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-10 max-w-md">
            <div
              className="w-12 h-[3px] mb-8"
              style={{ backgroundColor: theme.primary }}
            />

            <p
              className="text-xs uppercase tracking-[4px] mb-5"
              style={{ color: theme.primaryDark }}
            >
              One unified workspace
            </p>

            <h2 className="text-4xl xl:text-5xl font-semibold leading-[1.2]">
              Manage better.
              <br />
              Work smarter.
              <br />
              <span style={{ color: theme.primaryDark }}>Stay connected.</span>
            </h2>

            <p
              className="text-sm leading-7 mt-7 max-w-sm"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Access your organisation&apos;s workspace to manage employees,
              monitor attendance, resolve tickets and stay updated.
            </p>

            <div className="mt-12 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(255,255,255,0.07)" }}
              >
                <ShieldCheck size={19} style={{ color: theme.primaryDark }} />
              </div>

              <div>
                <p className="text-sm font-medium text-white/90">
                  Secure workspace
                </p>
                <p
                  className="text-xs mt-1"
                  style={{ color: "rgba(255,255,255,0.4)" }}
                >
                  Authorised access only
                </p>
              </div>
            </div>
          </div>

          <div
            className="relative z-10 flex items-center justify-between text-[11px]"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            <span>© {new Date().getFullYear()} SP Infocom</span>
            <span>All rights reserved.</span>
          </div>
        </section>

        {/* RIGHT LOGIN PANEL */}
        <section className="flex items-center justify-center px-6 py-12 sm:px-12 lg:px-14 xl:px-20">
          <div className="w-full max-w-[390px]">
            {/* MOBILE BRANDING */}
            <div className="lg:hidden mb-12 flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: theme.primarySoft }}
              >
                <img
                  src="/icon.png"
                  alt="SP Infocom"
                  className="w-full h-full object-contain p-1"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>

              <div>
                <h1
                  className="text-xl font-bold tracking-[1px]"
                  style={{ color: theme.ink }}
                >
                  SP<span style={{ color: theme.primary }}>INFOCOM</span>
                </h1>
                <p
                  className="text-[9px] tracking-[2px] mt-1"
                  style={{ color: theme.muted }}
                >
                  MANAGEMENT PORTAL
                </p>
              </div>
            </div>

            {/* LOGIN HEADER */}
            <div className="mb-9">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-7"
                style={{ backgroundColor: theme.primarySoft }}
              >
                <LockKeyhole
                  size={25}
                  style={{ color: theme.primary }}
                  strokeWidth={1.8}
                />
              </div>

              <p
                className="text-[11px] uppercase tracking-[3px] font-semibold mb-3"
                style={{ color: theme.primary }}
              >
                Welcome back
              </p>

              <h2
                className="text-[32px] font-semibold tracking-tight"
                style={{ color: theme.ink }}
              >
                Sign in to your account
              </h2>

              <p
                className="text-sm mt-3 leading-6"
                style={{ color: theme.muted }}
              >
                Enter your credentials to access your SP Infocom workspace.
              </p>
            </div>

            {/* LOGIN FORM */}
            <form onSubmit={handleLogin} className="space-y-5">
              {/* USERNAME */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-[13px] font-semibold mb-2"
                  style={{ color: theme.ink }}
                >
                  Username
                </label>

                <div className="relative">
                  <UserRound
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: theme.light }}
                  />

                  <input
                    id="username"
                    type="text"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    disabled={loading}
                    placeholder="Enter your username"
                    value={userName}
                    onChange={(e) => {
                      setUserName(e.target.value);
                      clearMessage();
                    }}
                    className="w-full h-[54px] pl-12 pr-4 rounded-xl border text-sm outline-none transition-all focus:ring-4 disabled:opacity-60"
                    style={{
                      backgroundColor: theme.input,
                      borderColor: theme.border,
                      color: theme.ink,
                      ["--tw-ring-color" as string]: `${theme.primary}1A`,
                    }}
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-[13px] font-semibold mb-2"
                  style={{ color: theme.ink }}
                >
                  Password
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2"
                    style={{ color: theme.light }}
                  />

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    disabled={loading}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearMessage();
                    }}
                    className="w-full h-[54px] pl-12 pr-12 rounded-xl border text-sm outline-none transition-all focus:ring-4 disabled:opacity-60"
                    style={{
                      backgroundColor: theme.input,
                      borderColor: theme.border,
                      color: theme.ink,
                      ["--tw-ring-color" as string]: `${theme.primary}1A`,
                    }}
                  />

                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowPassword((previous) => !previous)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition"
                    style={{ color: theme.muted }}
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              {/* STATUS MESSAGE */}
              {message && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="rounded-xl px-4 py-3 text-sm border"
                  style={{
                    backgroundColor: isSuccess
                      ? theme.successSoft
                      : theme.dangerSoft,
                    borderColor: isSuccess ? theme.success : theme.danger,
                    color: isSuccess ? theme.success : theme.danger,
                  }}
                >
                  {message}
                </div>
              )}

              {/* LOGIN BUTTON */}
              <button
                type="submit"
                disabled={loading}
                className="group w-full h-[54px] rounded-xl text-white flex items-center justify-center gap-3 font-semibold text-sm transition-all hover:shadow-lg active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                style={{
                  backgroundColor: theme.dark,
                  color: theme.everWhite,
                }}
              >
                {loading ? (
                  <>
                    <span
                      className="w-4 h-4 rounded-full border-2 border-t-white animate-spin"
                      style={{
                        borderColor: "rgba(255,255,255,0.3)",
                        borderTopColor: "#FFFFFF",
                      }}
                    />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </>
                )}
              </button>
            </form>

            {/* SECURITY FOOTER */}
            <div
              className="mt-9 pt-6 border-t"
              style={{ borderColor: theme.divider }}
            >
              <div
                className="flex items-center justify-center gap-2"
                style={{ color: theme.muted }}
              >
                <ShieldCheck size={15} />
                <p className="text-[11px]">
                  Protected access · Authorised personnel only
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default LoginPage;
