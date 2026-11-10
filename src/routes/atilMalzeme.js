import { Router } from 'express';
import atilMalzemeController from '../controllers/atilMalzemeController.js';
import { authMiddleware } from '../middleware/auth.js';
import { rolKontrol } from '../middleware/rol.js';

const router = Router();

router.use(authMiddleware);

// Personel / Birim ihtiyaç fazlası malzeme bildirir
router.post('/', atilMalzemeController.bildir);

// Satın alma yetkilisi bekleyenleri ve tümünü listeler, detay görür, teslim alır
router.get('/', rolKontrol(['satin_alma']), atilMalzemeController.getBekleyenler);
router.get('/tum-bildirimler', rolKontrol(['satin_alma']), atilMalzemeController.getTumBildirimler);
router.get('/:id', rolKontrol(['satin_alma']), atilMalzemeController.getById);
router.post('/:id/teslim-al', rolKontrol(['satin_alma']), atilMalzemeController.teslimAl);

export default router;
