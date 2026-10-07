"use client";
import React, { useRef, useCallback, useEffect, forwardRef, useImperativeHandle, useState } from "react";
import type Konva from "konva";
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Text,
  Transformer,
  Line,
} from "react-konva";
import type {
  CanvasElement,
  RectElement,
  CircleElement,
  TextElement,
  ArtboardDimensions,
  ToolType,
} from "@/types/canvas";

export interface CanvasStageHandle {
  exportPng: (filename?: string) => void;
}

interface CanvasStageProps {
  artboard: ArtboardDimensions;
  elements: CanvasElement[];
  selectedId: string | null;
  activeTool: ToolType;
  onSelect: (id: string | null) => void;
  onAdd: (type: "rect" | "circle" | "text", x: number, y: number) => void;
  onUpdate: (id: string, patch: Partial<CanvasElement>) => void;
  onHistorySnapshot: () => void;
}

interface GuideLine {
  points: number[];
  orientation: "V" | "H";
}

const SNAP_THRESHOLD = 6;

/** Normalize a Konva node after transformer resize: absorb scaleX/scaleY into dimensions */
function normalizeNode(
  node: Konva.Node,
  el: CanvasElement
): Partial<CanvasElement> {
  const scaleX = node.scaleX();
  const scaleY = node.scaleY();
  node.scaleX(1);
  node.scaleY(1);

  if (el.type === "rect") {
    const rect = el as RectElement;
    return {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      width: Math.max(1, Math.abs(rect.width * scaleX)),
      height: Math.max(1, Math.abs(rect.height * scaleY)),
    };
  }
  if (el.type === "circle") {
    const circle = el as CircleElement;
    const scale = (scaleX + scaleY) / 2;
    return {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      radius: Math.max(1, circle.radius * scale),
    };
  }
  if (el.type === "text") {
    const text = el as TextElement;
    return {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      width: Math.max(20, Math.abs(text.width * scaleX)),
      fontSize: Math.max(6, Math.abs(text.fontSize * scaleY)),
    };
  }
  return { x: node.x(), y: node.y(), rotation: node.rotation() };
}

/** Collect snapping lines from artboard and all other elements */
function getLineGuideStops(
  skipId: string,
  elements: CanvasElement[],
  artboard: ArtboardDimensions
) {
  // Snap to artboard boundaries and center
  const vertical = [0, Math.round(artboard.width / 2), artboard.width];
  const horizontal = [0, Math.round(artboard.height / 2), artboard.height];

  // Snap to edges and centers of other visible elements
  elements.forEach((el) => {
    if (el.id === skipId || el.visible === false) return;

    if (el.type === "rect") {
      const r = el as RectElement;
      vertical.push(Math.round(r.x), Math.round(r.x + r.width / 2), Math.round(r.x + r.width));
      horizontal.push(Math.round(r.y), Math.round(r.y + r.height / 2), Math.round(r.y + r.height));
    } else if (el.type === "circle") {
      const c = el as CircleElement;
      vertical.push(Math.round(c.x - c.radius), Math.round(c.x), Math.round(c.x + c.radius));
      horizontal.push(Math.round(c.y - c.radius), Math.round(c.y), Math.round(c.y + c.radius));
    } else if (el.type === "text") {
      const t = el as TextElement;
      const h = Math.round(t.fontSize * 1.3);
      vertical.push(Math.round(t.x), Math.round(t.x + t.width / 2), Math.round(t.x + t.width));
      horizontal.push(Math.round(t.y), Math.round(t.y + h / 2), Math.round(t.y + h));
    }
  });

  return { vertical, horizontal };
}

/** Get bounding box and alignment edges for currently dragged node */
function getObjectSnappingEdges(node: Konva.Node) {
  const box = node.getClientRect({ relativeTo: node.getLayer() ?? undefined });
  const absX = node.x();
  const absY = node.y();

  return {
    vertical: [
      {
        guide: Math.round(box.x),
        offset: Math.round(absX - box.x),
        snap: "start",
      },
      {
        guide: Math.round(box.x + box.width / 2),
        offset: Math.round(absX - (box.x + box.width / 2)),
        snap: "center",
      },
      {
        guide: Math.round(box.x + box.width),
        offset: Math.round(absX - (box.x + box.width)),
        snap: "end",
      },
    ],
    horizontal: [
      {
        guide: Math.round(box.y),
        offset: Math.round(absY - box.y),
        snap: "start",
      },
      {
        guide: Math.round(box.y + box.height / 2),
        offset: Math.round(absY - (box.y + box.height / 2)),
        snap: "center",
      },
      {
        guide: Math.round(box.y + box.height),
        offset: Math.round(absY - (box.y + box.height)),
        snap: "end",
      },
    ],
  };
}

