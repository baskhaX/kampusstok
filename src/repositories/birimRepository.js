import getDb from '../db/connection.js';

export const birimRepository = {
  findAll(db = getDb()) {
    return db.prepare(`
      SELECT b.*, u.ad as ust_birim_ad 
      FROM birimler b 
      LEFT JOIN birimler u ON b.ust_birim_id = u.id 
      ORDER BY b.ad ASC
    `).all();
  },

  findActive(db = getDb()) {
    return db.prepare(`
      SELECT b.*, u.ad as ust_birim_ad 
      FROM birimler b 
      LEFT JOIN birimler u ON b.ust_birim_id = u.id 
      WHERE b.aktif = 1 
      ORDER BY b.ad ASC
    `).all();
  },

  findById(id, db = getDb()) {
    return db.prepare(`
      SELECT b.*, u.ad as ust_birim_ad 
      FROM birimler b 
      LEFT JOIN birimler u ON b.ust_birim_id = u.id 
      WHERE b.id = ?
    `).get(id);
  },

  findSubBirimIds(ustBirimId, db = getDb()) {
    return db.prepare(`
      WITH RECURSIVE birim_tree(id) AS (
        SELECT id FROM birimler WHERE id = ?
        UNION ALL
        SELECT b.id FROM birimler b JOIN birim_tree bt ON b.ust_birim_id = bt.id
      )
      SELECT id FROM birim_tree
    `).all(ustBirimId).map(r => r.id);
  },

  create({ ad, tur, ust_birim_id = null }, db = getDb()) {
    const stmt = db.prepare(`
      INSERT INTO birimler (ad, tur, ust_birim_id, aktif)
      VALUES (?, ?, ?, 1)
    `);
    const res = stmt.run(ad, tur, ust_birim_id);
    return this.findById(res.lastInsertRowid, db);
  },

  update(id, { ad, tur, ust_birim_id = null, aktif = 1 }, db = getDb()) {
    db.prepare(`
      UPDATE birimler 
      SET ad = ?, tur = ?, ust_birim_id = ?, aktif = ?, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(ad, tur, ust_birim_id, aktif, id);
    return this.findById(id, db);
  },

  setAktif(id, aktif, db = getDb()) {
    db.prepare(`
      UPDATE birimler 
      SET aktif = ?, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(aktif ? 1 : 0, id);
    return this.findById(id, db);
  },

  delete(id, db = getDb()) {
    const talepSayisi = db.prepare('SELECT COUNT(*) as cnt FROM talepler WHERE birim_id = ?').get(id).cnt;
    if (talepSayisi > 0) {
      this.setAktif(id, 0, db);
      return { silindi: false, pasifeAlindi: true, mesaj: 'Birim geçmiş talepler içerdiği için arşive/pasife alındı.' };
    }

    // Alt birimleri kontrol et
    const altBirimSayisi = db.prepare('SELECT COUNT(*) as cnt FROM birimler WHERE ust_birim_id = ?').get(id).cnt;
    if (altBirimSayisi > 0) {
      db.prepare('UPDATE birimler SET ust_birim_id = NULL WHERE ust_birim_id = ?').run(id);
    }

    // Personel ve hesapları temizle
    db.prepare('DELETE FROM sepet_kalemleri WHERE birim_id = ?').run(id);
    db.prepare('DELETE FROM personel WHERE birim_id = ?').run(id);
    db.prepare('DELETE FROM hesaplar WHERE birim_id = ?').run(id);
    db.prepare('DELETE FROM birimler WHERE id = ?').run(id);

    return { silindi: true, pasifeAlindi: false, mesaj: 'Birim sistemden tamamen silindi.' };
  }
};

export default birimRepository;
