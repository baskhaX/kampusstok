import { Router } from 'express';
import oduncEkipmanController from '../controllers/oduncEkipmanController.js';
import { authMiddleware } from '../middleware/auth.js';
import { rolKontrol } from '../middleware/rol.js';

const router = Router();

router.use(authMiddleware);

// Ortak ekipmanları ve müsaitlik durumlarını listele
router.get('/', oduncEkipmanController.getEkipmanlar);

// Tüm rezervasyonları listele (Satın Alma)
router.get('/tum-rezervasyonlar', rolKontrol(['satin_alma']), oduncEkipmanController.getTumRezervasyonlar);
router.get('/rezervasyon/:id', rolKontrol(['satin_alma']), oduncEkipmanController.getRezervasyonById);

// Birimin kendi rezervasyon geçmişi
router.get('/rezervasyonlarim', oduncEkipmanController.getBirimRezervasyonlari);

// Yeni rezervasyon oluştur
router.post('/rezerve-et', oduncEkipmanController.rezerveEt);

// Satın alma yetkilisi ekipmanı teslim eder veya iadesini alır
router.post('/:id/teslim-et', rolKontrol(['satin_alma']), oduncEkipmanController.teslimEt);
router.post('/:id/iade-al', rolKontrol(['satin_alma']), oduncEkipmanController.iadeAl);

export default router;
