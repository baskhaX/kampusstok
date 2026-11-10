import getDb from '../db/connection.js';

export const urunRepository = {
  findAll(db = getDb()) {
    return db.prepare(`
      SELECT u.*, k.ad as kategori_adi, k.ust_kategori_id as ust_kategori_id, uk.ad as ust_kategori_adi
      FROM urunler u
      JOIN kategoriler k ON u.kategori_id = k.id
      LEFT JOIN kategoriler uk ON k.ust_kategori_id = uk.id
      ORDER BY u.ad ASC
    `).all();
  },

  findActive(db = getDb()) {
    return db.prepare(`
      SELECT u.*, k.ad as kategori_adi, k.ust_kategori_id as ust_kategori_id, uk.ad as ust_kategori_adi
      FROM urunler u
      JOIN kategoriler k ON u.kategori_id = k.id
      LEFT JOIN kategoriler uk ON k.ust_kategori_id = uk.id
      WHERE u.aktif = 1 AND k.aktif = 1
      ORDER BY u.ad ASC
    `).all();
  },

  findById(id, db = getDb()) {
    return db.prepare(`
      SELECT u.*, k.ad as kategori_adi, k.ust_kategori_id as ust_kategori_id, uk.ad as ust_kategori_adi
      FROM urunler u
      JOIN kategoriler k ON u.kategori_id = k.id
      LEFT JOIN kategoriler uk ON k.ust_kategori_id = uk.id
      WHERE u.id = ?
    `).get(id);
  },

  findByKategori(kategoriId, db = getDb()) {
    return db.prepare(`
      SELECT u.*, k.ad as kategori_adi
      FROM urunler u
      JOIN kategoriler k ON u.kategori_id = k.id
      WHERE u.aktif = 1 AND (u.kategori_id = ? OR k.ust_kategori_id = ?)
      ORDER BY u.ad ASC
    `).all(kategoriId, kategoriId);
  },

  create({ kategori_id, ad, marka = null, barkod = null, olcu_birimi, stok = 0, kritik_stok = 5, gorsel_yolu = null }, db = getDb()) {
    const stmt = db.prepare(`
      INSERT INTO urunler (kategori_id, ad, marka, barkod, olcu_birimi, stok, kritik_stok, gorsel_yolu, aktif)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    const res = stmt.run(kategori_id, ad.trim(), marka ? marka.trim() : null, barkod ? barkod.trim() : null, olcu_birimi, stok, kritik_stok, gorsel_yolu);
    return this.findById(res.lastInsertRowid, db);
  },

  update(id, { kategori_id, ad, marka = null, barkod = null, olcu_birimi, kritik_stok = 5, gorsel_yolu = null, aktif = 1 }, db = getDb()) {
    db.prepare(`
      UPDATE urunler 
      SET kategori_id = ?, ad = ?, marka = ?, barkod = ?, olcu_birimi = ?, kritik_stok = ?, gorsel_yolu = ?, aktif = ?, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(kategori_id, ad.trim(), marka ? marka.trim() : null, barkod ? barkod.trim() : null, olcu_birimi, kritik_stok, gorsel_yolu, aktif, id);
    return this.findById(id, db);
  },

  findByBarkod(barkod, db = getDb()) {
    return db.prepare(`
      SELECT u.*, k.ad as kategori_adi, k.ust_kategori_id as ust_kategori_id, uk.ad as ust_kategori_adi
      FROM urunler u
      JOIN kategoriler k ON u.kategori_id = k.id
      LEFT JOIN kategoriler uk ON k.ust_kategori_id = uk.id
      WHERE u.barkod = ?
    `).get(barkod);
  },

  setAktif(id, aktif, db = getDb()) {
    db.prepare(`
      UPDATE urunler 
      SET aktif = ?, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(aktif ? 1 : 0, id);
    return this.findById(id, db);
  },

  updateStok(id, yeniStok, db = getDb()) {
    db.prepare(`
      UPDATE urunler 
      SET stok = ?, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(yeniStok, id);
    return this.findById(id, db);
  },

  decrementStok(id, miktar, db = getDb()) {
    const res = db.prepare(`
      UPDATE urunler 
      SET stok = stok - ?, guncelleme_tarihi = datetime('now')
      WHERE id = ? AND stok >= ?
    `).run(miktar, id, miktar);
    return res.changes > 0;
  },

  incrementStok(id, miktar, db = getDb()) {
    const res = db.prepare(`
      UPDATE urunler 
      SET stok = stok + ?, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(miktar, id);
    return res.changes > 0;
  }
};

export default urunRepository;
