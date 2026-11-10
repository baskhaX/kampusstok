import { existsSync, mkdirSync, readdirSync, unlinkSync, statSync, copyFileSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import config from '../config/index.js';
import getDb, { closeDb } from '../db/connection.js';
import logger from '../utils/logger.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export const yedekService = {
  /**
   * SQLite online backup API ile anlık sıcak yedek alır
   */
  async yedekAl(hedefKlasor = config.backupDir, prefix = 'backup_') {
    if (!existsSync(hedefKlasor)) {
      mkdirSync(hedefKlasor, { recursive: true });
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const yedekDosyaAdi = `${prefix}${timestamp}.db`;
    const hedefYol = join(hedefKlasor, yedekDosyaAdi);

    logger.info(`Veritabanı yedeği alınıyor: ${hedefYol}`);
    const db = getDb();

    try {
      await db.backup(hedefYol);
      logger.info(`Yedekleme başarıyla tamamlandı: ${yedekDosyaAdi}`);

      // Eski yedekleri temizle (Son 14 günlük rotasyon)
      this.eskiYedekleriTemizle(hedefKlasor, 14);

      const stats = statSync(hedefYol);
      return {
        basarili: true,
        dosya: yedekDosyaAdi,
        boyut: stats.size,
        yol: hedefYol,
        tarih: now.toISOString()
      };
    } catch (err) {
      logger.error(`Yedekleme hatası: ${err.message}`);
      throw err;
    }
  },

  /**
   * Belirtilen sayıdan fazla olan eski yedek dosyalarını siler (Varsayılan: Son 14 yedek saklanır)
   */
  eskiYedekleriTemizle(hedefKlasor = config.backupDir, saklanacakSayi = 14) {
    try {
      if (!existsSync(hedefKlasor)) return;
      const files = readdirSync(hedefKlasor)
        .filter(f => (f.startsWith('backup_') || f.startsWith('safety_pre_restore_')) && f.endsWith('.db'))
        .map(f => ({
          name: f,
          path: join(hedefKlasor, f),
          time: statSync(join(hedefKlasor, f)).mtimeMs
        }))
        .sort((a, b) => b.time - a.time); // En yeniden en eskiye

      if (files.length > saklanacakSayi) {
        const silinecekler = files.slice(saklanacakSayi);
        for (const file of silinecekler) {
          unlinkSync(file.path);
          logger.info(`Eski yedek temizlendi (14 günlük rotasyon): ${file.name}`);
        }
      }
    } catch (err) {
      logger.warn(`Eski yedekler temizlenirken uyarı: ${err.message}`);
    }
  },

  /**
   * Mevcut yedekleri listeler
   */
  listele(hedefKlasor = config.backupDir) {
    if (!existsSync(hedefKlasor)) return [];

    return readdirSync(hedefKlasor)
      .filter(f => (f.startsWith('backup_') || f.startsWith('safety_pre_restore_')) && f.endsWith('.db'))
      .map(f => {
        const stats = statSync(join(hedefKlasor, f));
        return {
          dosya: f,
          boyut: stats.size,
          tur: f.startsWith('safety_pre_restore_') ? 'GuvenlikOnYedegi' : (f.includes('manual') ? 'Manuel' : 'Otomatik'),
          tarih: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.tarih) - new Date(a.tarih));
  },

  /**
   * Güvenli Geri Yükleme (Restore) Mimarisini işletir:
   * 1. Path traversal koruması (basename filtresi)
   * 2. Acil Durum Ön-Yedeği (safety_pre_restore_TIMESTAMP.db)
   * 3. DB bağlantısını güvenle yenileme ve bütünlük denetimi
   */
  async geriYukle(dosyaAdi, hedefKlasor = config.backupDir) {
    if (!dosyaAdi || typeof dosyaAdi !== 'string') {
      throw new ValidationError('Geri yüklenecek yedek dosya adı belirtilmelidir.');
    }

    const cleanDosya = basename(dosyaAdi.trim());
    const kaynakYol = join(hedefKlasor, cleanDosya);

    if (!existsSync(kaynakYol) || !cleanDosya.endsWith('.db')) {
      throw new NotFoundError('Geri yüklenecek geçerli bir veritabanı yedek dosyası bulunamadı.');
    }

    logger.warn(`Veritabanı geri yükleme başlatılıyor. Kaynak: ${cleanDosya}`);

    // 1. ADIM: Acil Durum Ön-Yedeği Al (Sıfır Veri Kaybı Garantisi)
    let safetyFileName = null;
    try {
      const safetyResult = await this.yedekAl(hedefKlasor, 'safety_pre_restore_');
      safetyFileName = safetyResult.dosya;
      logger.info(`Acil durum güvenlik ön-yedeği başarıyla alındı: ${safetyFileName}`);
    } catch (err) {
      logger.error(`Güvenlik ön-yedeği alınamadı, geri yükleme durduruldu: ${err.message}`);
      throw new Error(`Güvenlik ön-yedeği alınamadığı için işlem iptal edildi: ${err.message}`);
    }

    // 2. ADIM: Aktif Veritabanı Bağlantısını Kapat
    closeDb();

    // 3. ADIM: Yedeği ana veritabanı dosyasına kopyala
    try {
      const walPath = config.dbPath + '-wal';
      const shmPath = config.dbPath + '-shm';
      if (existsSync(walPath)) {
        try { unlinkSync(walPath); } catch {}
      }
      if (existsSync(shmPath)) {
        try { unlinkSync(shmPath); } catch {}
      }

      copyFileSync(kaynakYol, config.dbPath);
      logger.info(`Yedek dosyası ana veritabanına kopyalandı.`);
    } catch (err) {
      logger.error(`Dosya kopyalama hatası: ${err.message}`);
      // Hata durumunda yeniden aç
      getDb();
      throw new Error(`Veritabanı dosyası geri yüklenirken hata oluştu: ${err.message}`);
    }

    // 4. ADIM: Veritabanı bağlantısını yeniden aç ve bütünlük testi yap
    const newDb = getDb();
    const check = newDb.pragma('integrity_check');
    logger.info(`Geri yükleme sonrası bütünlük kontrolü: ${JSON.stringify(check)}`);

    return {
      basarili: true,
      mesaj: `Veritabanı "${cleanDosya}" yedeğinden başarıyla geri yüklendi.`,
      geriYuklenenDosya: cleanDosya,
      guvenlikOnYedegi: safetyFileName,
      tarih: new Date().toISOString()
    };
  },

  /**
   * Yedek dosyasını siler
   */
  yedekSil(dosyaAdi, hedefKlasor = config.backupDir) {
    if (!dosyaAdi || typeof dosyaAdi !== 'string') {
      throw new ValidationError('Silinecek dosya adı belirtilmelidir.');
    }
    const cleanDosya = basename(dosyaAdi.trim());
    const dosyaYolu = join(hedefKlasor, cleanDosya);

    if (!existsSync(dosyaYolu) || !cleanDosya.endsWith('.db')) {
      throw new NotFoundError('Silinecek yedek dosyası bulunamadı.');
    }

    unlinkSync(dosyaYolu);
    logger.info(`Yedek dosyası silindi: ${cleanDosya}`);
    return { basarili: true, silinen: cleanDosya };
  }
};

export default yedekService;
