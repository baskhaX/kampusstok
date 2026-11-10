-- 009_guvenlik_ve_performans_indeksleri.sql
-- 15 dakikalık şifre sıfırlama tokenleri ve kritik sorgu performans indeksleri

CREATE TABLE IF NOT EXISTS sifre_sifirlama_tokenleri (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hesap_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  son_gecerlilik TEXT NOT NULL,
  kullanildi INTEGER DEFAULT 0,
  olusturma_tarihi TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (hesap_id) REFERENCES hesaplar(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sifre_token_hash ON sifre_sifirlama_tokenleri(token_hash);
CREATE INDEX IF NOT EXISTS idx_sifre_token_hesap ON sifre_sifirlama_tokenleri(hesap_id, son_gecerlilik);

-- Performans ve Hızlandırma İndeksleri
CREATE INDEX IF NOT EXISTS idx_talep_kalemleri_talep_id ON talep_kalemleri(talep_id);
CREATE INDEX IF NOT EXISTS idx_talep_kalemleri_urun_id ON talep_kalemleri(urun_id);
CREATE INDEX IF NOT EXISTS idx_talepler_teslimat_durum ON talepler(teslimat_tarihi, durum);
CREATE INDEX IF NOT EXISTS idx_talepler_birim_durum ON talepler(birim_id, durum);
CREATE INDEX IF NOT EXISTS idx_giris_denemeleri_ip_tarih ON giris_denemeleri(ip, tarih);
CREATE INDEX IF NOT EXISTS idx_giris_denemeleri_kullanici_tarih ON giris_denemeleri(kullanici_adi, tarih);
