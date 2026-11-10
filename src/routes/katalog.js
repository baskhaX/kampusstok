import { Router } from 'express';
import katalogController from '../controllers/katalogController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/kategoriler', katalogController.getKategoriler);
router.get('/urunler', katalogController.getUrunler);
router.get('/urunler/:id', katalogController.getUrunDetay);

export default router;
