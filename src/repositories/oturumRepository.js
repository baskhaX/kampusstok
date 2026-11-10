import getDb from '../db/connection.js';

export const oturumRepository = {
  create({ token_hash, hesap_id, secili_personel_id = null, son_gecerlilik }, db = getDb()) {
    const stmt = db.prepare(`
      INSERT INTO oturumlar (token_hash, hesap_id, secili_personel_id, son_gecerlilik)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(token_hash, hesap_id, secili_personel_id, son_gecerlilik);
  },

  findByTokenHash(tokenHash, db = getDb()) {
    return db.prepare(`
      SELECT o.*, h.kullanici_adi, h.rol, h.birim_id, h.personel_id as hesap_personel_id,
             h.sifre_degistirmeli, h.aktif as hesap_aktif,
             b.ad as birim_adi, b.tur as birim_turu,
             COALESCE(op.id, hp.id) as personel_id,
             COALESCE(op.ad_soyad, hp.ad_soyad) as personel_adi,
             COALESCE(op.eposta, hp.eposta) as personel_eposta,
             COALESCE(op.bina_adi, hp.bina_adi) as bina_adi,
             COALESCE(op.oda_no, hp.oda_no) as oda_no
      FROM oturumlar o
      JOIN hesaplar h ON o.hesap_id = h.id
      LEFT JOIN birimler b ON h.birim_id = b.id
      LEFT JOIN personel hp ON h.personel_id = hp.id
      LEFT JOIN personel op ON o.secili_personel_id = op.id
      WHERE o.token_hash = ? AND o.son_gecerlilik > datetime('now')
    `).get(tokenHash);
  },

  updateSeciliPersonel(tokenHash, personelId, db = getDb()) {
    return db.prepare(`
      UPDATE oturumlar
      SET secili_personel_id = ?, guncelleme_tarihi = datetime('now')
      WHERE token_hash = ?
    `).run(personelId, tokenHash);
  },

  deleteByTokenHash(tokenHash, db = getDb()) {
    return db.prepare(`
      DELETE FROM oturumlar WHERE token_hash = ?
    `).run(tokenHash);
  },

  deleteByHesapId(hesapId, exceptTokenHash = null, db = getDb()) {
    if (exceptTokenHash) {
      return db.prepare(`
        DELETE FROM oturumlar WHERE hesap_id = ? AND token_hash != ?
      `).run(hesapId, exceptTokenHash);
    }
    return db.prepare(`
      DELETE FROM oturumlar WHERE hesap_id = ?
    `).run(hesapId);
  },

  deleteExpired(db = getDb()) {
    return db.prepare(`
      DELETE FROM oturumlar WHERE son_gecerlilik <= datetime('now')
    `).run();
  }
};

export default oturumRepository;
