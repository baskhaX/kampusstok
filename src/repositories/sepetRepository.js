import getDb from '../db/connection.js';

export const sepetRepository = {
  findByBirimAndPersonel(birimId, personelId, db = getDb()) {
    return db.prepare(`
      SELECT sk.*, u.ad as urun_adi, u.marka as urun_marka, u.olcu_birimi,
             u.stok as mevcut_stok, u.kritik_stok, u.gorsel_yolu, u.aktif as urun_aktif,
             k.ad as kategori_adi
      FROM sepet_kalemleri sk
      JOIN urunler u ON sk.urun_id = u.id
      JOIN kategoriler k ON u.kategori_id = k.id
      WHERE sk.birim_id = ? AND sk.personel_id = ?
      ORDER BY sk.olusturma_tarihi ASC
    `).all(birimId, personelId);
  },

  upsertItem(birimId, personelId, urunId, adet, db = getDb()) {
    return db.prepare(`
      INSERT INTO sepet_kalemleri (birim_id, personel_id, urun_id, adet, guncelleme_tarihi)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(birim_id, personel_id, urun_id) DO UPDATE SET
        adet = excluded.adet,
        guncelleme_tarihi = datetime('now')
    `).run(birimId, personelId, urunId, adet);
  },

  updateQuantity(birimId, personelId, urunId, adet, db = getDb()) {
    if (adet <= 0) {
      return this.removeItem(birimId, personelId, urunId, db);
    }
    return db.prepare(`
      UPDATE sepet_kalemleri
      SET adet = ?, guncelleme_tarihi = datetime('now')
      WHERE birim_id = ? AND personel_id = ? AND urun_id = ?
    `).run(adet, birimId, personelId, urunId);
  },

  removeItem(birimId, personelId, urunId, db = getDb()) {
    return db.prepare(`
      DELETE FROM sepet_kalemleri
      WHERE birim_id = ? AND personel_id = ? AND urun_id = ?
    `).run(birimId, personelId, urunId);
  },

  clear(birimId, personelId, db = getDb()) {
    return db.prepare(`
      DELETE FROM sepet_kalemleri
      WHERE birim_id = ? AND personel_id = ?
    `).run(birimId, personelId);
  }
};

export default sepetRepository;
