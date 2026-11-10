import ExcelJS from 'exceljs';
import getDb from '../db/connection.js';
import talepRepository from '../repositories/talepRepository.js';
import birimRepository from '../repositories/birimRepository.js';
import yesilKampusRepository from '../repositories/yesilKampusRepository.js';
import { formatTurkishDate, formatTurkishDateTime } from '../utils/date.js';

export const raporService = {
  /**
   * Filtrelenmiş talepler için Excel (.xlsx) çalışma kitabı üretir
   */
  async exportTaleplerExcel({ birimId, durum, baslangic, bitis }) {
    const db = getDb();
    let birimIds = null;
    if (birimId) {
      birimIds = birimRepository.findSubBirimIds(birimId, db);
    }

    const talepler = talepRepository.findFiltered({
      birimIds,
      durum,
      baslangic,
      bitis,
      limit: 1000,
      offset: 0
    }, db);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'KampüsStok Üniversitesi Kırtasiye Talep Sistemi';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Talepler', {
      pageSetup: { paperSize: 9, orientation: 'landscape' }
    });

    // Başlıklar
    sheet.columns = [
      { header: 'Talep No', key: 'talep_no', width: 16 },
      { header: 'Tarih', key: 'tarih', width: 20 },
      { header: 'Birim', key: 'birim', width: 28 },
      { header: 'İstek Sahibi', key: 'istek_sahibi', width: 24 },
      { header: 'E-Posta', key: 'eposta', width: 24 },
      { header: 'Durum', key: 'durum', width: 18 },
      { header: 'Teslim Tarihi', key: 'teslim_tarihi', width: 16 },
      { header: 'Kalem Sayısı', key: 'kalem_sayisi', width: 14 },
      { header: 'Sonuç Gerekçesi', key: 'gerekce', width: 30 }
    ];

    // Başlık Satırı Stili
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    const durumMetinleri = {
      beklemede: 'Beklemede',
      onaylandi: 'Onaylandı',
      revize_onaylandi: 'Revize Edildi',
      reddedildi: 'Reddedildi',
      teslim_edildi: 'Teslim Edildi'
    };

    for (const t of talepler) {
      sheet.addRow({
        talep_no: t.talep_no,
        tarih: formatTurkishDateTime(t.olusturma_tarihi),
        birim: t.birim_adi,
        istek_sahibi: t.personel_adi,
        eposta: t.personel_eposta,
        durum: durumMetinleri[t.durum] || t.durum,
        teslim_tarihi: t.teslimat_tarihi ? formatTurkishDate(t.teslimat_tarihi) : '-',
        kalem_sayisi: t.kalem_sayisi,
        gerekce: t.sonuc_gerekcesi || '-'
      });
    }

    return workbook;
  },

  /**
   * İlgili Çarşamba gününe ait haftalık malzeme toplama verilerini çeker (Bina & Kat Sıralı Rota Desteği)
   */
  async getHaftalikToplamaListesi(carsambaTarihi, { binaSirali = true } = {}) {
    const db = getDb();
    let normTarih = carsambaTarihi;
    if (normTarih && normTarih.includes('.')) {
      const parts = normTarih.split('.');
      if (parts.length === 3) {
        normTarih = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    const orderClause = binaSirali
      ? `ORDER BY COALESCE(p.bina_adi, 'Diğer') ASC, CAST(p.oda_no AS INTEGER) ASC, p.oda_no ASC, b.ad ASC, t.talep_no ASC`
      : `ORDER BY b.ad ASC, t.talep_no ASC`;

    const talepler = db.prepare(`
      SELECT t.*, b.ad as birim_adi,
             COALESCE(p.ad_soyad, t.personel_adi) as personel_adi,
             p.bina_adi, p.oda_no, p.telefon as personel_telefon
      FROM talepler t
      JOIN birimler b ON t.birim_id = b.id
      LEFT JOIN personel p ON t.personel_id = p.id
      WHERE t.teslimat_tarihi = ? AND t.durum IN ('onaylandi', 'revize_onaylandi', 'teslim_edildi')
      ${orderClause}
    `).all(normTarih);

    const talepIdler = talepler.map(t => t.id);
    let kalemler = [];
    if (talepIdler.length > 0) {
      const placeholders = talepIdler.map(() => '?').join(',');
      kalemler = db.prepare(`
        SELECT tk.*, t.talep_no, t.durum, b.ad as birim_adi,
               COALESCE(p.ad_soyad, t.personel_adi) as personel_adi,
               p.bina_adi, p.oda_no, p.telefon as personel_telefon,
               u.marka, u.kategori_id, k.ad as kategori_adi
        FROM talep_kalemleri tk
        JOIN talepler t ON tk.talep_id = t.id
        JOIN birimler b ON t.birim_id = b.id
        LEFT JOIN personel p ON t.personel_id = p.id
        LEFT JOIN urunler u ON tk.urun_id = u.id
        LEFT JOIN kategoriler k ON u.kategori_id = k.id
        WHERE tk.talep_id IN (${placeholders}) AND tk.onaylanan_adet > 0
        ORDER BY COALESCE(p.bina_adi, 'Diğer') ASC, CAST(p.oda_no AS INTEGER) ASC, p.oda_no ASC, b.ad ASC, t.talep_no ASC, tk.urun_adi ASC
      `).all(...talepIdler);
    }

    // Ürün bazında toplam adetler
    const urunToplamlari = {};
    for (const k of kalemler) {
      const key = `${k.urun_adi} (${k.olcu_birimi})`;
      if (!urunToplamlari[key]) {
        urunToplamlari[key] = {
          urun_adi: k.urun_adi,
          olcu_birimi: k.olcu_birimi,
          toplam_adet: 0,
          toplam_onaylanan: 0
        };
      }
      urunToplamlari[key].toplam_adet += k.onaylanan_adet;
      urunToplamlari[key].toplam_onaylanan += k.onaylanan_adet;
    }

    // Çarşamba Dağıtımında Odalardan Teslim Alınacak Atıl Malzemeler
    let atilIadeler = [];
    try {
      atilIadeler = db.prepare(`
        SELECT a.*, b.ad as birim_adi,
               COALESCE(p.ad_soyad, 'Yetkili') as bildiren_adi,
               p.telefon as bildiren_telefon
        FROM atil_malzeme_bildirimleri a
        JOIN birimler b ON a.birim_id = b.id
        LEFT JOIN personel p ON a.personel_id = p.id
        WHERE a.durum = 'beklemede'
        ORDER BY COALESCE(a.bina_adi, 'Diğer') ASC, a.oda_no ASC
      `).all();
    } catch {
      // sessiz geç
    }

    return {
      teslimatTarihi: normTarih,
      teslimatTarihiText: formatTurkishDate(normTarih),
      talepler,
      kalemler,
      urunOzet: Object.values(urunToplamlari),
      atilIadeler
    };
  },

  /**
   * Canlı İnteraktif Tüketim ve Talep Analiz Tablosu
   */
  async getDetayliAnaliz({ birimId = null, personelId = null, baslangic = null, bitis = null, durum = null, q = null, limit = 500, offset = 0 } = {}) {
    const db = getDb();
    let sql = `
      SELECT tk.id as kalem_id, tk.talep_id, tk.urun_id, tk.urun_adi, tk.olcu_birimi,
             tk.istenen_adet, tk.onaylanan_adet,
             t.talep_no, t.olusturma_tarihi, t.teslimat_tarihi, t.durum as talep_durumu,
             b.id as birim_id, b.ad as birim_adi, b.tur as birim_turu,
             ub.id as ust_birim_id, ub.ad as ust_birim_adi,
             p.id as personel_id, p.ad_soyad as personel_adi, p.eposta as personel_eposta,
             p.bina_adi, p.oda_no, p.telefon,
             u.marka, k.ad as kategori_adi
      FROM talep_kalemleri tk
      JOIN talepler t ON tk.talep_id = t.id
      JOIN birimler b ON t.birim_id = b.id
      LEFT JOIN birimler ub ON b.ust_birim_id = ub.id
      LEFT JOIN personel p ON t.personel_id = p.id
      LEFT JOIN urunler u ON tk.urun_id = u.id
      LEFT JOIN kategoriler k ON u.kategori_id = k.id
      WHERE 1=1
    `;
    const params = [];

    if (birimId) {
      const subIds = birimRepository.findSubBirimIds(birimId, db);
      if (subIds.length > 0) {
        sql += ` AND t.birim_id IN (${subIds.map(() => '?').join(',')})`;
        params.push(...subIds);
      } else {
        sql += ` AND t.birim_id = ?`;
        params.push(birimId);
      }
    }

    if (personelId) {
      sql += ` AND t.personel_id = ?`;
      params.push(personelId);
    }

    if (durum) {
      sql += ` AND t.durum = ?`;
      params.push(durum);
    }

    if (baslangic) {
      sql += ` AND date(t.olusturma_tarihi) >= date(?)`;
      params.push(baslangic);
    }

    if (bitis) {
      sql += ` AND date(t.olusturma_tarihi) <= date(?)`;
      params.push(bitis);
    }

    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      sql += ` AND (tk.urun_adi LIKE ? OR b.ad LIKE ? OR p.ad_soyad LIKE ? OR t.talep_no LIKE ? OR k.ad LIKE ?)`;
      params.push(term, term, term, term, term);
    }

    sql += ` ORDER BY t.olusturma_tarihi DESC, tk.id ASC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const satirlar = db.prepare(sql).all(...params);

    // İstatistik ve Özet
    const toplamKalem = satirlar.length;
    let toplamVerilenAdet = 0;
    let toplamIstenenAdet = 0;
    const birimSayac = {};
    const urunSayac = {};

    for (const r of satirlar) {
      toplamVerilenAdet += Number(r.onaylanan_adet) || 0;
      toplamIstenenAdet += Number(r.istenen_adet) || 0;
      birimSayac[r.birim_adi] = (birimSayac[r.birim_adi] || 0) + (Number(r.onaylanan_adet) || Number(r.istenen_adet) || 1);
      urunSayac[r.urun_adi] = (urunSayac[r.urun_adi] || 0) + (Number(r.onaylanan_adet) || Number(r.istenen_adet) || 1);
    }

    const enCokBirim = Object.entries(birimSayac).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
    const enCokUrun = Object.entries(urunSayac).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    return {
      satirlar,
      ozet: {
        toplamKalem,
        toplamVerilenAdet,
        toplamIstenenAdet,
        enCokBirim,
        enCokUrun
      }
    };
  },

  /**
   * Tek bir talep için Malzeme Teslim Fişi verilerini hazırlar
   */
  async getMalzemeTeslimFisi(talepId) {
    const db = getDb();
    const talep = talepRepository.findById(talepId, db);
    if (!talep) return null;

    const kalemler = talepRepository.findKalemlerByTalepId(talepId, db);

    return {
      talep,
      kalemler,
      teslimatTarihiText: talep.teslimat_tarihi ? formatTurkishDate(talep.teslimat_tarihi) : '-'
    };
  },

  /**
   * İlgili Çarşamba gününe ait tüm onaylı/teslim edilmiş taleplerin teslim fişi verilerini topluca çeker (Bina & Kat Sıralı Rota Desteği + N+1 Çözümü)
   */
  async getTopluTeslimFisleri(carsambaTarihi, { binaSirali = true } = {}) {
    const db = getDb();
    let normTarih = carsambaTarihi;
    if (normTarih && normTarih.includes('.')) {
      const parts = normTarih.split('.');
      if (parts.length === 3) {
        normTarih = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    const orderClause = binaSirali
      ? `ORDER BY COALESCE(p.bina_adi, 'Diğer') ASC, CAST(p.oda_no AS INTEGER) ASC, p.oda_no ASC, b.ad ASC, t.talep_no ASC`
      : `ORDER BY b.ad ASC, t.talep_no ASC`;

    const talepler = db.prepare(`
      SELECT t.*, b.ad as birim_adi, b.tur as birim_turu,
             h.kullanici_adi as sonuclandiran_kullanici,
             COALESCE(p.ad_soyad, t.personel_adi) as personel_adi,
             COALESCE(p.eposta, t.personel_eposta) as personel_eposta,
             p.bina_adi, p.oda_no, p.telefon as personel_telefon, p.unvan as personel_unvan
      FROM talepler t
      JOIN birimler b ON t.birim_id = b.id
      LEFT JOIN hesaplar h ON t.sonuclandiran_hesap_id = h.id
      LEFT JOIN personel p ON t.personel_id = p.id
      WHERE t.teslimat_tarihi = ? AND t.durum IN ('onaylandi', 'revize_onaylandi', 'teslim_edildi')
      ${orderClause}
    `).all(normTarih);

    const talepIdler = talepler.map(t => t.id);
    let allKalemler = [];
    if (talepIdler.length > 0) {
      const placeholders = talepIdler.map(() => '?').join(',');
      allKalemler = db.prepare(`
        SELECT tk.*, u.marka
        FROM talep_kalemleri tk
        LEFT JOIN urunler u ON tk.urun_id = u.id
        WHERE tk.talep_id IN (${placeholders})
        ORDER BY tk.id ASC
      `).all(...talepIdler);
    }

    const kalemlerByTalepId = {};
    for (const k of allKalemler) {
      if (!kalemlerByTalepId[k.talep_id]) kalemlerByTalepId[k.talep_id] = [];
      kalemlerByTalepId[k.talep_id].push(k);
    }

    const fisler = talepler.map(talep => ({
      talep,
      kalemler: kalemlerByTalepId[talep.id] || [],
      teslimatTarihiText: talep.teslimat_tarihi ? formatTurkishDate(talep.teslimat_tarihi) : '-'
    }));

    return {
      teslimatTarihi: normTarih,
      teslimatTarihiText: formatTurkishDate(normTarih),
      toplamTalep: fisler.length,
      fisler
    };
  },

  /**
   * Rektörlük ve Genel Sekreterlik İçin Aylık Tüketim & Tasarruf Bülteni
   */
  async getYoneticiBulteni({ ay, yil }) {
    const db = getDb();
    const now = new Date();
    const targetYil = String(yil || now.getFullYear());
    const targetAy = String(ay || (now.getMonth() + 1)).padStart(2, '0');

    // 1. Genel Talep İstatistikleri
    const talepOzeti = db.prepare(`
      SELECT 
        COUNT(*) as toplamTalep,
        COUNT(DISTINCT birim_id) as aktifBirimSayisi,
        COUNT(DISTINCT personel_id) as aktifPersonelSayisi,
        SUM(CASE WHEN durum = 'teslim_edildi' THEN 1 ELSE 0 END) as teslimEdilenTalep,
        SUM(CASE WHEN durum = 'onaylandi' OR durum = 'revize_onaylandi' THEN 1 ELSE 0 END) as onayliTalep,
        SUM(CASE WHEN durum = 'reddedildi' THEN 1 ELSE 0 END) as reddedilenTalep
      FROM talepler
      WHERE strftime('%Y', olusturma_tarihi) = ? AND strftime('%m', olusturma_tarihi) = ?
    `).get(targetYil, targetAy) || {};

    // 2. İstenen vs Karşılanan ve Tasarruf Metriği
    const sarfiyat = db.prepare(`
      SELECT 
        COALESCE(SUM(tk.istenen_adet), 0) as toplamIstenen,
        COALESCE(SUM(CASE 
          WHEN t.durum = 'reddedildi' THEN 0 
          WHEN tk.onaylanan_adet IS NOT NULL THEN tk.onaylanan_adet 
          ELSE tk.istenen_adet 
        END), 0) as toplamKarsilanan
      FROM talep_kalemleri tk
      JOIN talepler t ON tk.talep_id = t.id
      WHERE strftime('%Y', t.olusturma_tarihi) = ? AND strftime('%m', t.olusturma_tarihi) = ?
    `).get(targetYil, targetAy) || { toplamIstenen: 0, toplamKarsilanan: 0 };

    const toplamIstenen = sarfiyat.toplamIstenen || 0;
    const toplamKarsilanan = sarfiyat.toplamKarsilanan || 0;
    const tasarrufAdet = Math.max(0, toplamIstenen - toplamKarsilanan);
    const tasarrufOrani = toplamIstenen > 0 ? Math.round((tasarrufAdet / toplamIstenen) * 100) : 0;

    // 3. En Çok Tüketen İlk 5 Birim
    const enCokTuketenBirimler = db.prepare(`
      SELECT b.ad as birim_adi, b.tur as birim_turu,
             COUNT(DISTINCT t.id) as talep_sayisi,
             SUM(COALESCE(tk.onaylanan_adet, tk.istenen_adet)) as toplam_adet
      FROM talepler t
      JOIN birimler b ON t.birim_id = b.id
      JOIN talep_kalemleri tk ON tk.talep_id = t.id
      WHERE strftime('%Y', t.olusturma_tarihi) = ? AND strftime('%m', t.olusturma_tarihi) = ?
        AND t.durum != 'reddedildi'
      GROUP BY b.id
      ORDER BY toplam_adet DESC
      LIMIT 5
    `).all(targetYil, targetAy);

    // 4. En Çok Talep Edilen İlk 5 Malzeme
    const enCokTalepEdilenUrunler = db.prepare(`
      SELECT tk.urun_adi, tk.olcu_birimi,
             SUM(COALESCE(tk.onaylanan_adet, tk.istenen_adet)) as toplam_adet,
             COUNT(DISTINCT t.birim_id) as talep_eden_birim_sayisi
      FROM talep_kalemleri tk
      JOIN talepler t ON tk.talep_id = t.id
      WHERE strftime('%Y', t.olusturma_tarihi) = ? AND strftime('%m', t.olusturma_tarihi) = ?
        AND t.durum != 'reddedildi'
      GROUP BY tk.urun_adi
      ORDER BY toplam_adet DESC
      LIMIT 5
    `).all(targetYil, targetAy);

    // 5. Dağıtılan Demirbaş & Dayanıklı Malzemeler
    const demirbasDagitimlari = db.prepare(`
      SELECT tk.urun_adi, b.ad as birim_adi, t.personel_adi,
             COALESCE(tk.onaylanan_adet, tk.istenen_adet) as adet,
             t.talep_no, t.teslimat_tarihi
      FROM talep_kalemleri tk
      JOIN talepler t ON tk.talep_id = t.id
      JOIN birimler b ON t.birim_id = b.id
      JOIN urunler u ON tk.urun_id = u.id
      WHERE strftime('%Y', t.olusturma_tarihi) = ? AND strftime('%m', t.olusturma_tarihi) = ?
        AND u.demirbas = 1
        AND t.durum IN ('onaylandi', 'revize_onaylandi', 'teslim_edildi')
      ORDER BY t.id DESC
      LIMIT 10
    `).all(targetYil, targetAy);

    const aylarTr = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const donemAdi = `${aylarTr[parseInt(targetAy, 10)]} ${targetYil}`;

    return {
      donem: {
        ay: targetAy,
        yil: targetYil,
        donemAdi
      },
      ozet: {
        toplamTalep: talepOzeti.toplamTalep || 0,
        aktifBirimSayisi: talepOzeti.aktifBirimSayisi || 0,
        aktifPersonelSayisi: talepOzeti.aktifPersonelSayisi || 0,
        teslimEdilenTalep: talepOzeti.teslimEdilenTalep || 0,
        onayliTalep: talepOzeti.onayliTalep || 0,
        reddedilenTalep: talepOzeti.reddedilenTalep || 0,
        toplamIstenen,
        toplamKarsilanan,
        tasarrufAdet,
        tasarrufOrani
      },
      enCokTuketenBirimler,
      enCokTalepEdilenUrunler,
      demirbasDagitimlari
    };
  },

  /**
   * Yeşil Kampüs Liderlik Sıralaması (Akademik & İdari Ligler + Kutlama Podyumu)
   */
  async getYesilKampusSiralamasi({ ay = null, birimId = null }) {
    const db = getDb();
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1; // 1-12
    const curDay = now.getDate();

    let targetAy = ay;
    let ilkYediGun = false;

    if (!targetAy) {
      if (curDay <= 7) {
        ilkYediGun = true;
        // Geçen ay
        let prevYear = curYear;
        let prevMonth = curMonth - 1;
        if (prevMonth === 0) {
          prevMonth = 12;
          prevYear -= 1;
        }
        targetAy = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
      } else {
        targetAy = `${curYear}-${String(curMonth).padStart(2, '0')}`;
      }
    }

    const aylarTr = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const [tYil, tAy] = targetAy.split('-');
    const donemAdi = `${aylarTr[parseInt(tAy, 10)]} ${tYil}`;

    const rawAkademik = yesilKampusRepository.getSiralama(targetAy, 'akademik', db);
    const rawIdari = yesilKampusRepository.getSiralama(targetAy, 'idari', db);

    const akademikLig = rawAkademik.map((item, idx) => ({ ...item, sira: idx + 1 }));
    const idariLig = rawIdari.map((item, idx) => ({ ...item, sira: idx + 1 }));

    // Kullanıcı birimi bilgisi
    let kullaniciBirimi = null;
    if (birimId) {
      const bId = parseInt(birimId, 10);
      const inAka = akademikLig.find(b => b.birim_id === bId);
      if (inAka) {
        kullaniciBirimi = { ...inAka, lig: 'akademik' };
      } else {
        const inIdari = idariLig.find(b => b.birim_id === bId);
        if (inIdari) {
          kullaniciBirimi = { ...inIdari, lig: 'idari' };
        }
      }
    }

    // Geçen ay şampiyonları (opsiyonel karşılaştırma için)
    let prevYear = curYear;
    let prevMonth = curMonth - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevAyKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const prevDonemAdi = `${aylarTr[prevMonth]} ${prevYear}`;
    const rawPrevAka = yesilKampusRepository.getSiralama(prevAyKey, 'akademik', db);
    const rawPrevIdari = yesilKampusRepository.getSiralama(prevAyKey, 'idari', db);

    return {
      seciliAy: targetAy,
      ayAdi: donemAdi,
      ilkYediGun,
      kutlama: ilkYediGun,
      kutlamaMesaji: ilkYediGun
        ? `Tebrik Ederiz! ${donemAdi} ayında sürdürülebilirlik ve sıfır atığa katkı sağlayan örnek birimlerimizi tebrik ederiz.`
        : null,
      akademikLig,
      idariLig,
      kullaniciBirimi,
      gecenAy: {
        ay: prevAyKey,
        ayAdi: prevDonemAdi,
        akademikIlk3: rawPrevAka.slice(0, 3).map((item, idx) => ({ ...item, sira: idx + 1 })),
        idariIlk3: rawPrevIdari.slice(0, 3).map((item, idx) => ({ ...item, sira: idx + 1 }))
      }
    };
  }
};

export default raporService;
