import { Router } from 'express';
import satinalmaController from '../controllers/satinalmaController.js';
import { authMiddleware } from '../middleware/auth.js';
import { rolKontrol } from '../middleware/rol.js';
import { validate } from '../middleware/validate.js';
import { talepSonuclandirSchema, topluTeslimSchema } from '../validators/talepValidators.js';

const router = Router();

router.use(authMiddleware);
router.use(rolKontrol(['satin_alma']));

router.get('/talepler', satinalmaController.getGelenTalepler);
router.get('/ozet', satinalmaController.getOzet);
router.get('/kritik-stok', satinalmaController.getKritikStok);
router.post('/talepler/toplu-teslim-et', validate(topluTeslimSchema), satinalmaController.topluTeslimEt);
router.get('/talepler/:id', satinalmaController.getTalepDetay);
router.post('/talepler/:id/sonuclandir', validate(talepSonuclandirSchema), satinalmaController.sonuclandir);
router.post('/talepler/:id/teslim-et', satinalmaController.teslimEt);
router.post('/mail/:kuyrukId/tekrar-gonder', satinalmaController.yenidenGonderMail);

export default router;
