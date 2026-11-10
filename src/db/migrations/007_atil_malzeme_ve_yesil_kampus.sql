-- 007_atil_malzeme_ve_yesil_kampus.sql
-- İhtiyaç Fazlası Atıl Malzeme Bildirimleri ve Yeşil Kampüs Puanlama Tabloları

CREATE TABLE IF NOT EXISTS atil_malzeme_bildirimleri (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  birim_id INTEGER NOT NULL REFERENCES birimler(id),
  personel_id INTEGER REFERENCES personel(id),
  bina_adi TEXT NOT NULL,
  oda_no TEXT NOT NULL,
  detay_notu TEXT NOT NULL,
  durum TEXT NOT NULL DEFAULT 'beklemede', -- 'beklemede', 'teslim_alindi', 'iptal'
  teslim_alan_hesap_id INTEGER REFERENCES hesaplar(id),
  teslim_tarihi TEXT,
  olusturma_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_atil_malzeme_durum ON atil_malzeme_bildirimleri(durum);
CREATE INDEX IF NOT EXISTS idx_atil_malzeme_birim ON atil_malzeme_bildirimleri(birim_id);

CREATE TABLE IF NOT EXISTS yesil_kampus_puanlari (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  birim_id INTEGER NOT NULL REFERENCES birimler(id),
  ay TEXT NOT NULL, -- 'YYYY-MM'
  taban_puan INTEGER NOT NULL DEFAULT 100,
  iade_puani INTEGER NOT NULL DEFAULT 0,
  tasarruf_puani INTEGER NOT NULL DEFAULT 0,
  nudge_puani INTEGER NOT NULL DEFAULT 0,
  hizli_teslim_puani INTEGER NOT NULL DEFAULT 0,
  toplam_puan INTEGER GENERATED ALWAYS AS (taban_puan + iade_puani + tasarruf_puani + nudge_puani + hizli_teslim_puani) VIRTUAL,
  guncelleme_tarihi TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(birim_id, ay)
);

CREATE INDEX IF NOT EXISTS idx_yesil_kampus_ay ON yesil_kampus_puanlari(ay);
CREATE INDEX IF NOT EXISTS idx_yesil_kampus_toplam ON yesil_kampus_puanlari(toplam_puan DESC);
