"use client";
import React from "react";
import type { ToolType } from "@/types/canvas";

interface ToolbarProps {
  activeTool: ToolType;
  hasSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: ToolType) => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

interface ToolBtn {
  id: ToolType;
  label: string;
  title: string;
  icon: React.ReactNode;
}

const RectIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const CircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const TextIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 4h10M8 4v8M5 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const SelectIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 2l10 5.5-5 1.5-2 5L3 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
  </svg>
);

const tools: ToolBtn[] = [
  { id: "select", label: "V", title: "Select (V)", icon: <SelectIcon /> },
  { id: "rect", label: "R", title: "Rectangle (R)", icon: <RectIcon /> },
  { id: "circle", label: "C", title: "Circle (C)", icon: <CircleIcon /> },
  { id: "text", label: "T", title: "Text (T)", icon: <TextIcon /> },
];

export function Toolbar({
  activeTool,
  hasSelection,
  canUndo,
  canRedo,
  onToolChange,
  onDelete,
  onUndo,
  onRedo,
}: ToolbarProps) {
  return (
    <aside className="flex flex-col items-center gap-1 w-12 bg-white border-r border-slate-200 py-3 shrink-0">
      {/* Tool buttons */}
      <div className="flex flex-col gap-1 w-full px-1.5">
        {tools.map((tool) => (
          <button
            key={tool.id}
            title={tool.title}
            onClick={() => onToolChange(tool.id)}
            className={`
              w-full aspect-square flex items-center justify-center rounded-md text-sm transition-all
              ${
                activeTool === tool.id
                  ? "bg-indigo-100 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              }
            `}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div className="w-6 h-px bg-slate-200 my-1" />

      {/* Undo / Redo */}
      <div className="flex flex-col gap-1 w-full px-1.5">
        <button
          title="Undo (Ctrl+Z)"
          onClick={onUndo}
          disabled={!canUndo}
          className="w-full aspect-square flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M3 7.5A4.5 4.5 0 1 1 7.5 12H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 5v2.5h2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          title="Redo (Ctrl+Shift+Z)"
          onClick={onRedo}
          disabled={!canRedo}
          className="w-full aspect-square flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M12 7.5A4.5 4.5 0 1 0 7.5 12H10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 5v2.5H9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <div className="w-6 h-px bg-slate-200 my-1" />

      {/* Delete */}
      <div className="w-full px-1.5">
        <button
          title="Delete selected (Del)"
          onClick={onDelete}
          disabled={!hasSelection}
          className="w-full aspect-square flex items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M3 4h9M6 4V3h3v1M5 4v7a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
