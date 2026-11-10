-- 001_baslangic.sql: Kırtasiye Talep ve Depo Yönetim Sistemi Başlangıç Şeması

-- 1) schema_migrations (Migrasyon takip tablosu)
CREATE TABLE IF NOT EXISTS schema_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT NOT NULL UNIQUE,
    uygulama_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2) birimler
CREATE TABLE IF NOT EXISTS birimler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    tur TEXT NOT NULL CHECK (tur IN ('dekanlik', 'bolum', 'idari_birim')),
    ust_birim_id INTEGER REFERENCES birimler(id) ON DELETE SET NULL,
    aktif INTEGER NOT NULL DEFAULT 1,
    olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3) hesaplar
CREATE TABLE IF NOT EXISTS hesaplar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kullanici_adi TEXT NOT NULL UNIQUE,
    sifre_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('birim', 'satin_alma')),
    birim_id INTEGER REFERENCES birimler(id) ON DELETE SET NULL,
    sifre_degistirmeli INTEGER NOT NULL DEFAULT 1,
    aktif INTEGER NOT NULL DEFAULT 1,
    olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4) personel
CREATE TABLE IF NOT EXISTS personel (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    birim_id INTEGER NOT NULL REFERENCES birimler(id) ON DELETE RESTRICT,
    ad_soyad TEXT NOT NULL,
    eposta TEXT NOT NULL,
    aktif INTEGER NOT NULL DEFAULT 1,
    olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(birim_id, ad_soyad, eposta)
);

-- 5) kategoriler
CREATE TABLE IF NOT EXISTS kategoriler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ad TEXT NOT NULL,
    ust_kategori_id INTEGER REFERENCES kategoriler(id) ON DELETE SET NULL,
    sira INTEGER NOT NULL DEFAULT 0,
    aktif INTEGER NOT NULL DEFAULT 1,
    olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 6) urunler
CREATE TABLE IF NOT EXISTS urunler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kategori_id INTEGER NOT NULL REFERENCES kategoriler(id) ON DELETE RESTRICT,
    ad TEXT NOT NULL,
    marka TEXT,
    olcu_birimi TEXT NOT NULL CHECK (olcu_birimi IN ('adet', 'paket', 'kutu', 'koli', 'takim', 'rulo')),
    stok INTEGER NOT NULL DEFAULT 0 CHECK (stok >= 0),
    kritik_stok INTEGER NOT NULL DEFAULT 5,
    gorsel_yolu TEXT,
    aktif INTEGER NOT NULL DEFAULT 1,
    olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 7) stok_hareketleri
CREATE TABLE IF NOT EXISTS stok_hareketleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    urun_id INTEGER NOT NULL REFERENCES urunler(id) ON DELETE RESTRICT,
    tur TEXT NOT NULL CHECK (tur IN ('giris', 'cikis', 'duzeltme')),
    miktar INTEGER NOT NULL,
    talep_id INTEGER REFERENCES talepler(id) ON DELETE SET NULL,
    aciklama TEXT,
    yapan_hesap_id INTEGER REFERENCES hesaplar(id) ON DELETE SET NULL,
    olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 8) sepet_kalemleri
CREATE TABLE IF NOT EXISTS sepet_kalemleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    birim_id INTEGER NOT NULL REFERENCES birimler(id) ON DELETE CASCADE,
    personel_id INTEGER NOT NULL REFERENCES personel(id) ON DELETE CASCADE,
    urun_id INTEGER NOT NULL REFERENCES urunler(id) ON DELETE CASCADE,
    adet INTEGER NOT NULL CHECK (adet > 0),
    olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(birim_id, personel_id, urun_id)
);

-- 9) talep_sayaclari (Yıl bazlı sayaç)
CREATE TABLE IF NOT EXISTS talep_sayaclari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    yil INTEGER NOT NULL UNIQUE,
    son_numara INTEGER NOT NULL DEFAULT 0,
    olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 10) talepler
