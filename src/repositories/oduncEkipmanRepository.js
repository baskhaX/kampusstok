import getDb from '../db/connection.js';

export const oduncEkipmanRepository = {
  findAll(db = getDb()) {
    return db.prepare(`
      SELECT e.*,
             (
               SELECT json_object(
                 'id', r.id,
                 'birim_adi', b.ad,
                 'baslangic_tarihi', r.baslangic_tarihi,
                 'bitis_tarihi', r.bitis_tarihi
               )
               FROM ekipman_rezervasyonlari r
               JOIN birimler b ON r.birim_id = b.id
               WHERE r.ekipman_id = e.id 
                 AND r.durum IN ('onaylandi', 'teslim_edildi')
                 AND r.bitis_tarihi >= date('now')
               ORDER BY r.baslangic_tarihi ASC
               LIMIT 1
             ) as aktif_rezervasyon
      FROM odunc_ekipmanlar e
      WHERE e.aktif = 1
      ORDER BY e.kategori ASC, e.ad ASC
    `).all().map(item => ({
      ...item,
      aktif_rezervasyon: item.aktif_rezervasyon ? JSON.parse(item.aktif_rezervasyon) : null
    }));
  },

  findById(id, db = getDb()) {
    return db.prepare(`SELECT * FROM odunc_ekipmanlar WHERE id = ?`).get(id);
  },

  /**
   * Çakışan rezervasyon var mı kontrol eder
   */
  findCakisma(ekipmanId, baslangic, bitis, haricId = null, db = getDb()) {
    let sql = `
      SELECT r.*, b.ad as birim_adi
      FROM ekipman_rezervasyonlari r
      JOIN birimler b ON r.birim_id = b.id
      WHERE r.ekipman_id = ?
        AND r.durum IN ('onaylandi', 'teslim_edildi')
        AND NOT (r.bitis_tarihi < ? OR r.baslangic_tarihi > ?)
    `;
    const params = [ekipmanId, baslangic, bitis];
    if (haricId) {
      sql += ' AND r.id != ?';
      params.push(haricId);
    }
    return db.prepare(sql).all(...params);
  },

  createRezervasyon({ ekipman_id, birim_id, personel_id, baslangic_tarihi, bitis_tarihi, kullanim_amaci, teslim_alma_turu }, db = getDb()) {
    const stmt = db.prepare(`
      INSERT INTO ekipman_rezervasyonlari (ekipman_id, birim_id, personel_id, baslangic_tarihi, bitis_tarihi, kullanim_amaci, teslim_alma_turu, durum)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'onaylandi')
    `);
    const info = stmt.run(ekipman_id, birim_id, personel_id || null, baslangic_tarihi, bitis_tarihi, kullanim_amaci, teslim_alma_turu);
    return info.lastInsertRowid;
  },

  findRezervasyonlarByBirim(birimId, db = getDb()) {
    return db.prepare(`
      SELECT r.*, e.ad as ekipman_adi, e.kategori as ekipman_kategorisi, e.demirbas_kodu
      FROM ekipman_rezervasyonlari r
      JOIN odunc_ekipmanlar e ON r.ekipman_id = e.id
      WHERE r.birim_id = ?
      ORDER BY r.baslangic_tarihi DESC
    `).all(birimId);
  },

  findRezervasyonById(id, db = getDb()) {
    return db.prepare(`
      SELECT r.*, e.ad as ekipman_adi, e.kategori as ekipman_kategorisi, e.demirbas_kodu,
             b.ad as birim_adi, p.ad_soyad as personel_adi, p.telefon as personel_telefon
      FROM ekipman_rezervasyonlari r
      JOIN odunc_ekipmanlar e ON r.ekipman_id = e.id
      JOIN birimler b ON r.birim_id = b.id
      LEFT JOIN personel p ON r.personel_id = p.id
      WHERE r.id = ?
    `).get(id);
  },

  findAllRezervasyonlar(db = getDb()) {
    return db.prepare(`
      SELECT r.*, e.ad as ekipman_adi, e.kategori as ekipman_kategorisi, e.demirbas_kodu,
             b.ad as birim_adi, p.ad_soyad as personel_adi, p.telefon as personel_telefon
      FROM ekipman_rezervasyonlari r
      JOIN odunc_ekipmanlar e ON r.ekipman_id = e.id
      JOIN birimler b ON r.birim_id = b.id
      LEFT JOIN personel p ON r.personel_id = p.id
      ORDER BY r.id DESC
    `).all();
  },

  teslimEt(rezervasyonId, db = getDb()) {
    return db.prepare(`
      UPDATE ekipman_rezervasyonlari
      SET durum = 'teslim_edildi'
      WHERE id = ? AND durum = 'onaylandi'
    `).run(rezervasyonId);
  },

  teslimAlindi(rezervasyonId, db = getDb()) {
    return db.prepare(`
      UPDATE ekipman_rezervasyonlari
      SET durum = 'iade_alindi', iade_tarihi = date('now')
      WHERE id = ? AND durum IN ('onaylandi', 'teslim_edildi')
    `).run(rezervasyonId);
  }
};

export default oduncEkipmanRepository;
