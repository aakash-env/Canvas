import { Canvas, ICanvas } from '../models/canvas.model';
import type { CreateCanvasInput, UpdateCanvasInput } from '../types/canvas';

export class CanvasService {
  async create(userId: string, input: CreateCanvasInput): Promise<ICanvas> {
    const canvas = new Canvas({
      userId,
      name: input.name,
      artboard: input.artboard ?? { width: 1200, height: 800 },
      elements: input.elements ?? [],
    });
    return canvas.save();
  }

  async findAll(userId: string): Promise<ICanvas[]> {
    return Canvas.find({ userId }).sort({ updatedAt: -1 }).lean<ICanvas[]>();
  }

  async findById(id: string, userId: string): Promise<ICanvas | null> {
    return Canvas.findOne({ _id: id, userId }).lean<ICanvas>();
  }

  async update(id: string, userId: string, input: UpdateCanvasInput): Promise<ICanvas | null> {
    return Canvas.findOneAndUpdate(
      { _id: id, userId },
      { $set: input },
      { new: true, runValidators: true }
    ).lean<ICanvas>();
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await Canvas.findOneAndDelete({ _id: id, userId });
    return result !== null;
  }
}

export const canvasService = new CanvasService();
