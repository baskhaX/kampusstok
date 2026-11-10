import { Router } from 'express';
import authController from '../controllers/authController.js';
import { authMiddleware } from '../middleware/auth.js';
import { loginRateLimit } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import {
  loginSchema,
  sifreDegistirSchema,
  personelSecSchema,
  personelEkleSchema,
  sifremiUnuttumSchema
} from '../validators/authValidators.js';

const router = Router();

router.get('/dev-login', authController.devLogin);
router.post('/login', loginRateLimit(), validate(loginSchema), authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.post('/sifremi-unuttum', loginRateLimit(), validate(sifremiUnuttumSchema), authController.sifremiUnuttum);
router.post('/sifre-sifirla-token', loginRateLimit(), authController.sifreSifirlaToken);
router.get('/me', authMiddleware, authController.me);
router.post('/sifre-degistir', authMiddleware, validate(sifreDegistirSchema), authController.sifreDegistir);

// Birim istek sahibi yönetimi
router.get('/personeller', authMiddleware, authController.getBirimPersoneller);
router.post('/personel-sec', authMiddleware, validate(personelSecSchema), authController.selectPersonel);
router.post('/personel-ekle', authMiddleware, validate(personelEkleSchema), authController.addPersonel);

export default router;
