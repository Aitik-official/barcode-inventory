"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Package,
  ScanBarcode,
  QrCode,
  Boxes,
  FileText,
  Receipt,
  Users,
  BarChart3,
  HelpCircle,
  Menu,
  X,
  Zap,
  Globe,
  Store,
  ShieldCheck,
  Crown,
  LogOut,
  User as UserIcon,
  ChevronDown,
  MoreHorizontal,
  Layers,
} from "lucide-react";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  permissions?: string[];
  loginAt?: number;
  expiresAt?: number;
}

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const moreRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const handleLogout = async (expired = false) => {
    try {
      await fetch("/api/zaa/login", { method: "DELETE" });
    } catch {}
    localStorage.removeItem("barcodezaa_user");
    setCurrentUser(null);
    window.dispatchEvent(new Event("barcodezaa_auth_change"));
    if (expired) {
      alert("Your 12-hour session has expired. Please sign in again.");
    }
    window.location.href = "/login";
  };

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreDropdownOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Synchronize active user session & enforce 12-hour expiration
  const loadSession = () => {
    try {
      const stored = localStorage.getItem("barcodezaa_user");
      if (stored) {
        const parsed: AuthUser = JSON.parse(stored);
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          handleLogout(true);
          return;
        }
        setCurrentUser(parsed);
        return;
      }

      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated && data.user) {
            if (data.user.expiresAt && Date.now() > data.user.expiresAt) {
              handleLogout(true);
              return;
            }
            setCurrentUser(data.user);
            localStorage.setItem("barcodezaa_user", JSON.stringify(data.user));
          } else {
            setCurrentUser(null);
          }
        })
        .catch(() => {});
    } catch {}
  };

  useEffect(() => {
    loadSession();

    window.addEventListener("barcodezaa_auth_change", loadSession);
    window.addEventListener("storage", loadSession);

    return () => {
      window.removeEventListener("barcodezaa_auth_change", loadSession);
      window.removeEventListener("storage", loadSession);
    };
  }, [pathname]);

  // Periodic check every 30 seconds for 12-hour session expiry
  useEffect(() => {
    const timer = setInterval(() => {
      if (currentUser?.expiresAt && Date.now() > currentUser.expiresAt) {
        handleLogout(true);
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [currentUser]);

  const isSuperAdmin = currentUser?.isSuperAdmin === true || currentUser?.role === "SUPER_ADMIN";
  const userPerms = currentUser?.permissions || [];
  const isLoggedIn = Boolean(currentUser);

  // Primary Navigation Tabs (Only visible when logged in)
  const primaryNavItems = [
    {
      label: "Catalog",
      href: "/products",
      icon: Package,
      allowed:
        isLoggedIn &&
        (isSuperAdmin ||
          userPerms.includes("CATALOG_VIEW") ||
          currentUser?.role === "ADMIN" ||
          currentUser?.role === "STAFF"),
    },
    {
      label: "Website",
      href: "/website",
      icon: Globe,
      allowed: isLoggedIn && (isSuperAdmin || userPerms.includes("CATALOG_VIEW") || currentUser?.role === "ADMIN"),
    },
    {
      label: "Channels",
      href: "/marketplaces",
      icon: Store,
      allowed: isLoggedIn && (isSuperAdmin || userPerms.includes("MARKETPLACE_VIEW") || currentUser?.role === "ADMIN"),
    },
    {
      label: "Barcodes",
      href: "/barcodes",
      icon: ScanBarcode,
      allowed:
        isLoggedIn &&
        (isSuperAdmin ||
          userPerms.includes("BARCODE_PRINT") ||
          currentUser?.role === "STAFF" ||
          currentUser?.role === "ADMIN"),
    },
    {
      label: "POS Scan",
      href: "/scan",
      icon: QrCode,
      allowed:
        isLoggedIn &&
        (isSuperAdmin ||
          userPerms.includes("POS_SCAN") ||
          currentUser?.role === "STAFF" ||
          currentUser?.role === "ADMIN"),
    },
    {
      label: "Inventory",
      href: "/inventory",
      icon: Boxes,
      allowed:
        isLoggedIn &&
        (isSuperAdmin ||
          userPerms.includes("INVENTORY_VIEW") ||
          currentUser?.role === "STAFF" ||
          currentUser?.role === "ADMIN"),
    },
    {
      label: "Orders",
      href: "/orders",
      icon: FileText,
      allowed:
        isLoggedIn &&
        (isSuperAdmin ||
          userPerms.includes("ORDERS_VIEW") ||
          currentUser?.role === "ACCOUNTANT" ||
          currentUser?.role === "ADMIN"),
    },
    {
      label: "Invoices",
      href: "/invoices",
      icon: Receipt,
      allowed:
        isLoggedIn &&
        (isSuperAdmin ||
          userPerms.includes("ORDERS_VIEW") ||
          currentUser?.role === "ACCOUNTANT" ||
          currentUser?.role === "ADMIN" ||
          currentUser?.role === "STAFF"),
    },
  ];

  // Secondary Modules in "More ▾" dropdown (Only visible when logged in)
  const secondaryNavItems = [
    {
      label: "Partners & Suppliers",
      href: "/partners",
      icon: Users,
      description: "Manage B2B customers, manufacturers & vendors",
      allowed:
        isLoggedIn &&
        (isSuperAdmin ||
          userPerms.includes("PARTNERS_MANAGE") ||
          currentUser?.role === "ADMIN" ||
          currentUser?.role === "ACCOUNTANT"),
    },
    {
      label: "Team & Permissions",
      href: "/users",
      icon: ShieldCheck,
      description: "Manage users, Super Admins & RBAC access",
      allowed: isLoggedIn && (isSuperAdmin || userPerms.includes("USERS_MANAGE")),
    },
    {
      label: "Audit Reports",
      href: "/reports",
      icon: BarChart3,
      description: "Sales revenue, inventory turnover & stock valuation",
      allowed:
        isLoggedIn &&
        (isSuperAdmin ||
          userPerms.includes("REPORTS_VIEW") ||
          currentUser?.role === "ADMIN" ||
          currentUser?.role === "ACCOUNTANT"),
    },
    {
      label: "System Guide",
      href: "/guide",
      icon: HelpCircle,
      description: "Thermal barcode sizes, API keys & quick manual",
      allowed: isLoggedIn,
    },
  ];

  const visiblePrimary = primaryNavItems.filter((i) => i.allowed);
  const visibleSecondary = secondaryNavItems.filter((i) => i.allowed);
  const allVisible = [...visiblePrimary, ...visibleSecondary];

  const isSecondaryActive = visibleSecondary.some(
    (item) => pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href))
  );

  return (
    <header className="sticky top-0 z-50 bg-[#056468] text-white shadow-md border-b border-[#045255] overflow-visible">
      <div className="w-full max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-15 gap-2">
          {/* Brand Logo */}
          <Link href="/products" className="flex items-center gap-2 shrink-0 group mr-2">
            <div className="h-10 px-2 py-1 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/15 shadow-xs">
              <img
                src="/logo/1-01.png"
                alt="BarcodeZaa Logo"
                className="h-8 max-h-8 w-auto object-contain brightness-0 invert"
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 overflow-visible">
            {visiblePrimary.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    isActive
                      ? "bg-white text-[#056468] shadow-sm"
                      : "text-emerald-100 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* "More ▾" Dropdown */}
            {visibleSecondary.length > 0 && (
              <div ref={moreRef} className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => setMoreDropdownOpen((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSecondaryActive || moreDropdownOpen
                      ? "bg-white text-[#056468] shadow-sm"
                      : "text-emerald-100 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <MoreHorizontal className="w-4 h-4" />
                  <span>More</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      moreDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu Popup */}
                {moreDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 w-64 rounded-2xl bg-white text-slate-800 shadow-2xl border border-slate-200 py-2 z-[100] text-xs animate-in fade-in zoom-in-95 origin-top-left">
                    <div className="px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1 flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-[#056468]" />
                      <span>Additional Modules</span>
                    </div>

                    {visibleSecondary.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/" && pathname?.startsWith(item.href));
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreDropdownOpen(false)}
                          className={`flex items-start gap-2.5 px-3.5 py-2.5 transition-colors ${
                            isActive
                              ? "bg-[#e3f2f5] text-[#056468] font-bold border-l-3 border-[#056468]"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? "text-[#056468]" : "text-slate-500"}`} />
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs leading-tight">{item.label}</span>
                            {item.description && (
                              <span className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{item.description}</span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Right Section: Quick Scan + User Session */}
          <div className="flex items-center gap-2 shrink-0 ml-auto overflow-visible">
            {/* Quick Scan Action Button (Only when logged in) */}
            {isLoggedIn && (
              <Link
                href="/scan"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-400 hover:bg-emerald-300 text-[#044e51] shadow-sm transition-all whitespace-nowrap cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Quick Scan</span>
              </Link>
            )}

            {/* User Session Pill & Dropdown */}
            {currentUser ? (
              <div ref={userRef} className="relative inline-block text-left">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-xs transition-all cursor-pointer"
                >
                  {currentUser.isSuperAdmin || currentUser.role === "SUPER_ADMIN" ? (
                    <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0" />
                  ) : (
                    <UserIcon className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                  )}
                  <span className="truncate max-w-[120px] sm:max-w-[160px] font-bold text-white">
                    {currentUser.name || currentUser.email.split("@")[0] || currentUser.email}
                  </span>
                  {currentUser.isSuperAdmin || currentUser.role === "SUPER_ADMIN" ? (
                    <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-400 text-amber-950 shadow-xs">
                      Super Admin
                    </span>
                  ) : (
                    <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/30 text-emerald-100">
                      {currentUser.role}
                    </span>
                  )}
                  <ChevronDown
                    className={`w-3 h-3 text-emerald-200 transition-transform ${
                      userDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white text-slate-800 shadow-2xl border border-slate-200 py-2.5 z-[100] text-xs animate-in fade-in zoom-in-95 origin-top-right">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-8 h-8 rounded-xl bg-[#056468] text-white font-bold flex items-center justify-center text-xs shadow">
                          {currentUser.name ? currentUser.name[0]?.toUpperCase() : "A"}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-slate-900 truncate leading-tight">
                            {currentUser.name || "Authenticated User"}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate font-mono">
                            {currentUser.email}
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${
                          currentUser.isSuperAdmin || currentUser.role === "SUPER_ADMIN"
                            ? "bg-amber-100 text-amber-900 border border-amber-300"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}>
                          {currentUser.role || "USER"}
                        </span>
                        {currentUser.isSuperAdmin && (
                          <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                            <Crown className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>Full System Access</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      href="/users"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50 text-slate-700 font-semibold"
                    >
                      <ShieldCheck className="w-4 h-4 text-[#056468]" />
                      <span>Team & Permissions</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout(false);
                      }}
                      className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-rose-600 hover:bg-rose-50 font-bold border-t border-slate-100 mt-1 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out from Portal</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all whitespace-nowrap"
              >
                <UserIcon className="w-3.5 h-3.5 text-emerald-200" />
                <span>Sign In</span>
              </Link>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-white hover:bg-white/10 focus:outline-none ml-1"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#045255] bg-[#045255] px-4 py-3 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-2 gap-1.5">
            {allVisible.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-white text-[#056468] font-bold shadow-xs"
                      : "text-emerald-100 hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {currentUser && (
            <div className="pt-2 border-t border-emerald-800/60 flex items-center justify-between text-xs text-emerald-100">
              <span>
                Signed in as <strong>{currentUser.name}</strong>
              </span>
              <button
                type="button"
                onClick={() => handleLogout(false)}
                className="text-rose-300 font-bold hover:underline cursor-pointer"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
