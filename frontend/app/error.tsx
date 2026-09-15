"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Application Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-md w-full flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>

        <h2 className="text-lg font-bold text-slate-800">Something went wrong</h2>
        <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
          An unexpected error occurred while rendering the canvas. Your saved canvases remain safe in the cloud.
        </p>

        {error?.message && process.env.NODE_ENV !== "production" && (
          <div className="w-full p-3 bg-red-50/70 border border-red-100 rounded-lg text-left overflow-x-auto text-[11px] font-mono text-red-700">
            {error.message}
          </div>
        )}

        <div className="flex items-center gap-3 mt-2 w-full">
          <button
            onClick={() => reset()}
            className="flex-1 py-2 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="py-2 px-4 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
