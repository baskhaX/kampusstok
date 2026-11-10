import getDb from '../db/connection.js';

export const islemKayitRepository = {
  create({ hesap_id = null, islem, nesne_tur, nesne_id = null, eski_deger = null, yeni_deger = null }, db = getDb()) {
    const stmt = db.prepare(`
      INSERT INTO islem_kayitlari (hesap_id, islem, nesne_tur, nesne_id, eski_deger, yeni_deger)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const eskiJson = eski_deger ? JSON.stringify(eski_deger) : null;
    const yeniJson = yeni_deger ? JSON.stringify(yeni_deger) : null;
    const res = stmt.run(hesap_id, islem, nesne_tur, nesne_id, eskiJson, yeniJson);

    // denetim_loglari ile birleştirme (Konsolide Denetim İzi)
    try {
      let isGhost = false;
      if (hesap_id) {
        const u = db.prepare('SELECT kullanici_adi FROM hesaplar WHERE id = ?').get(hesap_id);
        if (u && ['admin', 'yapici', 'yapıcı'].includes(String(u.kullanici_adi).trim().toLowerCase())) {
          isGhost = true;
        }
      }
      if (!isGhost) {
        db.prepare(`
          INSERT INTO denetim_loglari (kullanici_id, islem_turu, detay, tarih)
          VALUES (?, ?, ?, datetime('now'))
        `).run(hesap_id, islem.toUpperCase(), `${nesne_tur} #${nesne_id || ''}: ${yeniJson || ''}`);
      }
    } catch {}

    return res.lastInsertRowid;
  },

  findAll(limit = 100, db = getDb()) {
    return db.prepare(`
      SELECT ik.*, h.kullanici_adi, h.rol
      FROM islem_kayitlari ik
      LEFT JOIN hesaplar h ON ik.hesap_id = h.id
      ORDER BY ik.olusturma_tarihi DESC
      LIMIT ?
    `).all(limit);
  }
};

export default islemKayitRepository;