/** Find closest matching guidelines within SNAP_THRESHOLD */
function getGuides(
  lineGuideStops: { vertical: number[]; horizontal: number[] },
  itemBounds: ReturnType<typeof getObjectSnappingEdges>,
  artboard: ArtboardDimensions
) {
  const resultV: { lineGuide: number; diff: number; snap: string; offset: number }[] = [];
  const resultH: { lineGuide: number; diff: number; snap: string; offset: number }[] = [];

  lineGuideStops.vertical.forEach((lineGuide) => {
    itemBounds.vertical.forEach((itemBound) => {
      const diff = Math.abs(lineGuide - itemBound.guide);
      if (diff <= SNAP_THRESHOLD) {
        resultV.push({ lineGuide, diff, snap: itemBound.snap, offset: itemBound.offset });
      }
    });
  });

  lineGuideStops.horizontal.forEach((lineGuide) => {
    itemBounds.horizontal.forEach((itemBound) => {
      const diff = Math.abs(lineGuide - itemBound.guide);
      if (diff <= SNAP_THRESHOLD) {
        resultH.push({ lineGuide, diff, snap: itemBound.snap, offset: itemBound.offset });
      }
    });
  });

  const guides: GuideLine[] = [];
  const minV = resultV.sort((a, b) => a.diff - b.diff)[0];
  const minH = resultH.sort((a, b) => a.diff - b.diff)[0];

  if (minV) {
    guides.push({
      points: [minV.lineGuide, 0, minV.lineGuide, artboard.height],
      orientation: "V",
    });
  }

  if (minH) {
    guides.push({
      points: [0, minH.lineGuide, artboard.width, minH.lineGuide],
      orientation: "H",
    });
  }

  return { guides, minV, minH };
}

function RectShape({
  el,
  onSelect,
  onUpdate,
  onPointerDown,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  el: RectElement;
  onSelect: () => void;
  onUpdate: (patch: Partial<CanvasElement>) => void;
  onPointerDown: (node?: Konva.Node) => void;
  onDragStart: (node?: Konva.Node) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}) {
  const ref = useRef<Konva.Rect>(null);

  if (el.visible === false) return null;

  return (
    <Rect
      ref={ref}
      id={el.id}
      x={el.x}
      y={el.y}
      width={el.width}
      height={el.height}
      cornerRadius={el.cornerRadius ?? 0}
      rotation={el.rotation}
      fill={el.fill}
      opacity={el.opacity}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth ?? 0}
      shadowColor={el.shadowColor}
      shadowBlur={el.shadowBlur ?? 0}
      shadowOffset={
        el.shadowOffsetX || el.shadowOffsetY
          ? { x: el.shadowOffsetX ?? 0, y: el.shadowOffsetY ?? 0 }
          : undefined
      }
      shadowOpacity={el.shadowColor ? 0.75 : 0}
      draggable={!el.locked}
      onMouseDown={() => onPointerDown(ref.current ?? undefined)}
      onTouchStart={() => onPointerDown(ref.current ?? undefined)}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={() => onDragStart(ref.current ?? undefined)}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformStart={() => onDragStart(ref.current ?? undefined)}
      onTransformEnd={() => {
        if (!ref.current) return;
        onUpdate(normalizeNode(ref.current, el));
      }}
    />
  );
}

function CircleShape({
  el,
  onSelect,
  onUpdate,
  onPointerDown,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  el: CircleElement;
  onSelect: () => void;
  onUpdate: (patch: Partial<CanvasElement>) => void;
  onPointerDown: (node?: Konva.Node) => void;
  onDragStart: (node?: Konva.Node) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}) {
  const ref = useRef<Konva.Circle>(null);

  if (el.visible === false) return null;

  return (
    <Circle
      ref={ref}
      id={el.id}
      x={el.x}
      y={el.y}
      radius={el.radius}
      rotation={el.rotation}
      fill={el.fill}
      opacity={el.opacity}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth ?? 0}
      shadowColor={el.shadowColor}
      shadowBlur={el.shadowBlur ?? 0}
      shadowOffset={
        el.shadowOffsetX || el.shadowOffsetY
          ? { x: el.shadowOffsetX ?? 0, y: el.shadowOffsetY ?? 0 }
          : undefined
      }
      shadowOpacity={el.shadowColor ? 0.75 : 0}
      draggable={!el.locked}
      onMouseDown={() => onPointerDown(ref.current ?? undefined)}
      onTouchStart={() => onPointerDown(ref.current ?? undefined)}
      onClick={onSelect}
      onTap={onSelect}
      onDragStart={() => onDragStart(ref.current ?? undefined)}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformStart={() => onDragStart(ref.current ?? undefined)}
      onTransformEnd={() => {
        if (!ref.current) return;
        onUpdate(normalizeNode(ref.current, el));
      }}
    />
  );
}

