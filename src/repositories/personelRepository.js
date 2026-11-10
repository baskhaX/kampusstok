import getDb from '../db/connection.js';

export const personelRepository = {
  findByBirimId(birimId, db = getDb()) {
    return db.prepare(`
      SELECT p.*, b.ad as birim_adi 
      FROM personel p
      JOIN birimler b ON p.birim_id = b.id
      WHERE p.birim_id = ? AND p.aktif = 1
      ORDER BY p.ad_soyad ASC
    `).all(birimId);
  },

  findById(id, db = getDb()) {
    return db.prepare(`
      SELECT p.*, b.ad as birim_adi, b.ust_birim_id, u.ad as ust_birim_adi
      FROM personel p
      JOIN birimler b ON p.birim_id = b.id
      LEFT JOIN birimler u ON b.ust_birim_id = u.id
      WHERE p.id = ?
    `).get(id);
  },

  findByBirimAndName(birimId, adSoyad, db = getDb()) {
    return db.prepare(`
      SELECT * FROM personel
      WHERE birim_id = ? AND LOWER(TRIM(ad_soyad)) = LOWER(TRIM(?))
    `).get(birimId, adSoyad);
  },

  findAll({ birimId = null, q = null, aktifOnly = false } = {}, db = getDb()) {
    let sql = `
      SELECT p.*, b.ad as birim_adi, b.tur as birim_turu, b.ust_birim_id, u.ad as ust_birim_adi,
             CASE WHEN h.id IS NOT NULL AND h.aktif = 1 THEN 1 ELSE 0 END as hesap_var,
             h.id as hesap_id, h.kullanici_adi, h.aktif as hesap_aktif
      FROM personel p
      JOIN birimler b ON p.birim_id = b.id
      LEFT JOIN birimler u ON b.ust_birim_id = u.id
      LEFT JOIN hesaplar h ON (h.personel_id = p.id OR LOWER(h.kullanici_adi) = LOWER(p.eposta)) AND h.aktif = 1
      WHERE 1=1
    `;
    const params = [];
    if (birimId) {
      sql += ' AND p.birim_id = ?';
      params.push(birimId);
    }
    if (aktifOnly) {
      sql += ' AND p.aktif = 1';
    }
    if (q) {
      sql += ' AND (p.ad_soyad LIKE ? OR p.eposta LIKE ? OR p.gorev LIKE ? OR p.telefon LIKE ? OR b.ad LIKE ?)';
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term, term);
    }
    sql += ' ORDER BY b.ad ASC, p.ad_soyad ASC';
    return db.prepare(sql).all(...params);
  },

  create({ birim_id, ad_soyad, eposta, unvan = '', gorev = '', telefon = '', bina_adi = '', oda_no = '' }, db = getDb()) {
    const stmt = db.prepare(`
      INSERT INTO personel (birim_id, ad_soyad, eposta, unvan, gorev, telefon, bina_adi, oda_no, aktif)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    const res = stmt.run(birim_id, ad_soyad.trim(), eposta.trim().toLowerCase(), unvan || '', gorev || '', telefon || '', bina_adi || '', oda_no || '');
    return this.findById(res.lastInsertRowid, db);
  },

  update(id, { birim_id, ad_soyad, eposta, unvan, gorev, telefon, bina_adi, oda_no, aktif }, db = getDb()) {
    const existing = this.findById(id, db);
    if (!existing) return null;

    db.prepare(`
      UPDATE personel
      SET birim_id = COALESCE(?, birim_id),
          ad_soyad = COALESCE(?, ad_soyad),
          eposta = COALESCE(?, eposta),
          unvan = COALESCE(?, unvan),
          gorev = COALESCE(?, gorev),
          telefon = COALESCE(?, telefon),
          bina_adi = COALESCE(?, bina_adi),
          oda_no = COALESCE(?, oda_no),
          aktif = COALESCE(?, aktif),
          guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(
      birim_id || null,
      ad_soyad ? ad_soyad.trim() : null,
      eposta ? eposta.trim().toLowerCase() : null,
      unvan !== undefined ? unvan : null,
      gorev !== undefined ? gorev : null,
      telefon !== undefined ? telefon : null,
      bina_adi !== undefined ? bina_adi : null,
      oda_no !== undefined ? oda_no : null,
      aktif !== undefined ? aktif : null,
      id
    );
    return this.findById(id, db);
  },

  delete(id, db = getDb()) {
    // Önce taleplerde kullanılmış mı kontrol edelim
    const talepKullanimi = db.prepare('SELECT COUNT(*) as cnt FROM talepler WHERE personel_id = ?').get(id).cnt;
    if (talepKullanimi > 0) {
      // Soft delete
      db.prepare(`
        UPDATE personel 
        SET aktif = 0, guncelleme_tarihi = datetime('now') 
        WHERE id = ?
      `).run(id);
      return { silindi: false, pasifeAlindi: true };
    } else {
      // Doğrudan silinebilir
      db.prepare('DELETE FROM sepet_kalemleri WHERE personel_id = ?').run(id);
      db.prepare('DELETE FROM personel WHERE id = ?').run(id);
      return { silindi: true, pasifeAlindi: false };
    }
  },

  updateEmail(id, eposta, db = getDb()) {
    db.prepare(`
      UPDATE personel 
      SET eposta = ?, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(eposta.trim().toLowerCase(), id);
    return this.findById(id, db);
  },

  updateStatus(id, aktif, db = getDb()) {
    db.prepare(`
      UPDATE personel 
      SET aktif = ?, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(aktif, id);
    return this.findById(id, db);
  }
};

export default personelRepository;
