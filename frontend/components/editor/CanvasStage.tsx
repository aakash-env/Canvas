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
      rotation={el.rotation}
      fill={el.fill}
      opacity={el.opacity}
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
  onSelect,
  onUpdate,
  onPointerDown,
  onDragStart,
  onDragMove,
  onDragEnd,
}: {
  el: TextElement;
  onSelect: () => void;
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
      opacity={el.opacity}
      fontFamily="Inter, system-ui, sans-serif"
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
    const [guides, setGuides] = useState<GuideLine[]>([]);

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

    // Attach transformer to selected node if not locked
    useEffect(() => {
      const tr = transformerRef.current;
      const stage = stageRef.current;
      if (!tr || !stage) return;

      if (selectedId) {
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
    }, [selectedId, elements]);

    const handleStageClick = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
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
      [activeTool, onAdd, onSelect]
    );

    const handleDragStart = useCallback(() => {
      onHistorySnapshot();
      setGuides([]);
    }, [onHistorySnapshot]);

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

        setGuides(newGuides);
      },
      [elements, artboard]
    );

    const handleDragEnd = useCallback(
      (e: Konva.KonvaEventObject<DragEvent>, el: CanvasElement) => {
        setGuides([]);
        onUpdate(el.id, { x: e.target.x(), y: e.target.y() } as Partial<CanvasElement>);
      },
      [onUpdate]
    );

    const selectedEl = elements.find((el) => el.id === selectedId) ?? null;

    // Transformer config per element type
    const trConfig =
      selectedEl?.type === "circle"
        ? { keepRatio: true, enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right"] as string[] }
        : { keepRatio: false };

    return (
      <div
        className="flex-1 overflow-auto flex items-center justify-center"
        style={{
          background: "repeating-linear-gradient(45deg,#f1f5f9 0,#f1f5f9 1px,transparent 0,transparent 50%)",
          backgroundSize: "20px 20px",
          backgroundColor: "#e2e8f0",
        }}
      >
        <div
          className="relative shadow-2xl"
          style={{ width: artboard.width, height: artboard.height }}
        >
          <Stage
            ref={stageRef}
            width={artboard.width}
            height={artboard.height}
            onClick={handleStageClick}
            onTap={(e) => handleStageClick(e as unknown as Konva.KonvaEventObject<MouseEvent | TouchEvent>)}
            style={{ cursor: activeTool !== "select" ? "crosshair" : "default" }}
          >
            <Layer>
              {/* Artboard background */}
              <Rect
                name="artboard-bg"
                x={0}
                y={0}
                width={artboard.width}
                height={artboard.height}
                fill="white"
                listening={true}
              />

              {/* Elements */}
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
                      onDragStart={handleDragStart}
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
                      onDragStart={handleDragStart}
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
                      onSelect={() => onSelect(el.id)}
                      onUpdate={handleUpdate}
                      onDragStart={handleDragStart}
                      onDragMove={(e) => handleDragMove(e, el.id)}
                      onDragEnd={(e) => handleDragEnd(e, el)}
                    />
                  );
                }
                return null;
              })}

              {/* Dynamic Smart Alignment Guidelines (Snapping Lines) */}
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

              {/* Transformer */}
              <Transformer
                ref={transformerRef}
                {...trConfig}
                boundBoxFunc={(oldBox, newBox) => {
                  if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
                    return oldBox;
                  }
                  return newBox;
                }}
                anchorStyleFunc={(anchor) => {
                  anchor.cornerRadius(3);
                  anchor.fill("#6366f1");
                  anchor.stroke("#4f46e5");
                  anchor.strokeWidth(1);
                }}
                borderStroke="#6366f1"
                borderStrokeWidth={1.5}
                rotateAnchorOffset={20}
              />
            </Layer>
          </Stage>
        </div>
      </div>
    );
  }
);
