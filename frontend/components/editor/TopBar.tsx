"use client";
import React, { useState } from "react";
import type { SaveStatus } from "@/types/canvas";
import { useAuth } from "@/context/AuthContext";

interface TopBarProps {
  canvasName: string;
  saveStatus: SaveStatus;
  isDirty: boolean;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onNew: () => void;
  onOpenBrowser: () => void;
  onExportPng: () => void;
  onOpenAuth: () => void;
}

const statusConfig = {
  idle: { text: "", cls: "" },
  saving: { text: "Saving...", cls: "text-amber-500" },
  saved: { text: "Saved", cls: "text-emerald-500" },
  error: { text: "Save failed", cls: "text-red-500" },
};

export function TopBar({
  canvasName,
  saveStatus,
  isDirty,
  onNameChange,
  onSave,
  onNew,
  onOpenBrowser,
  onExportPng,
  onOpenAuth,
}: TopBarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(canvasName);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const status = statusConfig[saveStatus];

  const commitName = () => {
    const trimmed = draft.trim();
    if (trimmed) onNameChange(trimmed);
    else setDraft(canvasName);
    setEditing(false);
  };

  return (
    <header className="flex items-center gap-3 px-4 h-12 bg-white border-b border-slate-200 shrink-0 z-10">
      {/* Logo */}
      <div className="flex items-center gap-2 mr-1">
        <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center shadow-sm">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" fill="white" />
            <circle cx="10.5" cy="3.5" r="2.5" fill="white" />
            <rect x="1" y="8" width="12" height="2" rx="1" fill="white" />
            <rect x="1" y="11" width="8" height="2" rx="1" fill="white" />
          </svg>
        </div>
        <span className="text-sm font-bold text-slate-800 hidden sm:block tracking-tight">Canvas</span>
      </div>

      {/* Canvas name */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") { setDraft(canvasName); setEditing(false); }
            }}
            className="w-full max-w-xs px-2 py-0.5 text-sm font-medium border border-indigo-400 rounded outline-none bg-white shadow-inner"
          />
        ) : (
          <button
            onClick={() => { setDraft(canvasName); setEditing(true); }}
            className="text-sm font-medium text-slate-800 hover:text-indigo-600 truncate max-w-xs flex items-center gap-1 group"
            title="Click to rename"
          >
            <span className="truncate">{canvasName}</span>
            {isDirty && <span className="text-amber-500 text-xs font-bold" title="Unsaved changes">•</span>}
            <svg className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 16 16">
              <path d="M11.5 2.5l2 2-9 9H2.5v-2l9-9z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Save / Autosave Status */}
      {status.text && (
        <span className={`text-xs font-medium ${status.cls} hidden md:flex items-center gap-1`}>
          {saveStatus === "saving" && (
            <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
          )}
          {status.text}
        </span>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenBrowser}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          title="Browse saved canvases"
        >
          Canvases
        </button>

        <button
          onClick={onNew}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
          title="New blank canvas"
        >
          New
        </button>

        {/* Export PNG */}
        <button
          onClick={onExportPng}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors flex items-center gap-1"
          title="Export artboard as high-resolution PNG"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M8 2v9M4 7l4 4 4-4M2 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden sm:inline">Export PNG</span>
        </button>

        {/* Save button */}
        <button
          onClick={onSave}
          disabled={saveStatus === "saving"}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-md transition-colors shadow-sm"
        >
          {saveStatus === "saving" ? "Saving..." : "Save"}
        </button>

        <div className="w-px h-4 bg-slate-200 mx-1" />

        {/* Auth Section */}
        {isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full hover:bg-slate-100 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px]">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-700 max-w-[90px] truncate hidden sm:block">
                {user.name}
              </span>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-lg shadow-xl border border-slate-100 py-1.5 z-50 animate-fadeIn">
                <div className="px-3 py-1.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-800 truncate">{user.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    logout();
                    setUserMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5"
                >
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                    <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M11 12l4-4-4-4M15 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
  );
}