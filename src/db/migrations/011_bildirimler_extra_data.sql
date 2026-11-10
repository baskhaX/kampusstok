-- 011_bildirimler_extra_data.sql
-- Bildirimlere ek veri (atil_id, rezervasyon_id vb.) saklamak için JSON kolonu ekle
ALTER TABLE bildirimler ADD COLUMN extra_data TEXT;
