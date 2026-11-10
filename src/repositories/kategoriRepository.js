import getDb from '../db/connection.js';

export const kategoriRepository = {
  findAll(db = getDb()) {
    return db.prepare(`
      SELECT k.*, u.ad as ust_kategori_ad,
             (SELECT COUNT(*) FROM urunler WHERE kategori_id = k.id AND aktif = 1) as urun_sayisi
      FROM kategoriler k
      LEFT JOIN kategoriler u ON k.ust_kategori_id = u.id
      ORDER BY k.sira ASC, k.ad ASC
    `).all();
  },

  findActive(db = getDb()) {
    return db.prepare(`
      SELECT k.*, u.ad as ust_kategori_ad,
             (SELECT COUNT(*) FROM urunler WHERE kategori_id = k.id AND aktif = 1) as urun_sayisi
      FROM kategoriler k
      LEFT JOIN kategoriler u ON k.ust_kategori_id = u.id
      WHERE k.aktif = 1
      ORDER BY k.sira ASC, k.ad ASC
    `).all();
  },

  findById(id, db = getDb()) {
    return db.prepare(`
      SELECT k.*, u.ad as ust_kategori_ad
      FROM kategoriler k
      LEFT JOIN kategoriler u ON k.ust_kategori_id = u.id
      WHERE k.id = ?
    `).get(id);
  },

  create({ ad, ust_kategori_id = null, sira = 0 }, db = getDb()) {
    const stmt = db.prepare(`
      INSERT INTO kategoriler (ad, ust_kategori_id, sira, aktif)
      VALUES (?, ?, ?, 1)
    `);
    const res = stmt.run(ad.trim(), ust_kategori_id, sira);
    return this.findById(res.lastInsertRowid, db);
  },

  update(id, { ad, ust_kategori_id = null, sira = 0, aktif = 1 }, db = getDb()) {
    db.prepare(`
      UPDATE kategoriler 
      SET ad = ?, ust_kategori_id = ?, sira = ?, aktif = ?, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(ad.trim(), ust_kategori_id, sira, aktif, id);
    return this.findById(id, db);
  },

  delete(id, db = getDb()) {
    const urunSayisi = db.prepare('SELECT COUNT(*) as cnt FROM urunler WHERE kategori_id = ?').get(id).cnt;
    if (urunSayisi > 0) {
      db.prepare('UPDATE kategoriler SET aktif = 0, guncelleme_tarihi = datetime(\'now\') WHERE id = ?').run(id);
      return { silindi: false, pasifeAlindi: true, mesaj: 'Kategori altında ürünler bulunduğu için arşive/pasife alındı.' };
    }
    db.prepare('UPDATE kategoriler SET ust_kategori_id = NULL WHERE ust_kategori_id = ?').run(id);
    db.prepare('DELETE FROM kategoriler WHERE id = ?').run(id);
    return { silindi: true, pasifeAlindi: false, mesaj: 'Kategori sistemden tamamen silindi.' };
  }
};

export default kategoriRepository;
