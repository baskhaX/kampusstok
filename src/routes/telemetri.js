// src/routes/telemetri.js - Sunum ve Sistem Test Telemetri Radarı
import { Router } from 'express';
import getDb from '../db/connection.js';

const router = Router();

// 1. Sunum İzleme Beacon / Telemetri Ping
router.post('/sunum-izleme', (req, res) => {
  try {
    const db = getDb();
    const { slaytNo = 1, toplamSlayt = 10, tamamlandi = false, ekran = '', cihaz = '' } = req.body || {};
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';

    // Cihaz ve İşletim Sistemi Analizi
    let detectedDevice = cihaz;
    if (!detectedDevice) {
      if (/iPad/i.test(userAgent)) detectedDevice = 'iPad';
      else if (/iPhone/i.test(userAgent)) detectedDevice = 'iPhone';
      else if (/Android/i.test(userAgent)) detectedDevice = 'Android Mobil';
      else if (/Macintosh|Mac OS/i.test(userAgent)) detectedDevice = 'MacBook / iMac';
      else if (/Windows/i.test(userAgent)) detectedDevice = 'Windows PC';
      else detectedDevice = 'Bilinmeyen Cihaz';
    }

    // Tarayıcı Analizi
    let browser = 'Bilinmeyen Tarayıcı';
    if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) browser = 'Chrome';
    else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari';
    else if (/Edg/i.test(userAgent)) browser = 'Edge';
    else if (/Firefox/i.test(userAgent)) browser = 'Firefox';

    // Telemetri Tablosu Varlığını Garantiye Al
    db.exec(`
      CREATE TABLE IF NOT EXISTS sunum_telemetri (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_adresi TEXT,
        cihaz TEXT,
        tarayici TEXT,
        ekran_boyutu TEXT,
        mevcut_slayt INTEGER DEFAULT 1,
        toplam_slayt INTEGER DEFAULT 10,
        tamamlandi INTEGER DEFAULT 0,
        tarih TEXT DEFAULT (datetime('now', 'localtime'))
      );
    `);

    db.prepare(`
      INSERT INTO sunum_telemetri (ip_adresi, cihaz, tarayici, ekran_boyutu, mevcut_slayt, toplam_slayt, tamamlandi, tarih)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))
    `).run(ip, detectedDevice, browser, ekran, slaytNo, toplamSlayt, tamamlandi ? 1 : 0);

    // İlk slayt açılışında veya tamamlanmada Denetim Loglarına da resmi kayıt düş
    if (slaytNo === 1 || tamamlandi) {
      db.prepare(`
        INSERT INTO denetim_loglari (kullanici_id, kullanici_adi, rol, islem_turu, aciklama, detay, ip_adresi, tarih)
        VALUES (NULL, 'ziyaretci', 'sunum', 'SUNUM_INCELEME', ?, ?, ?, datetime('now', 'localtime'))
      `).run(
        tamamlandi ? 'Sunum Tamamlandı (%100 İncelendi)' : 'Sunum Açıldı ve İnceleniyor',
        JSON.stringify({ cihaz: detectedDevice, tarayici: browser, slayt: slaytNo, toplam: toplamSlayt, ekran }),
        ip
      );
    }

    res.json({ basarili: true });
  } catch (err) {
    res.status(200).json({ basarili: false });
  }
});

// 2. Radar Özeti (Admin / Yapıcı Masası için)
router.get('/radar-ozeti', (req, res) => {
  try {
    const db = getDb();
    
    // Son sunum izlemeleri
    let sonSunum = null;
    try {
      sonSunum = db.prepare(`
        SELECT * FROM sunum_telemetri 
        ORDER BY id DESC LIMIT 1
      `).get();
    } catch {}

    // Bugün sunum açılış sayısı
    let bugunSunumSayisi = 0;
    try {
      const row = db.prepare(`
        SELECT COUNT(*) as sayi FROM sunum_telemetri
        WHERE date(tarih) = date('now', 'localtime')
      `).get();
      bugunSunumSayisi = row?.sayi || 0;
    } catch {}

    // Canlı test girişleri (Ktest ve Atest)
    let sonTestGirisleri = [];
    try {
      sonTestGirisleri = db.prepare(`
        SELECT * FROM denetim_loglari
        WHERE LOWER(kullanici_adi) IN ('atest', 'ktest')
        ORDER BY id DESC LIMIT 5
      `).all();
    } catch {}

    res.json({
      basarili: true,
      radar: {
        sonSunum,
        bugunSunumSayisi,
        sonTestGirisleri
      }
    });
  } catch (err) {
    res.json({ basarili: true, radar: { sonSunum: null, bugunSunumSayisi: 0, sonTestGirisleri: [] } });
  }
});

export default router;
