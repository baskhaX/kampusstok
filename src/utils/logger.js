import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const logDir = resolve(process.cwd(), 'logs');
if (!existsSync(logDir)) {
  mkdirSync(logDir, { recursive: true });
}

function getLogDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatMessage(level, message, meta) {
  const timestamp = new Date().toISOString();
  const metaString = meta ? ` ${typeof meta === 'object' ? JSON.stringify(meta) : meta}` : '';
  return `[${timestamp}] [${level}] ${message}${metaString}\n`;
}

function writeLog(level, message, meta) {
  const formatted = formatMessage(level, message, meta);
  // Konsol çıktısı
  if (level === 'ERROR') {
    console.error(formatted.trim());
  } else if (level === 'WARN') {
    console.warn(formatted.trim());
  } else {
    console.log(formatted.trim());
  }
  // Dosyaya yazma
  try {
    const filename = resolve(logDir, `${getLogDateString()}.log`);
    appendFileSync(filename, formatted, 'utf8');
  } catch (err) {
    console.error('Log dosyasına yazılamadı:', err.message);
  }
}

export const logger = {
  info: (msg, meta) => writeLog('INFO', msg, meta),
  warn: (msg, meta) => writeLog('WARN', msg, meta),
  error: (msg, meta) => writeLog('ERROR', msg, meta),
  debug: (msg, meta) => {
    if (process.env.NODE_ENV !== 'production') {
      writeLog('DEBUG', msg, meta);
    }
  }
};

export default logger;
