import mongoose from 'mongoose';
import { Canvas, ICanvas } from '../models/canvas.model';
import type { CreateCanvasInput, UpdateCanvasInput, CanvasSummary } from '../types/canvas';
import { AppError } from '../middleware/error.middleware';

export class CanvasService {
  async create(userId: string, input: CreateCanvasInput): Promise<ICanvas> {
    const canvas = new Canvas({
      userId,
      name: input.name,
      artboard: input.artboard ?? { width: 1200, height: 800 },
      elements: input.elements ?? [],
      version: 1,
      deletedAt: null,
    });
    return canvas.save();
  }

  async findAll(userId: string): Promise<CanvasSummary[]> {
    return Canvas.aggregate<CanvasSummary>([
      { $match: { userId: new mongoose.Types.ObjectId(userId), deletedAt: null } },
      { $sort: { updatedAt: -1 } },
      {
        $project: {
          _id: 1,
          userId: 1,
          name: 1,
          artboard: 1,
          version: 1,
          elementCount: { $size: { $ifNull: ['$elements', []] } },
          createdAt: 1,
          updatedAt: 1,
        },
      },
    ]);
  }

  async findById(id: string, userId: string): Promise<ICanvas | null> {
    return Canvas.findOne({ _id: id, userId, deletedAt: null }).lean<ICanvas>();
  }

  async update(id: string, userId: string, input: UpdateCanvasInput): Promise<ICanvas | null> {
    if (input.version !== undefined) {
      const existing = await Canvas.findOne({ _id: id, userId, deletedAt: null });
      if (existing && existing.version !== input.version) {
        throw new AppError(409, 'Conflict: Canvas has been modified by another session');
      }
    }

    const { version: _v, ...updateFields } = input;
    return Canvas.findOneAndUpdate(
      { _id: id, userId, deletedAt: null },
      {
        $set: updateFields,
        $inc: { version: 1 },
      },
      { new: true, runValidators: true }
    ).lean<ICanvas>();
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await Canvas.findOneAndUpdate(
      { _id: id, userId, deletedAt: null },
      { $set: { deletedAt: new Date() } }
    );
    return result !== null;
  }

  async restore(id: string, userId: string): Promise<ICanvas | null> {
    return Canvas.findOneAndUpdate(
      { _id: id, userId, deletedAt: { $ne: null } },
      { $set: { deletedAt: null } },
      { new: true }
    ).lean<ICanvas>();
  }
}

export const canvasService = new CanvasService();
