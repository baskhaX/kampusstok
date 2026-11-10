import { z } from 'zod';

export const loginSchema = z.object({
  kullanici_adi: z.string().min(1, 'Kullanıcı adı boş bırakılamaz').trim(),
  sifre: z.string().min(1, 'Şifre boş bırakılamaz'),
  beni_hatirla: z.boolean().optional()
});

export const sifremiUnuttumSchema = z.object({
  eposta: z.string().min(3, 'Geçerli bir kurumsal e-posta adresi veya kullanıcı adı giriniz').trim()
});

export const sifreDegistirSchema = z.object({
  mevcut_sifre: z.string().min(1, 'Mevcut şifre zorunludur'),
  yeni_sifre: z.string().min(6, 'Yeni şifre en az 6 karakter olmalıdır'),
  yeni_sifre_tekrar: z.string().min(6, 'Yeni şifre tekrarı zorunludur'),
  bina_adi: z.string().optional(),
  oda_no: z.string().optional(),
  telefon: z.string().optional()
}).refine(data => data.yeni_sifre === data.yeni_sifre_tekrar, {
  message: 'Yeni şifreler birbiriyle uyuşmuyor',
  path: ['yeni_sifre_tekrar']
});

export const personelSecSchema = z.object({
  personel_id: z.number().int().positive('Geçerli bir personel ID belirtilmelidir'),
  eposta: z.string().email('Geçerli bir kurumsal e-posta adresi giriniz').trim().toLowerCase()
});

export const personelEkleSchema = z.object({
  ad_soyad: z.string().min(3, 'Ad Soyad en az 3 karakter olmalıdır').trim(),
  eposta: z.string().email('Geçerli bir kurumsal e-posta adresi giriniz').trim().toLowerCase()
});
