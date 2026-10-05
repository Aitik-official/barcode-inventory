"use client";

import { FormEvent, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  Key,
  ShieldCheck,
  ScanBarcode,
  ArrowRight,
  Eye,
  EyeOff,
  LogIn,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Authenticate user
  async function performLogin(loginEmail: string, loginPass: string) {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/zaa/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: loginEmail.trim(),
          password: loginPass,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid credentials. Please verify your email and password.");
        setBusy(false);
        return;
      }

      // Save user session in localStorage with 12-hour expiration
      if (data.user) {
        const userSession = {
          ...data.user,
          loginAt: data.user.loginAt || Date.now(),
          expiresAt: data.user.expiresAt || Date.now() + 12 * 60 * 60 * 1000,
        };
        localStorage.setItem("barcodezaa_user", JSON.stringify(userSession));
        window.dispatchEvent(new Event("barcodezaa_auth_change"));
      }

      // Target redirect based on role
      let targetPath = "/products";
      if (redirectUrl) {
        targetPath = redirectUrl;
      } else if (data.user?.role === "STAFF") {
        targetPath = "/scan";
      } else if (data.user?.role === "ACCOUNTANT") {
        targetPath = "/orders";
      }

      // Hard redirect to load fresh session in navbar and entire app immediately
      window.location.href = targetPath;
    } catch (err: any) {
      setError(err.message || "Network error while signing in.");
      setBusy(false);
    }
  }

  // Handle Form Submit
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await performLogin(email, password);
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-10 bg-[#e3f2f5]">
      <div className="w-full max-w-md space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex h-13 w-13 items-center justify-center rounded-2xl bg-[#056468] text-white shadow-lg border border-[#045255]">
            <ScanBarcode className="h-6 w-6 text-emerald-200" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            BarcodeZaa Portal Login
          </h1>
          <p className="text-xs text-slate-600 max-w-xs mx-auto">
            Semi-SaaS Inventory, POS Scanner, Thermal Labels & Multi-Channel Marketplace Portal
          </p>
        </div>

        {/* CREDENTIALS LOGIN CARD */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <LogIn className="w-4 h-4 text-[#056468]" />
            <h2 className="text-sm font-bold text-slate-800">Sign In with Your Credentials</h2>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Email / Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address or Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  placeholder="admin@barcodezaa.com or username..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2.5 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#056468] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-[#056468] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? "Hide" : "Show"}</span>
                </button>
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your password..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-10 py-2.5 text-xs text-slate-900 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#056468] focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#056468] hover:bg-[#044e51] py-3 text-xs font-bold text-white shadow-md transition-all active:scale-98 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {busy ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Need access? Contact your Organization Super Admin or Manager to invite your account.
            </p>
          </div>
        </div>

        {/* Security Footer */}
        <div className="text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Secured with Role-Based Access Control & PBKDF2 Password Encryption</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[85vh] flex items-center justify-center text-xs text-slate-500">
          Loading portal authentication...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
