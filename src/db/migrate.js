import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import getDb from './connection.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function runMigrations(customDb = null) {
  const db = customDb || getDb();

  // Migrasyon tablosunun varlığını garantiye alalım
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version TEXT NOT NULL UNIQUE,
      uygulama_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const appliedRows = db.prepare('SELECT version FROM schema_migrations').all();
  const appliedVersions = new Set(appliedRows.map((r) => r.version));

  for (const file of files) {
    if (!appliedVersions.has(file)) {
      logger.info(`Migrasyon uygulanıyor: ${file}`);
      const sqlPath = join(migrationsDir, file);
      const sqlContent = readFileSync(sqlPath, 'utf8');

      const applyMigration = db.transaction(() => {
        db.exec(sqlContent);
        db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(file);
      });

      try {
        applyMigration();
        logger.info(`Migrasyon başarıyla uygulandı: ${file}`);
      } catch (err) {
        logger.error(`Migrasyon hatası (${file}): ${err.message}`);
        throw err;
      }
    }
  }

  logger.info('Tüm veritabanı migrasyonları güncel.');
}

// Doğrudan çalıştırıldığında
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations();
}

export default runMigrations;
