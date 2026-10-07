"use client";
import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { TopBar } from "./TopBar";
import { Toolbar } from "./Toolbar";
import { PropertiesPanel } from "./PropertiesPanel";
import { CanvasBrowser } from "./CanvasBrowser";
import { LayerPanel } from "./LayerPanel";
import { AuthModal } from "../auth/AuthModal";
import { useCanvasEditor } from "@/hooks/useCanvasEditor";
import { useAuth } from "@/context/AuthContext";
import type { CanvasStageHandle } from "./CanvasStage";

// Dynamically import the Konva stage to avoid SSR issues
const CanvasStage = dynamic(
  () => import("./CanvasStage").then((m) => m.CanvasStage),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        Loading canvas…
      </div>
    ),
  }
);

export function Editor() {
  const {
    state,
    setActiveTool,
    selectElement,
    addElement,
    updateElement,
    deleteElement,
    setCanvasName,
    setArtboard,
    loadCanvas,
    newCanvas,
    saveCanvas,
    reorderElements,
    bringToFront,
    sendToBack,
    toggleVisibility,
    toggleLock,
    snapshot,
    undo,
    redo,
  } = useCanvasEditor();

  const { isAuthenticated } = useAuth();
  const [browserOpen, setBrowserOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const stageRef = useRef<CanvasStageHandle>(null);
  const pendingExportRef = useRef(false);
  const pendingSaveRef = useRef(false);

  // Handle saving with auth check
  const handleSave = async () => {
    if (!isAuthenticated) {
      pendingSaveRef.current = true;
      setAuthModalOpen(true);
      return;
    }
    await saveCanvas();
  };

  // Export PNG handler with auth check
  const handleExportPng = () => {
    if (!isAuthenticated) {
      pendingExportRef.current = true;
      setAuthModalOpen(true);
      return;
    }
    stageRef.current?.exportPng(state.canvasName);
  };

  // Resume pending action once user authenticates
  const handleAuthSuccess = async () => {
    if (pendingExportRef.current) {
      pendingExportRef.current = false;
      setTimeout(() => {
        stageRef.current?.exportPng(state.canvasName);
      }, 200);
    }
    if (pendingSaveRef.current) {
      pendingSaveRef.current = false;
      await saveCanvas();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (!isInput) {
        if (e.key === "Delete" || e.key === "Backspace") {
          if (state.selectedId) {
            const el = state.elements.find((item) => item.id === state.selectedId);
            if (el && !el.locked) {
              deleteElement(state.selectedId);
            }
          }
          return;
        }
        if (e.key === "v" || e.key === "V") { setActiveTool("select"); return; }
        if (e.key === "r" || e.key === "R") { setActiveTool("rect"); return; }
        if (e.key === "c" || e.key === "C") { setActiveTool("circle"); return; }
        if (e.key === "t" || e.key === "T") { setActiveTool("text"); return; }
        if (e.key === "Escape") { selectElement(null); setActiveTool("select"); return; }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        undo();
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    state.selectedId,
    state.elements,
    deleteElement,
    setActiveTool,
    selectElement,
    undo,
    redo,
    isAuthenticated,
  ]);

  // Warn on unload if dirty
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state.isDirty]);

  const selectedElement = state.elements.find((el) => el.id === state.selectedId) ?? null;

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      <TopBar
        canvasName={state.canvasName}
        saveStatus={state.saveStatus}
        isDirty={state.isDirty}
        onNameChange={setCanvasName}
        onSave={handleSave}
        onNew={() => newCanvas(true)}
        onOpenBrowser={() => {
          if (!isAuthenticated) {
            setAuthModalOpen(true);
          } else {
            setBrowserOpen(true);
          }
        }}
        onExportPng={handleExportPng}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left toolbar */}
        <Toolbar
          activeTool={state.activeTool}
          hasSelection={!!state.selectedId && !selectedElement?.locked}
          canUndo={state.canUndo}
          canRedo={state.canRedo}
          onToolChange={setActiveTool}
          onDelete={() => state.selectedId && !selectedElement?.locked && deleteElement(state.selectedId)}
          onUndo={undo}
          onRedo={redo}
        />

        {/* Canvas area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <CanvasStage
            ref={stageRef}
            artboard={state.artboard}
            elements={state.elements}
            selectedId={state.selectedId}
            activeTool={state.activeTool}
            onSelect={selectElement}
            onAdd={(type, x, y) => {
              addElement(type, x, y);
            }}
            onUpdate={updateElement}
            onHistorySnapshot={snapshot}
          />
        </div>

        {/* Right side: layers + properties */}
        <div className="flex flex-col w-56 border-l border-slate-200 bg-white shrink-0 overflow-hidden">
          {/* Layer panel - top half */}
          <div className="flex flex-col border-b border-slate-200" style={{ maxHeight: "45%" }}>
            <LayerPanel
              elements={state.elements}
              selectedId={state.selectedId}
              onSelect={selectElement}
              onReorder={reorderElements}
              onBringToFront={bringToFront}
              onSendToBack={sendToBack}
              onToggleVisibility={toggleVisibility}
              onToggleLock={toggleLock}
              onDelete={deleteElement}
            />
          </div>

          {/* Properties panel - rest */}
          <div className="flex-1 overflow-y-auto">
            <PropertiesPanel
              element={selectedElement}
              artboard={state.artboard}
              onUpdateArtboard={setArtboard}
              onUpdate={updateElement}
              onDelete={deleteElement}
            />
          </div>
        </div>
      </div>

      {browserOpen && (
        <CanvasBrowser
          currentId={state.canvasId}
          onLoad={(canvas) => {
            if (state.isDirty && !window.confirm("You have unsaved changes. Load another canvas?")) return;
            loadCanvas(canvas);
          }}
          onClose={() => setBrowserOpen(false)}
        />
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => {
          setAuthModalOpen(false);
          pendingExportRef.current = false;
          pendingSaveRef.current = false;
        }}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}
