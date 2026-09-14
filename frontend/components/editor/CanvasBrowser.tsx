"use client";
import React, { useEffect, useState, useCallback } from "react";
import type { CanvasData } from "@/types/canvas";
import { api } from "@/lib/api";

interface CanvasBrowserProps {
  currentId: string | null;
  onLoad: (canvas: CanvasData) => void;
  onClose: () => void;
}

export function CanvasBrowser({ currentId, onLoad, onClose }: CanvasBrowserProps) {
  const [canvases, setCanvases] = useState<CanvasData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCanvases = useCallback(async () => {
    try {
      const data = await api.listCanvases();
      setCanvases(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load canvases");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCanvases();
  }, [fetchCanvases]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await api.deleteCanvas(id);
      setCanvases((prev) => prev.filter((c) => c._id !== id));
      if (id === currentId) {
        try {
          localStorage.removeItem("mini_canvas_current_session");
        } catch { }
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete canvas");
    } finally {
      setDeleting(null);
    }
  };

  const handleLoad = async (id: string) => {
    try {
      const canvas = await api.getCanvas(id);
      onLoad(canvas);
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to load canvas");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 flex flex-col max-h-[80vh] border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Your Canvases</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
              Loading canvases…
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center gap-3 py-8">
              <p className="text-sm text-red-500">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  fetchCanvases();
                }}
                className="text-xs text-indigo-600 hover:underline"
              >
                Retry
              </button>
            </div>
          )}
          {!loading && !error && canvases.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <rect x="2" y="2" width="14" height="14" rx="2" stroke="#94a3b8" strokeWidth="1.4" />
                  <path d="M6 9h6M9 6v6" stroke="#94a3b8" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </div>
              <p className="text-sm text-slate-500 font-medium">No canvases yet</p>
              <p className="text-xs text-slate-400">Save your first canvas to see it here</p>
            </div>
          )}
          {!loading && !error && canvases.length > 0 && (
            <ul className="flex flex-col gap-1">
              {canvases.map((c) => (
                <li
                  key={c._id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${c._id === currentId
                    ? "bg-indigo-50 ring-1 ring-indigo-200"
                    : "hover:bg-slate-50"
                    }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {c.elements.length} element{c.elements.length !== 1 ? "s" : ""} ·{" "}
                      {c.artboard.width}×{c.artboard.height} ·{" "}
                      {new Date(c.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleLoad(c._id)}
                      className="px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleDelete(c._id, c.name)}
                      disabled={deleting === c._id}
                      className="px-2 py-1 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                    >
                      {deleting === c._id ? "…" : "Delete"}
                    </button>
                  </div>
                  {c._id === currentId && (
                    <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded shrink-0">
                      Current
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
