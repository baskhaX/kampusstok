import ExcelJS from 'exceljs';
import oturumRepository from '../repositories/oturumRepository.js';
import urunRepository from '../repositories/urunRepository.js';
import gorevDevriRepository from '../repositories/gorevDevriRepository.js';
import getDb from '../db/connection.js';
import { randomInt } from 'node:crypto';
import kategoriRepository from '../repositories/kategoriRepository.js';
import birimRepository from '../repositories/birimRepository.js';
import hesapRepository from '../repositories/hesapRepository.js';
import personelRepository from '../repositories/personelRepository.js';
import stokHareketRepository from '../repositories/stokHareketRepository.js';
import stokService from '../services/stokService.js';
import gorselService from '../services/gorselService.js';
import denetimService from '../services/denetimService.js';
import mailService from '../services/mailService.js';
import yedekService from '../services/yedekService.js';
import { generateYeniHesapMail } from '../templates/mail/yeniHesapTanimi.js';
import { hashPassword, hashPasswordAsync } from '../utils/crypto.js';
import config from '../config/index.js';
import { join, basename } from 'node:path';
import { existsSync } from 'node:fs';
import logger from '../utils/logger.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

// Görev ve Unvan Hiyerarşi Sıralaması (Görev 3: En üstte Rektör, Rektör Yrd, Dekan, Bölüm Başkanı, Müdür vb.)
function getGorevRank(p) {
  const g = (p.gorev || '').trim().toLowerCase();
  const u = (p.unvan || '').trim().toLowerCase();
  const ad = (p.ad_soyad || '').trim().toLowerCase();

  // 1. REKTÖR (Rektör Danışmanı, Katı veya Güvenlik hariç tam yetkili Rektör)
  if (g === 'rektör' || (g.includes('rektör') && !g.includes('yardımc') && !g.includes('danışman') && !g.includes('katı') && !g.includes('güvenlik'))) {
    return 1;
  }

  // 2. REKTÖR YARDIMCISI (Gerçek personel)
  if (g.includes('rektör yardımcısı') || g.includes('rektör yrd') || g.includes('rektör y.')) {
    if (ad.includes('fuaye') || ad.includes('güvenlik') || ad.includes('katı')) return 50;
    return 2;
  }

  // 3. REKTÖR DANIŞMANI
  if (g.includes('rektör danışmanı') || g.includes('danışman')) {
    return 3;
  }

  // 4. ÖZEL KALEM MÜDÜRÜ
  if (g.includes('özel kalem')) {
    return 4;
  }

  // 5. DEKAN
  if (g === 'dekan' || (g.includes('dekan') && !g.includes('yardımc') && !g.includes('danışman') && !g.includes('sekreter'))) {
    return 5;
  }

  // 6. DEKAN YARDIMCISI
  if (g.includes('dekan yardımcısı') || g.includes('dekan yrd') || g.includes('dekan y.')) {
    return 6;
  }

  // 7. GENEL SEKRETER
  if (g === 'genel sekreter' || (g.includes('genel sekreter') && !g.includes('yardımc'))) {
    return 7;
  }

  // 8. GENEL SEKRETER YARDIMCISI
  if (g.includes('genel sekreter yardımcısı') || g.includes('genel sekreter yrd') || g.includes('genel sekreter y.')) {
    return 8;
  }

  // 9. ENSTİTÜ MÜDÜRÜ / MÜDÜR
  if ((g.includes('enstitü müdür') && !g.includes('yardımc')) || (g === 'müdür' || (g.includes('müdür') && !g.includes('yardımc') && !g.includes('şube')))) {
    return 9;
  }

  // 10. MÜDÜR YARDIMCISI / ŞUBE MÜDÜRÜ
  if (g.includes('müdür yardımcısı') || g.includes('müdür yrd') || g.includes('şube müdürü')) {
    return 10;
  }

  // 11. BÖLÜM BAŞKANI
  if (g.includes('bölüm başkanı') || g.includes('anabilim dalı başkanı') || g.includes('ana bilim dalı başkanı')) {
    return 11;
  }

  // 12. BÖLÜM BAŞKAN YARDIMCISI
  if (g.includes('bölüm başkan yardımcısı') || g.includes('bölüm başkan yrd')) {
    return 12;
  }

  // 13. AKADEMİK UNVANLAR (Prof -> Doç -> Dr. Öğr. Üyesi -> Öğr. Gör. -> Arş. Gör.)
  if (u.includes('prof') || g.includes('prof')) return 20;
  if (u.includes('doç') || g.includes('doç')) return 21;
  if (u.includes('dr. öğr') || u.includes('doktor') || g.includes('öğretim üyesi')) return 22;
  if (u.includes('öğr. gör') || g.includes('öğretim görevlisi')) return 23;
  if (u.includes('arş. gör') || g.includes('araştırma görevlisi')) return 24;

  // 14. İDARİ ROLLER
  if (g.includes('uzman') || g.includes('avukat') || g.includes('mühendis') || g.includes('şef')) return 30;

  // 15. SEKRETERLİK
  if (g.includes('fakülte sekreteri') || g.includes('enstitü sekreteri')) return 40;
  if (g.includes('sekreter')) return 45;
  if (g.includes('memur') || g.includes('bilgisayar işletmeni')) return 48;

  return 100;
}

