import { z } from 'zod';

export const talepOlusturSchema = z.object({
  notlar: z.string().max(500, 'Not en fazla 500 karakter olabilir').optional().nullable()
});

export const talepSonuclandirSchema = z.object({
  karar: z.enum(['onayla', 'revize_onayla', 'reddet'], {
    errorMap: () => ({ message: 'Geçersiz karar türü (onayla, revize_onayla, reddet)' })
  }),
  gerekce: z.string().max(1000).optional().nullable(),
  kalem_kararlari: z.array(z.object({
    kalem_id: z.number().int().positive(),
    onaylanan_adet: z.number().int().min(0)
  })).optional().default([])
});

export const topluTeslimSchema = z.object({
  talepIds: z.array(z.coerce.number().int().positive('Geçersiz talep ID')).min(1, 'En az bir talep seçilmelidir')
});

export const kullaniciTeslimAlSchema = z.object({
  not: z.string().trim().max(500, 'Not en fazla 500 karakter olabilir').optional().nullable()
});
