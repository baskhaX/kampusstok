import getDb from '../db/connection.js';

export const yesilKampusRepository = {
  /**
   * Birimin belirli bir aydaki puan kaydını getirir veya 100 taban puanla oluşturur
   */
  getOrCreate(birimId, ay = null, db = getDb()) {
    const targetAy = ay || new Date().toISOString().substring(0, 7); // 'YYYY-MM'
    let row = db.prepare(`SELECT * FROM yesil_kampus_puanlari WHERE birim_id = ? AND ay = ?`).get(birimId, targetAy);

    if (!row) {
      try {
        db.prepare(`
          INSERT INTO yesil_kampus_puanlari (birim_id, ay, taban_puan, iade_puani, tasarruf_puani, nudge_puani, hizli_teslim_puani)
          VALUES (?, ?, 100, 0, 0, 0, 0)
        `).run(birimId, targetAy);

        row = db.prepare(`SELECT * FROM yesil_kampus_puanlari WHERE birim_id = ? AND ay = ?`).get(birimId, targetAy);
      } catch (err) {
        if (err.message && err.message.includes('FOREIGN KEY')) {
          return null;
        }
        throw err;
      }
    }

    return row;
  },

  /**
   * Puan ekleme (iade_puani, tasarruf_puani, nudge_puani, hizli_teslim_puani)
   */
  puanEkle(birimId, kolon, miktar, ay = null, db = getDb()) {
    const targetAy = ay || new Date().toISOString().substring(0, 7);
    this.getOrCreate(birimId, targetAy, db);

    const validCols = ['iade_puani', 'tasarruf_puani', 'nudge_puani', 'hizli_teslim_puani'];
    if (!validCols.includes(kolon)) return;

    db.prepare(`
      UPDATE yesil_kampus_puanlari
      SET ${kolon} = ${kolon} + ?, guncelleme_tarihi = datetime('now')
      WHERE birim_id = ? AND ay = ?
    `).run(miktar, birimId, targetAy);
  },

  /**
   * Belirtilen ayın liderlik tablosunu getirir (Akademik ve İdari ayrı ayrı)
   */
  getSiralama(ay = null, tur = null, db = getDb()) {
    const targetAy = ay || new Date().toISOString().substring(0, 7);

    // Tüm aktif birimleri garantiye al
    const birimler = db.prepare(`SELECT id FROM birimler WHERE aktif = 1`).all();
    for (const b of birimler) {
      this.getOrCreate(b.id, targetAy, db);
    }

    let sql = `
      SELECT yk.*, b.ad as birim_adi, b.tur as birim_turu,
             (SELECT COUNT(*) FROM personel p WHERE p.birim_id = b.id AND p.aktif = 1) as personel_sayisi
      FROM yesil_kampus_puanlari yk
      JOIN birimler b ON yk.birim_id = b.id
      WHERE yk.ay = ? AND b.aktif = 1
    `;
    const params = [targetAy];

    if (tur === 'akademik') {
      sql += ` AND b.tur IN ('bolum', 'dekanlik')`;
    } else if (tur === 'idari') {
      // İdari lig sadece fiilen hizmet veren idari müdürlüklerden oluşur
      sql += ` AND b.tur = 'idari_birim' AND (b.ad LIKE '%Müdürlüğü%' OR b.ad LIKE '%Müdürlük%')`;
    }

    sql += ` ORDER BY yk.toplam_puan DESC, b.ad ASC`;

    return db.prepare(sql).all(...params);
  }
};

export default yesilKampusRepository;