CREATE TABLE IF NOT EXISTS talepler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    talep_no TEXT NOT NULL UNIQUE,
    birim_id INTEGER NOT NULL REFERENCES birimler(id) ON DELETE RESTRICT,
    personel_id INTEGER REFERENCES personel(id) ON DELETE SET NULL,
    personel_adi TEXT NOT NULL,
    personel_eposta TEXT NOT NULL,
    notlar TEXT,
    durum TEXT NOT NULL DEFAULT 'beklemede' CHECK (durum IN ('beklemede', 'onaylandi', 'revize_onaylandi', 'reddedildi', 'teslim_edildi')),
    sonuc_gerekcesi TEXT,
    sonuclandiran_hesap_id INTEGER REFERENCES hesaplar(id) ON DELETE SET NULL,
    sonuc_tarihi TEXT,
    teslimat_tarihi TEXT,
    mail_durumu TEXT NOT NULL DEFAULT 'bekliyor' CHECK (mail_durumu IN ('bekliyor', 'gonderildi', 'basarisiz', 'simulasyon')),
    olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 11) talep_kalemleri
CREATE TABLE IF NOT EXISTS talep_kalemleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    talep_id INTEGER NOT NULL REFERENCES talepler(id) ON DELETE CASCADE,
    urun_id INTEGER NOT NULL REFERENCES urunler(id) ON DELETE RESTRICT,
    urun_adi TEXT NOT NULL,
    olcu_birimi TEXT NOT NULL,
    istenen_adet INTEGER NOT NULL CHECK (istenen_adet > 0),
    onaylanan_adet INTEGER CHECK (onaylanan_adet IS NULL OR (onaylanan_adet >= 0 AND onaylanan_adet <= istenen_adet)),
    olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 12) bildirimler
CREATE TABLE IF NOT EXISTS bildirimler (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hedef_rol TEXT NOT NULL CHECK (hedef_rol IN ('birim', 'satin_alma')),
    hedef_birim_id INTEGER REFERENCES birimler(id) ON DELETE CASCADE,
    tur TEXT NOT NULL,
    baslik TEXT NOT NULL,
    mesaj TEXT NOT NULL,
    talep_id INTEGER REFERENCES talepler(id) ON DELETE SET NULL,
    okundu INTEGER NOT NULL DEFAULT 0,
    olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 13) islem_kayitlari
CREATE TABLE IF NOT EXISTS islem_kayitlari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hesap_id INTEGER REFERENCES hesaplar(id) ON DELETE SET NULL,
    islem TEXT NOT NULL,
    nesne_tur TEXT NOT NULL,
    nesne_id INTEGER,
    eski_deger TEXT,
    yeni_deger TEXT,
    olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 14) oturumlar
CREATE TABLE IF NOT EXISTS oturumlar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    hesap_id INTEGER NOT NULL REFERENCES hesaplar(id) ON DELETE CASCADE,
    secili_personel_id INTEGER REFERENCES personel(id) ON DELETE SET NULL,
    son_gecerlilik TEXT NOT NULL,
    olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 15) giris_denemeleri
CREATE TABLE IF NOT EXISTS giris_denemeleri (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kullanici_adi TEXT NOT NULL,
    ip TEXT NOT NULL,
    basarili INTEGER NOT NULL,
    tarih TEXT NOT NULL DEFAULT (datetime('now')),
    olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 16) mail_kuyrugu
CREATE TABLE IF NOT EXISTS mail_kuyrugu (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    talep_id INTEGER REFERENCES talepler(id) ON DELETE SET NULL,
    alici TEXT NOT NULL,
    konu TEXT NOT NULL,
    govde TEXT NOT NULL,
    durum TEXT NOT NULL DEFAULT 'bekliyor' CHECK (durum IN ('bekliyor', 'gonderildi', 'basarisiz', 'simulasyon')),
    deneme_sayisi INTEGER NOT NULL DEFAULT 0,
    hata TEXT,
    tarih TEXT NOT NULL DEFAULT (datetime('now')),
    olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
    guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_talepler_durum_tarih ON talepler(durum, olusturma_tarihi);
CREATE INDEX IF NOT EXISTS idx_talepler_birim_id ON talepler(birim_id);
CREATE INDEX IF NOT EXISTS idx_talep_kalemleri_talep_id ON talep_kalemleri(talep_id);
CREATE INDEX IF NOT EXISTS idx_urunler_kategori_aktif ON urunler(kategori_id, aktif);
CREATE INDEX IF NOT EXISTS idx_stok_hareketleri_urun_id ON stok_hareketleri(urun_id);
CREATE INDEX IF NOT EXISTS idx_bildirimler_hedef_okundu ON bildirimler(hedef_rol, okundu);
CREATE INDEX IF NOT EXISTS idx_giris_denemeleri_ip_kullanici ON giris_denemeleri(kullanici_adi, ip, tarih);
CREATE INDEX IF NOT EXISTS idx_oturumlar_token ON oturumlar(token_hash);
