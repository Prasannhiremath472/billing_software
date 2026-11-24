export function ok(res, data, message = 'OK', extra = {}) {
  return res.status(200).json({ success: true, message, data, ...extra });
}

export function created(res, data, message = 'Created') {
  return res.status(201).json({ success: true, message, data });
}

export function paginated(res, data, { page, limit, total }, message = 'OK') {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
}
