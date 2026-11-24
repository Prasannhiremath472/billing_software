import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.path}`,
    errorCode: 'ROUTE_NOT_FOUND',
  });
}

const DUP_FIELD_LABELS = {
  uq_customers_mobile: 'A customer with this mobile number already exists',
  uq_items_barcode: 'An item with this barcode already exists',
  uq_items_item_code: 'An item with this item code already exists',
  uq_items_sku: 'An item with this SKU already exists',
  uq_users_email: 'A user with this email already exists',
  uq_product_designs_code: 'A design with this design code already exists',
  uq_invoices_number: 'Invoice number already exists',
};

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  // Known application errors
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  // Malformed JSON body
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Malformed JSON body', errorCode: 'INVALID_JSON' });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request body too large', errorCode: 'PAYLOAD_TOO_LARGE' });
  }

  // MySQL constraint errors
  if (err?.code === 'ER_DUP_ENTRY') {
    const key = /for key '(?:[\w.]+\.)?([\w]+)'/.exec(err.sqlMessage || '')?.[1];
    return res.status(409).json({
      success: false,
      message: DUP_FIELD_LABELS[key] || 'A record with the same unique value already exists',
      errorCode: 'DUPLICATE_ENTRY',
    });
  }
  if (err?.code === 'ER_NO_REFERENCED_ROW_2' || err?.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(422).json({
      success: false,
      message: 'The request references a record that does not exist or is still in use',
      errorCode: 'REFERENCE_ERROR',
    });
  }
  if (err?.code === 'ER_CHECK_CONSTRAINT_VIOLATED') {
    return res.status(422).json({ success: false, message: 'A value violates a data constraint', errorCode: 'CONSTRAINT_VIOLATION' });
  }

  // Unknown: log everything, reveal nothing
  logger.error('Unhandled error', {
    method: req.method,
    path: req.originalUrl,
    userId: req.user?.id,
    error: err?.message,
    code: err?.code,
    stack: config.isProd ? undefined : err?.stack,
  });
  res.status(500).json({
    success: false,
    message: 'Something went wrong on our side. Please try again.',
    errorCode: 'INTERNAL_ERROR',
  });
}
