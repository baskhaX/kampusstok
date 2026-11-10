import getDb from '../db/connection.js';

export const bildirimRepository = {
  create({ hedef_rol, hedef_birim_id = null, tur, baslik, mesaj, talep_id = null, extra_data = null, extraData = null }, db = getDb()) {
    const rawExtra = extra_data || extraData;
    const extraStr = typeof rawExtra === 'object' && rawExtra !== null ? JSON.stringify(rawExtra) : rawExtra;
    const stmt = db.prepare(`
      INSERT INTO bildirimler (hedef_rol, hedef_birim_id, tur, baslik, mesaj, talep_id, extra_data, okundu)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);
    const res = stmt.run(hedef_rol, hedef_birim_id, tur, baslik, mesaj, talep_id, extraStr);
    return res.lastInsertRowid;
  },

  findRecent(hedefRol, hedefBirimId = null, limit = 50, db = getDb()) {
    let sql = `
      SELECT b.*, t.talep_no
      FROM bildirimler b
      LEFT JOIN talepler t ON b.talep_id = t.id
      WHERE b.hedef_rol = ?
    `;
    const params = [hedefRol];

    if (hedefBirimId) {
      sql += ' AND (b.hedef_birim_id IS NULL OR b.hedef_birim_id = ?)';
      params.push(hedefBirimId);
    }

    sql += ' ORDER BY b.olusturma_tarihi DESC LIMIT ?';
    params.push(limit);

    const rows = db.prepare(sql).all(...params);
    return rows.map(r => {
      let extraObj = null;
      if (r.extra_data) {
        try { extraObj = JSON.parse(r.extra_data); } catch (e) {}
      }
      return {
        ...r,
        extraData: extraObj,
        ...(extraObj || {})
      };
    });
  },

  countUnread(hedefRol, hedefBirimId = null, db = getDb()) {
    let sql = `
      SELECT COUNT(*) as count
      FROM bildirimler
      WHERE hedef_rol = ? AND okundu = 0
    `;
    const params = [hedefRol];

    if (hedefBirimId) {
      sql += ' AND (hedef_birim_id IS NULL OR hedef_birim_id = ?)';
      params.push(hedefBirimId);
    }

    return db.prepare(sql).get(...params).count;
  },

  markAsRead(id, hedefRol = null, hedefBirimId = null, db = getDb()) {
    let sql = `
      UPDATE bildirimler
      SET okundu = 1, guncelleme_tarihi = datetime('now')
      WHERE id = ?
    `;
    const params = [id];

    if (hedefRol && hedefRol !== 'satin_alma') {
      sql += ' AND hedef_rol = ?';
      params.push(hedefRol);
      if (hedefBirimId) {
        sql += ' AND (hedef_birim_id IS NULL OR hedef_birim_id = ?)';
        params.push(hedefBirimId);
      }
    }

    return db.prepare(sql).run(...params);
  },

  markAllAsRead(hedefRol, hedefBirimId = null, db = getDb()) {
    let sql = `
      UPDATE bildirimler
      SET okundu = 1, guncelleme_tarihi = datetime('now')
      WHERE hedef_rol = ? AND okundu = 0
    `;
    const params = [hedefRol];

    if (hedefBirimId) {
      sql += ' AND (hedef_birim_id IS NULL OR hedef_birim_id = ?)';
      params.push(hedefBirimId);
    }

    return db.prepare(sql).run(...params);
  }
};

export default bildirimRepository;
