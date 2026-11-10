import { z } from 'zod';

export const sepetEkleSchema = z.object({
  urun_id: z.number().int().positive('Geçersiz ürün ID'),
  adet: z.number().int().min(1, 'Talep adedi en az 1 olmalıdır')
});

export const sepetGuncelleSchema = z.object({
  urun_id: z.number().int().positive('Geçersiz ürün ID'),
  adet: z.number().int().min(0, 'Adet negatif olamaz')
});
