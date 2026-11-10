import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Node 20+ --env-file kullanılmaktadır.
const port = parseInt(process.env.PORT || '3000', 10);
const nodeEnv = process.env.NODE_ENV || 'development';
const sessionSecret = process.env.SESSION_SECRET || 'kampusstok-talep-default-secret-change-in-prod';
const sessionExpireHours = parseInt(process.env.SESSION_EXPIRE_HOURS || '24', 10);
const appUrl = process.env.APP_URL || '';

const dbPath = resolve(process.cwd(), process.env.DB_PATH || 'data/app.db');
const backupDir = resolve(process.cwd(), process.env.BACKUP_DIR || 'data/backups');

const teslimatGunu = process.env.TESLIMAT_GUNU || 'Wednesday';
const teslimatSaatSiniri = process.env.TESLIMAT_SAAT_SINIRI || '12:00';

const smtp = {
  host: process.env.SMTP_HOST || '',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  from: process.env.SMTP_FROM || 'KampüsStok Portalı <kirtasiye@ornek.edu.tr>',
  satinalmaEmail: process.env.SATIN_ALMA_EMAIL || 'satinalma@ornek.edu.tr',
  isConfigured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
};

const kurum = {
  ad: process.env.KURUM_ADI || 'Örnek Devlet Üniversitesi',
  kisaAd: process.env.KURUM_KISA_AD || 'ÖDÜ',
  sistemAdi: process.env.SISTEM_ADI || 'KampüsStok - Kırtasiye & Depo Yönetim Portalı',
  logo: process.env.KURUM_LOGO || '/assets/logo.svg',
  epostaDomain: process.env.EPOSTA_DOMAIN || 'ornek.edu.tr'
};

const unsplash = {
  accessKey: process.env.UNSPLASH_ACCESS_KEY || '',
  isConfigured: Boolean(process.env.UNSPLASH_ACCESS_KEY)
};

// Doğrulama kontrolü
export function validateConfig() {
  const errors = [];
  if (isNaN(port) || port < 1 || port > 65535) {
    errors.push('Geçersiz PORT değeri.');
  }
  if (!sessionSecret) {
    errors.push('SESSION_SECRET tanımlanmamış.');
  }
  if (!process.env.SATIN_ALMA_EMAIL && !smtp.satinalmaEmail) {
    errors.push('SATIN_ALMA_EMAIL tanımlanmamış.');
  }
  if (errors.length > 0) {
    throw new Error(`Konfigürasyon doğrulama hatası:\n- ${errors.join('\n- ')}`);
  }
}

export const config = {
  port,
  appUrl,
  nodeEnv,
  sessionSecret,
  sessionExpireHours,
  dbPath,
  backupDir,
  teslimatGunu,
  teslimatSaatSiniri,
  smtp,
  unsplash,
  kurum
};

export default config;
