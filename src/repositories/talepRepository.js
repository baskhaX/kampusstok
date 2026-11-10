import getDb from '../db/connection.js';

export const talepRepository = {
  // Yıl bazlı benzersiz talep numarası üretir (Transaction içinde çalışmalıdır)
  generateNextTalepNo(db = getDb()) {
    const currentYear = new Date().getFullYear();

    db.prepare(`
      INSERT INTO talep_sayaclari (yil, son_numara)
      VALUES (?, 0)
      ON CONFLICT(yil) DO NOTHING
    `).run(currentYear);

    const updateRes = db.prepare(`
      UPDATE talep_sayaclari
      SET son_numara = son_numara + 1, guncelleme_tarihi = datetime('now')
      WHERE yil = ?
      RETURNING son_numara
    `).get(currentYear);

    const numStr = String(updateRes.son_numara).padStart(4, '0');
    return `TLP-${currentYear}-${numStr}`;
  },

  create({ talep_no, birim_id, personel_id, personel_adi, personel_eposta, notlar = null }, db = getDb()) {
    const stmt = db.prepare(`
      INSERT INTO talepler (
        talep_no, birim_id, personel_id, personel_adi, personel_eposta, notlar,
        durum, mail_durumu
      )
      VALUES (?, ?, ?, ?, ?, ?, 'beklemede', 'bekliyor')
    `);
    const res = stmt.run(talep_no, birim_id, personel_id, personel_adi, personel_eposta, notlar);
    return res.lastInsertRowid;
  },

  createKalemler(items, db = getDb()) {
    const stmt = db.prepare(`
      INSERT INTO talep_kalemleri (talep_id, urun_id, urun_adi, olcu_birimi, istenen_adet, onaylanan_adet)
      VALUES (?, ?, ?, ?, ?, NULL)
    `);
    for (const item of items) {
      stmt.run(item.talep_id, item.urun_id, item.urun_adi, item.olcu_birimi, item.istenen_adet);
    }
  },

  findById(id, db = getDb()) {
    return db.prepare(`
      SELECT t.*, b.ad as birim_adi, b.tur as birim_turu,
             h.kullanici_adi as sonuclandiran_kullanici,
             p.bina_adi, p.oda_no, p.telefon as personel_telefon, p.unvan as personel_unvan
      FROM talepler t
      JOIN birimler b ON t.birim_id = b.id
      LEFT JOIN hesaplar h ON t.sonuclandiran_hesap_id = h.id
      LEFT JOIN personel p ON t.personel_id = p.id
      WHERE t.id = ?
    `).get(id);
  },

  findByTalepNo(talepNo, db = getDb()) {
    return db.prepare(`
      SELECT t.*, b.ad as birim_adi, b.tur as birim_turu,
             h.kullanici_adi as sonuclandiran_kullanici,
             p.bina_adi, p.oda_no, p.telefon as personel_telefon, p.unvan as personel_unvan
      FROM talepler t
      JOIN birimler b ON t.birim_id = b.id
      LEFT JOIN hesaplar h ON t.sonuclandiran_hesap_id = h.id
      LEFT JOIN personel p ON t.personel_id = p.id
      WHERE t.talep_no = ?
    `).get(talepNo);
  },

  findKalemlerByTalepId(talepId, db = getDb()) {
    return db.prepare(`
      SELECT tk.*, u.stok as mevcut_stok, u.kritik_stok, u.gorsel_yolu, u.aktif as urun_aktif, u.demirbas
      FROM talep_kalemleri tk
      LEFT JOIN urunler u ON tk.urun_id = u.id
      WHERE tk.talep_id = ?
      ORDER BY tk.id ASC
    `).all(talepId);
  },

  findFiltered({ birimId = null, birimIds = null, durum = null, personelId = null, baslangic = null, bitis = null, search = null, limit = 100, offset = 0 }, db = getDb()) {
    let sql = `
      SELECT t.*, b.ad as birim_adi,
             p.bina_adi, p.oda_no, p.telefon as personel_telefon, p.unvan as personel_unvan,
             (SELECT COUNT(*) FROM talep_kalemleri WHERE talep_id = t.id) as kalem_sayisi,
             (SELECT SUM(istenen_adet) FROM talep_kalemleri WHERE talep_id = t.id) as toplam_istenen_adet
      FROM talepler t
      JOIN birimler b ON t.birim_id = b.id
      LEFT JOIN personel p ON t.personel_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (birimId) {
      sql += ' AND t.birim_id = ?';
      params.push(birimId);
    } else if (birimIds && birimIds.length > 0) {
      const placeholders = birimIds.map(() => '?').join(',');
      sql += ` AND t.birim_id IN (${placeholders})`;
      params.push(...birimIds);
    }

    if (durum) {
      sql += ' AND t.durum = ?';
      params.push(durum);
    }

    if (personelId) {
      sql += ' AND t.personel_id = ?';
      params.push(personelId);
    }

    if (baslangic) {
      sql += ' AND t.olusturma_tarihi >= ?';
      params.push(baslangic);
    }

    if (bitis) {
      sql += ' AND t.olusturma_tarihi <= ?';
      params.push(bitis);
    }

    if (search) {
      sql += ' AND (t.talep_no LIKE ? OR t.personel_adi LIKE ? OR b.ad LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY t.olusturma_tarihi DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return db.prepare(sql).all(...params);
  },

  updateKalemOnay(kalemId, onaylananAdet, db = getDb()) {
    return db.prepare(`
      UPDATE talep_kalemleri
      SET onaylanan_adet = ?, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(onaylananAdet, kalemId);
  },

  updateSonuc({ id, durum, sonuc_gerekcesi = null, sonuclandiran_hesap_id, sonuc_tarihi, teslimat_tarihi = null }, db = getDb()) {
    return db.prepare(`
      UPDATE talepler
      SET durum = ?, sonuc_gerekcesi = ?, sonuclandiran_hesap_id = ?,
          sonuc_tarihi = ?, teslimat_tarihi = ?, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(durum, sonuc_gerekcesi, sonuclandiran_hesap_id, sonuc_tarihi, teslimat_tarihi, id);
  },

  updateMailDurumu(id, mailDurumu, db = getDb()) {
    return db.prepare(`
      UPDATE talepler
      SET mail_durumu = ?, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(mailDurumu, id);
  },

  updateDurumTeslimEdildi(id, db = getDb()) {
    return db.prepare(`
      UPDATE talepler
      SET durum = 'teslim_edildi', guncelleme_tarihi = datetime('now')
      WHERE id = ? AND durum IN ('onaylandi', 'revize_onaylandi')
    `).run(id);
  },

  kullaniciTeslimAl({ id, hesapId, not = null }, db = getDb()) {
    return db.prepare(`
      UPDATE talepler
      SET durum = 'teslim_edildi',
          kullanici_teslim_aldi = 1,
          kullanici_teslim_tarihi = datetime('now'),
          kullanici_teslim_hesap_id = ?,
          kullanici_teslim_notu = ?,
          guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(hesapId, not ? not.trim() : null, id);
  }
};

export default talepRepository;
