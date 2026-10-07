"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import type {
  CanvasElement,
  CanvasData,
  SaveStatus,
  ToolType,
  ArtboardDimensions,
} from "@/types/canvas";
import { api } from "@/lib/api";
import { createElement } from "@/lib/elements";

const DEFAULT_ARTBOARD: ArtboardDimensions = { width: 1200, height: 800 };
const MAX_HISTORY_STEPS = 50;
const STORAGE_KEY = "mini_canvas_current_session";

interface StoredSession {
  canvasId: string | null;
  canvasName: string;
  artboard: ArtboardDimensions;
  elements: CanvasElement[];
  isDirty: boolean;
}

export interface EditorState {
  canvasId: string | null;
  canvasName: string;
  artboard: ArtboardDimensions;
  elements: CanvasElement[];
  selectedId: string | null;
  activeTool: ToolType;
  saveStatus: SaveStatus;
  isDirty: boolean;
  version: number | null;
  canUndo: boolean;
  canRedo: boolean;
}

export function useCanvasEditor() {
  const [state, setState] = useState<EditorState>({
    canvasId: null,
    canvasName: "Untitled Canvas",
    artboard: DEFAULT_ARTBOARD,
    elements: [],
    selectedId: null,
    activeTool: "select",
    saveStatus: "idle",
    isDirty: false,
    version: null,
    canUndo: false,
    canRedo: false,
  });

  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false);
  const saveInFlight = useRef(false);
  const stateRef = useRef(state);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // History stacks stored per editor instance (NOT global module variables)
  const historyPastRef = useRef<CanvasElement[][]>([]);
  const historyFutureRef = useRef<CanvasElement[][]>([]);

  // Restore session from localStorage on mount so refresh does not lose work
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: StoredSession = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.elements)) {
          setState((s) => ({
            ...s,
            canvasId: parsed.canvasId ?? null,
            canvasName: parsed.canvasName || "Untitled Canvas",
            artboard: parsed.artboard || DEFAULT_ARTBOARD,
            elements: parsed.elements,
            isDirty: parsed.isDirty ?? false,
          }));
        }
      }
    } catch (e) {
      console.warn("Could not restore canvas session from localStorage:", e);
    }
    setIsLoadedFromStorage(true);
  }, []);

  // Persist session to localStorage on any canvas change
  useEffect(() => {
    if (!isLoadedFromStorage) return;
    try {
      const session: StoredSession = {
        canvasId: state.canvasId,
        canvasName: state.canvasName,
        artboard: state.artboard,
        elements: state.elements,
        isDirty: state.isDirty,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch (e) {
      console.warn("Could not save canvas session to localStorage:", e);
    }
  }, [
    state.canvasId,
    state.canvasName,
    state.artboard,
    state.elements,
    state.isDirty,
    isLoadedFromStorage,
  ]);

  // Keep stateRef up to date safely in an effect to comply with React 19 rules
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const updateHistoryFlags = useCallback(() => {
    setState((s) => ({
      ...s,
      canUndo: historyPastRef.current.length > 0,
      canRedo: historyFutureRef.current.length > 0,
    }));
  }, []);

  const clearHistory = useCallback(() => {
    historyPastRef.current = [];
    historyFutureRef.current = [];
    setState((s) => ({ ...s, canUndo: false, canRedo: false }));
  }, []);

  const snapshot = useCallback(() => {
    const current = stateRef.current.elements;
    historyPastRef.current.push([...current]);
    if (historyPastRef.current.length > MAX_HISTORY_STEPS) {
      historyPastRef.current.shift();
    }
    historyFutureRef.current = [];
    updateHistoryFlags();
  }, [updateHistoryFlags]);

  const setActiveTool = useCallback((tool: ToolType) => {
    setState((s) => ({ ...s, activeTool: tool, selectedId: null }));
  }, []);

  const selectElement = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedId: id }));
  }, []);

  const setElements = useCallback((elements: CanvasElement[]) => {
    setState((s) => ({
      ...s,
      elements,
      isDirty: true,
    }));
  }, []);

  const addElement = useCallback(
    (type: "rect" | "circle" | "text", x: number, y: number) => {
      snapshot();
      const el = createElement(type, x, y);
      setState((s) => ({
        ...s,
        elements: [...s.elements, el],
        selectedId: el.id,
        activeTool: "select",
        isDirty: true,
      }));
    },
    [snapshot]
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<CanvasElement>) => {
      setState((s) => ({
        ...s,
        elements: s.elements.map((el) =>
          el.id === id ? ({ ...el, ...patch } as CanvasElement) : el
        ),
        isDirty: true,
      }));
    },
    []
  );

  const deleteElement = useCallback(
    (id: string) => {
      snapshot();
      setState((s) => ({
        ...s,
        elements: s.elements.filter((el) => el.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
        isDirty: true,
      }));
    },
    [snapshot]
  );

  const setCanvasName = useCallback((name: string) => {
    setState((s) => ({ ...s, canvasName: name, isDirty: true }));
  }, []);

  const setArtboard = useCallback((artboard: ArtboardDimensions) => {
    snapshot();
    setState((s) => ({ ...s, artboard, isDirty: true }));
  }, [snapshot]);

  const loadCanvas = useCallback((canvas: CanvasData) => {
    clearHistory();
    setState({
      canvasId: canvas._id,
      canvasName: canvas.name,
      artboard: canvas.artboard,
      elements: canvas.elements,
      version: canvas.version ?? 1,
      selectedId: null,
      activeTool: "select",
      saveStatus: "idle",
      isDirty: false,
      canUndo: false,
      canRedo: false,
    });
  }, [clearHistory]);

  const newCanvas = useCallback(
    (confirmIfDirty: boolean = true) => {
      if (confirmIfDirty && stateRef.current.isDirty) {
        if (!window.confirm("You have unsaved changes. Start a new canvas anyway?")) {
          return;
        }
      }
      clearHistory();
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      setState({
        canvasId: null,
        canvasName: "Untitled Canvas",
        artboard: DEFAULT_ARTBOARD,
        elements: [],
        version: null,
        selectedId: null,
        activeTool: "select",
        saveStatus: "idle",
        isDirty: false,
        canUndo: false,
        canRedo: false,
      });
    },
    [clearHistory]
  );

  const saveCanvas = useCallback(async (): Promise<boolean> => {
    if (saveInFlight.current) return false;
    saveInFlight.current = true;
    setState((s) => ({ ...s, saveStatus: "saving" }));

    // Read current state via ref to avoid stale closure
    const snapshotData = stateRef.current;

    try {
      let saved: CanvasData;
      if (snapshotData.canvasId) {
        saved = await api.updateCanvas(snapshotData.canvasId, {
          name: snapshotData.canvasName,
          artboard: snapshotData.artboard,
          elements: snapshotData.elements,
          version: snapshotData.version ?? undefined,
        });
      } else {
        saved = await api.createCanvas({
          name: snapshotData.canvasName,
          artboard: snapshotData.artboard,
          elements: snapshotData.elements,
        });
      }

      setState((s) => ({
        ...s,
        canvasId: saved._id,
        version: saved.version ?? (s.version ? s.version + 1 : 1),
        saveStatus: "saved",
        isDirty: false,
      }));

      setTimeout(() => {
        setState((s) =>
          s.saveStatus === "saved" ? { ...s, saveStatus: "idle" } : s
        );
      }, 2500);
      return true;
    } catch {
      setState((s) => ({ ...s, saveStatus: "error" }));
      return false;
    } finally {
      saveInFlight.current = false;
    }
  }, []);

  // Autosave: debounce saveCanvas 1500ms after edits when canvas is dirty and exists
  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    if (state.isDirty && state.canvasId && state.saveStatus !== "saving") {
      autosaveTimerRef.current = setTimeout(() => {
        saveCanvas();
      }, 1500);
    }

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, [state.isDirty, state.canvasId, state.saveStatus, saveCanvas]);

  // Undo: restores complete elements state from past stack
  const undo = useCallback(() => {
    const prev = historyPastRef.current.pop();
    if (!prev) return;
    historyFutureRef.current.push([...stateRef.current.elements]);
    setState((s) => ({
      ...s,
      elements: prev,
      selectedId: prev.some((el) => el.id === s.selectedId) ? s.selectedId : null,
      isDirty: true,
    }));
    updateHistoryFlags();
  }, [updateHistoryFlags]);

  // Redo: restores complete elements state from future stack
  const redo = useCallback(() => {
    const next = historyFutureRef.current.pop();
    if (!next) return;
    historyPastRef.current.push([...stateRef.current.elements]);
    setState((s) => ({
      ...s,
      elements: next,
      selectedId: next.some((el) => el.id === s.selectedId) ? s.selectedId : null,
      isDirty: true,
    }));
    updateHistoryFlags();
  }, [updateHistoryFlags]);

  // Layer Actions
  const reorderElements = useCallback(
    (fromIndex: number, toIndex: number) => {
      snapshot();
      setState((s) => {
        const els = [...s.elements];
        const [moved] = els.splice(fromIndex, 1);
        els.splice(toIndex, 0, moved);
        return { ...s, elements: els, isDirty: true };
      });
    },
    [snapshot]
  );

  const bringToFront = useCallback(
    (id: string) => {
      snapshot();
      setState((s) => {
        const index = s.elements.findIndex((el) => el.id === id);
        if (index === -1 || index === s.elements.length - 1) return s;
        const els = [...s.elements];
        const [moved] = els.splice(index, 1);
        els.push(moved);
        return { ...s, elements: els, isDirty: true };
      });
    },
    [snapshot]
  );

  const sendToBack = useCallback(
    (id: string) => {
      snapshot();
      setState((s) => {
        const index = s.elements.findIndex((el) => el.id === id);
        if (index === -1 || index === 0) return s;
        const els = [...s.elements];
        const [moved] = els.splice(index, 1);
        els.unshift(moved);
        return { ...s, elements: els, isDirty: true };
      });
    },
    [snapshot]
  );

  const toggleVisibility = useCallback(
    (id: string) => {
      snapshot();
      setState((s) => ({
        ...s,
        elements: s.elements.map((el) =>
          el.id === id ? { ...el, visible: el.visible === false ? true : false } : el
        ),
        selectedId: s.selectedId === id ? null : s.selectedId,
        isDirty: true,
      }));
    },
    [snapshot]
  );

  const toggleLock = useCallback(
    (id: string) => {
      snapshot();
      setState((s) => ({
        ...s,
        elements: s.elements.map((el) =>
          el.id === id ? { ...el, locked: !el.locked } : el
        ),
        isDirty: true,
      }));
    },
    [snapshot]
  );

  return {
    state,
    setActiveTool,
    selectElement,
    addElement,
    updateElement,
    deleteElement,
    setElements,
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
  };
}