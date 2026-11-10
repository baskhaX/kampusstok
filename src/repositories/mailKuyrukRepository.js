import getDb from '../db/connection.js';

export const mailKuyrukRepository = {
  create({ talep_id = null, alici, konu, govde, durum = 'bekliyor' }, db = getDb()) {
    const stmt = db.prepare(`
      INSERT INTO mail_kuyrugu (talep_id, alici, konu, govde, durum, deneme_sayisi, tarih)
      VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
    `);
    const res = stmt.run(talep_id, alici, konu, govde, durum);
    return res.lastInsertRowid;
  },

  findPending(limit = 10, maxRetries = 3, db = getDb()) {
    return db.prepare(`
      SELECT * FROM mail_kuyrugu
      WHERE durum IN ('bekliyor', 'basarisiz') AND deneme_sayisi < ?
      ORDER BY tarih ASC
      LIMIT ?
    `).all(maxRetries, limit);
  },

  markSuccess(id, durum = 'gonderildi', db = getDb()) {
    return db.prepare(`
      UPDATE mail_kuyrugu
      SET durum = ?, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(durum, id);
  },

  markFailed(id, hataMesaji, db = getDb()) {
    return db.prepare(`
      UPDATE mail_kuyrugu
      SET durum = 'basarisiz', deneme_sayisi = deneme_sayisi + 1, hata = ?, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(hataMesaji, id);
  },

  resetForRetry(id, db = getDb()) {
    return db.prepare(`
      UPDATE mail_kuyrugu
      SET durum = 'bekliyor', deneme_sayisi = 0, hata = NULL, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `).run(id);
  },

  findByTalepId(talepId, db = getDb()) {
    return db.prepare(`
      SELECT * FROM mail_kuyrugu
      WHERE talep_id = ?
      ORDER BY id DESC
    `).all(talepId);
  }
};

export default mailKuyrukRepository;
