import { z } from 'zod';

export const urunEkleGuncelleSchema = z.object({
  kategori_id: z.number().int().positive('Geçerli bir kategori seçiniz'),
  ad: z.string().min(2, 'Ürün adı en az 2 karakter olmalıdır').trim(),
  marka: z.string().trim().optional().nullable(),
  barkod: z.string().trim().optional().nullable(),
  olcu_birimi: z.enum(['adet', 'paket', 'kutu', 'koli', 'takim', 'rulo'], {
    errorMap: () => ({ message: 'Geçersiz ölçü birimi' })
  }),
  stok: z.number().int().min(0, 'Stok negatif olamaz').optional().default(0),
  kritik_stok: z.number().int().min(0, 'Kritik stok negatif olamaz').optional().default(5),
  gorsel_yolu: z.string().optional().nullable(),
  aktif: z.number().int().min(0).max(1).optional().default(1)
});

export const stokHareketiSchema = z.object({
  urun_id: z.number().int().positive('Geçerli bir ürün ID gereklidir'),
  tur: z.enum(['giris', 'duzeltme'], {
    errorMap: () => ({ message: 'Geçersiz işlem türü (giris veya duzeltme)' })
  }),
  miktar: z.number().int().min(0, 'Miktar negatif olamaz'),
  aciklama: z.string().max(255).optional().nullable()
});

export const kategoriEkleGuncelleSchema = z.object({
  ad: z.string().min(2, 'Kategori adı en az 2 karakter olmalıdır').trim(),
  ust_kategori_id: z.number().int().positive().optional().nullable(),
  sira: z.number().int().optional().default(0),
  aktif: z.number().int().min(0).max(1).optional().default(1)
});

export const birimEkleGuncelleSchema = z.object({
  ad: z.string().min(2, 'Birim adı en az 2 karakter olmalıdır').trim(),
  tur: z.enum(['dekanlik', 'bolum', 'idari_birim'], {
    errorMap: () => ({ message: 'Geçersiz birim türü' })
  }),
  ust_birim_id: z.number().int().positive().optional().nullable(),
  aktif: z.number().int().min(0).max(1).optional().default(1),
  kullanici_adi: z.string().trim().optional().nullable(),
  sifre: z.string().min(6, 'Şifre en az 6 karakter olmalıdır').optional().nullable()
});

export const birimSifreSifirlaSchema = z.object({
  birim_id: z.number().int().positive(),
  yeni_sifre: z.string().min(6, 'Şifre en az 6 karakter olmalıdır')
});

export const personelEkleSchema = z.object({
  birim_id: z.number().int().positive('Geçerli bir birim seçiniz'),
  ad_soyad: z.string().min(2, 'Ad Soyad en az 2 karakter olmalıdır').trim(),
  eposta: z.string().email('Geçerli bir kurumsal e-posta giriniz').trim().toLowerCase(),
  unvan: z.string().trim().optional().nullable(),
  gorev: z.string().trim().optional().nullable(),
  telefon: z.string().trim().optional().nullable()
});

export const personelGuncelleSchema = z.object({
  birim_id: z.number().int().positive('Geçerli bir birim seçiniz').optional(),
  ad_soyad: z.string().min(2, 'Ad Soyad en az 2 karakter olmalıdır').trim().optional(),
  eposta: z.string().email('Geçerli bir kurumsal e-posta giriniz').trim().toLowerCase().optional(),
  unvan: z.string().trim().optional().nullable(),
  gorev: z.string().trim().optional().nullable(),
  telefon: z.string().trim().optional().nullable(),
  aktif: z.number().int().min(0).max(1).optional()
});

export const gorselIndirSchema = z.object({
  gorsel_url: z.string().url('Geçerli bir URL giriniz')
});

export const gorselYukleBase64Schema = z.object({
  base64_data: z.string().min(10, 'Görsel verisi boş olamaz'),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp']).default('image/jpeg')
});

export const durumGuncelleSchema = z.object({
  aktif: z.union([z.boolean(), z.number().int().min(0).max(1)])
});

export const topluStokGuncelleSchema = z.union([
  z.object({
    urun_ids: z.array(z.coerce.number().int().positive()).optional(),
    urun_idler: z.array(z.coerce.number().int().positive()).optional(),
    yeni_stok: z.coerce.number().int().min(0, 'Stok negatif olamaz'),
    aciklama: z.string().optional(),
    islem_turu: z.string().optional()
  }).refine(data => (data.urun_ids && data.urun_ids.length > 0) || (data.urun_idler && data.urun_idler.length > 0), {
    message: 'En az bir ürün seçmelisiniz'
  }),
  z.object({
    guncellemeler: z.array(z.object({
      urun_id: z.coerce.number().int().positive('Geçersiz ürün ID'),
      yeni_stok: z.coerce.number().int().min(0, 'Stok negatif olamaz'),
      aciklama: z.string().optional()
    })).min(1, 'En az bir ürün güncellemesi gereklidir')
  })
]);

export const personelHesapOlusturSchema = z.object({
  birim_id: z.union([z.coerce.number().int().positive(), z.literal('tumu')]).optional().nullable(),
  personelIds: z.array(z.coerce.number().int().positive()).optional(),
  personel_ids: z.array(z.coerce.number().int().positive()).optional(),
  personel_idler: z.array(z.coerce.number().int().positive()).optional(),
  sadece_hesapsizlar: z.boolean().optional(),
  tum_personel: z.boolean().optional(),
  ust_yonetim_haric: z.boolean().optional()
});
