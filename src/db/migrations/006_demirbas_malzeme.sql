-- 006_demirbas_malzeme.sql
-- Ürünler için demirbaş / dayanıklı ofis gereci ayrımı ve israf önleme

ALTER TABLE urunler ADD COLUMN demirbas INTEGER NOT NULL DEFAULT 0;

-- Dayanıklı ofis malzemelerini (delgeç, zımba, hesap makinesi, kaşe, makas vb.) demirbaş olarak işaretle
UPDATE urunler 
SET demirbas = 1 
WHERE (LOWER(ad) LIKE '%delgeç%' 
   OR LOWER(ad) LIKE '%zımba%' 
   OR LOWER(ad) LIKE '%hesap makinesi%' 
   OR LOWER(ad) LIKE '%makas%' 
   OR LOWER(ad) LIKE '%kaşe%'
   OR LOWER(ad) LIKE '%panosu%'
   OR LOWER(ad) LIKE '%evrak rafı%'
   OR LOWER(ad) LIKE '%kalemlik%')
  AND LOWER(ad) NOT LIKE '%teli%'
  AND LOWER(ad) NOT LIKE '%kitapçığı%';
