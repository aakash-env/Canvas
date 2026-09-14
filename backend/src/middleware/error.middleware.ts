import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        statusCode: err.statusCode,
      },
    });
    return;
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      error: {
        message: err.message,
        statusCode: 400,
      },
    });
    return;
  }

  // Mongoose cast errors (bad ObjectId)
  if (err.name === 'CastError') {
    res.status(400).json({
      error: {
        message: 'Invalid ID format',
        statusCode: 400,
      },
    });
    return;
  }

  console.error('[Unhandled Error]', err);
  res.status(500).json({
    error: {
      message: 'Internal server error',
      statusCode: 500,
    },
  });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      statusCode: 404,
    },
  });
};
