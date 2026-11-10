import { existsSync } from 'node:fs';
if (existsSync('.env') && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env');
  } catch (e) {}
}

import { networkInterfaces } from 'node:os';
import config, { validateConfig } from './config/index.js';
import { createApp } from './app.js';
import { runMigrations } from './db/migrate.js';
import { runSeed } from './db/seed.js';
import { closeDb } from './db/connection.js';
import { yedekService } from './services/yedekService.js';
import { mailService } from './services/mailService.js';
import oturumRepository from './repositories/oturumRepository.js';
import logger from './utils/logger.js';

function getLanIpAddresses() {
  const nets = networkInterfaces();
  const results = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Sadece dahili olmayan IPv4 adreslerini al
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }

  return results;
}

async function startServer() {
  try {
    // 1) Konfigürasyon doğrulama
    validateConfig();

    // 2) Veritabanı migrasyonları
    runMigrations();

    // 3) Gerekirse örnek veri tohumlama (Seed)
    runSeed();

    // 3.1) Ktest ve Atest hesaplarını garantiye al
    try {
      const db = (await import('./db/connection.js')).getDb();
      const { hashPassword } = await import('./utils/crypto.js');
      const testHash = hashPassword('test');
      const defaultBirim = db.prepare('SELECT id FROM birimler WHERE aktif = 1 ORDER BY id ASC LIMIT 1').get();
      const defaultPersonel = defaultBirim 
        ? db.prepare('SELECT id FROM personel WHERE birim_id = ? AND aktif = 1 ORDER BY id ASC LIMIT 1').get(defaultBirim.id)
        : null;

      const hasKtest = db.prepare('SELECT id FROM hesaplar WHERE LOWER(kullanici_adi) = ?').get('ktest');
      if (!hasKtest) {
        db.prepare('INSERT INTO hesaplar (kullanici_adi, sifre_hash, rol, birim_id, personel_id, sifre_degistirmeli, aktif) VALUES (?, ?, ?, ?, ?, 0, 1)').run(
          'ktest', testHash, 'birim', defaultBirim?.id || null, defaultPersonel?.id || null
        );
      }
      const hasAtest = db.prepare('SELECT id FROM hesaplar WHERE LOWER(kullanici_adi) = ?').get('atest');
      if (!hasAtest) {
        db.prepare('INSERT INTO hesaplar (kullanici_adi, sifre_hash, rol, birim_id, personel_id, sifre_degistirmeli, aktif) VALUES (?, ?, ?, ?, ?, 0, 1)').run(
          'atest', testHash, 'satin_alma', null, null
        );
      }
    } catch (err) {
      logger.warn(`Test hesapları kontrol uyarısı: ${err.message}`);
    }

    // 4) Express uygulamasını kur ve başlat
    const app = createApp();

    const server = app.listen(config.port, '0.0.0.0', () => {
      const lanIps = getLanIpAddresses();
      logger.info('====================================================');
      logger.info('KampüsStok KIRTASİYE TALEP VE DEPO YÖNETİM SİSTEMİ');
      logger.info(`Sunucu çalışıyor (Port: ${config.port})`);
      logger.info(`Yerel Erişim (Localhost): http://localhost:${config.port}`);

      if (lanIps.length > 0) {
        logger.info('Kurum İçi Ağ (LAN) Erişim Adresleri:');
        lanIps.forEach(ip => {
          logger.info(`  http://${ip}:${config.port}`);
        });
      } else {
        logger.info(`Ağ Adresi: http://0.0.0.0:${config.port}`);
      }
      logger.info('====================================================');
    });

    // 5) Gece 03:00 Otomatik Yedekleme, 14 Günlük Rotasyon ve Oturum Temizleme
    let sonYedekTarihi = null;
    const scheduleNightlyJobs = () => {
      const now = new Date();
      if (now.getHours() === 3 && now.getMinutes() === 0 && sonYedekTarihi !== now.toDateString()) {
        sonYedekTarihi = now.toDateString();
        logger.info('Gece 03:00 otomatik veritabanı yedeği alınıyor...');
        yedekService.yedekAl(undefined, 'backup_auto_').catch(err => {
          logger.error(`Gece otomatik yedekleme hatası: ${err.message}`);
        });

        // Süresi dolmuş oturumları temizle (Madde 3.4)
        try {
          oturumRepository.deleteExpired();
          logger.info('Süresi dolmuş kullanıcı oturumları temizlendi.');
        } catch (e) {}
      }
    };
    const backupTimer = setInterval(scheduleNightlyJobs, 60 * 1000);

    // 6) Bekleyen E-posta Kuyruğu İşleme Zamanlayıcısı (Her 5 dakikada bir)
    const MAIL_INTERVAL = 5 * 60 * 1000;
    const mailTimer = setInterval(() => {
      mailService.kuyruguIsle().catch(err => {
        logger.debug(`Mail kuyruğu işleme: ${err.message}`);
      });
    }, MAIL_INTERVAL);

    // 7) Düzgün Kapanış (Graceful Shutdown)
    const shutdown = (signal) => {
      logger.info(`\n${signal} sinyali alındı. Sunucu kapatılıyor...`);
      clearInterval(backupTimer);
      clearInterval(mailTimer);

      server.close(() => {
        logger.info('HTTP sunucusu kapatıldı.');
        closeDb();
        process.exit(0);
      });

      // 5 saniye içinde kapanmazsa zorla çık
      setTimeout(() => {
        logger.error('Sunucu zamanında kapanamadı, zorla sonlandırılıyor.');
        process.exit(1);
      }, 5000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

  } catch (err) {
    logger.error(`Sunucu başlatılamadı: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
}

startServer();
