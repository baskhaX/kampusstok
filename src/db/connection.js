import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import config from '../config/index.js';
import logger from '../utils/logger.js';

let dbInstance = null;

export function getDb(customPath = null) {
  if (dbInstance) {
    return dbInstance;
  }

  const dbFilePath = customPath || config.dbPath;
  const dbDir = dirname(dbFilePath);

  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  try {
    dbInstance = new Database(dbFilePath, {
      verbose: config.nodeEnv === 'development' ? (sql) => logger.debug(`[SQL] ${sql}`) : null
    });

    // Performans ve Bütünlük Ayarları
    dbInstance.pragma('journal_mode = WAL');
    dbInstance.pragma('foreign_keys = ON');
    dbInstance.pragma('busy_timeout = 5000');
    dbInstance.pragma('synchronous = NORMAL');

    logger.info(`Veritabanı bağlantısı kuruldu: ${dbFilePath}`);
    return dbInstance;
  } catch (err) {
    logger.error(`Veritabanı bağlantı hatası: ${err.message}`);
    throw err;
  }
}

export function closeDb() {
  if (dbInstance) {
    try {
      dbInstance.close();
      logger.info('Veritabanı bağlantısı kapatıldı.');
    } catch (err) {
      logger.error(`Veritabanı kapatılırken hata: ${err.message}`);
    } finally {
      dbInstance = null;
    }
  }
}

export default getDb;
