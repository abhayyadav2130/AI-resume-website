import multer from 'multer';

export function notFound(req, res) { res.status(404).json({ success: false, message: 'Route not found.' }); }
export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  const status = error instanceof multer.MulterError ? 400 : error.statusCode || 500;
  const message = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE' ? 'PDF must be 5 MB or smaller.' : error.message || 'Internal server error.';
  if (status >= 500) console.error(error);
  res.status(status).json({ success: false, message, ...(error.details && { errors: error.details }) });
}
