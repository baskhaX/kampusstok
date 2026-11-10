import getDb from '../db/connection.js';
import config from '../config/index.js';

export const hesapRepository = {
  findByKullaniciAdi(kullaniciAdi, db = getDb()) {
    let raw = (kullaniciAdi || '').trim().toLowerCase();
    if (!raw) return null;

    // 'yapici' veya 'yapıcı' acil durum admin takma adı (alias) desteği
    if (raw === 'yapici' || raw === 'yapıcı') {
      raw = 'admin';
    }

    const domain = config?.epostaDomain || 'kampus.edu.tr';
    const withDomain = raw.includes('@') ? raw : `${raw}@${domain}`;
    const withoutDomain = raw.split('@')[0];

    return db.prepare(`
      SELECT h.*, b.ad as birim_adi, b.tur as birim_turu,
             p.ad_soyad as personel_adi, p.eposta as personel_eposta,
             p.bina_adi, p.oda_no, p.telefon
      FROM hesaplar h
      LEFT JOIN birimler b ON h.birim_id = b.id
      LEFT JOIN personel p ON h.personel_id = p.id
      WHERE LOWER(h.kullanici_adi) IN (?, ?) 
         OR LOWER(p.eposta) IN (?, ?)
      LIMIT 1
    `).get(withoutDomain, withDomain, withoutDomain, withDomain);
  },

  findById(id, db = getDb()) {
    return db.prepare(`
      SELECT h.*, b.ad as birim_adi, b.tur as birim_turu,
             p.ad_soyad as personel_adi, p.eposta as personel_eposta,
             p.bina_adi, p.oda_no, p.telefon
      FROM hesaplar h
      LEFT JOIN birimler b ON h.birim_id = b.id
      LEFT JOIN personel p ON h.personel_id = p.id
      WHERE h.id = ?
    `).get(id);
  },

  findByPersonelId(personelId, db = getDb()) {
    return db.prepare(`
      SELECT h.*, b.ad as birim_adi, b.tur as birim_turu 
      FROM hesaplar h
      LEFT JOIN birimler b ON h.birim_id = b.id
      WHERE h.personel_id = ?
    `).get(personelId);
  },

  findAll(db = getDb()) {
    return db.prepare(`
      SELECT h.id, h.kullanici_adi, h.rol, h.birim_id, h.personel_id, h.sifre_degistirmeli, h.aktif,
             h.olusturma_tarihi, h.guncelleme_tarihi, b.ad as birim_adi,
             p.ad_soyad as personel_adi, p.eposta as personel_eposta, p.bina_adi, p.oda_no
      FROM hesaplar h
      LEFT JOIN birimler b ON h.birim_id = b.id
      LEFT JOIN personel p ON h.personel_id = p.id
      ORDER BY h.id ASC
    `).all();
  },

  create({ kullanici_adi, sifre_hash, rol, birim_id = null, personel_id = null, sifre_degistirmeli = 1 }, db = getDb()) {
    const stmt = db.prepare(`
      INSERT INTO hesaplar (kullanici_adi, sifre_hash, rol, birim_id, personel_id, sifre_degistirmeli, aktif)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    const res = stmt.run(kullanici_adi, sifre_hash, rol, birim_id, personel_id, sifre_degistirmeli);
    return this.findById(res.lastInsertRowid, db);
  },

  updatePassword(id, sifre_hash, sifre_degistirmeli = 0, db = getDb()) {
    db.prepare(`
      UPDATE hesaplar 
      SET sifre_hash = ?, sifre_degistirmeli = ?, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(sifre_hash, sifre_degistirmeli, id);
    return this.findById(id, db);
  },

  updateStatus(id, aktif, db = getDb()) {
    db.prepare(`
      UPDATE hesaplar 
      SET aktif = ?, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(aktif, id);
    return this.findById(id, db);
  }
};

export default hesapRepository;
