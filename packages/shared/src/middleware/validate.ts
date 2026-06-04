import { RequestHandler } from 'express';
import { AnyZodObject, ZodError, ZodTypeAny } from 'zod';
import { ValidationError } from '../errors/AppError';

export interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validate (and coerce) request body/query/params against Zod schemas.
 * Parsed values replace the originals so downstream handlers get typed,
 * coerced data. Throws ValidationError (422) on failure.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params);
      if (schemas.query) {
        // req.query is a getter in Express 5-ready setups; assign parsed values.
        Object.assign(req.query, schemas.query.parse(req.query));
      }
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError('Request validation failed', err.flatten()));
        return;
      }
      next(err);
    }
  };
}

/** Validate only the body — common case shorthand. */
export function validateBody(schema: AnyZodObject): RequestHandler {
  return validate({ body: schema });
}
