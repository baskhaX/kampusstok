import getDb from './connection.js';
import { runMigrations } from './migrate.js';
import { hashPassword } from '../utils/crypto.js';
import logger from '../utils/logger.js';

export function runSeed(customDb = null) {
  const db = customDb || getDb();
  runMigrations(db);

  // Zaten veri varsa çalıştırma
  const existingCount = db.prepare('SELECT COUNT(*) as count FROM hesaplar').get().count;
  if (existingCount > 0) {
    logger.info('Veritabanında kayıtlı hesaplar mevcut, tohumlama (seed) atlandı.');
    return;
  }

  logger.info('KampüsStok temiz açık kaynak örnek verileri (seed) yükleniyor...');

  const seedTransaction = db.transaction(() => {
    // 1) Temel Sistem ve Yönetim Hesapları
    const adminInsert = db.prepare(`
      INSERT INTO hesaplar (kullanici_adi, sifre_hash, rol, birim_id, sifre_degistirmeli, aktif)
      VALUES (?, ?, ?, ?, 0, 1)
    `);

    const adminHash = hashPassword('admin123');
    const satinalmaHash = hashPassword('satinalma123');
    const depoHash = hashPassword('depo123');
    const birimHash = hashPassword('birim123');

    const adminResult = adminInsert.run('admin', adminHash, 'satin_alma', null);
    const adminId = adminResult.lastInsertRowid;
    adminInsert.run('satinalma', satinalmaHash, 'satin_alma', null);
    adminInsert.run('depo', depoHash, 'satin_alma', null);

    // 2) Örnek Üniversite Birimleri (10 Temel Birim)
    const insertBirim = db.prepare(`
      INSERT INTO birimler (ad, tur, ust_birim_id, aktif)
      VALUES (?, ?, ?, 1)
    `);

    const rektorlukId = insertBirim.run('Rektörlük Makamı', 'idari_birim', null).lastInsertRowid;
    const genelSekreterlikId = insertBirim.run('Genel Sekreterlik', 'idari_birim', null).lastInsertRowid;
    const muhendislikId = insertBirim.run('Mühendislik Fakültesi Dekanlığı', 'dekanlik', null).lastInsertRowid;
    const cengId = insertBirim.run('Bilgisayar Mühendisliği Bölümü', 'bolum', muhendislikId).lastInsertRowid;
    const eeeId = insertBirim.run('Elektrik-Elektronik Mühendisliği Bölümü', 'bolum', muhendislikId).lastInsertRowid;
    const iibfId = insertBirim.run('İktisadi ve İdari Bilimler Fakültesi', 'dekanlik', null).lastInsertRowid;
    const fenEdebiyatId = insertBirim.run('Fen-Edebiyat Fakültesi', 'dekanlik', null).lastInsertRowid;
    const ogrenciIsleriId = insertBirim.run('Öğrenci İşleri Müdürlüğü', 'idari_birim', null).lastInsertRowid;
    const idariMaliId = insertBirim.run('İdari ve Mali İşler Müdürlüğü', 'idari_birim', null).lastInsertRowid;
    const bidbId = insertBirim.run('Bilgi İşlem Müdürlüğü', 'idari_birim', null).lastInsertRowid;
    const kutuphaneId = insertBirim.run('Kütüphane ve Dokümantasyon Müdürlüğü', 'idari_birim', null).lastInsertRowid;

    // 3) Birim Demo Hesapları
    adminInsert.run('birim', birimHash, 'birim', cengId);
    adminInsert.run('rektorluk', hashPassword('demo123'), 'birim', rektorlukId);
    adminInsert.run('muhendislik', hashPassword('demo123'), 'birim', muhendislikId);
    adminInsert.run('ogrenciisleri', hashPassword('demo123'), 'birim', ogrenciIsleriId);
    adminInsert.run('bidb', hashPassword('demo123'), 'birim', bidbId);

    // 4) 20 Fictitious Mock Personel (KVKK Uyumlu Temiz Örnek Veri)
    const insertPersonel = db.prepare(`
      INSERT INTO personel (birim_id, ad_soyad, eposta, telefon, unvan, oda_no, bina_adi, aktif)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    insertPersonel.run(rektorlukId, 'Prof. Dr. Kemal Yılmaz', 'kemal.yilmaz@kampus.edu.tr', '0312 000 1001', 'Rektör', 'R-101', 'Rektörlük Binası');
    insertPersonel.run(rektorlukId, 'Dr. Selin Doğan', 'selin.dogan@kampus.edu.tr', '0312 000 1002', 'Rektör Danışmanı', 'R-102', 'Rektörlük Binası');
    insertPersonel.run(genelSekreterlikId, 'Hakan Öztürk', 'hakan.ozturk@kampus.edu.tr', '0312 000 1003', 'Genel Sekreter', 'GS-201', 'Rektörlük Binası');
    insertPersonel.run(genelSekreterlikId, 'Ayşe Güler', 'ayse.guler@kampus.edu.tr', '0312 000 1004', 'Genel Sekreter Yrd.', 'GS-202', 'Rektörlük Binası');
    insertPersonel.run(muhendislikId, 'Prof. Dr. Mehmet Demir', 'mehmet.demir@kampus.edu.tr', '0312 000 2001', 'Dekan', 'M-301', 'Mühendislik Binası');
    insertPersonel.run(muhendislikId, 'Zeynep Kaya', 'zeynep.kaya@kampus.edu.tr', '0312 000 2002', 'Fakülte Sekreteri', 'M-302', 'Mühendislik Binası');
    insertPersonel.run(cengId, 'Dr. Öğr. Üyesi Emre Aydın', 'emre.aydin@kampus.edu.tr', '0312 000 2010', 'Bölüm Başkanı', 'M-401', 'Mühendislik Binası');
    insertPersonel.run(cengId, 'Caner Arslan', 'caner.arslan@kampus.edu.tr', '0312 000 2011', 'Araştırma Görevlisi', 'M-405', 'Mühendislik Binası');
    insertPersonel.run(eeeId, 'Doç. Dr. Ali Vural', 'ali.vural@kampus.edu.tr', '0312 000 2020', 'Öğretim Üyesi', 'M-501', 'Mühendislik Binası');
    insertPersonel.run(eeeId, 'Fatma Koç', 'fatma.koc@kampus.edu.tr', '0312 000 2021', 'Bölüm Sekreteri', 'M-502', 'Mühendislik Binası');
    insertPersonel.run(iibfId, 'Prof. Dr. Fatma Çelik', 'fatma.celik@kampus.edu.tr', '0312 000 3001', 'Dekan', 'İ-101', 'İİBF Binası');
    insertPersonel.run(iibfId, 'Burak Şahin', 'burak.sahin@kampus.edu.tr', '0312 000 3002', 'Fakülte Sekreteri', 'İ-102', 'İİBF Binası');
    insertPersonel.run(fenEdebiyatId, 'Prof. Dr. Hasan Yıldız', 'hasan.yildiz@kampus.edu.tr', '0312 000 4001', 'Dekan', 'F-101', 'Fen Binası');
    insertPersonel.run(fenEdebiyatId, 'Elif Koç', 'elif.koc@kampus.edu.tr', '0312 000 4002', 'Fakülte Sekreteri', 'F-102', 'Fen Binası');
    insertPersonel.run(ogrenciIsleriId, 'Murat Polat', 'murat.polat@kampus.edu.tr', '0312 000 5001', 'Daire Başkanı', 'Ö-201', 'Öğrenci Merkezi');
    insertPersonel.run(ogrenciIsleriId, 'Sevgi Karaca', 'sevgi.karaca@kampus.edu.tr', '0312 000 5002', 'Şube Müdürü', 'Ö-202', 'Öğrenci Merkezi');
    insertPersonel.run(idariMaliId, 'Tarık Bozkurt', 'tarik.bozkurt@kampus.edu.tr', '0312 000 6001', 'Satın Alma Sorumlusu', 'D-101', 'İdari Bina');
    insertPersonel.run(bidbId, 'Serkan Aksoy', 'serkan.aksoy@kampus.edu.tr', '0312 000 7001', 'Daire Başkanı', 'B-101', 'Bilişim Merkezi');
    insertPersonel.run(bidbId, 'Derya Güven', 'derya.guven@kampus.edu.tr', '0312 000 7002', 'Sistem Yöneticisi', 'B-102', 'Bilişim Merkezi');
    insertPersonel.run(kutuphaneId, 'Cengizhan Er', 'cengizhan.er@kampus.edu.tr', '0312 000 8001', 'Kütüphane Daire Bşk.', 'K-101', 'Merkez Kütüphane');

    // 5) Standart Kategoriler
    const insertKategori = db.prepare(`
      INSERT INTO kategoriler (ad, ust_kategori_id, sira, aktif)
      VALUES (?, ?, ?, 1)
    `);

    const katKagit = insertKategori.run('Kağıt ve Defter Grubu', null, 1).lastInsertRowid;
    const katYazim = insertKategori.run('Yazım ve Çizim Gereçleri', null, 2).lastInsertRowid;
    const katDosya = insertKategori.run('Dosyalama ve Arşivleme', null, 3).lastInsertRowid;
    const katMasa = insertKategori.run('Masaüstü Kırtasiye Gereçleri', null, 4).lastInsertRowid;

    const subFotokopi = insertKategori.run('Fotokopi Kağıtları', katKagit, 1).lastInsertRowid;
    const subNot = insertKategori.run('Not Kağıtları ve Bloknot', katKagit, 2).lastInsertRowid;
    const subZarf = insertKategori.run('Resmi Zarf ve Formlar', katKagit, 3).lastInsertRowid;
    const subKalem = insertKategori.run('Tükenmez ve Jel Kalemler', katYazim, 1).lastInsertRowid;
    const subTahta = insertKategori.run('Tahta ve Fosforlu Kalemler', katYazim, 2).lastInsertRowid;
    const subSinav = insertKategori.run('Sınav ve Çizim Gereçleri', katYazim, 3).lastInsertRowid;
    const subKlasor = insertKategori.run('Klasör ve Telli Dosyalar', katDosya, 1).lastInsertRowid;
    const subPoset = insertKategori.run('Poşet Dosyalar ve Gömlekler', katDosya, 2).lastInsertRowid;
    const subArsiv = insertKategori.run('Arşivleme ve Sunum Dosyaları', katDosya, 3).lastInsertRowid;
    const subZimba = insertKategori.run('Zımba, Delgeç ve Teller', katMasa, 1).lastInsertRowid;
    const subBant = insertKategori.run('Bant, Yapıştırıcı ve Makas', katMasa, 2).lastInsertRowid;
    const subAtac = insertKategori.run('Ataç ve Kıskaçlar', katMasa, 3).lastInsertRowid;
    const subDuzen = insertKategori.run('Masaüstü Düzen ve Kaşe', katMasa, 4).lastInsertRowid;
    const subElektronik = insertKategori.run('Ofis Elektroniği ve Piller', katMasa, 5).lastInsertRowid;

    // 6) Ürünler
    const insertUrun = db.prepare(`
      INSERT INTO urunler (kategori_id, ad, marka, olcu_birimi, stok, kritik_stok, gorsel_yolu, aktif)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);

    const insertStok = db.prepare(`
      INSERT INTO stok_hareketleri (urun_id, tur, miktar, talep_id, aciklama, yapan_hesap_id)
      VALUES (?, 'giris', ?, NULL, 'Açılış Stok Girişi', ?)
    `);

    const urunlerList = [
      { kat: subFotokopi, ad: 'A4 Fotokopi Kağıdı 80 gr (500 Yaprak)', marka: 'Standart', birim: 'paket', stok: 120, kritik: 20, gorsel: '/uploads/urunler/urun_1793918310254_45c02d93.jpg' },
      { kat: subFotokopi, ad: 'A4 Fotokopi Kağıdı 80 gr (1 Kutu / 5 Paket)', marka: 'Standart', birim: 'kutu', stok: 50, kritik: 10, gorsel: '/uploads/urunler/urun_1793922287378_94363313.png' },
      { kat: subFotokopi, ad: 'A3 Fotokopi Kağıdı 80 gr (500 Yaprak)', marka: 'Standart', birim: 'paket', stok: 25, kritik: 5, gorsel: '/uploads/urunler/urun_1793905979884_7a70f1e7.jpg' },
      { kat: subKalem, ad: 'Mavi Tükenmez Kalem 0.7 mm (50\'li Kutu)', marka: 'Bic', birim: 'kutu', stok: 40, kritik: 10, gorsel: '/uploads/urunler/urun_3_mavi_tukenmez.jpg' },
      { kat: subKalem, ad: 'Siyah Jel Kalem 0.5 mm (12\'li Kutu)', marka: 'Pilot G2', birim: 'kutu', stok: 35, kritik: 8, gorsel: '/uploads/urunler/urun_4_siyah_jel.jpg' },
      { kat: subKalem, ad: 'Kırmızı Tükenmez Kalem 0.7 mm (50\'li Kutu)', marka: 'Bic', birim: 'kutu', stok: 20, kritik: 5, gorsel: '/uploads/urunler/urun_5_kirmizi_tukenmez.jpg' },
      { kat: subTahta, ad: 'Fosforlu Kalem 4\'lü Karışık Set', marka: 'Stabilo Boss', birim: 'takim', stok: 45, kritik: 10, gorsel: '/uploads/urunler/urun_6_fosforlu_kalem.jpg' },
      { kat: subTahta, ad: 'Beyaz Yazı Tahtası Kalemi 4 Renk Set', marka: 'Edding', birim: 'takim', stok: 60, kritik: 15, gorsel: '/uploads/urunler/urun_1793918412161_9172b9e2.jpg' },
      { kat: subKlasor, ad: 'Geniş Sırtlı Mekanizmalı A4 Klasör (Mavi)', marka: 'Leitz', birim: 'adet', stok: 85, kritik: 15, gorsel: '/uploads/urunler/urun_8_leitz_klasor.jpg' },
      { kat: subKlasor, ad: 'Dar Sırtlı Mekanizmalı A4 Klasör (Siyah)', marka: 'Leitz', birim: 'adet', stok: 50, kritik: 10, gorsel: '/uploads/urunler/urun_9_leitz_klasor_dar_siyah.jpg' },
      { kat: subPoset, ad: 'Şeffaf Poşet Dosya A4 (100\'lü Paket)', marka: 'Noki', birim: 'paket', stok: 90, kritik: 20, gorsel: '/uploads/urunler/urun_10_noki_poset_dosya_100lu.jpg' },
      { kat: subKlasor, ad: 'Renkli Plastik Telli Dosya (50\'li Paket)', marka: 'Noki', birim: 'paket', stok: 35, kritik: 10, gorsel: '/uploads/urunler/urun_11_noki_telli_dosya_renkli_50li.jpg' },
      { kat: subZimba, ad: 'Standart Masaüstü Zımba Makinesi No: 24/6', marka: 'Mas', birim: 'adet', stok: 25, kritik: 5, gorsel: '/uploads/urunler/urun_12_zimba_makinesi.jpg' },
      { kat: subZimba, ad: 'Zımba Teli No: 24/6 (1000\'li Kutu)', marka: 'Mas', birim: 'kutu', stok: 80, kritik: 15, gorsel: '/uploads/urunler/urun_13_mas_zimba_teli_24_6.jpg' },
      { kat: subZimba, ad: '2 Delikli Metal Masaüstü Delgeç (30 Sayfa)', marka: 'Mas', birim: 'adet', stok: 18, kritik: 4, gorsel: '/uploads/urunler/urun_1793830360049_193a7128.jpg' },
      { kat: subBant, ad: 'Sıvı/Stick Yapıştırıcı Pritt 43 gr', marka: 'Pritt', birim: 'adet', stok: 55, kritik: 10, gorsel: '/uploads/urunler/urun_1793961834668_133bd261.jpg' },
      { kat: subBant, ad: 'Şeffaf Koli Bandı 45 mm x 100 m', marka: 'Ve-Ge', birim: 'rulo', stok: 40, kritik: 8, gorsel: '/uploads/urunler/urun_16_vege_koli_bandi_seffaf.jpg' },
      { kat: subNot, ad: 'Post-it Kendinden Yapışkanlı Not Kağıdı Sarı', marka: '3M', birim: 'adet', stok: 110, kritik: 25, gorsel: '/uploads/urunler/urun_18_postit_sari.jpg' },
      { kat: subAtac, ad: 'Nikelajlı Metal Ataç No: 3 (100\'lü Kutu)', marka: 'Mas', birim: 'kutu', stok: 80, kritik: 15, gorsel: '/uploads/urunler/urun_19_mas_atac_no3_100lu.jpg' },
      { kat: subAtac, ad: 'Büyük Boy Metal Kıskaç 32 mm (12\'li Kutu)', marka: 'Mas', birim: 'kutu', stok: 45, kritik: 10, gorsel: '/uploads/urunler/urun_20_mas_kiskac_binder_32mm_12li.jpg' },
      { kat: subZarf, ad: 'Resmi Antetli A4 Kağıdı (500 Sayfa)', marka: 'Kurumsal', birim: 'paket', stok: 80, kritik: 15, gorsel: '/uploads/urunler/urun_114_navigator_100gr_a4.jpg' },
      { kat: subZarf, ad: 'Resmi Diplomat Zarf Pencereli (100\'lü Kutu)', marka: 'Kurumsal', birim: 'kutu', stok: 60, kritik: 15, gorsel: '/uploads/urunler/urun_23_diplomat_zarf.jpg' },
      { kat: subElektronik, ad: 'USB 3.0 Flash Bellek 32 GB (Metal Gövde)', marka: 'Kingston', birim: 'adet', stok: 40, kritik: 8, gorsel: '/uploads/urunler/urun_55_kingston_usb_bellek_32gb_metal.jpg' },
      { kat: subElektronik, ad: 'Alkalin Kalem Pil AA 1.5V (Tane)', marka: 'Duracell', birim: 'adet', stok: 150, kritik: 30, gorsel: '/uploads/urunler/urun_1793959989039_ed1f2253.jpg' }
    ];

    for (const u of urunlerList) {
      const urunRes = insertUrun.run(u.kat, u.ad, u.marka, u.birim, u.stok, u.kritik, u.gorsel || null);
      const urunId = urunRes.lastInsertRowid;
      insertStok.run(urunId, u.stok, adminId);
    }
  });

  seedTransaction();
  logger.info('KampüsStok temiz açık kaynak örnek verileri başarıyla yüklendi.');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed();
}

export default runSeed;
