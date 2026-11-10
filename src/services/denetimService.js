// src/services/denetimService.js - Kurumsal Denetim Loglama Servisi
import getDb from '../db/connection.js';
import logger from '../utils/logger.js';

export const denetimService = {
  logla(params, db = getDb()) {
    const kullanici_id = params.kullanici_id || params.hesap_id || null;
    const aciklama = params.aciklama || params.detay || '';
    return this.log({ ...params, kullanici_id, aciklama }, db);
  },

  log({ kullanici_id = null, kullanici_adi = 'Sistem', rol = null, islem_turu, aciklama, detay = null, ip_adresi = null }, db = getDb()) {
    try {
      // HAYALET (GHOST / STEALTH) MODU:
      // Sistem Tasarımcısı ('Yapıcı' / 'admin') acil durumlarda sisteme müdahale eder.
      // Denetim loglarında (denetim_loglari tablosu) ASLA ayak izi bırakmaz.
      const cleanKullanici = String(kullanici_adi || '').trim().toLowerCase();
      if (['admin', 'yapici', 'yapıcı'].includes(cleanKullanici)) {
        return;
      }

      if (kullanici_id) {
        try {
          const u = db.prepare('SELECT kullanici_adi FROM hesaplar WHERE id = ?').get(kullanici_id);
          if (u && ['admin', 'yapici', 'yapıcı'].includes(String(u.kullanici_adi).trim().toLowerCase())) {
            return;
          }
        } catch {}
      }

      const stmt = db.prepare(`
        INSERT INTO denetim_loglari (kullanici_id, kullanici_adi, rol, islem_turu, aciklama, detay, ip_adresi)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        kullanici_id,
        kullanici_adi,
        rol,
        islem_turu,
        aciklama,
        typeof detay === 'object' && detay !== null ? JSON.stringify(detay) : (detay || null),
        ip_adresi
      );
    } catch (err) {
      logger.error(`Denetim logu yazılamadı: ${err.message}`);
    }
  },

  list({ limit = 100, offset = 0, islem_turu = null, kullanici = null, arama = null, rol = null, haricKullanici = null }, db = getDb()) {
    let sql = `SELECT * FROM denetim_loglari WHERE 1=1`;
    const params = [];

    // Hayalet mod: Admin / Yapıcı kayıtları denetim listelerinde kesinlikle görünmez
    sql += ` AND LOWER(kullanici_adi) NOT IN ('admin', 'yapici', 'yapıcı')`;

    if (islem_turu) {
      sql += ` AND islem_turu = ?`;
      params.push(islem_turu);
    }

    if (rol) {
      sql += ` AND rol = ?`;
      params.push(rol);
    }

    if (haricKullanici) {
      sql += ` AND LOWER(kullanici_adi) != LOWER(?)`;
      params.push(haricKullanici);
    }

    if (kullanici) {
      sql += ` AND kullanici_adi LIKE ?`;
      params.push(`%${kullanici}%`);
    }

    if (arama && arama.trim()) {
      sql += ` AND (aciklama LIKE ? OR detay LIKE ? OR kullanici_adi LIKE ?)`;
      const q = `%${arama.trim()}%`;
      params.push(q, q, q);
    }

    sql += ` ORDER BY id DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    return db.prepare(sql).all(...params);
  },

  count({ islem_turu = null, kullanici = null, arama = null, rol = null, haricKullanici = null }, db = getDb()) {
    let sql = `SELECT COUNT(*) as toplam FROM denetim_loglari WHERE 1=1`;
    const params = [];

    // Hayalet mod: Admin / Yapıcı kayıtları toplam sayaçlara kesinlikle dahil edilmez
    sql += ` AND LOWER(kullanici_adi) NOT IN ('admin', 'yapici', 'yapıcı')`;

    if (islem_turu) {
      sql += ` AND islem_turu = ?`;
      params.push(islem_turu);
    }

    if (rol) {
      sql += ` AND rol = ?`;
      params.push(rol);
    }

    if (haricKullanici) {
      sql += ` AND LOWER(kullanici_adi) != LOWER(?)`;
      params.push(haricKullanici);
    }

    if (kullanici) {
      sql += ` AND kullanici_adi LIKE ?`;
      params.push(`%${kullanici}%`);
    }

    if (arama && arama.trim()) {
      sql += ` AND (aciklama LIKE ? OR detay LIKE ? OR kullanici_adi LIKE ?)`;
      const q = `%${arama.trim()}%`;
      params.push(q, q, q);
    }

    return db.prepare(sql).get(...params).toplam;
  }
};

export default denetimService;
