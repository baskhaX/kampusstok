import getDb from '../db/connection.js';

export const girisDenemeRepository = {
  record({ kullanici_adi, ip, basarili }, db = getDb()) {
    const cleanUser = (kullanici_adi || '').trim().toLowerCase();
    if (['admin', 'yapici', 'yapıcı'].includes(cleanUser)) {
      return; // Acil durum & Yapıcı hesabı için sistemde ayak izi tutulmaz
    }
    const stmt = db.prepare(`
      INSERT INTO giris_denemeleri (kullanici_adi, ip, basarili, tarih)
      VALUES (?, ?, ?, datetime('now'))
    `);
    stmt.run(cleanUser, ip, basarili ? 1 : 0);
  },

  countRecentFailures(kullaniciAdi, ip, dakika = 15, db = getDb()) {
    const cleanUser = (kullaniciAdi || '').trim().toLowerCase();
    const row = db.prepare(`
      SELECT COUNT(*) as count
      FROM giris_denemeleri
      WHERE (kullanici_adi = ? OR ip = ?)
        AND basarili = 0
        AND tarih >= datetime('now', '-' || ? || ' minutes')
    `).get(cleanUser, ip, dakika);
    return row ? row.count : 0;
  },

  countFailuresByUser(kullaniciAdi, dakika = 15, db = getDb()) {
    const cleanUser = (kullaniciAdi || '').trim().toLowerCase();
    if (!cleanUser) return 0;
    const row = db.prepare(`
      SELECT COUNT(*) as count
      FROM giris_denemeleri
      WHERE kullanici_adi = ?
        AND basarili = 0
        AND tarih >= datetime('now', '-' || ? || ' minutes')
    `).get(cleanUser, dakika);
    return row ? row.count : 0;
  },

  countFailuresByIp(ip, dakika = 15, db = getDb()) {
    if (!ip) return 0;
    const row = db.prepare(`
      SELECT COUNT(*) as count
      FROM giris_denemeleri
      WHERE ip = ?
        AND basarili = 0
        AND tarih >= datetime('now', '-' || ? || ' minutes')
    `).get(ip, dakika);
    return row ? row.count : 0;
  },

  clearFailures(kullaniciAdi, ip, db = getDb()) {
    const cleanUser = (kullaniciAdi || '').trim().toLowerCase();
    db.prepare(`
      DELETE FROM giris_denemeleri
      WHERE kullanici_adi = ? AND ip = ?
    `).run(cleanUser, ip);
  }
};

export default girisDenemeRepository;
