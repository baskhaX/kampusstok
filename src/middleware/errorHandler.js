import logger from '../utils/logger.js';
import { AppError } from '../utils/errors.js';
import config from '../config/index.js';

export function errorHandler(err, req, res, next) {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const isProduction = config.nodeEnv === 'production';

  const rawMessage = err.message || 'Sunucuda beklenmeyen bir hata oluştu.';
  const message = (isProduction && statusCode === 500)
    ? 'Sunucuda beklenmeyen bir sistem hatası oluştu.'
    : rawMessage;

  logger.error(`[${req.method} ${req.url}] ${statusCode} - ${rawMessage}`, {
    stack: err.stack,
    details: err.details || null
  });

  res.status(statusCode).json({
    basarili: false,
    hata: {
      kod: err.name || 'Hata',
      mesaj: message,
      detay: (isProduction && statusCode === 500) ? null : (err.details || null)
    }
  });
}

export default errorHandler;
