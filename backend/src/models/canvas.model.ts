import mongoose, { Schema, Document } from 'mongoose';
import type { CanvasElement, ArtboardDimensions } from '../types/canvas';

export interface ICanvas extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  artboard: ArtboardDimensions;
  elements: CanvasElement[];
  version: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const baseElementFields = {
  id: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  rotation: { type: Number, default: 0 },
  fill: { type: String, required: true },
  opacity: { type: Number, default: 1, min: 0, max: 1 },
  visible: { type: Boolean, default: true },
  locked: { type: Boolean, default: false },
  stroke: { type: String },
  strokeWidth: { type: Number, default: 0 },
  shadowColor: { type: String },
  shadowBlur: { type: Number, default: 0 },
  shadowOffsetX: { type: Number, default: 0 },
  shadowOffsetY: { type: Number, default: 0 },
};

const elementSchema = new Schema(
  {
    ...baseElementFields,
    type: { type: String, enum: ['rect', 'circle', 'text'], required: true },
    // rect fields
    width: { type: Number },
    height: { type: Number },
    cornerRadius: { type: Number, default: 0 },
    // circle fields
    radius: { type: Number },
    // text fields
    text: { type: String },
    fontSize: { type: Number },
  },
  { _id: false }
);

const artboardSchema = new Schema(
  {
    width: { type: Number, required: true, min: 100, max: 10000 },
    height: { type: Number, required: true, min: 100, max: 10000 },
  },
  { _id: false }
);

const canvasSchema = new Schema<ICanvas>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    artboard: { type: artboardSchema, required: true, default: { width: 1200, height: 800 } },
    elements: { type: [elementSchema], default: [] },
    version: { type: Number, default: 1 },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

canvasSchema.index({ userId: 1, deletedAt: 1, updatedAt: -1 });
canvasSchema.index({ createdAt: -1 });
canvasSchema.index({ updatedAt: -1 });

export const Canvas = mongoose.model<ICanvas>('Canvas', canvasSchema);
