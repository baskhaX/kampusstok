-- 012_hayalet_admin_ve_temiz_denetim.sql
-- Acil durum / Yapıcı (Sistem Tasarımcısı) denetim kayıtlarını temizler ve veri bütünlüğünü sağlar
DELETE FROM denetim_loglari WHERE LOWER(kullanici_adi) IN ('admin', 'yapici', 'yapıcı');
DELETE FROM giris_denemeleri WHERE LOWER(kullanici_adi) IN ('admin', 'yapici', 'yapıcı');