export const yonetimController = {
  // --- ÜRÜN YÖNETİMİ ---
  async getUrunler(req, res, next) {
    try {
      const urunler = urunRepository.findAll();
      res.json({ basarili: true, urunler });
    } catch (err) {
      next(err);
    }
  },

  async addUrun(req, res, next) {
    try {
      let { kategori_id, ad, marka, barkod, olcu_birimi, stok, kritik_stok, gorsel_yolu } = req.body;

      // Harici URL ise yerel depoya indirmeyi dene
      if (gorsel_yolu && (gorsel_yolu.startsWith('http://') || gorsel_yolu.startsWith('https://'))) {
        try {
          gorsel_yolu = await gorselService.indirVeKaydet(gorsel_yolu);
        } catch (e) {
          logger.warn(`Ürün görseli indirilemedi, URL doğrudan kullanılacak: ${e.message}`);
        }
      }

      // Eğer barkod girilmediyse benzersiz EAN-13 formatında bir barkod oluştur
      if (!barkod || !barkod.trim()) {
        const randomDigits = Math.floor(10000 + Math.random() * 90000);
        const base = `8692026${randomDigits}`;
        let sum = 0;
        for (let i = 0; i < 12; i++) {
          const digit = parseInt(base[i], 10);
          sum += (i % 2 === 0) ? digit : digit * 3;
        }
        const checkDigit = (10 - (sum % 10)) % 10;
        barkod = `${base}${checkDigit}`;
      }

      const yeniUrun = urunRepository.create({
        kategori_id,
        ad,
        marka,
        barkod,
        olcu_birimi,
        stok: stok || 0,
        kritik_stok: kritik_stok || 5,
        gorsel_yolu
      });

      if (stok && stok > 0) {
        stokHareketRepository.create({
          urun_id: yeniUrun.id,
          tur: 'giris',
          miktar: stok,
          aciklama: 'Ürün ilk açılış stoğu',
          yapan_hesap_id: req.user.hesapId
        });
      }

      res.status(201).json({ basarili: true, mesaj: 'Ürün başarıyla eklendi.', urun: yeniUrun });
    } catch (err) {
      next(err);
    }
  },

  async updateUrun(req, res, next) {
    try {
      const { id } = req.params;
      let { kategori_id, ad, marka, barkod, olcu_birimi, kritik_stok, gorsel_yolu, aktif, stok } = req.body;

      // Harici URL ise yerel depoya indirmeyi dene
      if (gorsel_yolu && (gorsel_yolu.startsWith('http://') || gorsel_yolu.startsWith('https://'))) {
        try {
          gorsel_yolu = await gorselService.indirVeKaydet(gorsel_yolu);
        } catch (e) {
          logger.warn(`Ürün görseli güncellenirken indirilemedi, URL kullanılacak: ${e.message}`);
        }
      }

      const mevcutUrun = urunRepository.findById(id);

      const guncel = urunRepository.update(id, {
        kategori_id,
        ad,
        marka,
        barkod,
        olcu_birimi,
        kritik_stok,
        gorsel_yolu,
        aktif
      });

      // Eğer stok değeri iletildiyse ve mevcut stoktan farklıysa stoğu da güncelle ve hareket kaydı oluştur
      if (stok !== undefined && stok !== null && mevcutUrun && parseInt(stok, 10) !== mevcutUrun.stok) {
        const yeniStok = parseInt(stok, 10);
        const fark = yeniStok - mevcutUrun.stok;
        urunRepository.updateStok(id, yeniStok);
        stokHareketRepository.create({
          urun_id: id,
          tur: fark > 0 ? 'giris' : 'duzeltme',
          miktar: Math.abs(fark),
          aciklama: `Ürün/Birim düzenleme stoğu (${mevcutUrun.olcu_birimi} -> ${olcu_birimi})`,
          yapan_hesap_id: req.user.hesapId
        });
        guncel.stok = yeniStok;

        await denetimService.logla({
          hesap_id: req.user.hesapId,
          islem_turu: 'STOK_DUZELTME',
          detay: `"${guncel.ad}" stoğu ${mevcutUrun.stok} (${mevcutUrun.olcu_birimi}) -> ${yeniStok} (${olcu_birimi}) olarak güncellendi.`,
          ip_adresi: req.ip
        });
      }

      res.json({ basarili: true, mesaj: 'Ürün güncellendi.', urun: guncel });
    } catch (err) {
      next(err);
    }
  },

  async updateUrunDurum(req, res, next) {
    try {
      const { id } = req.params;
      const { aktif } = req.body;
      const urun = urunRepository.setAktif(id, aktif ? 1 : 0);
      if (!urun) {
        return res.status(404).json({ basarili: false, mesaj: 'Ürün bulunamadı.' });
      }
      res.json({
        basarili: true,
        mesaj: urun.aktif ? `"${urun.ad}" talebe açıldı (Kullanıcılara görünür).` : `"${urun.ad}" talebe kapatıldı (Kullanıcılardan gizlendi).`,
        urun
      });
    } catch (err) {
      next(err);
    }
  },

  async getUrunByBarkod(req, res, next) {
    try {
      const { barkod } = req.params;
      const urun = urunRepository.findByBarkod(barkod.trim());
      if (!urun) {
        return res.status(404).json({ basarili: false, mesaj: 'Bu barkoda ait ürün bulunamadı.' });
      }
      res.json({ basarili: true, urun });
    } catch (err) {
      next(err);
    }
  },

  // --- STOK İŞLEMLERİ ---
  async stokIslemi(req, res, next) {
    try {
      const { urun_id, tur, miktar, aciklama } = req.body;
      let sonuc;

      if (tur === 'giris') {
        sonuc = stokService.giris({
          urunId: urun_id,
          miktar,
          aciklama,
          yapanHesapId: req.user.hesapId
        });
      } else if (tur === 'duzeltme') {
        sonuc = stokService.duzelt({
          urunId: urun_id,
          yeniStok: miktar,
          aciklama,
          yapanHesapId: req.user.hesapId
        });
      }

      res.json({ basarili: true, mesaj: 'Stok hareketi başarıyla işlendi.', urun: sonuc });
    } catch (err) {
      next(err);
    }
  },

  async getStokHareketleri(req, res, next) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
      const hareketler = stokHareketRepository.findAll(limit);
      res.json({ basarili: true, hareketler });
    } catch (err) {
      next(err);
    }
  },

  // --- KATEGORİ YÖNETİMİ ---
  async getKategoriler(req, res, next) {
    try {
      const kategoriler = kategoriRepository.findAll();
      res.json({ basarili: true, kategoriler });
    } catch (err) {
      next(err);
    }
  },

  async addKategori(req, res, next) {
    try {
      const { ad, ust_kategori_id, sira } = req.body;
      const yeni = kategoriRepository.create({ ad, ust_kategori_id, sira });
      res.status(201).json({ basarili: true, mesaj: 'Kategori eklendi.', kategori: yeni });
    } catch (err) {
      next(err);
    }
  },

  async updateKategori(req, res, next) {
    try {
      const { id } = req.params;
      const { ad, ust_kategori_id, sira, aktif } = req.body;
      const guncel = kategoriRepository.update(id, { ad, ust_kategori_id, sira, aktif });
      res.json({ basarili: true, mesaj: 'Kategori güncellendi.', kategori: guncel });
    } catch (err) {
      next(err);
    }
  },

  // --- BİRİM YÖNETİMİ ---
  async getBirimler(req, res, next) {
    try {
      const birimler = birimRepository.findAll();
      res.json({ basarili: true, birimler });
    } catch (err) {
      next(err);
    }
  },

  async addBirim(req, res, next) {
    try {
      const { ad, tur, ust_birim_id, kullanici_adi, sifre } = req.body;

      if (!kullanici_adi || !sifre) {
        throw new ValidationError('Birim için giriş kullanıcı adı ve ilk şifre zorunludur.');
      }

      const yeniBirim = birimRepository.create({ ad, tur, ust_birim_id });
      const sifreHash = hashPassword(sifre);

      hesapRepository.create({
        kullanici_adi: kullanici_adi.trim().toLowerCase(),
        sifre_hash: sifreHash,
        rol: 'birim',
        birim_id: yeniBirim.id,
        sifre_degistirmeli: 1
      });

      res.status(201).json({ basarili: true, mesaj: 'Birim ve hesabı başarıyla oluşturuldu.', birim: yeniBirim });
    } catch (err) {
      next(err);
    }
  },

  async updateBirim(req, res, next) {
    try {
      const { id } = req.params;
      const { ad, tur, ust_birim_id, aktif } = req.body;
      const guncel = birimRepository.update(id, { ad, tur, ust_birim_id, aktif });
      res.json({ basarili: true, mesaj: 'Birim güncellendi.', birim: guncel });
    } catch (err) {
      next(err);
    }
  },

  async sifirlaBirimSifre(req, res, next) {
    try {
      const { birim_id, yeni_sifre } = req.body;
      const hesap = (await import('../db/connection.js')).default()
        .prepare('SELECT id FROM hesaplar WHERE birim_id = ?')
        .get(birim_id);

      if (!hesap) throw new NotFoundError('Bu birime bağlı hesap bulunamadı.');

      const hash = hashPassword(yeni_sifre);
      hesapRepository.updatePassword(hesap.id, hash, 1);
      oturumRepository.deleteByHesapId(hesap.id);

      res.json({ basarili: true, mesaj: 'Birim şifresi sıfırlandı. İlk girişte değiştirilmesi istenecektir.' });
    } catch (err) {
      next(err);
    }
  },

  // --- PERSONEL YÖNETİMİ ---
  async getPersoneller(req, res, next) {
    try {
      const { birim_id, q, aktifOnly } = req.query;
      const list = personelRepository.findAll({
        birimId: birim_id ? parseInt(birim_id, 10) : null,
        q,
        aktifOnly: aktifOnly === '1' || aktifOnly === 'true'
      });
      res.json({ basarili: true, personeller: list });
    } catch (err) {
      next(err);
    }
  },

  async addPersonel(req, res, next) {
    try {
      const { birim_id, ad_soyad, eposta, unvan, gorev, telefon } = req.body;
      const yeni = personelRepository.create({
        birim_id,
        ad_soyad,
        eposta,
        unvan,
        gorev,
        telefon
      });
      res.status(201).json({ basarili: true, mesaj: 'Personel başarıyla eklendi.', personel: yeni });
    } catch (err) {
      next(err);
    }
  },

  async updatePersonel(req, res, next) {
    try {
      const { id } = req.params;
      const { birim_id, ad_soyad, eposta, unvan, gorev, telefon, aktif } = req.body;
      const guncel = personelRepository.update(id, {
        birim_id,
        ad_soyad,
        eposta,
        unvan,
        gorev,
        telefon,
        aktif
      });
      if (!guncel) throw new NotFoundError('Personel bulunamadı.');
      res.json({ basarili: true, mesaj: 'Personel güncellendi.', personel: guncel });
    } catch (err) {
      next(err);
    }
  },

  async deletePersonel(req, res, next) {
    try {
      const { id } = req.params;
      const sonuc = personelRepository.delete(id);
      res.json({ 
        basarili: true, 
        mesaj: sonuc.silindi ? 'Personel sistemden tamamen silindi.' : 'Personel geçmiş taleplerde yer aldığı için arşive/pasife alındı.',
        ...sonuc
      });
    } catch (err) {
      next(err);
    }
  },

  async sifirlaPersonelSifre(req, res, next) {
    try {
      const { id } = req.params;
      const { yeni_sifre = 'Etu1234!.' } = req.body || {};
      const db = (await import('../db/connection.js')).default();

      const personel = db.prepare('SELECT p.*, b.ad as birim_adi FROM personel p JOIN birimler b ON p.birim_id = b.id WHERE p.id = ?').get(id);
      if (!personel) throw new NotFoundError('Personel bulunamadı.');

      // Personelin bağlı hesabı var mı? (personel_id veya e-posta/kullanıcı adına göre)
      const username = (personel.eposta || personel.ad_soyad.toLowerCase().replace(/\s+/g, '.')).trim();
      let hesap = db.prepare('SELECT id, kullanici_adi FROM hesaplar WHERE personel_id = ? OR LOWER(kullanici_adi) = LOWER(?)').get(id, username);

      const hash = hashPassword(yeni_sifre);

      // Eğer henüz bireysel hesabı yoksa, otomatik olarak e-postasıyla hesap aç
      if (!hesap) {
        const insertRes = db.prepare(`
          INSERT INTO hesaplar (kullanici_adi, sifre_hash, rol, birim_id, personel_id, sifre_degistirmeli, aktif)
          VALUES (?, ?, 'birim', ?, ?, 1, 1)
        `).run(username, hash, personel.birim_id, personel.id);
        hesap = { id: insertRes.lastInsertRowid, kullanici_adi: username };
      } else {
        db.prepare('UPDATE hesaplar SET sifre_hash = ?, sifre_degistirmeli = 1, personel_id = COALESCE(personel_id, ?) WHERE id = ?').run(hash, personel.id, hesap.id);
        oturumRepository.deleteByHesapId(hesap.id);
      }

      await denetimService.logla({
        hesap_id: req.user.hesapId,
        islem_turu: 'SIFRE_SIFIRLA',
        detay: `"${personel.ad_soyad}" (${personel.eposta}) personelinin şifresi sıfırlandı.`,
        ip_adresi: req.ip
      });

      res.json({
        basarili: true,
        mesaj: `"${personel.ad_soyad}" şifresi sıfırlandı.`,
        kullanici_adi: hesap.kullanici_adi,
        yeni_sifre,
        ad_soyad: personel.ad_soyad,
        eposta: personel.eposta
      });
    } catch (err) {
      next(err);
    }
  },

  // --- KURUMSAL AĞAÇ & HİYERARŞİ (GÖRSEL-3 STİLİ & GÖREV 5/6) ---
  async getHiyerarsi(req, res, next) {
    try {
      const db = (await import('../db/connection.js')).default();
      const tumBirimler = db.prepare("SELECT id, ad, tur, ust_birim_id, aktif FROM birimler WHERE ad NOT LIKE '%Patent Temelli%'").all();
      const tumPersonel = db.prepare(`
        SELECT p.id, p.birim_id, p.ad_soyad, p.eposta, p.unvan, p.gorev, p.telefon, p.aktif,
               p.bina_adi, p.oda_no,
               h.id as hesap_id, h.kullanici_adi as hesap_kullanici_adi, h.aktif as hesap_aktif
        FROM personel p
        LEFT JOIN hesaplar h ON p.id = h.personel_id OR (p.eposta IS NOT NULL AND LOWER(p.eposta) = LOWER(h.kullanici_adi))
        WHERE p.aktif = 1
      `).all();

      const personelByBirim = new Map();
      for (const p of tumPersonel) {
        if (!personelByBirim.has(p.birim_id)) {
          personelByBirim.set(p.birim_id, []);
        }
        personelByBirim.get(p.birim_id).push(p);
      }

      // Her birimdeki personelleri önce görev rütbesine, sonra A-Z adına göre sırala (Görev 6)
      for (const plist of personelByBirim.values()) {
        plist.sort((a, b) => {
          const rankA = getGorevRank(a);
          const rankB = getGorevRank(b);
          if (rankA !== rankB) return rankA - rankB;
          return a.ad_soyad.localeCompare(b.ad_soyad, 'tr-TR');
        });
      }

      const birimById = new Map();
      for (const b of tumBirimler) {
        birimById.set(b.id, {
          ...b,
          personeller: personelByBirim.get(b.id) || [],
          altBirimler: []
        });
      }

      const kokBirimler = [];
      for (const b of tumBirimler) {
        const node = birimById.get(b.id);
        if (b.ust_birim_id && birimById.has(b.ust_birim_id)) {
          birimById.get(b.ust_birim_id).altBirimler.push(node);
        } else {
          kokBirimler.push(node);
        }
      }

      // Alt birimleri A-Z sırala
      for (const node of birimById.values()) {
        node.altBirimler.sort((a, b) => a.ad.localeCompare(b.ad, 'tr-TR'));
      }

      // Kök birimleri sırala (Görev 6: 1. Rektörlük, 2. Genel Sekreterlik, sonra A-Z)
      kokBirimler.sort((a, b) => {
        const getRootRank = (node) => {
          const name = (node.ad || '').toLowerCase();
          if (name.includes('rektörlük') && !name.includes('özel kalem') && !name.includes('yardımcı')) return 1;
          if (name.includes('genel sekreterlik')) return 2;
          return 10;
        };
        const rankA = getRootRank(a);
        const rankB = getRootRank(b);
        if (rankA !== rankB) return rankA - rankB;
        return a.ad.localeCompare(b.ad, 'tr-TR');
      });

      res.json({
        basarili: true,
        kokBirimler,
        toplamBirim: tumBirimler.length,
        toplamPersonel: tumPersonel.length,
        toplamHesap: tumPersonel.filter(p => p.hesap_id).length,
        toplamTalebeAcikBirim: tumBirimler.filter(b => b.aktif === 1).length
      });
    } catch (err) {
      next(err);
    }
  },

  // --- GÖRSEL ARAMA & YÜKLEME ---
  async araGorsel(req, res, next) {
    try {
      const query = req.query.q || '';
      const sonuc = await gorselService.araResim(query);
      res.json({ basarili: true, ...sonuc });
    } catch (err) {
      next(err);
    }
  },

  async indirGorselUrl(req, res, next) {
    try {
      const { gorsel_url } = req.body;
      const yerelYol = await gorselService.indirVeKaydet(gorsel_url);
      res.json({ basarili: true, gorselYolu: yerelYol });
    } catch (err) {
      next(err);
    }
  },

  async yukleGorselBase64(req, res, next) {
    try {
      const { base64_data, mime_type } = req.body;
      const yerelYol = await gorselService.kaydetBase64(base64_data, mime_type);
      res.json({ basarili: true, gorselYolu: yerelYol });
    } catch (err) {
      next(err);
    }
  },

  // --- BİRİM SİLME & AKTİF/PASİF YAPMA ---
  async deleteBirim(req, res, next) {
    try {
      const { id } = req.params;
      const birim = birimRepository.findById(id);
      if (!birim) throw new NotFoundError('Birim bulunamadı.');

      const sonuc = birimRepository.delete(id);

      denetimService.log({
        kullanici_id: req.user.hesapId,
        kullanici_adi: req.user.kullaniciAdi,
        rol: req.user.rol,
        islem_turu: 'BIRIM_SILME',
        aciklama: `Birim silme işlemi: ${birim.ad} (${sonuc.mesaj})`,
        detay: { birimId: id, birimAdi: birim.ad, ...sonuc },
        ip_adresi: req.ip
      });

      res.json({ basarili: true, ...sonuc });
    } catch (err) {
      next(err);
    }
  },

  async updateBirimDurum(req, res, next) {
    try {
      const { id } = req.params;
      const { aktif } = req.body;
      const guncel = birimRepository.setAktif(id, aktif);

      denetimService.log({
        kullanici_id: req.user.hesapId,
        kullanici_adi: req.user.kullaniciAdi,
        rol: req.user.rol,
        islem_turu: 'BIRIM_DURUM_GUNCELLEME',
        aciklama: `Birim ${aktif ? 'Aktif yapıldı' : 'Pasife alındı (kapatıldı)'}: ${guncel?.ad}`,
        detay: { birimId: id, aktif },
        ip_adresi: req.ip
      });

      res.json({ basarili: true, mesaj: `Birim başarıyla ${aktif ? 'açıldı' : 'kapatıldı'}.`, birim: guncel });
    } catch (err) {
      next(err);
    }
  },

  // --- KATEGORİ SİLME ---
  async deleteKategori(req, res, next) {
    try {
      const { id } = req.params;
      const kat = kategoriRepository.findById(id);
      if (!kat) throw new NotFoundError('Kategori bulunamadı.');

      const sonuc = kategoriRepository.delete(id);

      denetimService.log({
        kullanici_id: req.user.hesapId,
        kullanici_adi: req.user.kullaniciAdi,
        rol: req.user.rol,
        islem_turu: 'KATEGORI_SILME',
        aciklama: `Kategori silme işlemi: ${kat.ad} (${sonuc.mesaj})`,
        detay: { kategoriId: id, ...sonuc },
        ip_adresi: req.ip
      });

      res.json({ basarili: true, ...sonuc });
    } catch (err) {
      next(err);
    }
  },

  // --- ÇOKLU SEÇİMLE TOPLU STOK GÜNCELLEME ---
  async topluStokGuncelle(req, res, next) {
    try {
      const { urun_idler, urun_ids, guncellemeler, yeni_stok, aciklama = 'Toplu Stok Güncellemesi' } = req.body;
      const rawIds = urun_ids || urun_idler || (Array.isArray(guncellemeler) ? guncellemeler.map(g => g.urun_id) : []);

      if (!Array.isArray(rawIds) || rawIds.length === 0) {
        throw new ValidationError('En az bir ürün seçmelisiniz.');
      }

      const hedefStok = parseInt(yeni_stok, 10);
      if (isNaN(hedefStok) && !Array.isArray(guncellemeler)) {
        throw new ValidationError('Lütfen geçerli bir stok miktarı giriniz.');
      }

      const db = getDb();
      let guncellenenSayisi = 0;

      // Atomik SQLite transaction garantisi
      const runTransaction = db.transaction(() => {
        if (Array.isArray(guncellemeler) && guncellemeler.length > 0) {
          for (const item of guncellemeler) {
            stokService.duzelt({
              urunId: item.urun_id,
              yeniStok: parseInt(item.yeni_stok, 10),
              aciklama: item.aciklama || aciklama,
              yapanHesapId: req.user.hesapId
            });
            guncellenenSayisi++;
          }
        } else {
          for (const uId of rawIds) {
            stokService.duzelt({
              urunId: uId,
              yeniStok: hedefStok,
              aciklama,
              yapanHesapId: req.user.hesapId
            });
            guncellenenSayisi++;
          }
        }
      });

      runTransaction();

      denetimService.log({
        kullanici_id: req.user.hesapId,
        kullanici_adi: req.user.kullaniciAdi,
        rol: req.user.rol,
        islem_turu: 'TOPLU_STOK_GUNCELLEME',
        aciklama: `${guncellenenSayisi} ürünün stoğu tek tıkla güncellendi.`,
        detay: { urun_idler: rawIds, yeni_stok: hedefStok, aciklama },
        ip_adresi: req.ip
      });

      res.json({ basarili: true, mesaj: `${guncellenenSayisi} ürünün stoğu başarıyla güncellendi.` });
    } catch (err) {
      next(err);
    }
  },

  // --- SEÇİLEN PERSONELLERE HESAP AÇMA & GEÇİCİ ŞİFRE E-POSTASI GÖNDERME ---
  async olusturPersonelHesaplari(req, res, next) {
    try {
      const rawPersonelIds = req.body.personel_idler || req.body.personel_ids || req.body.personelIds;
      const { birim_id, ust_yonetim_haric = true, sadece_hesapsizlar = true } = req.body;
      let personeller = [];

      if (Array.isArray(rawPersonelIds) && rawPersonelIds.length > 0) {
        for (const pid of rawPersonelIds) {
          const p = personelRepository.findById(pid);
          if (p) personeller.push(p);
        }
      } else if (birim_id && birim_id !== 'tumu') {
        personeller = personelRepository.findByBirimId(birim_id);
      } else if (birim_id === 'tumu' || req.body.tum_personel || !birim_id) {
        personeller = personelRepository.findAll();
      } else {
        throw new ValidationError('Personel veya birim seçmelisiniz.');
      }

      if (ust_yonetim_haric && (!rawPersonelIds || rawPersonelIds.length === 0)) {
        // Sadece birim bazlı toplu açılışta üst yönetimi otomatik filtrele
        personeller = personeller.filter(p => {
          const rank = getGorevRank(p);
          return rank > 12; // 1-12 üst yönetim (Rektör, Dekan vb.) hariç
        });
      }

      const sonuclar = [];
      const db = (await import('../db/connection.js')).default();

      for (const p of personeller) {
        if (!p.eposta || !p.eposta.includes('@')) continue;

        // Mevcut hesap var mı kontrol et
        let hesap = hesapRepository.findByPersonelId(p.id);
        if (!hesap) {
          hesap = hesapRepository.findByKullaniciAdi(p.eposta);
        }

        // Eğer sadece hesabı olmayanlara açılması istenmişse ve personelin hesabı zaten varsa atla
        if (sadece_hesapsizlar && hesap) {
          continue;
        }

        // Kriptografik güvenli rastgele 6 haneli geçici şifre üret (Örn: Stok#489201)
        const rndNum = randomInt(100000, 999999);
        const geciciSifre = `Stok#${rndNum}`;
        const sifreHash = await hashPasswordAsync(geciciSifre);

        if (hesap) {
          hesapRepository.updatePassword(hesap.id, sifreHash, 1);
          db.prepare('UPDATE hesaplar SET personel_id = ?, aktif = 1 WHERE id = ?').run(p.id, hesap.id);
        } else {
          hesap = hesapRepository.create({
            kullanici_adi: p.eposta.toLowerCase().trim(),
            sifre_hash: sifreHash,
            rol: 'birim',
            birim_id: p.birim_id,
            personel_id: p.id,
            sifre_degistirmeli: 1
          });
        }

        // E-posta gönder
        const mailData = generateYeniHesapMail({
          adSoyad: p.ad_soyad,
          eposta: p.eposta,
          geciciSifre,
          birimAdi: p.birim_adi || '',
          girisUrl: `${req.protocol}://${req.get('host')}`
        });

        await mailService.kuyrugaEkle({
          alici: p.eposta,
          konu: mailData.konu,
          govde: mailData.govde
        });

        sonuclar.push({
          personelId: p.id,
          adSoyad: p.ad_soyad,
          eposta: p.eposta,
          geciciSifre
        });
      }

      denetimService.log({
        kullanici_id: req.user.hesapId,
        kullanici_adi: req.user.kullaniciAdi,
        rol: req.user.rol,
        islem_turu: 'TOPLU_HESAP_ACMA',
        aciklama: `${sonuclar.length} personele kullanıcı hesabı tanımlandı ve bilgilendirme e-postası kuyruğa eklendi.`,
        detay: { adet: sonuclar.length, ust_yonetim_haric },
        ip_adresi: req.ip
      });

      res.json({
        basarili: true,
        mesaj: `${sonuclar.length} personele kullanıcı hesabı tanımlandı ve bilgilendirme e-postası kuyruğa eklendi.`,
        olusturulanlar: sonuclar
      });
    } catch (err) {
      next(err);
    }
  },

  // --- DENETİM VE SİSTEM LOGLARI ---
  async getDenetimLoglari(req, res, next) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
      const { islem_turu, kullanici, arama, rol, haric_kullanici } = req.query;

      const loglar = denetimService.list({ limit, offset, islem_turu, kullanici, arama, rol, haricKullanici: haric_kullanici });
      const toplam = denetimService.count({ islem_turu, kullanici, arama, rol, haricKullanici: haric_kullanici });

      res.json({ basarili: true, loglar, toplam });
    } catch (err) {
      next(err);
    }
  },

  // --- SİSTEM YEDEKLEME VE GERİ YÜKLEME ---
  async getYedekler(req, res, next) {
    try {
      const yedekler = yedekService.listele();
      res.json({ basarili: true, yedekler });
    } catch (err) {
      next(err);
    }
  },

  async alYedek(req, res, next) {
    try {
      const sonuc = await yedekService.yedekAl(undefined, 'backup_manual_');
      await denetimService.logla({
        hesap_id: req.user.hesapId,
        islem_turu: 'YEDEK_ALINDI',
        detay: `Manuel sıcak veritabanı yedeği alındı: ${sonuc.dosya}`,
        ip_adresi: req.ip
      });
      res.json({ basarili: true, mesaj: `Yedek başarıyla alındı: ${sonuc.dosya}`, ...sonuc });
    } catch (err) {
      next(err);
    }
  },

  async geriYukleYedek(req, res, next) {
    try {
      const { dosya } = req.body;
      if (!dosya) {
        throw new ValidationError('Geri yüklenecek yedek dosya adı belirtilmelidir.');
      }
      const sonuc = await yedekService.geriYukle(dosya);
      await denetimService.logla({
        hesap_id: req.user.hesapId,
        islem_turu: 'YEDEK_GERI_YUKLENDI',
        detay: `Veritabanı "${dosya}" dosyasından geri yüklendi (Ön-güvenlik yedeği: ${sonuc.guvenlikOnYedegi})`,
        ip_adresi: req.ip
      });
      res.json({ basarili: true, mesaj: sonuc.mesaj, ...sonuc });
    } catch (err) {
      next(err);
    }
  },

  async indirYedek(req, res, next) {
    try {
      const { dosya } = req.params;
      const cleanDosya = basename(dosya);
      const dosyaYolu = join(config.backupDir, cleanDosya);
      if (!existsSync(dosyaYolu) || !cleanDosya.endsWith('.db')) {
        throw new NotFoundError('Yedek dosyası bulunamadı.');
      }
      res.download(dosyaYolu, cleanDosya);
    } catch (err) {
      next(err);
    }
  },

  async silYedek(req, res, next) {
    try {
      const { dosya } = req.params;
      const sonuc = yedekService.yedekSil(dosya);
      await denetimService.logla({
        hesap_id: req.user.hesapId,
        islem_turu: 'YEDEK_SILINDI',
        detay: `Yedek dosyası silindi: ${dosya}`,
        ip_adresi: req.ip
      });
      res.json({ basarili: true, mesaj: `Yedek dosyası silindi: ${sonuc.silinen}` });
    } catch (err) {
      next(err);
    }
  },

  // --- Görev Devri & Saatli İzin Motoru ---
  async getAktifGorevDevri(req, res, next) {
    try {
      const aktif = gorevDevriRepository.findAktif();
      res.json({ basarili: true, aktifVekalet: aktif || null });
    } catch (err) {
      next(err);
    }
  },

  async getGorevDevriGecmisi(req, res, next) {
    try {
      const gecmis = gorevDevriRepository.findAll();
      res.json({ basarili: true, gecmis });
    } catch (err) {
      next(err);
    }
  },

  async kaydetGorevDevri(req, res, next) {
    try {
      const { alan_personel_id, tur = 'devir', rol_model_etiket, neden, baslangic_tarihi, bitis_tarihi } = req.body;
      const pid = parseInt(alan_personel_id, 10);
      if (!pid) throw new ValidationError('Yetki devredilecek personel seçilmelidir.');

      const personel = personelRepository.findById(pid);
      if (!personel) throw new NotFoundError('Personel bulunamadı.');

      const verenAdSoyad = req.user.seciliPersonelAdi || (req.user.kullaniciAdi === 'satinalma' ? 'Satın Alma Müdürü' : req.user.kullaniciAdi);
      const verenMakam = (req.user.kullaniciAdi === 'satinalma' || req.user.rol === 'admin') ? 'Satın Alma Müdürü' : 'Satın Alma Yetkilisi';

      const yeniDevir = gorevDevriRepository.create({
        verenMakam,
        verenPersonelId: req.user.seciliPersonelId || null,
        verenAdSoyad,
        alanPersonelId: pid,
        alanAdSoyad: personel.ad_soyad,
        alanBirimId: personel.birim_id || 41,
        alanEposta: personel.eposta || null,
        tur: tur === 'izin' ? 'izin' : 'devir',
        rolModelEtiket: rol_model_etiket || (tur === 'izin' ? 'Yıllık İzin Vekili' : 'Kırtasiye ve Depo Sorumlusu'),
        neden: neden || (tur === 'izin' ? 'Yıllık İzin Geçici Görev Devri' : 'Kırtasiye ve Depo Baş Sorumlusu Ataması'),
        baslangicTarihi: baslangic_tarihi || null,
        bitisTarihi: bitis_tarihi || null
      });

      await denetimService.logla({
        hesap_id: req.user.hesapId,
        islem_turu: tur === 'izin' ? 'IZIN_VEKALETI_VERILDI' : 'GOREV_DEVRI_YAPILDI',
        detay: `'${verenAdSoyad}' tarafından '${personel.ad_soyad}' personeline yetki devredildi (Tür: ${tur === 'izin' ? 'Saatli Yıllık İzin' : 'Tam Asıl Görev'})`,
        ip_adresi: req.ip
      });

      res.json({
        basarili: true,
        mesaj: `Yetki başarıyla devredildi: ${personel.ad_soyad}`,
        devir: yeniDevir
      });
    } catch (err) {
      next(err);
    }
  },

  async sonlandirGorevDevri(req, res, next) {
    try {
      const { tur = null } = req.body || {};
      const sonlandiranAdSoyad = req.user.seciliPersonelAdi || (req.user.kullaniciAdi === 'satinalma' ? 'Satın Alma Müdürü' : req.user.kullaniciAdi);

      gorevDevriRepository.sonlandir({ tur, sonlandiranAdSoyad });

      await denetimService.logla({
        hesap_id: req.user.hesapId,
        islem_turu: 'GOREV_DEVRI_SONLANDIRILDI',
        detay: `'${sonlandiranAdSoyad}' tarafından görev devri sonlandırıldı. Yetki asıl makama iade edildi.`,
        ip_adresi: req.ip
      });

      res.json({ basarili: true, mesaj: 'Görev devri sonlandırıldı. Yetki asıl makama iade edildi.' });
    } catch (err) {
      next(err);
    }
  },

  async indirPersonelSablonu(req, res, next) {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'KampüsStok';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Personel Listesi', {
        views: [{ showGridLines: true }]
      });

      worksheet.columns = [
        { header: 'Birim Adı *', key: 'birimAdi', width: 35 },
        { header: 'Ad Soyad *', key: 'adSoyad', width: 28 },
        { header: 'E-Posta *', key: 'eposta', width: 32 },
        { header: 'Telefon', key: 'telefon', width: 18 },
        { header: 'Unvan', key: 'unvan', width: 22 },
        { header: 'Bina Adı', key: 'binaAdi', width: 25 },
        { header: 'Oda No', key: 'odaNo', width: 15 }
      ];

      // Başlık Stili
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' }
      };
      headerRow.height = 26;
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      // Örnek Satırlar
      worksheet.addRow({
        birimAdi: 'Mühendislik Fakültesi Dekanlığı',
        adSoyad: 'Prof. Dr. Ahmet Yılmaz',
        eposta: 'ahmet.yilmaz@kampus.edu.tr',
        telefon: '0312 000 1001',
        unvan: 'Dekan',
        binaAdi: 'Mühendislik Binası',
        odaNo: 'M-101'
      });
      worksheet.addRow({
        birimAdi: 'Bilgisayar Mühendisliği Bölümü',
        adSoyad: 'Dr. Öğr. Üyesi Zeynep Kaya',
        eposta: 'zeynep.kaya@kampus.edu.tr',
        telefon: '0312 000 1002',
        unvan: 'Bölüm Başkanı',
        binaAdi: 'Mühendislik Binası',
        odaNo: 'M-201'
      });
      worksheet.addRow({
        birimAdi: 'Öğrenci İşleri Daire Başkanlığı',
        adSoyad: 'Mustafa Demir',
        eposta: 'mustafa.demir@kampus.edu.tr',
        telefon: '0312 000 1003',
        unvan: 'Şube Müdürü',
        binaAdi: 'Öğrenci Merkezi',
        odaNo: 'Ö-105'
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="kampusstok_personel_sablonu.xlsx"');

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      next(err);
    }
  },

  async aktarPersonelExcel(req, res, next) {
    try {
      const { dosyaBase64, satirlar: gelenSatirlar } = req.body || {};
      let parsedRows = [];

      if (Array.isArray(gelenSatirlar) && gelenSatirlar.length > 0) {
        parsedRows = gelenSatirlar;
      } else if (dosyaBase64) {
        const cleanBase64 = dosyaBase64.replace(/^data:[^;]+;base64,/, '');
        const buffer = Buffer.from(cleanBase64, 'base64');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];

        if (!worksheet) {
          throw new ValidationError('Excel dosyasında geçerli bir çalışma sayfası bulunamadı.');
        }

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Başlık satırını atla
          const birimAdi = (row.getCell(1).text || '').trim();
          const adSoyad = (row.getCell(2).text || '').trim();
          const eposta = (row.getCell(3).text || '').trim().toLowerCase();
          const telefon = (row.getCell(4).text || '').trim();
          const unvan = (row.getCell(5).text || '').trim();
          const binaAdi = (row.getCell(6).text || '').trim();
          const odaNo = (row.getCell(7).text || '').trim();

          if (birimAdi && adSoyad && eposta) {
            parsedRows.push({ birimAdi, adSoyad, eposta, telefon, unvan, binaAdi, odaNo });
          }
        });
      } else {
        throw new ValidationError('Lütfen Excel dosyası yükleyiniz.');
      }

      if (parsedRows.length === 0) {
        throw new ValidationError('İçe aktarılacak geçerli personel satırı bulunamadı. (Birim Adı, Ad Soyad ve E-Posta zorunludur)');
      }

      const db = getDb();
      let eklenenBirim = 0;
      let eklenenPersonel = 0;
      let guncellenenPersonel = 0;
      const hatalar = [];

      const aktarimTransaction = db.transaction(() => {
        for (const row of parsedRows) {
          try {
            // 1. Birim Kontrolü veya Oluşturulması
            let birim = db.prepare('SELECT id FROM birimler WHERE LOWER(TRIM(ad)) = LOWER(TRIM(?)) LIMIT 1').get(row.birimAdi);
            if (!birim) {
              const bRes = db.prepare('INSERT INTO birimler (ad, tur, aktif) VALUES (?, ?, 1)').run(row.birimAdi, 'idari_birim');
              birim = { id: bRes.lastInsertRowid };
              eklenenBirim++;
            }

            // 2. Personel Kontrolü veya Eklenmesi
            const mevcut = db.prepare('SELECT id FROM personel WHERE (birim_id = ? AND LOWER(TRIM(ad_soyad)) = LOWER(TRIM(?))) OR LOWER(TRIM(eposta)) = LOWER(TRIM(?)) LIMIT 1').get(birim.id, row.adSoyad, row.eposta);

            if (mevcut) {
              db.prepare(`
                UPDATE personel
                SET ad_soyad = ?, eposta = ?, telefon = ?, unvan = ?, bina_adi = ?, oda_no = ?, aktif = 1, guncelleme_tarihi = datetime('now')
                WHERE id = ?
              `).run(row.adSoyad, row.eposta, row.telefon || null, row.unvan || null, row.binaAdi || null, row.odaNo || null, mevcut.id);
              guncellenenPersonel++;
            } else {
              db.prepare(`
                INSERT INTO personel (birim_id, ad_soyad, eposta, telefon, unvan, bina_adi, oda_no, aktif)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1)
              `).run(birim.id, row.adSoyad, row.eposta, row.telefon || null, row.unvan || null, row.binaAdi || null, row.odaNo || null);
              eklenenPersonel++;
            }
          } catch (rowErr) {
            hatalar.push(`${row.adSoyad} (${row.eposta}): ${rowErr.message}`);
          }
        }
      });

      aktarimTransaction();

      await denetimService.logla({
        hesap_id: req.user.hesapId,
        islem_turu: 'EXCEL_PERSONEL_ICE_AKTAR',
        detay: `Excel ile toplu aktarım: ${eklenenPersonel} yeni personel, ${guncellenenPersonel} güncellenen, ${eklenenBirim} yeni birim.`,
        ip_adresi: req.ip
      });

      res.json({
        basarili: true,
        mesaj: `Excel aktarımı tamamlandı: ${eklenenPersonel} personel eklendi, ${guncellenenPersonel} güncellendi, ${eklenenBirim} yeni birim oluşturuldu.`,
        ozet: {
          toplamSatir: parsedRows.length,
          eklenenPersonel,
          guncellenenPersonel,
          eklenenBirim,
          hatalar
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

export default yonetimController;
