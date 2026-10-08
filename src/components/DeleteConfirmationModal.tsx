"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  itemName?: string;
  itemType?: string;
  warningMessage?: string;
  confirmKeyword?: string; // default: "DELETE"
  requireTyping?: boolean;  // default: false for simple 1-click delete
  isLoading?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType = "item",
  warningMessage,
  confirmKeyword = "DELETE",
  requireTyping = false,
  isLoading = false,
}: DeleteConfirmationModalProps) {
  const [inputVal, setInputVal] = useState("");
  const [internalLoading, setInternalLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInputVal("");
      setInternalLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmed = !requireTyping || inputVal.trim().toUpperCase() === confirmKeyword.toUpperCase();
  const loading = isLoading || internalLoading;

  const handleConfirm = async () => {
    if (!isConfirmed || loading) return;
    setInternalLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setInternalLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto pointer-events-auto">
      <div className="relative z-[10000] bg-white border-2 border-rose-300 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-slate-800 animate-in fade-in zoom-in-95 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center border border-rose-200 shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-950">
                {title || `Delete ${itemType}`}
              </h3>
              <p className="text-[11px] text-slate-500">
                Permanent Removal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Body */}
        <div className="space-y-3 text-xs text-slate-600">
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5 text-rose-950">
            <p className="font-bold text-xs">
              Are you sure you want to permanently delete:
            </p>
            {itemName && (
              <p className="font-mono font-bold text-slate-900 text-sm bg-white/90 px-2.5 py-1.5 rounded-lg border border-rose-200 truncate">
                {itemName}
              </p>
            )}
            <p className="text-[11px] text-rose-800 pt-0.5 leading-relaxed">
              {warningMessage ||
                "This will permanently delete this record and its associated barcodes from the inventory database."}
            </p>
          </div>

          {requireTyping && (
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                To confirm deletion, type{" "}
                <span className="font-mono text-rose-700 font-black tracking-wider px-1 py-0.5 bg-rose-100 rounded">
                  {confirmKeyword}
                </span>{" "}
                below:
              </label>
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={confirmKeyword}
                disabled={loading}
                className="w-full px-3 py-2 rounded-xl border-2 border-slate-300 font-mono font-black text-center text-sm tracking-widest focus:outline-none focus:border-rose-600 bg-white"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!isConfirmed || loading}
            className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{loading ? "Deleting..." : "Permanently Delete"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
