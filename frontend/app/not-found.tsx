import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-sm w-full flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M16 16s-1.5-2-4-2-4 2-4 2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </div>

        <h2 className="text-xl font-bold text-slate-800">404 - Page Not Found</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          The canvas or route you are looking for does not exist or has been moved.
        </p>

        <Link
          href="/"
          className="mt-2 w-full py-2 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm inline-block"
        >
          Return to Canvas Editor
        </Link>
      </div>
    </div>
  );
}
