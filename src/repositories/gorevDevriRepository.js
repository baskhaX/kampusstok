// src/repositories/gorevDevriRepository.js - Satın Alma Görev Devri ve İzin Motoru Deposu
import getDb from '../db/connection.js';

export const gorevDevriRepository = {
  /**
   * Yürürlükteki aktif yetkiyi getirir.
   * Öncelik Sırası:
   * 1. Zamanı gelmiş ve henüz süresi dolmamış aktif 'izin' (vekalet) kaydı.
   * 2. Aktif 'devir' (Asıl Kırtasiye Yöneticisi, örn: Ozan Can Şimşek) kaydı.
   * 3. Hiçbiri yoksa null döner (Asıl Makam: Satın Alma Müdürü masadadır).
   */
  findAktif(db = getDb()) {
    // 1. Önce saatli/tarihli geçerli izin vekaleti var mı?
    const izin = db.prepare(`
      SELECT g.*, p.gorev as personel_gorev, p.telefon as personel_telefon
      FROM gorev_devirleri g
      JOIN personel p ON g.alan_personel_id = p.id
      WHERE g.aktif = 1 
        AND g.tur = 'izin'
        AND g.baslangic_tarihi <= datetime('now', 'localtime')
        AND (g.bitis_tarihi IS NULL OR g.bitis_tarihi >= datetime('now', 'localtime'))
      ORDER BY g.id DESC
      LIMIT 1
    `).get();

    if (izin) return izin;

    // 2. İzin yoksa veya süresi dolmuşsa asıl devir kaydına bak
    const devir = db.prepare(`
      SELECT g.*, p.gorev as personel_gorev, p.telefon as personel_telefon
      FROM gorev_devirleri g
      JOIN personel p ON g.alan_personel_id = p.id
      WHERE g.aktif = 1 
        AND g.tur = 'devir'
        AND (g.bitis_tarihi IS NULL OR g.bitis_tarihi >= datetime('now', 'localtime'))
      ORDER BY g.id DESC
      LIMIT 1
    `).get();

    return devir || null;
  },

  /**
   * Personel ID'ye göre şu an aktif yetkili olup olmadığını kontrol eder.
   */
  isPersonelAktifYetkili(personelId, db = getDb()) {
    if (!personelId) return false;
    const aktif = this.findAktif(db);
    return Boolean(aktif && Number(aktif.alan_personel_id) === Number(personelId));
  },

  /**
   * Tüm geçmiş ve aktif görevlendirmeleri listeler
   */
  findAll(db = getDb()) {
    return db.prepare(`
      SELECT g.*, p.gorev as personel_gorev, p.telefon as personel_telefon
      FROM gorev_devirleri g
      JOIN personel p ON g.alan_personel_id = p.id
      ORDER BY g.id DESC
      LIMIT 50
    `).all();
  },

  /**
   * Yeni Görev Devri veya İzin Vekaleti Oluşturur
   */
  create({
    verenMakam = 'Satın Alma Müdürü',
    verenPersonelId = null,
    verenAdSoyad = 'Satın Alma Müdürü',
    alanPersonelId,
    alanAdSoyad,
    alanBirimId = 41,
    alanEposta = null,
    tur = 'devir', // 'devir' veya 'izin'
    rolModelEtiket = 'Kırtasiye ve Depo Sorumlusu',
    neden = null,
    baslangicTarihi = null,
    bitisTarihi = null
  }, db = getDb()) {
    const baslangic = baslangicTarihi || new Date().toISOString().slice(0, 19).replace('T', ' ');

    return db.transaction(() => {
      // Eğer aynı türde (devir veya izin) aktif kayıt varsa kapat
      db.prepare(`
        UPDATE gorev_devirleri
        SET aktif = 0,
            sonlandiran_ad_soyad = ?,
            sonlandirma_tarihi = datetime('now', 'localtime')
        WHERE aktif = 1 AND tur = ?
      `).run(verenAdSoyad, tur);

      const stmt = db.prepare(`
        INSERT INTO gorev_devirleri (
          veren_makam, veren_personel_id, veren_ad_soyad,
          alan_personel_id, alan_ad_soyad, alan_birim_id, alan_eposta,
          tur, rol_model_etiket, neden,
          baslangic_tarihi, bitis_tarihi, aktif, olusturma_tarihi
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now', 'localtime'))
      `);

      const res = stmt.run(
        verenMakam,
        verenPersonelId,
        verenAdSoyad,
        alanPersonelId,
        alanAdSoyad,
        alanBirimId,
        alanEposta,
        tur,
        rolModelEtiket,
        neden,
        baslangic,
        bitisTarihi || null
      );

      return db.prepare('SELECT * FROM gorev_devirleri WHERE id = ?').get(res.lastInsertRowid);
    })();
  },

  /**
   * Aktif görevi iptal eder (Yetkiyi asıl makama veya devredene iade eder)
   */
  sonlandir(optionsOrId = {}, sonlandiranAdSoyad = 'Satın Alma Müdürü', db = getDb()) {
    let id = null;
    let tur = null;
    let sonlandiran = typeof sonlandiranAdSoyad === 'string' ? sonlandiranAdSoyad : 'Satın Alma Müdürü';
    let targetDb = (typeof sonlandiranAdSoyad === 'object' && sonlandiranAdSoyad?.prepare) ? sonlandiranAdSoyad : (db || getDb());

    if (typeof optionsOrId === 'number' || (typeof optionsOrId === 'string' && !isNaN(Number(optionsOrId)))) {
      id = Number(optionsOrId);
    } else if (typeof optionsOrId === 'object' && optionsOrId !== null) {
      id = optionsOrId.id || null;
      tur = optionsOrId.tur || null;
      if (optionsOrId.sonlandiranAdSoyad) {
        sonlandiran = optionsOrId.sonlandiranAdSoyad;
      }
    }

    let sql = `
      UPDATE gorev_devirleri
      SET aktif = 0,
          sonlandiran_ad_soyad = ?,
          sonlandirma_tarihi = datetime('now', 'localtime')
      WHERE aktif = 1
    `;
    const params = [sonlandiran];
    if (id) {
      sql += ` AND id = ?`;
      params.push(id);
    }
    if (tur) {
      sql += ` AND tur = ?`;
      params.push(tur);
    }
    return targetDb.prepare(sql).run(...params);
  }
};

export default gorevDevriRepository;
