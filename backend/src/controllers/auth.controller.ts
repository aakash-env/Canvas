import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { registerSchema, loginSchema } from '../validation/auth.validation';
import { AppError } from '../middleware/error.middleware';

export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors.map((e) => e.message).join('; ')));
      return;
    }
    const result = await authService.register(parsed.data);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      next(new AppError(400, parsed.error.errors.map((e) => e.message).join('; ')));
      return;
    }
    const result = await authService.login(parsed.data);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      next(new AppError(401, 'Authentication required'));
      return;
    }
    const user = await authService.findById(req.user.id);
    if (!user) {
      next(new AppError(404, 'User not found'));
      return;
    }
    res.json({ data: user });
  } catch (err) {
    next(err);
  }
};
