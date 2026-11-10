import { Router } from 'express';
import sepetController from '../controllers/sepetController.js';
import { authMiddleware } from '../middleware/auth.js';
import { rolKontrol, istekSahibiZorunlu } from '../middleware/rol.js';
import { validate } from '../middleware/validate.js';
import { sepetEkleSchema, sepetGuncelleSchema } from '../validators/sepetValidators.js';

const router = Router();

router.use(authMiddleware);
router.use(rolKontrol(['birim']));
router.use(istekSahibiZorunlu);

router.get('/', sepetController.getSepet);
router.post('/ekle', validate(sepetEkleSchema), sepetController.addItem);
router.put('/guncelle', validate(sepetGuncelleSchema), sepetController.updateItem);
router.delete('/kalem/:urunId', sepetController.removeItem);
router.delete('/temizle', sepetController.clearCart);

export default router;
