-- 004_urunler_barkod.sql

ALTER TABLE urunler ADD COLUMN barkod TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_urunler_barkod ON urunler(barkod) WHERE barkod IS NOT NULL;
