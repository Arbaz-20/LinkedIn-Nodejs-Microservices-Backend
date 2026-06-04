import { Response } from 'express';

/** Uniform success envelope returned by every endpoint. */
export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/** Uniform error envelope returned by the global error handler. */
export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Send a 2xx success envelope. */
export function ok<T>(res: Response, data: T, status = 200, meta?: Record<string, unknown>): Response {
  const body: SuccessEnvelope<T> = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

/** Send a 201 Created envelope. */
export function created<T>(res: Response, data: T, meta?: Record<string, unknown>): Response {
  return ok(res, data, 201, meta);
}

/** Send a 204 No Content. */
export function noContent(res: Response): Response {
  return res.status(204).send();
}
