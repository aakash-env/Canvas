import React from "react";

export default function Loading() {
  return (
    <div className="flex flex-col h-screen w-screen bg-slate-100 items-center justify-center font-sans">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-200 animate-pulse">
          <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" fill="white" />
            <circle cx="10.5" cy="3.5" r="2.5" fill="white" />
            <rect x="1" y="8" width="12" height="2" rx="1" fill="white" />
            <rect x="1" y="11" width="8" height="2" rx="1" fill="white" />
          </svg>
        </div>
        <p className="text-xs font-semibold text-slate-500 tracking-wide">Loading Canvas...</p>
      </div>
    </div>
  );
}
