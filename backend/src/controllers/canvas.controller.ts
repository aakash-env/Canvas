import { Request, Response, NextFunction } from 'express';
import { canvasService } from '../services/canvas.service';
import {
  createCanvasSchema,
  updateCanvasSchema,
  mongoIdSchema,
} from '../validation/canvas.validation';
import { AppError } from '../middleware/error.middleware';

export const createCanvas = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      next(new AppError(401, 'Authentication required'));
      return;
    }
    const parsed = createCanvasSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors.map((e) => e.message).join('; ')));
      return;
    }
    const canvas = await canvasService.create(userId, parsed.data);
    res.status(201).json({ data: canvas });
  } catch (err) {
    next(err);
  }
};

export const listCanvases = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      next(new AppError(401, 'Authentication required'));
      return;
    }
    const canvases = await canvasService.findAll(userId);
    res.json({ data: canvases });
  } catch (err) {
    next(err);
  }
};

export const getCanvas = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      next(new AppError(401, 'Authentication required'));
      return;
    }
    const idParsed = mongoIdSchema.safeParse(req.params.id);
    if (!idParsed.success) {
      next(new AppError(400, 'Invalid canvas ID'));
      return;
    }
    const canvas = await canvasService.findById(idParsed.data, userId);
    if (!canvas) {
      next(new AppError(404, 'Canvas not found'));
      return;
    }
    res.json({ data: canvas });
  } catch (err) {
    next(err);
  }
};

export const updateCanvas = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      next(new AppError(401, 'Authentication required'));
      return;
    }
    const idParsed = mongoIdSchema.safeParse(req.params.id);
    if (!idParsed.success) {
      next(new AppError(400, 'Invalid canvas ID'));
      return;
    }
    const parsed = updateCanvasSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors.map((e) => e.message).join('; ')));
      return;
    }
    const canvas = await canvasService.update(idParsed.data, userId, parsed.data);
    if (!canvas) {
      next(new AppError(404, 'Canvas not found'));
      return;
    }
    res.json({ data: canvas });
  } catch (err) {
    next(err);
  }
};

export const deleteCanvas = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      next(new AppError(401, 'Authentication required'));
      return;
    }
    const idParsed = mongoIdSchema.safeParse(req.params.id);
    if (!idParsed.success) {
      next(new AppError(400, 'Invalid canvas ID'));
      return;
    }
    const deleted = await canvasService.delete(idParsed.data, userId);
    if (!deleted) {
      next(new AppError(404, 'Canvas not found'));
      return;
    }
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
