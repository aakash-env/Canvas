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

interface MongoError extends Error {
  code?: number;
  keyPattern?: Record<string, number>;
}

export const errorHandler = (
  err: Error | MongoError,
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

  // Mongoose duplicate key error (E11000)
  if ('code' in err && err.code === 11000) {
    const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : 'field';
    res.status(409).json({
      error: {
        message: `An account with this ${field} already exists`,
        statusCode: 409,
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

  // Generic unhandled errors
  console.error('[Unhandled Error]', err);
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  res.status(500).json({
    error: {
      message,
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
