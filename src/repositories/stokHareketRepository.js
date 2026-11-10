import getDb from '../db/connection.js';

export const stokHareketRepository = {
  create({ urun_id, tur, miktar, talep_id = null, aciklama = null, yapan_hesap_id = null }, db = getDb()) {
    const stmt = db.prepare(`
      INSERT INTO stok_hareketleri (urun_id, tur, miktar, talep_id, aciklama, yapan_hesap_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const res = stmt.run(urun_id, tur, miktar, talep_id, aciklama, yapan_hesap_id);
    return res.lastInsertRowid;
  },

  findByUrunId(urunId, db = getDb()) {
    return db.prepare(`
      SELECT sh.*, u.ad as urun_adi, u.marka as urun_marka, u.barkod as urun_barkod, u.olcu_birimi, u.gorsel_yolu as urun_gorsel,
             h.kullanici_adi as yapan_kullanici, t.talep_no
      FROM stok_hareketleri sh
      JOIN urunler u ON sh.urun_id = u.id
      LEFT JOIN hesaplar h ON sh.yapan_hesap_id = h.id
      LEFT JOIN talepler t ON sh.talep_id = t.id
      WHERE sh.urun_id = ?
      ORDER BY sh.olusturma_tarihi DESC
    `).all(urunId);
  },

  findAll(limit = 100, db = getDb()) {
    return db.prepare(`
      SELECT sh.*, u.ad as urun_adi, u.marka as urun_marka, u.barkod as urun_barkod, u.olcu_birimi, u.gorsel_yolu as urun_gorsel,
             h.kullanici_adi as yapan_kullanici, t.talep_no
      FROM stok_hareketleri sh
      JOIN urunler u ON sh.urun_id = u.id
      LEFT JOIN hesaplar h ON sh.yapan_hesap_id = h.id
      LEFT JOIN talepler t ON sh.talep_id = t.id
      ORDER BY sh.olusturma_tarihi DESC
      LIMIT ?
    `).all(limit);
  }
};

export default stokHareketRepository;
