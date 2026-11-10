import { z } from 'zod';

export const raporFiltreSchema = z.object({
  birimId: z.preprocess((val) => (!val || val === '' ? undefined : val), z.coerce.number().int().positive().optional()),
  durum: z.preprocess((val) => (!val || val === '' ? undefined : val), z.enum(['beklemede', 'onaylandi', 'revize_onaylandi', 'reddedildi', 'teslim_edildi']).optional()),
  baslangic: z.preprocess((val) => (!val || val === '' ? undefined : val), z.string().optional()),
  bitis: z.preprocess((val) => (!val || val === '' ? undefined : val), z.string().optional())
});
