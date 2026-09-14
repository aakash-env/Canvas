"use client";
import { useCallback, useRef, useState } from "react";
import type { CanvasElement } from "@/types/canvas";

export interface HistoryEntry {
  elements: CanvasElement[];
}

export function useHistory(
  getElements: () => CanvasElement[],
  setElements: (els: CanvasElement[]) => void
) {
  const past = useRef<HistoryEntry[]>([]);
  const future = useRef<HistoryEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateFlags = useCallback(() => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  }, []);

  const snapshot = useCallback(() => {
    past.current.push({ elements: getElements() });
    if (past.current.length > 50) past.current.shift();
    future.current = [];
    updateFlags();
  }, [getElements, updateFlags]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push({ elements: getElements() });
    setElements(prev.elements);
    updateFlags();
  }, [getElements, setElements, updateFlags]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    past.current.push({ elements: getElements() });
    setElements(next.elements);
    updateFlags();
  }, [getElements, setElements, updateFlags]);

  const clear = useCallback(() => {
    past.current = [];
    future.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return { snapshot, undo, redo, clear, canUndo, canRedo };
}