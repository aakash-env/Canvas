"use client";
import React from "react";
import type { CanvasElement } from "@/types/canvas";

interface LayerPanelProps {
  elements: CanvasElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onBringToFront?: (id: string) => void;
  onSendToBack?: (id: string) => void;
  onToggleVisibility?: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onDelete: (id: string) => void;
}

const typeIcon = (type: CanvasElement["type"]) => {
  if (type === "rect")
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="1" y="3" width="10" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    );
  if (type === "circle")
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" />
      </svg>
    );
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 3h8M6 3v6M4 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
};

const typeLabel = (el: CanvasElement) => {
  if (el.type === "text") {
    const txt = (el as { text: string }).text;
    return `"${txt.slice(0, 12)}${txt.length > 12 ? "…" : ""}"`;
  }
  return el.type.charAt(0).toUpperCase() + el.type.slice(1);
};

export function LayerPanel({
  elements,
  selectedId,
  onSelect,
  onReorder,
  onBringToFront,
  onSendToBack,
  onToggleVisibility,
  onToggleLock,
  onDelete,
}: LayerPanelProps) {
  // Elements rendered last are on top, so reverse for layer stack
  const reversed = [...elements].reverse();

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Layers ({elements.length})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {elements.length === 0 ? (
          <p className="text-[11px] text-slate-400 text-center py-6 px-3">
            No layers on canvas
          </p>
        ) : (
          <ul className="flex flex-col py-1">
            {reversed.map((el, revIdx) => {
              const origIdx = elements.length - 1 - revIdx;
              const isSelected = el.id === selectedId;
              const isHidden = el.visible === false;
              const isLocked = el.locked === true;

              return (
                <li
                  key={el.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer group transition-colors select-none ${isSelected
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "hover:bg-slate-50 text-slate-600"
                    } ${isHidden ? "opacity-50" : ""}`}
                  onClick={() => onSelect(el.id)}
                >
                  {/* Visibility button */}
                  <button
                    type="button"
                    title={isHidden ? "Show layer" : "Hide layer"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility?.(el.id);
                    }}
                    className={`w-4 h-4 flex items-center justify-center rounded transition-colors ${isHidden
                      ? "text-slate-400"
                      : "text-slate-400 group-hover:text-slate-600 hover:text-indigo-600"
                      }`}
                  >
                    {isHidden ? (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <path d="M2 2l12 12M6.7 6.7a2 2 0 0 0 2.6 2.6M9.9 5.3A4.5 4.5 0 0 0 8 5C4.5 5 2 8 2 8a10.8 10.8 0 0 0 3.2 3.3m5.6-.8A10.8 10.8 0 0 0 14 8s-2.5-3-6-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <path d="M2 8s2.5-4.5 6-4.5 6 4.5 6 4.5-2.5 4.5-6 4.5-6-4.5-6-4.5z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
                      </svg>
                    )}
                  </button>

                  {/* Lock button */}
                  <button
                    type="button"
                    title={isLocked ? "Unlock layer" : "Lock layer"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLock?.(el.id);
                    }}
                    className={`w-4 h-4 flex items-center justify-center rounded transition-colors ${isLocked
                      ? "text-amber-500"
                      : "text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-600"
                      }`}
                  >
                    {isLocked ? (
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                        <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                        <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M5 7V5a3 3 0 0 1 5-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>

                  {/* Type icon */}
                  <span className={`shrink-0 ${isSelected ? "text-indigo-500" : "text-slate-400"}`}>
                    {typeIcon(el.type)}
                  </span>

                  {/* Layer name/label */}
                  <span className="flex-1 text-xs truncate">
                    {typeLabel(el)}
                  </span>

                  {/* Reorder & action buttons */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Bring to front */}
                    <button
                      title="Bring to Front"
                      disabled={origIdx === elements.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onBringToFront?.(el.id);
                      }}
                      className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                    >
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                        <path d="M2 2h8M6 10V4M3 6l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {/* Step Up */}
                    <button
                      title="Step Up"
                      disabled={origIdx === elements.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReorder(origIdx, origIdx + 1);
                      }}
                      className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-20"
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M4 6V2M2 4l2-2 2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {/* Step Down */}
                    <button
                      title="Step Down"
                      disabled={origIdx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReorder(origIdx, origIdx - 1);
                      }}
                      className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-700 disabled:opacity-20"
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M4 2v4M2 4l2 2 2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {/* Send to back */}
                    <button
                      title="Send to Back"
                      disabled={origIdx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSendToBack?.(el.id);
                      }}
                      className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-indigo-600 disabled:opacity-20"
                    >
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                        <path d="M2 10h8M6 2v6M3 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(el.id);
                      }}
                      className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-red-500"
                    >
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
