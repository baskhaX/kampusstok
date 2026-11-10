import getDb from '../db/connection.js';

export const atilMalzemeRepository = {
  create({ birim_id, personel_id, bina_adi, oda_no, detay_notu }, db = getDb()) {
    const stmt = db.prepare(`
      INSERT INTO atil_malzeme_bildirimleri (birim_id, personel_id, bina_adi, oda_no, detay_notu, durum)
      VALUES (?, ?, ?, ?, ?, 'beklemede')
    `);
    const info = stmt.run(birim_id, personel_id || null, bina_adi, oda_no, detay_notu);
    return info.lastInsertRowid;
  },

  findById(id, db = getDb()) {
    return db.prepare(`
      SELECT m.*, b.ad as birim_adi, p.ad_soyad as personel_adi, p.telefon as personel_telefon
      FROM atil_malzeme_bildirimleri m
      JOIN birimler b ON m.birim_id = b.id
      LEFT JOIN personel p ON m.personel_id = p.id
      WHERE m.id = ?
    `).get(id);
  },

  findBekleyenler(db = getDb()) {
    return db.prepare(`
      SELECT m.*, b.ad as birim_adi, p.ad_soyad as personel_adi, p.telefon as personel_telefon
      FROM atil_malzeme_bildirimleri m
      JOIN birimler b ON m.birim_id = b.id
      LEFT JOIN personel p ON m.personel_id = p.id
      WHERE m.durum = 'beklemede'
      ORDER BY m.bina_adi ASC, m.oda_no ASC
    `).all();
  },

  findTumBildirimler(db = getDb()) {
    return db.prepare(`
      SELECT m.*, b.ad as birim_adi, p.ad_soyad as personel_adi, p.telefon as personel_telefon
      FROM atil_malzeme_bildirimleri m
      JOIN birimler b ON m.birim_id = b.id
      LEFT JOIN personel p ON m.personel_id = p.id
      ORDER BY m.id DESC
    `).all();
  },

  teslimAl(id, hesapId, db = getDb()) {
    return db.prepare(`
      UPDATE atil_malzeme_bildirimleri
      SET durum = 'teslim_alindi', teslim_alan_hesap_id = ?, teslim_tarihi = datetime('now')
      WHERE id = ? AND durum = 'beklemede'
    `).run(hesapId, id);
  }
};

export default atilMalzemeRepository;
