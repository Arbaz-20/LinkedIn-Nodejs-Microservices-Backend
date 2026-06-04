import { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { ErrorEnvelope } from '../http/respond';
import { logger } from '../logger';

/** 404 handler for unmatched routes — mount after all routers. */
export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ErrorEnvelope = {
    success: false,
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  };
  res.status(404).json(body);
};

/**
 * Global error handler. Normalizes AppError, ZodError, and unknown errors into
 * the uniform error envelope. Mount last.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    if (!err.isOperational) logger.error({ err }, 'non-operational AppError');
    const body: ErrorEnvelope = {
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof ZodError) {
    const body: ErrorEnvelope = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: err.flatten(),
      },
    };
    res.status(422).json(body);
    return;
  }

  logger.error({ err }, 'unhandled error');
  const body: ErrorEnvelope = {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  };
  res.status(500).json(body);
};
