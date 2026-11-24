import { ZodError } from 'zod';
import { unprocessable } from '../utils/errors.js';

/**
 * validate({ body, query, params }) - parses with zod and exposes the cleaned values on `req.valid`.
 * Unknown body keys are stripped by the schemas (mass-assignment protection).
 */
export const validate = schemas => (req, _res, next) => {
  try {
    req.valid = {};
    for (const part of ['params', 'query', 'body']) {
      if (schemas[part]) req.valid[part] = schemas[part].parse(req[part] ?? {});
    }
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
      const first = details[0];
      return next(
        unprocessable(
          first ? `${first.field ? `${first.field}: ` : ''}${first.message}` : 'Validation failed',
          'VALIDATION_ERROR',
          details
        )
      );
    }
    next(err);
  }
};
