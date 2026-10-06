"use client";

import { useState, useMemo } from "react";
import { Users, Building2, Plus, Factory, X, UserCheck } from "lucide-react";
import { Pagination } from "@/components/Pagination";

export default function PartnersClient({
  customers,
  suppliers,
}: {
  customers: any[];
  suppliers: any[];
}) {
  const [activeTab, setActiveTab] = useState<"customers" | "suppliers">("customers");

  // Pagination states
  const [custPage, setCustPage] = useState(1);
  const [custPageSize, setCustPageSize] = useState(10);
  const paginatedCustomers = useMemo(() => {
    return customers.slice((custPage - 1) * custPageSize, custPage * custPageSize);
  }, [customers, custPage, custPageSize]);

  const [supPage, setSupPage] = useState(1);
  const [supPageSize, setSupPageSize] = useState(10);
  const paginatedSuppliers = useMemo(() => {
    return suppliers.slice((supPage - 1) * supPageSize, supPage * supPageSize);
  }, [suppliers, supPage, supPageSize]);

  // Customer Modal State
  const [custModalOpen, setCustModalOpen] = useState(false);
  const [custName, setCustName] = useState("");
  const [custUsername, setCustUsername] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [custCompany, setCustCompany] = useState("");
  const [custGstin, setCustGstin] = useState("");
  const [custLoading, setCustLoading] = useState(false);

  // Supplier Modal State
  const [supModalOpen, setSupModalOpen] = useState(false);
  const [supName, setSupName] = useState("");
  const [supContact, setSupContact] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supCity, setSupCity] = useState("");
  const [supGstin, setSupGstin] = useState("");
  const [supLoading, setSupLoading] = useState(false);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustLoading(true);

    try {
      const res = await fetch("/api/partners/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: custName,
          username: custUsername || custName.toLowerCase().replace(/[^a-z0-9]/g, ""),
          email: custEmail,
          phone: custPhone,
          company: custCompany,
          gstin: custGstin,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create customer");
      }

      setCustModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCustLoading(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupLoading(true);

    try {
      const res = await fetch("/api/partners/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: supName,
          contact: supContact,
          email: supEmail,
          phone: supPhone,
          city: supCity,
          gstin: supGstin,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create supplier");
      }

      setSupModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSupLoading(false);
    }
  };

  return (
    <div className="space-y-6 py-2">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#cce7ed] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0b252c] flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#056468]" />
            <span>Partners Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage B2B Customer accounts, stock-in-hand allocations, and Vendor Supplier records.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCustModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs shadow transition-all flex items-center gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Add B2B Customer</span>
          </button>
          <button
            onClick={() => setSupModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#0b252c] font-medium text-xs border border-[#cce7ed] shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Factory className="w-3.5 h-3.5 text-[#056468]" />
            <span>Add Vendor Supplier</span>
          </button>
        </div>
      </div>

      {/* Module Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-[#cce7ed] pb-2">
        <button
          onClick={() => setActiveTab("customers")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === "customers"
              ? "bg-[#056468] text-white shadow-sm"
              : "text-slate-600 hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <UserCheck className="w-3.5 h-3.5" />
          B2B Customers ({customers.length})
        </button>

        <button
          onClick={() => setActiveTab("suppliers")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
            activeTab === "suppliers"
              ? "bg-[#056468] text-white shadow-sm"
              : "text-slate-600 hover:text-[#0b252c] hover:bg-white/60"
          }`}
        >
          <Factory className="w-3.5 h-3.5" />
          Suppliers & Vendors ({suppliers.length})
        </button>
      </div>

      {/* TAB 1: CUSTOMERS */}
      {activeTab === "customers" && (
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-semibold text-[#0b252c] flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#056468]" />
              B2B Customers Directory
            </h2>
            <button
              onClick={() => setCustModalOpen(true)}
              className="px-4 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Customer
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#cce7ed]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f2f9fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                <tr>
                  <th className="p-3.5">Customer Name</th>
                  <th className="p-3.5">Username / Email</th>
                  <th className="p-3.5">Company</th>
                  <th className="p-3.5">Phone</th>
                  <th className="p-3.5">GSTIN</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                      No customer accounts created.
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-medium text-[#0b252c]">{c.name}</td>
                      <td className="p-3.5 text-[#056468]">
                        {c.email}
                        <span className="block text-[11px] text-slate-500">@{c.username}</span>
                      </td>
                      <td className="p-3.5 text-slate-700">{c.company || "-"}</td>
                      <td className="p-3.5 text-slate-700">{c.phone || "-"}</td>
                      <td className="p-3.5 text-slate-500 font-mono">{c.gstin || "-"}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={custPage}
            totalItems={customers.length}
            pageSize={custPageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setCustPage}
            onPageSizeChange={setCustPageSize}
          />
        </div>
      )}

      {/* TAB 2: SUPPLIERS */}
      {activeTab === "suppliers" && (
        <div className="bg-white border border-[#cce7ed] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-lg font-semibold text-[#0b252c] flex items-center gap-2">
              <Factory className="w-5 h-5 text-[#056468]" />
              Vendors & Suppliers Directory
            </h2>
            <button
              onClick={() => setSupModalOpen(true)}
              className="px-4 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium text-xs rounded-xl shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Supplier
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#cce7ed]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f2f9fa] text-[#0b252c] font-semibold uppercase tracking-wider border-b border-[#cce7ed]">
                <tr>
                  <th className="p-3.5">Supplier Name</th>
                  <th className="p-3.5">Contact Person</th>
                  <th className="p-3.5">Email / Phone</th>
                  <th className="p-3.5">City</th>
                  <th className="p-3.5">GSTIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-sans">
                      No supplier records created.
                    </td>
                  </tr>
                ) : (
                  paginatedSuppliers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70">
                      <td className="p-3.5 font-medium text-[#0b252c]">{s.name}</td>
                      <td className="p-3.5 text-slate-700">{s.contact || "-"}</td>
                      <td className="p-3.5 text-[#056468]">
                        {s.email || "-"}
                        <span className="block text-[11px] text-slate-500 font-mono">{s.phone}</span>
                      </td>
                      <td className="p-3.5 text-slate-700">{s.city || "-"}</td>
                      <td className="p-3.5 text-slate-500 font-mono">{s.gstin || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={supPage}
            totalItems={suppliers.length}
            pageSize={supPageSize}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setSupPage}
            onPageSizeChange={setSupPageSize}
          />
        </div>
      )}

      {/* Add Customer Modal */}
      {custModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#cce7ed] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-[#0b252c] flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#056468]" />
                Add B2B Customer
              </h3>
              <button onClick={() => setCustModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder="e.g. Acme Enterprises"
                  className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm focus:outline-none focus:border-[#056468]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Username / Identifier</label>
                <input
                  type="text"
                  required
                  value={custUsername}
                  onChange={(e) => setCustUsername(e.target.value)}
                  placeholder="e.g. acme_corp"
                  className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm font-mono focus:outline-none focus:border-[#056468]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="e.g. contact@acme.com"
                  className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm focus:outline-none focus:border-[#056468]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-[#0b252c] mb-1">Company</label>
                  <input
                    type="text"
                    value={custCompany}
                    onChange={(e) => setCustCompany(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm focus:outline-none focus:border-[#056468]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#0b252c] mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={custGstin}
                    onChange={(e) => setCustGstin(e.target.value)}
                    placeholder="29ABCDE1234F1Z8"
                    className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm font-mono focus:outline-none focus:border-[#056468]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCustModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-500 hover:text-[#0b252c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={custLoading}
                  className="px-5 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium rounded-xl shadow-sm"
                >
                  {custLoading ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {supModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#cce7ed] rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-semibold text-[#0b252c] flex items-center gap-2">
                <Factory className="w-5 h-5 text-[#056468]" />
                Add Vendor Supplier
              </h3>
              <button onClick={() => setSupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Supplier Company Name</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="e.g. Paper Mills India"
                  className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm focus:outline-none focus:border-[#056468]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-medium text-[#0b252c] mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="Rajesh Kumar"
                    className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm focus:outline-none focus:border-[#056468]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-[#0b252c] mb-1">City</label>
                  <input
                    type="text"
                    value={supCity}
                    onChange={(e) => setSupCity(e.target.value)}
                    placeholder="Mumbai"
                    className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm focus:outline-none focus:border-[#056468]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-[#0b252c] mb-1">Email / Phone</label>
                <input
                  type="text"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  placeholder="supplier@papermills.com"
                  className="w-full bg-slate-50 border border-[#cce7ed] rounded-xl px-3 py-2 text-[#0b252c] text-sm focus:outline-none focus:border-[#056468]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSupModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-500 hover:text-[#0b252c]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={supLoading}
                  className="px-5 py-2 bg-[#056468] hover:bg-[#044e51] text-white font-medium rounded-xl shadow-sm"
                >
                  {supLoading ? "Saving..." : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

