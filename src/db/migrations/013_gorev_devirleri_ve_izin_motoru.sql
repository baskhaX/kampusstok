-- 013_gorev_devirleri_ve_izin_motoru.sql
-- Satın Alma Müdürü Görev Devri ve Saatli/Tarihli Yıllık İzin Yetkilendirme Motoru

CREATE TABLE IF NOT EXISTS gorev_devirleri (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  veren_makam TEXT NOT NULL DEFAULT 'Satın Alma Müdürü',
  veren_personel_id INTEGER,
  veren_ad_soyad TEXT NOT NULL DEFAULT 'Satın Alma Müdürü',
  alan_personel_id INTEGER NOT NULL REFERENCES personel(id),
  alan_ad_soyad TEXT NOT NULL,
  alan_birim_id INTEGER NOT NULL DEFAULT 41,
  alan_eposta TEXT,
  tur TEXT NOT NULL DEFAULT 'devir', -- 'devir' (Asıl Kırtasiye Yöneticisi) veya 'izin' (Geçici Yıllık İzin Vekili)
  rol_model_etiket TEXT NOT NULL DEFAULT 'Kırtasiye ve Depo Sorumlusu',
  neden TEXT,
  baslangic_tarihi TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  bitis_tarihi TEXT, -- ISO veya YYYY-MM-DDTHH:MM
  aktif INTEGER NOT NULL DEFAULT 1,
  olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  sonlandiran_ad_soyad TEXT,
  sonlandirma_tarihi TEXT
);

CREATE INDEX IF NOT EXISTS idx_gorev_devirleri_aktif ON gorev_devirleri(aktif, alan_personel_id);
