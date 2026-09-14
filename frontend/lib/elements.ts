import { v4 as uuidv4 } from "uuid";
import type {
  CanvasElement,
  RectElement,
  CircleElement,
  TextElement,
} from "@/types/canvas";

export function createRect(x: number, y: number): RectElement {
  return {
    id: uuidv4(),
    type: "rect",
    x,
    y,
    width: 160,
    height: 100,
    rotation: 0,
    fill: "#6366f1",
    opacity: 1,
  };
}

export function createCircle(x: number, y: number): CircleElement {
  return {
    id: uuidv4(),
    type: "circle",
    x,
    y,
    radius: 60,
    rotation: 0,
    fill: "#10b981",
    opacity: 1,
  };
}

export function createText(x: number, y: number): TextElement {
  return {
    id: uuidv4(),
    type: "text",
    x,
    y,
    text: "Double-click to edit",
    fontSize: 20,
    width: 220,
    rotation: 0,
    fill: "#1e293b",
    opacity: 1,
  };
}

export function createElement(
  type: "rect" | "circle" | "text",
  x: number,
  y: number
): CanvasElement {
  switch (type) {
    case "rect":
      return createRect(x, y);
    case "circle":
      return createCircle(x, y);
    case "text":
      return createText(x, y);
  }
}

/** Normalize scale after Konva Transformer resize to avoid cumulative drift */
export function normalizeElement(el: CanvasElement): CanvasElement {
  return el; // elements are already stored without scaleX/scaleY
}