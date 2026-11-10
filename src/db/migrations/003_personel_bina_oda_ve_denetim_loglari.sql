-- 003_personel_bina_oda_ve_denetim_loglari.sql

-- 1. Personel tablosuna teslimat adresi için bina_adi ve oda_no alanları
ALTER TABLE personel ADD COLUMN bina_adi TEXT;
ALTER TABLE personel ADD COLUMN oda_no TEXT;

-- 2. Hesaplar tablosuna bireysel personel hesabı bağı
ALTER TABLE hesaplar ADD COLUMN personel_id INTEGER REFERENCES personel(id) ON DELETE SET NULL;

-- 3. Kurumsal Denetim Logları (Audit Trail)
CREATE TABLE IF NOT EXISTS denetim_loglari (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kullanici_id INTEGER,
    kullanici_adi TEXT,
    rol TEXT,
    islem_turu TEXT NOT NULL,
    aciklama TEXT NOT NULL,
    detay TEXT,
    ip_adresi TEXT,
    tarih TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_denetim_tarih ON denetim_loglari(tarih DESC);
CREATE INDEX IF NOT EXISTS idx_denetim_islem ON denetim_loglari(islem_turu);
