-- 008_odunc_ekipman.sql
-- Acil Ödünç / Ortak Ekipman Havuzu (Kırtasiye Kütüphanesi)

CREATE TABLE IF NOT EXISTS odunc_ekipmanlar (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  urun_id INTEGER REFERENCES urunler(id),
  ad TEXT NOT NULL,
  kategori TEXT NOT NULL DEFAULT 'Ortak Ekipman',
  demirbas_kodu TEXT,
  gorsel_yolu TEXT,
  durum TEXT NOT NULL DEFAULT 'musait', -- 'musait', 'oduncte', 'bakimda'
  aktif INTEGER NOT NULL DEFAULT 1,
  olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ekipman_rezervasyonlari (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ekipman_id INTEGER NOT NULL REFERENCES odunc_ekipmanlar(id),
  birim_id INTEGER NOT NULL REFERENCES birimler(id),
  personel_id INTEGER REFERENCES personel(id),
  baslangic_tarihi TEXT NOT NULL, -- YYYY-MM-DD
  bitis_tarihi TEXT NOT NULL,     -- YYYY-MM-DD
  kullanim_amaci TEXT NOT NULL,
  teslim_alma_turu TEXT NOT NULL DEFAULT 'elden', -- 'elden', 'carsamba_dagitim'
  durum TEXT NOT NULL DEFAULT 'onaylandi',        -- 'onaylandi', 'teslim_edildi', 'iade_alindi', 'iptal'
  iade_tarihi TEXT,
  olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ekipman_rez_tarih ON ekipman_rezervasyonlari(ekipman_id, baslangic_tarihi, bitis_tarihi);
CREATE INDEX IF NOT EXISTS idx_ekipman_rez_durum ON ekipman_rezervasyonlari(durum);

-- Standart Üniversite Ortak Ekipman Havuzunu Tohumla (Eğer yoksa)
INSERT INTO odunc_ekipmanlar (ad, kategori, demirbas_kodu, durum) VALUES
('Ağır Hizmet Tipi Kollu Zımba (200 Sayfa)', 'Ciltleme & Zımba', 'DMB-ZMB-001', 'musait'),
('A3/A4 Profesyonel Kağıt Giyotini', 'Kesim & Düzeltme', 'DMB-GYT-002', 'musait'),
('Laminasyon (PVC Kaplama) Makinesi A3/A4', 'Kaplama', 'DMB-LAM-003', 'musait'),
('Helezon Spiral Tel Ciltleme Cihazı', 'Ciltleme & Zımba', 'DMB-CLT-004', 'musait'),
('Sunum Kumandası & Yeşil Lazer Pointer', 'Elektronik & Sunum', 'DMB-LZR-005', 'musait'),
('Toplu Yaka Kartı Delgeci ve Aparatları', 'Organizasyon', 'DMB-YKA-006', 'musait');