function TextShape({
  el,
  isEditing,
  onSelect,
  onDblClick,
  onUpdate,
  onPointerDown,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  el: TextElement;
  isEditing?: boolean;
  onSelect: () => void;
  onDblClick: () => void;
  onUpdate: (patch: Partial<CanvasElement>) => void;
  onPointerDown: (node?: Konva.Node) => void;
  onDragStart: (node?: Konva.Node) => void;
  onDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}) {
  const ref = useRef<Konva.Text>(null);

  if (el.visible === false) return null;

  return (
    <Text
      ref={ref}
      id={el.id}
      x={el.x}
      y={el.y}
      text={el.text}
      fontSize={el.fontSize}
      width={el.width}
      rotation={el.rotation}
      fill={el.fill}
      opacity={isEditing ? 0 : el.opacity}
      stroke={el.stroke}
      strokeWidth={el.strokeWidth ?? 0}
      shadowColor={el.shadowColor}
      shadowBlur={el.shadowBlur ?? 0}
      shadowOffset={
        el.shadowOffsetX || el.shadowOffsetY
          ? { x: el.shadowOffsetX ?? 0, y: el.shadowOffsetY ?? 0 }
          : undefined
      }
      shadowOpacity={el.shadowColor ? 0.75 : 0}
      fontFamily="Inter, system-ui, sans-serif"
      draggable={!el.locked && !isEditing}
      onMouseDown={() => onPointerDown(ref.current ?? undefined)}
      onTouchStart={() => onPointerDown(ref.current ?? undefined)}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
      onDragStart={() => onDragStart(ref.current ?? undefined)}
      onDragMove={onDragMove}
      onDragEnd={onDragEnd}
      onTransformStart={() => onDragStart(ref.current ?? undefined)}
      onTransformEnd={() => {
        if (!ref.current) return;
        onUpdate(normalizeNode(ref.current, el));
      }}
    />
  );
}

