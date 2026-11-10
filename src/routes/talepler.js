import { Router } from 'express';
import talepController from '../controllers/talepController.js';
import { authMiddleware } from '../middleware/auth.js';
import { rolKontrol, istekSahibiZorunlu } from '../middleware/rol.js';
import { validate } from '../middleware/validate.js';
import { talepOlusturSchema, kullaniciTeslimAlSchema } from '../validators/talepValidators.js';

const router = Router();

// QR Kod ile Hızlı Teslim (Mobil Tarayıcı - Doğrudan Erişim)
router.get('/hizli-teslim-bilgi/:talepNo', talepController.getHizliTeslimBilgi);
router.post('/hizli-teslim/:talepNo', talepController.hizliTeslimOnayla);

router.use(authMiddleware);

// Talepleri listeleme ve detay görme
router.get('/', rolKontrol(['birim']), talepController.getTaleplerim);
router.get('/:id', talepController.getTalepDetay);

// Talep oluşturma ve sepete kopyalama istek sahibi seçilmiş olmayı gerektirir
router.post('/', rolKontrol(['birim']), istekSahibiZorunlu, validate(talepOlusturSchema), talepController.olustur);
router.post('/:id/kopyala', rolKontrol(['birim']), istekSahibiZorunlu, talepController.sepeteKopyala);
router.post('/:id/teslim-al', rolKontrol(['birim', 'satin_alma']), validate(kullaniciTeslimAlSchema), talepController.kullaniciTeslimAl);

export default router;
