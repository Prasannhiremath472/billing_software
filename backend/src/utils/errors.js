export class AppError extends Error {
  constructor(status, errorCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }
}

export const badRequest = (message, errorCode = 'BAD_REQUEST', details) =>
  new AppError(400, errorCode, message, details);
export const unauthorized = (message = 'Authentication required', errorCode = 'UNAUTHORIZED') =>
  new AppError(401, errorCode, message);
export const forbidden = (message = 'You do not have permission to perform this action', errorCode = 'FORBIDDEN') =>
  new AppError(403, errorCode, message);
export const notFound = (message = 'Resource not found', errorCode = 'NOT_FOUND') =>
  new AppError(404, errorCode, message);
export const conflict = (message, errorCode = 'CONFLICT') => new AppError(409, errorCode, message);
export const unprocessable = (message, errorCode = 'UNPROCESSABLE', details) =>
  new AppError(422, errorCode, message, details);
