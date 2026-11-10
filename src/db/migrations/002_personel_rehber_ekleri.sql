-- 002_personel_rehber_ekleri.sql: Rehber bilgileri için personel tablosuna unvan, gorev ve telefon alanları
ALTER TABLE personel ADD COLUMN unvan TEXT;
ALTER TABLE personel ADD COLUMN gorev TEXT;
ALTER TABLE personel ADD COLUMN telefon TEXT;
