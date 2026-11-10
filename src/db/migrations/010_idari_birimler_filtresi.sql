-- 010_idari_birimler_filtresi.sql
-- Kategori başlığı olan ve personeli/hesabı bulunmayan sanal üst birim kayıtlarını pasife al
UPDATE birimler 
SET aktif = 0, guncelleme_tarihi = datetime('now')
WHERE id IN (108, 109, 110) 
   OR ad IN ('İdari Birimler', 'Akademik Birimler', 'Uygulama ve Araştırma Merkezleri');