export const CanvasStage = forwardRef<CanvasStageHandle, CanvasStageProps>(
  function CanvasStage(
    {
      artboard,
      elements,
      selectedId,
      activeTool,
      onSelect,
      onAdd,
      onUpdate,
      onHistorySnapshot,
    },
    ref
  ) {
    const transformerRef = useRef<Konva.Transformer>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);
    const [guides, setGuides] = useState<GuideLine[]>([]);

    // Viewport & Ergonomics: Infinite Pan & Zoom
    const [zoom, setZoom] = useState<number>(1);
    const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isSpaceDown, setIsSpaceDown] = useState(false);
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef<{ x: number; y: number; mouseX: number; mouseY: number }>({
      x: 0,
      y: 0,
      mouseX: 0,
      mouseY: 0,
    });

    // In-place text editing state
    const [editingTextId, setEditingTextId] = useState<string | null>(null);
    const [editingTextValue, setEditingTextValue] = useState("");

    const handleCommitText = useCallback(() => {
      if (editingTextId) {
        onUpdate(editingTextId, { text: editingTextValue } as Partial<CanvasElement>);
        setEditingTextId(null);
      }
    }, [editingTextId, editingTextValue, onUpdate]);

    useEffect(() => {
      if (editingTextId && textAreaRef.current) {
        textAreaRef.current.focus();
        textAreaRef.current.select();
      }
    }, [editingTextId]);

    // Zoom to Fit calculation
    const handleZoomToFit = useCallback(() => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const padding = 60;
      const availableW = Math.max(100, rect.width - padding);
      const availableH = Math.max(100, rect.height - padding);
      const fitScale = Math.min(availableW / artboard.width, availableH / artboard.height, 1);
      setZoom(Math.max(0.1, Number(fitScale.toFixed(2))));
      setPan({ x: 0, y: 0 });
    }, [artboard]);

    // Keyboard shortcuts: Spacebar for pan, Ctrl+0 for 100%, Shift+1 for fit
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA"
        ) {
          return;
        }

        if (e.code === "Space" && !e.repeat) {
          e.preventDefault();
          setIsSpaceDown(true);
        }

        if ((e.ctrlKey || e.metaKey) && e.key === "0") {
          e.preventDefault();
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }

        if (e.shiftKey && (e.key === "!" || e.key === "1")) {
          e.preventDefault();
          handleZoomToFit();
        }
      };

      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === "Space") {
          setIsSpaceDown(false);
          setIsPanning(false);
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }, [handleZoomToFit]);

    // Wheel zooming & 2-finger panning on container
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const handleWheel = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
          setZoom((prev) => {
            return Math.min(5.0, Math.max(0.1, Number((prev * zoomFactor).toFixed(2))));
          });
        } else {
          e.preventDefault();
          setPan((prev) => ({
            x: prev.x - e.deltaX,
            y: prev.y - e.deltaY,
          }));
        }
      };

      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => {
        container.removeEventListener("wheel", handleWheel);
      };
    }, []);

    // Mouse drag pan (Middle-click or Space + Left-click)
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button === 1 || (isSpaceDown && e.button === 0)) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
          x: pan.x,
          y: pan.y,
          mouseX: e.clientX,
          mouseY: e.clientY,
        };
      }
    };

    useEffect(() => {
      if (!isPanning) return;

      const handleMouseMove = (e: MouseEvent) => {
        const dx = e.clientX - panStartRef.current.mouseX;
        const dy = e.clientY - panStartRef.current.mouseY;
        setPan({
          x: panStartRef.current.x + dx,
          y: panStartRef.current.y + dy,
        });
      };

      const handleMouseUp = () => {
        setIsPanning(false);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }, [isPanning]);

    // Expose exportPng method through ref
    useImperativeHandle(ref, () => ({
      exportPng: (filename?: string) => {
        const stage = stageRef.current;
        const tr = transformerRef.current;
        if (!stage) return;

        setGuides([]); // Clear guidelines before export

        // Hide transformer temporarily so outline doesn't show in PNG
        const prevNodes = tr?.nodes() ?? [];
        tr?.nodes([]);
        tr?.getLayer()?.batchDraw();

        const dataUrl = stage.toDataURL({
          x: 0,
          y: 0,
          width: artboard.width,
          height: artboard.height,
          pixelRatio: 2,
        });

        // Restore transformer
        tr?.nodes(prevNodes);
        tr?.getLayer()?.batchDraw();

        const link = document.createElement("a");
        link.download = `${filename || "canvas"}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
    }));

    // Attach transformer to selected node if not locked and not editing text
    useEffect(() => {
      const tr = transformerRef.current;
      const stage = stageRef.current;
      if (!tr || !stage) return;

      if (selectedId && !editingTextId) {
        const selectedEl = elements.find((e) => e.id === selectedId);
        if (selectedEl && !selectedEl.locked && selectedEl.visible !== false) {
          const node = stage.findOne(`#${selectedId}`);
          if (node) {
            tr.nodes([node]);
            tr.getLayer()?.batchDraw();
            return;
          }
        }
      }

      tr.nodes([]);
      tr.getLayer()?.batchDraw();
    }, [selectedId, editingTextId, elements]);

    const handleStageClick = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        if (isSpaceDown || isPanning) return;
        const stage = e.target.getStage();
        if (!stage) return;

        // Clicked on empty stage or artboard background
        if (e.target === stage || e.target.name() === "artboard-bg") {
          if (activeTool !== "select") {
            const pos = stage.getPointerPosition();
            if (!pos) return;
            onAdd(activeTool as "rect" | "circle" | "text", pos.x, pos.y);
          } else {
            onSelect(null);
          }
        }
      },
      [activeTool, isSpaceDown, isPanning, onAdd, onSelect]
    );

    const handlePointerDown = useCallback(
      (elId: string, node?: Konva.Node) => {
        if (isSpaceDown || isPanning) return;
        if (selectedId !== elId) {
          onSelect(elId);
          if (node && transformerRef.current) {
            transformerRef.current.nodes([node]);
            transformerRef.current.getLayer()?.batchDraw();
          }
        }
      },
      [selectedId, isSpaceDown, isPanning, onSelect]
    );

    const handleDragStart = useCallback(
      (elId: string, node?: Konva.Node) => {
        if (isSpaceDown || isPanning) return;
        onHistorySnapshot();
        setGuides([]);
        onSelect(elId);
        if (node && transformerRef.current) {
          transformerRef.current.nodes([node]);
          transformerRef.current.getLayer()?.batchDraw();
        }
      },
      [onHistorySnapshot, onSelect, isSpaceDown, isPanning]
    );

    const handleDragMove = useCallback(
      (e: Konva.KonvaEventObject<DragEvent>, elId: string) => {
        const node = e.target;
        const stops = getLineGuideStops(elId, elements, artboard);
        const bounds = getObjectSnappingEdges(node);
        const { guides: newGuides, minV, minH } = getGuides(stops, bounds, artboard);

        // Snap node coordinates if guide exists
        if (minV) {
          node.x(minV.lineGuide + minV.offset);
        }
        if (minH) {
          node.y(minH.lineGuide + minH.offset);
        }

        // Keep transformer lines, corner anchors and rotation handle strictly synced with moving shape
        if (transformerRef.current) {
          transformerRef.current.update();
        }

        setGuides(newGuides);
      },
      [elements, artboard]
    );

    const handleDragEnd = useCallback(
      (e: Konva.KonvaEventObject<DragEvent>, el: CanvasElement) => {
        setGuides([]);
        const node = e.target;
        onUpdate(el.id, { x: node.x(), y: node.y() } as Partial<CanvasElement>);
        if (transformerRef.current) {
          transformerRef.current.update();
          transformerRef.current.getLayer()?.batchDraw();
        }
      },
      [onUpdate]
    );

    const selectedEl = elements.find((el) => el.id === selectedId) ?? null;
    const editingEl = elements.find((el) => el.id === editingTextId && el.type === "text") as TextElement | undefined;

    // Transformer config per element type - 4 corner anchors + rotation anchor matching user screenshot
    const trConfig = {
      enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right"] as string[],
      keepRatio: selectedEl?.type === "circle",
    };

    return (
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden select-none"
        onMouseDown={handleMouseDown}
        style={{
          backgroundColor: "#e2e8f0",
          backgroundImage: "radial-gradient(#94a3b8 1.2px, transparent 1.2px)",
          backgroundSize: `${Math.max(12, Math.round(20 * zoom))}px ${Math.max(12, Math.round(20 * zoom))}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          cursor: isPanning
            ? "grabbing"
            : isSpaceDown
            ? "grab"
            : activeTool !== "select"
            ? "crosshair"
            : "default",
        }}
      >
        {/* Artboard Container with GPU-accelerated Pan & Zoom */}
        <div
          className="absolute shadow-2xl transition-transform duration-75 ease-out"
          style={{
            left: "50%",
            top: "50%",
            width: artboard.width,
            height: artboard.height,
            marginLeft: -artboard.width / 2,
            marginTop: -artboard.height / 2,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            willChange: "transform",
          }}
        >
          <Stage
            ref={stageRef}
            width={artboard.width}
            height={artboard.height}
            onClick={handleStageClick}
            onTap={(e) => handleStageClick(e as unknown as Konva.KonvaEventObject<MouseEvent | TouchEvent>)}
            style={{ cursor: activeTool !== "select" ? "crosshair" : "default" }}
          >
            {/* Layer 1: Artboard background (drawn once, independent canvas) */}
            <Layer id="background-layer">
              <Rect
                name="artboard-bg"
                x={0}
                y={0}
                width={artboard.width}
                height={artboard.height}
                fill="white"
                listening={true}
              />
            </Layer>

            {/* Layer 2: Main Design Content (all shapes) */}
            <Layer id="content-layer">
              {elements.map((el) => {
                const handleUpdate = (patch: Partial<CanvasElement>) =>
                  onUpdate(el.id, patch);

                if (el.type === "rect") {
                  return (
                    <RectShape
                      key={el.id}
                      el={el as RectElement}
                      onSelect={() => onSelect(el.id)}
                      onUpdate={handleUpdate}
                      onPointerDown={(node) => handlePointerDown(el.id, node)}
                      onDragStart={(node) => handleDragStart(el.id, node)}
                      onDragMove={(e) => handleDragMove(e, el.id)}
                      onDragEnd={(e) => handleDragEnd(e, el)}
                    />
                  );
                }
                if (el.type === "circle") {
                  return (
                    <CircleShape
                      key={el.id}
                      el={el as CircleElement}
                      onSelect={() => onSelect(el.id)}
                      onUpdate={handleUpdate}
                      onPointerDown={(node) => handlePointerDown(el.id, node)}
                      onDragStart={(node) => handleDragStart(el.id, node)}
                      onDragMove={(e) => handleDragMove(e, el.id)}
                      onDragEnd={(e) => handleDragEnd(e, el)}
                    />
                  );
                }
                if (el.type === "text") {
                  return (
                    <TextShape
                      key={el.id}
                      el={el as TextElement}
                      isEditing={editingTextId === el.id}
                      onSelect={() => onSelect(el.id)}
                      onDblClick={() => {
                        setEditingTextId(el.id);
                        setEditingTextValue((el as TextElement).text);
                      }}
                      onUpdate={handleUpdate}
                      onPointerDown={(node) => handlePointerDown(el.id, node)}
                      onDragStart={(node) => handleDragStart(el.id, node)}
                      onDragMove={(e) => handleDragMove(e, el.id)}
                      onDragEnd={(e) => handleDragEnd(e, el)}
                    />
                  );
                }
                return null;
              })}
            </Layer>

            {/* Layer 3: Dynamic Smart Alignment Guidelines */}
            <Layer id="overlay-layer" listening={false}>
              {guides.map((g, idx) => (
                <Line
                  key={`guide-${idx}`}
                  points={g.points}
                  stroke="#ec4899"
                  strokeWidth={1}
                  dash={[4, 3]}
                  listening={false}
                  perfectDrawEnabled={false}
                />
              ))}
            </Layer>

            {/* Layer 4: Transformer Controls & Bounding Box */}
            <Layer id="controls-layer">
              <Transformer
                ref={transformerRef}
                {...trConfig}
                boundBoxFunc={(oldBox, newBox) => {
                  if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                    return oldBox;
                  }
                  return newBox;
                }}
                anchorSize={9}
                anchorCornerRadius={2.5}
                anchorFill="#ffffff"
                anchorStroke="#6366f1"
                anchorStrokeWidth={1.5}
                borderStroke="#6366f1"
                borderStrokeWidth={1.5}
                rotateAnchorOffset={24}
                anchorStyleFunc={(anchor) => {
                  anchor.cornerRadius(2.5);
                  anchor.fill("#ffffff");
                  anchor.stroke("#6366f1");
                  anchor.strokeWidth(1.5);
                }}
              />
            </Layer>
          </Stage>

          {/* In-Place Text Editor Overlay */}
          {editingEl && (
            <textarea
              ref={textAreaRef}
              value={editingTextValue}
              onChange={(e) => setEditingTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleCommitText();
                }
              }}
              onBlur={handleCommitText}
              style={{
                position: "absolute",
                left: `${editingEl.x}px`,
                top: `${editingEl.y}px`,
                width: `${Math.max(60, editingEl.width)}px`,
                fontSize: `${editingEl.fontSize}px`,
                lineHeight: 1.2,
                color: editingEl.fill,
                transform: `rotate(${editingEl.rotation || 0}deg)`,
                transformOrigin: "top left",
                background: "rgba(255, 255, 255, 0.95)",
                outline: "2px solid #6366f1",
                outlineOffset: "2px",
                borderRadius: "3px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                border: "none",
                resize: "none",
                overflow: "hidden",
                fontFamily: "Inter, system-ui, sans-serif",
                zIndex: 60,
                padding: "2px 4px",
                margin: 0,
              }}
            />
          )}
        </div>

        {/* Floating Zoom & Viewport HUD */}
        <div className="absolute bottom-4 right-4 z-40 flex items-center gap-1 bg-white/90 backdrop-blur-md border border-slate-200/90 shadow-lg rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-700 select-none">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.1, Number((z - 0.15).toFixed(2))))}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            title="Zoom Out"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 8a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H2.75A.75.75 0 012 8z" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="px-2 py-0.5 rounded-lg hover:bg-slate-100 text-slate-700 font-mono text-[11px] min-w-[50px] text-center transition-colors"
            title="Reset to 100% (Ctrl 0)"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(5.0, Number((z + 0.15).toFixed(2))))}
            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
            title="Zoom In"
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z" />
            </svg>
          </button>

          <div className="w-[1px] h-3.5 bg-slate-200 mx-0.5" />

          <button
            type="button"
            onClick={handleZoomToFit}
            className="px-2 py-0.5 rounded-lg hover:bg-slate-100 text-[11px] text-slate-600 font-medium transition-colors"
            title="Zoom to Fit Artboard (Shift 1)"
          >
            Fit
          </button>
        </div>
      </div>
    );
  }
);

