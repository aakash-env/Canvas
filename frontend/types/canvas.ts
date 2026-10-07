export type ElementType = "rect" | "circle" | "text";

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  rotation: number;
  fill: string;
  opacity: number;
  visible?: boolean;
  locked?: boolean;
}

export interface RectElement extends BaseElement {
  type: "rect";
  width: number;
  height: number;
}

export interface CircleElement extends BaseElement {
  type: "circle";
  radius: number;
}

export interface TextElement extends BaseElement {
  type: "text";
  text: string;
  fontSize: number;
  width: number;
}

export type CanvasElement = RectElement | CircleElement | TextElement;

export interface ArtboardDimensions {
  width: number;
  height: number;
}

export interface CanvasData {
  _id: string;
  userId?: string;
  name: string;
  artboard: ArtboardDimensions;
  elements: CanvasElement[];
  version?: number;
  deletedAt?: string | null;
  elementCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type CanvasSummary = Omit<CanvasData, "elements"> & {
  elements?: CanvasElement[];
  elementCount?: number;
};

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResult {
  user: User;
  token: string;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";
export type ToolType = "select" | "rect" | "circle" | "text";