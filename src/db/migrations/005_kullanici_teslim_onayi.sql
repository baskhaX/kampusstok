-- 005_kullanici_teslim_onayi.sql
-- Kullanıcının teslimatı panelinden onaylaması (teslim alma teyidi)

ALTER TABLE talepler ADD COLUMN kullanici_teslim_aldi INTEGER NOT NULL DEFAULT 0;
ALTER TABLE talepler ADD COLUMN kullanici_teslim_tarihi TEXT;
ALTER TABLE talepler ADD COLUMN kullanici_teslim_hesap_id INTEGER REFERENCES hesaplar(id) ON DELETE SET NULL;
ALTER TABLE talepler ADD COLUMN kullanici_teslim_notu TEXT;
