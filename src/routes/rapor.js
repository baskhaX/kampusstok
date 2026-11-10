import { Router } from 'express';
import raporController from '../controllers/raporController.js';
import { authMiddleware } from '../middleware/auth.js';
import { rolKontrol } from '../middleware/rol.js';
import { validate } from '../middleware/validate.js';
import { raporFiltreSchema } from '../validators/raporValidators.js';

const router = Router();

router.use(authMiddleware);

// Teslim Fişi (Birim kendi onaylı talebini, Satın Alma tüm talepleri yazdırabilir)
router.get('/teslim-fisi/:talepId', raporController.getTeslimFisi);

// Yeşil Kampüs Liderlik Ligi (Tüm kullanıcılar görebilir)
router.get('/yesil-kampus', raporController.getYesilKampus);

// Satın Alma Özel Raporları
router.get('/excel', rolKontrol(['satin_alma']), validate(raporFiltreSchema, 'query'), raporController.exportTaleplerExcel);
router.get('/haftalik-toplama', rolKontrol(['satin_alma']), raporController.getHaftalikToplama);
router.get('/toplu-teslim-fisleri', rolKontrol(['satin_alma']), raporController.getTopluTeslimFisleri);
router.get('/yonetici-bulteni', rolKontrol(['satin_alma']), raporController.getYoneticiBulteni);
router.get('/detayli-analiz', rolKontrol(['satin_alma']), raporController.getDetayliAnaliz);

export default router;
