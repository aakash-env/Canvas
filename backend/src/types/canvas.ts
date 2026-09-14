export type ElementType = 'rect' | 'circle' | 'text';

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
  type: 'rect';
  width: number;
  height: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  radius: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  width: number;
}

export type CanvasElement = RectElement | CircleElement | TextElement;

export interface ArtboardDimensions {
  width: number;
  height: number;
}

export interface CanvasDocument {
  _id: string;
  userId: string;
  name: string;
  artboard: ArtboardDimensions;
  elements: CanvasElement[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCanvasInput {
  userId?: string;
  name: string;
  artboard?: ArtboardDimensions;
  elements?: CanvasElement[];
}

export interface UpdateCanvasInput {
  name?: string;
  artboard?: ArtboardDimensions;
  elements?: CanvasElement[];
}
