"use client";
import React from "react";
import type {
  CanvasElement,
  RectElement,
  CircleElement,
  TextElement,
  ArtboardDimensions,
} from "@/types/canvas";

interface PropertiesPanelProps {
  element: CanvasElement | null;
  artboard?: ArtboardDimensions;
  onUpdateArtboard?: (artboard: ArtboardDimensions) => void;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
  onDelete: (id: string) => void;
}

const ARTBOARD_PRESETS = [
  { label: "Default", width: 1200, height: 800 },
  { label: "Square (1:1)", width: 1080, height: 1080 },
  { label: "Full HD (16:9)", width: 1920, height: 1080 },
  { label: "Twitter Banner", width: 1500, height: 500 },
  { label: "Dribbble Shot", width: 1600, height: 1200 },
];

function NumInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      <input
        type="number"
        value={Math.round(value * 100) / 100}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        onKeyDown={(e) => e.stopPropagation()}
        className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors"
      />
    </div>
  );
}

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value.startsWith("#") ? value : "#6366f1"}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-md border border-slate-200 cursor-pointer p-0.5 bg-white"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.stopPropagation()}
          className="flex-1 px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 font-mono transition-colors"
        />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function PropertiesPanel({
  element,
  artboard,
  onUpdateArtboard,
  onUpdate,
  onDelete,
}: PropertiesPanelProps) {
  if (!element) {
    return (
      <aside className="w-56 bg-white border-l border-slate-200 flex flex-col shrink-0 h-full overflow-y-auto">
        <div className="px-4 py-3 border-b border-slate-100">
          <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Artboard
          </h2>
          <p className="text-[10px] text-slate-400 mt-0.5">Canvas Dimensions</p>
        </div>

        {artboard && onUpdateArtboard ? (
          <div className="flex flex-col gap-4 px-4 py-3">
            <Section title="Dimensions">
              <div className="grid grid-cols-2 gap-2">
                <NumInput
                  label="Width"
                  value={artboard.width}
                  min={100}
                  max={5000}
                  step={10}
                  onChange={(w) => onUpdateArtboard({ ...artboard, width: Math.max(100, Math.min(5000, w)) })}
                />
                <NumInput
                  label="Height"
                  value={artboard.height}
                  min={100}
                  max={5000}
                  step={10}
                  onChange={(h) => onUpdateArtboard({ ...artboard, height: Math.max(100, Math.min(5000, h)) })}
                />
              </div>
            </Section>

            <Section title="Presets">
              <div className="flex flex-col gap-1.5">
                {ARTBOARD_PRESETS.map((p) => {
                  const isActive = artboard.width === p.width && artboard.height === p.height;
                  return (
                    <button
                      key={p.label}
                      onClick={() => onUpdateArtboard({ width: p.width, height: p.height })}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-200"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                      }`}
                    >
                      <span>{p.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {p.width}×{p.height}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <div className="pt-2 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400">
                Click any canvas shape to inspect and adjust its properties
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-xs font-medium text-slate-500">No element selected</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Click an element or use the toolbar to add one
            </p>
          </div>
        )}
      </aside>
    );
  }

  const update = (patch: Partial<CanvasElement>) => onUpdate(element.id, patch);

  const typeLabel =
    element.type === "rect"
      ? "Rectangle"
      : element.type === "circle"
      ? "Circle"
      : "Text";

  return (
    <aside className="w-56 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold text-slate-700">{typeLabel}</h2>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{element.id.slice(0, 8)}…</p>
        </div>
        <div className="flex items-center gap-1.5">
          {element.locked && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium">
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Locked
            </span>
          )}
          <button
            onClick={() => onDelete(element.id)}
            disabled={element.locked}
            title={element.locked ? "Element is locked" : "Delete element"}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 3h9M5 3V2h3v1M4 3v6a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5 px-4 py-4">
        {/* Position */}
        <Section title="Position">
          <div className="grid grid-cols-2 gap-2">
            <NumInput label="X" value={element.x} onChange={(v) => update({ x: v } as Partial<CanvasElement>)} step={0.5} />
            <NumInput label="Y" value={element.y} onChange={(v) => update({ y: v } as Partial<CanvasElement>)} step={0.5} />
          </div>
          <NumInput
            label="Rotation"
            value={element.rotation}
            onChange={(v) => update({ rotation: v } as Partial<CanvasElement>)}
            min={-360}
            max={360}
          />
        </Section>

        {/* Size */}
        <Section title="Size">
          {element.type === "rect" && (
            <div className="grid grid-cols-2 gap-2">
              <NumInput
                label="W"
                value={(element as RectElement).width}
                min={1}
                onChange={(v) => update({ width: Math.max(1, v) } as Partial<CanvasElement>)}
              />
              <NumInput
                label="H"
                value={(element as RectElement).height}
                min={1}
                onChange={(v) => update({ height: Math.max(1, v) } as Partial<CanvasElement>)}
              />
            </div>
          )}
          {element.type === "circle" && (
            <NumInput
              label="Radius"
              value={(element as CircleElement).radius}
              min={1}
              onChange={(v) => update({ radius: Math.max(1, v) } as Partial<CanvasElement>)}
            />
          )}
          {element.type === "text" && (
            <NumInput
              label="Width"
              value={(element as TextElement).width}
              min={20}
              onChange={(v) => update({ width: Math.max(20, v) } as Partial<CanvasElement>)}
            />
          )}
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <ColorInput
            label={element.type === "text" ? "Text Color" : "Fill"}
            value={element.fill}
            onChange={(v) => update({ fill: v } as Partial<CanvasElement>)}
          />
          <NumInput
            label="Opacity"
            value={element.opacity * 100}
            min={0}
            max={100}
            onChange={(v) => update({ opacity: Math.min(1, Math.max(0, v / 100)) } as Partial<CanvasElement>)}
          />
        </Section>

        {/* Text-specific */}
        {element.type === "text" && (
          <Section title="Text">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Content
              </label>
              <textarea
                value={(element as TextElement).text}
                rows={3}
                onChange={(e) => update({ text: e.target.value } as Partial<CanvasElement>)}
                onKeyDown={(e) => e.stopPropagation()}
                className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 resize-none transition-colors"
              />
            </div>
            <NumInput
              label="Font Size"
              value={(element as TextElement).fontSize}
              min={6}
              max={500}
              onChange={(v) => update({ fontSize: Math.max(6, v) } as Partial<CanvasElement>)}
            />
          </Section>
        )}
      </div>
    </aside>
  );
}
