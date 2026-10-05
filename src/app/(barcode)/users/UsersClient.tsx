"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Crown,
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Key,
  CheckCircle2,
  AlertTriangle,
  Search,
  SlidersHorizontal,
  X,
  Lock,
  Mail,
  User,
  Building,
  Phone,
  Check,
  Sparkles,
  RefreshCw,
  Eye,
  Layers,
  Zap,
} from "lucide-react";
import { PermissionDefinition, RoleType, getDefaultPermissionsForRole } from "@/lib/permissions";
import { DeleteConfirmationModal } from "@/components/DeleteConfirmationModal";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  status: string;
  phone: string | null;
  department: string | null;
  permissions: string[];
  lastLoginAt: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface Props {
  initialUsers: UserItem[];
  allPermissions: PermissionDefinition[];
}

export default function UsersClient({ initialUsers, allPermissions }: Props) {
  const router = useRouter();

  // State
  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Loading & Feedback
  const [isSeeding, setIsSeeding] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: "success" | "error" | "info"; message: string } | null>(null);

  // Modals
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserItem> & { password?: string } | null>(null);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [viewingPermsUser, setViewingPermsUser] = useState<UserItem | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);

  const showFeedback = (type: "success" | "error" | "info", message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 6000);
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== "ALL" && u.role !== roleFilter) return false;
    if (statusFilter !== "ALL" && u.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchDept = (u.department || "").toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchDept) return false;
    }
    return true;
  });

  // Metrics
  const superAdminsCount = users.filter((u) => u.isSuperAdmin || u.role === "SUPER_ADMIN").length;
  const managersCount = users.filter((u) => u.role === "ADMIN").length;
  const staffCount = users.filter((u) => u.role === "STAFF").length;
  const activeCount = users.filter((u) => u.status === "ACTIVE").length;

  // Open Create Modal
  const handleOpenCreate = (isSuper: boolean = false) => {
    const defaultRole: RoleType = isSuper ? "SUPER_ADMIN" : "STAFF";
    setEditingUser({
      name: "",
      email: "",
      password: "",
      role: defaultRole,
      isSuperAdmin: isSuper,
      status: "ACTIVE",
      department: isSuper ? "Executive Management" : "Warehouse Operations",
      phone: "",
      permissions: getDefaultPermissionsForRole(defaultRole),
    });
    setIsUserModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: UserItem) => {
    setEditingUser({
      ...user,
      password: "", // blank means don't change
    });
    setIsUserModalOpen(true);
  };

  // Save User (Create or Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const method = editingUser.id ? "PUT" : "POST";
      const res = await fetch("/api/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingUser),
      });

      const data = await res.json();
      if (data.success) {
        showFeedback("success", data.message || "User saved successfully!");
        setIsUserModalOpen(false);
        setEditingUser(null);
        // Refresh users
        const usersRes = await fetch("/api/users");
        const usersData = await usersRes.json();
        if (usersData.users) setUsers(usersData.users);
      } else {
        showFeedback("error", data.error || "Failed to save user");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Network error");
    }
  };

  // Delete User Confirmation
  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const res = await fetch(`/api/users?id=${userToDelete.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        showFeedback("success", data.message || "User deleted.");
        setUsers(users.filter((u) => u.id !== userToDelete.id));
        setUserToDelete(null);
      } else {
        showFeedback("error", data.error || "Failed to delete user");
      }
    } catch (err: any) {
      showFeedback("error", err.message);
    }
  };

  // Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser || !newPassword) return;

    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: passwordTargetUser.id,
          password: newPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showFeedback("success", `Password updated for '${passwordTargetUser.name}'.`);
        setIsPasswordModalOpen(false);
        setPasswordTargetUser(null);
        setNewPassword("");
      } else {
        showFeedback("error", data.error || "Failed to update password");
      }
    } catch (err: any) {
      showFeedback("error", err.message);
    }
  };

  // Toggle User Status
  const handleToggleStatus = async (user: UserItem) => {
    const nextStatus = user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          status: nextStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showFeedback("success", `User '${user.name}' marked as ${nextStatus}.`);
        setUsers(users.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)));
      } else {
        showFeedback("error", data.error || "Failed to change status");
      }
    } catch (err: any) {
      showFeedback("error", err.message);
    }
  };

  // Seed / Reset Default Super Admins
  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/users/seed-defaults", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showFeedback("success", data.message);
        const usersRes = await fetch("/api/users");
        const usersData = await usersRes.json();
        if (usersData.users) setUsers(usersData.users);
      } else {
        showFeedback("error", data.error);
      }
    } catch (err: any) {
      showFeedback("error", err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  // Group Permissions by Category
  const permissionCategories = Array.from(new Set(allPermissions.map((p) => p.category)));

  return (
    <div className="min-h-screen bg-[#e3f2f5] text-slate-800 pb-20">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-[#056468] via-[#087f84] to-[#0a9b9f] text-white py-8 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Semi-SaaS Multi-User & RBAC Access Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Team, Roles & Permissions Hub
            </h1>
            <p className="text-emerald-100 text-sm mt-1 max-w-2xl">
              Manage Super Admins with master access, operations managers, and warehouse staff with granular module permissions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleOpenCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 font-extrabold text-xs shadow transition-all active:scale-95"
            >
              <Crown className="w-4 h-4 text-slate-900 fill-amber-500" />
              <span>Create Super Admin</span>
            </button>

            <button
              onClick={() => handleOpenCreate(false)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#056468] font-bold text-xs shadow hover:bg-emerald-50 transition-all active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-[#056468]" />
              <span>Add Team Member</span>
            </button>

            <button
              onClick={handleSeedDefaults}
              disabled={isSeeding}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-medium border border-white/30 transition-all"
              title="Reset or synchronize default Super Admin accounts"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? "animate-spin" : ""}`} />
              <span>Sync Defaults</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {actionFeedback && (
          <div className="max-w-7xl mx-auto mt-4">
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
                actionFeedback.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-300"
                  : actionFeedback.type === "error"
                  ? "bg-rose-50 text-rose-900 border border-rose-300"
                  : "bg-cyan-50 text-cyan-900 border border-cyan-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {actionFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : actionFeedback.type === "error" ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                ) : (
                  <Zap className="w-4 h-4 text-cyan-600 shrink-0" />
                )}
                <span>{actionFeedback.message}</span>
              </div>
              <button onClick={() => setActionFeedback(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Super Admins */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 uppercase tracking-wide">
                <Crown className="w-3.5 h-3.5 fill-amber-400" />
                Super Admins
              </div>
              <div className="text-2xl font-black text-slate-800 mt-1">{superAdminsCount}</div>
              <div className="text-[11px] text-slate-500">Full Master Access</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 font-extrabold text-sm shadow-inner">
              👑
            </div>
          </div>

          {/* Operations Managers */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#056468] uppercase tracking-wide">Operations Admins</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{managersCount}</div>
              <div className="text-[11px] text-slate-500">Catalog & Stock Control</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#056468]">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Warehouse Staff */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Warehouse Staff</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{staffCount}</div>
              <div className="text-[11px] text-slate-500">POS Scan & Barcode Print</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* Total Active Users */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-blue-700 uppercase tracking-wide">Active Users</div>
              <div className="text-2xl font-black text-slate-800 mt-1">{activeCount}</div>
              <div className="text-[11px] text-slate-500">Of {users.length} Total Accounts</div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-extrabold text-sm">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Super Admins Highlight Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 rounded-2xl p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-bold backdrop-blur-xs">
              <Crown className="w-3.5 h-3.5 fill-white" />
              <span>Dual Super Admin Structure (Semi-SaaS Model)</span>
            </div>
            <h3 className="text-lg font-bold text-white">Master Access Super Admins Configured</h3>
            <p className="text-xs text-amber-100 max-w-2xl leading-relaxed">
              Super Admins have unrestricted master control over all modules, API keys, user roles, catalog, barcodes, and orders. You can create a 2nd Super Admin or team member with any email/password.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleOpenCreate(true)}
              className="px-4 py-2 rounded-xl bg-white hover:bg-amber-50 text-slate-900 font-extrabold text-xs shadow-md transition-all active:scale-95"
            >
              + Add Super Admin
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search user name, email, or department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#056468]"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#056468]"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">👑 Super Admin</option>
              <option value="ADMIN">🛡️ Operations Admin</option>
              <option value="STAFF">📦 Warehouse Staff</option>
              <option value="ACCOUNTANT">💼 Accountant</option>
              <option value="CUSTOM">⚙️ Custom Role</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#056468]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-medium shrink-0">
            Showing <strong className="text-slate-800">{filteredUsers.length}</strong> of {users.length} users
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f4fbfb] border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">User & Contact</th>
                  <th className="py-3.5 px-4">Role & Access Level</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4 text-center">Permissions</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Last Login</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No users match the search filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSuper = u.isSuperAdmin || u.role === "SUPER_ADMIN";
                    const isStaff = u.role === "STAFF";
                    const isAdmin = u.role === "ADMIN";
                    const isAccountant = u.role === "ACCOUNTANT";

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* User & Contact */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSuper
                                  ? "bg-amber-100 text-amber-900 border border-amber-300"
                                  : isAdmin
                                  ? "bg-teal-100 text-teal-900 border border-teal-300"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {isSuper ? <Crown className="w-4 h-4 fill-amber-500 text-amber-700" /> : u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {isSuper && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                                    MASTER
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wide inline-flex items-center gap-1 ${
                              isSuper
                                ? "bg-amber-100 text-amber-900 border border-amber-300"
                                : isAdmin
                                ? "bg-[#e3f2f5] text-[#056468] border border-[#cce7ed]"
                                : isStaff
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : isAccountant
                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                : "bg-purple-100 text-purple-800 border border-purple-200"
                            }`}
                          >
                            {isSuper && <Crown className="w-3 h-3 fill-amber-600" />}
                            <span>{u.role.replace("_", " ")}</span>
                          </span>
                        </td>

                        {/* Department */}
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {u.department || "Operations"}
                        </td>

                        {/* Permissions */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setViewingPermsUser(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-all"
                            title="Click to view full permission matrix"
                          >
                            <Eye className="w-3 h-3 text-slate-500" />
                            <span>
                              {isSuper ? "Full Access (14/14)" : `${u.permissions?.length || 0} permissions`}
                            </span>
                          </button>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                              u.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                                : "bg-rose-100 text-rose-800 hover:bg-rose-200"
                            }`}
                            title="Click to Toggle Status"
                          >
                            {u.status}
                          </button>
                        </td>

                        {/* Last Login */}
                        <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                          {u.lastLoginAt ? (
                            new Date(u.lastLoginAt).toLocaleString("en-IN", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          ) : (
                            <span className="text-slate-400">Never logged in</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setPasswordTargetUser(u);
                                setNewPassword("");
                                setIsPasswordModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Reset Password"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-[#056468] hover:bg-slate-100 transition-colors"
                              title="Edit User & Permissions"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setUserToDelete(u)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: CREATE / EDIT USER MODAL */}
      {isUserModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto pointer-events-auto">
          <div className="relative z-[10000] bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {editingUser.isSuperAdmin ? (
                  <Crown className="w-5 h-5 text-amber-500 fill-amber-400" />
                ) : (
                  <UserPlus className="w-5 h-5 text-[#056468]" />
                )}
                <span>{editingUser.id ? "Edit User & Permissions" : "Add Portal User"}</span>
              </h3>
              <button
                onClick={() => {
                  setIsUserModalOpen(false);
                  setEditingUser(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="mt-4 space-y-4 text-xs">
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Patel"
                    value={editingUser.name || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#056468]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. ramesh@stealthsight.com"
                    value={editingUser.email || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#056468]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {editingUser.id ? "New Password (leave empty to keep current)" : "Password"}
                  </label>
                  <input
                    type="password"
                    required={!editingUser.id}
                    placeholder="••••••••"
                    value={editingUser.password || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#056468]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role / Access Level</label>
                  <select
                    value={
                      ["SUPER_ADMIN", "ADMIN", "STAFF", "ACCOUNTANT"].includes(editingUser.role || "")
                        ? editingUser.role
                        : "CUSTOM"
                    }
                    onChange={(e) => {
                      const newRole = e.target.value as RoleType;
                      const isSuper = newRole === "SUPER_ADMIN";
                      setEditingUser({
                        ...editingUser,
                        role: newRole,
                        isSuperAdmin: isSuper,
                        department: isSuper ? "Executive Management" : editingUser.department,
                        permissions: getDefaultPermissionsForRole(newRole),
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-[#056468]"
                  >
                    <option value="SUPER_ADMIN">👑 Super Admin (Full Portal & System Access)</option>
                    <option value="ADMIN">🛡️ Operations Admin (Store & Stock Manager)</option>
                    <option value="STAFF">📦 Warehouse Staff (POS Scan & Print)</option>
                    <option value="ACCOUNTANT">💼 Accountant (Invoices & Reports)</option>
                    <option value="CUSTOM">⚙️ Custom Role (Write Any Title & Set Granular Permissions)</option>
                  </select>
                </div>
              </div>

              {/* Custom Role Title Input if CUSTOM */}
              {!["SUPER_ADMIN", "ADMIN", "STAFF", "ACCOUNTANT"].includes(editingUser.role || "") && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                  <label className="block font-bold text-amber-900 text-xs">
                    Custom Role Name / Job Title
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Inventory Lead, Senior Dispatcher, Purchasing Manager..."
                    value={editingUser.role === "CUSTOM" ? "" : editingUser.role || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value || "CUSTOM" })}
                    className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white font-semibold text-amber-950 focus:outline-none focus:ring-2 focus:ring-[#056468]"
                  />
                  <p className="text-[10px] text-amber-700">
                    Write any custom role name you like, then select the exact permissions below.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Warehouse, Accounts, Sales"
                    value={editingUser.department || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#056468]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={editingUser.phone || ""}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#056468]"
                  />
                </div>
              </div>

              {/* Granular Permissions Selector */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="font-bold text-slate-800 text-xs">
                    Granular Module Permissions ({editingUser.permissions?.length || 0} Enabled):
                  </label>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingUser({
                          ...editingUser,
                          permissions: allPermissions.map((p) => p.id),
                        })
                      }
                      className="text-[#056468] hover:underline font-semibold"
                    >
                      Select All
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setEditingUser({ ...editingUser, permissions: [] })}
                      className="text-slate-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  {permissionCategories.map((category) => {
                    const categoryPerms = allPermissions.filter((p) => p.category === category);
                    return (
                      <div key={category} className="space-y-1.5">
                        <div className="text-[11px] font-extrabold uppercase text-[#056468] tracking-wide">
                          {category}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {categoryPerms.map((perm) => {
                            const isChecked = (editingUser.permissions || []).includes(perm.id);
                            return (
                              <label
                                key={perm.id}
                                className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                                  isChecked
                                    ? "bg-white border-[#056468] shadow-xs"
                                    : "bg-white/60 border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const curr = editingUser.permissions || [];
                                    const next = e.target.checked
                                      ? [...curr, perm.id]
                                      : curr.filter((p) => p !== perm.id);
                                    setEditingUser({ ...editingUser, permissions: next });
                                  }}
                                  className="mt-0.5 rounded text-[#056468] focus:ring-[#056468]"
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-900 text-[11px]">{perm.name}</div>
                                  <div className="text-[10px] text-slate-500 leading-tight">{perm.description}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#056468] hover:bg-[#045255] text-white font-bold shadow transition-all active:scale-95"
                >
                  {editingUser.id ? "Save Changes" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESET PASSWORD MODAL */}
      {isPasswordModalOpen && passwordTargetUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 relative z-[10000]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                <span>Reset Password</span>
              </h3>
              <button
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setPasswordTargetUser(null);
                  setNewPassword("");
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="mt-4 space-y-4 text-xs">
              <p className="text-slate-600">
                Set a new password for <strong className="text-slate-900">{passwordTargetUser.name}</strong> ({passwordTargetUser.email}):
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password..."
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#056468]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setPasswordTargetUser(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#056468] hover:bg-[#045255] text-white font-bold shadow"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW PERMISSIONS MATRIX MODAL */}
      {viewingPermsUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 relative z-[10000]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#056468]" />
                  <span>Authorized Permissions</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {viewingPermsUser.name} • <strong className="text-slate-800">{viewingPermsUser.role}</strong>
                </p>
              </div>
              <button onClick={() => setViewingPermsUser(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 max-h-80 overflow-y-auto space-y-3 text-xs pr-1">
              {allPermissions.map((perm) => {
                const isGranted =
                  viewingPermsUser.isSuperAdmin ||
                  viewingPermsUser.role === "SUPER_ADMIN" ||
                  (viewingPermsUser.permissions || []).includes(perm.id);

                return (
                  <div
                    key={perm.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      isGranted ? "bg-emerald-50/70 border-emerald-200" : "bg-slate-50 border-slate-200 opacity-60"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-slate-900">{perm.name}</div>
                      <div className="text-[10px] text-slate-500">{perm.description}</div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isGranted ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {isGranted ? "GRANTED" : "DENIED"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 text-right">
              <button
                onClick={() => setViewingPermsUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Delete User Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={confirmDeleteUser}
        title="Delete User Account"
        itemName={userToDelete ? `${userToDelete.name} (${userToDelete.email})` : ""}
        confirmKeyword="RESET"
      />
    </div>
  );
}
