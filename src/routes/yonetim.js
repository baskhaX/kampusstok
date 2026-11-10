import { Router } from 'express';
import yonetimController from '../controllers/yonetimController.js';
import { authMiddleware } from '../middleware/auth.js';
import { rolKontrol } from '../middleware/rol.js';
import { validate } from '../middleware/validate.js';
import {
  urunEkleGuncelleSchema,
  stokHareketiSchema,
  kategoriEkleGuncelleSchema,
  birimEkleGuncelleSchema,
  birimSifreSifirlaSchema,
  personelEkleSchema,
  personelGuncelleSchema,
  gorselIndirSchema,
  gorselYukleBase64Schema,
  durumGuncelleSchema,
  topluStokGuncelleSchema,
  personelHesapOlusturSchema
} from '../validators/yonetimValidators.js';

const router = Router();

router.use(authMiddleware);
router.use(rolKontrol(['satin_alma']));

// Ürünler
router.get('/urunler', yonetimController.getUrunler);
router.get('/urunler/barkod/:barkod', yonetimController.getUrunByBarkod);
router.post('/urunler', validate(urunEkleGuncelleSchema), yonetimController.addUrun);
router.put('/urunler/:id', validate(urunEkleGuncelleSchema), yonetimController.updateUrun);
router.patch('/urunler/:id/durum', validate(durumGuncelleSchema), yonetimController.updateUrunDurum);

// Stok Hareketleri
router.get('/stok/hareketler', yonetimController.getStokHareketleri);
router.post('/stok/hareket', validate(stokHareketiSchema), yonetimController.stokIslemi);
router.post('/stok/toplu-guncelle', validate(topluStokGuncelleSchema), yonetimController.topluStokGuncelle);

// Kategoriler
router.get('/kategoriler', yonetimController.getKategoriler);
router.post('/kategoriler', validate(kategoriEkleGuncelleSchema), yonetimController.addKategori);
router.put('/kategoriler/:id', validate(kategoriEkleGuncelleSchema), yonetimController.updateKategori);
router.delete('/kategoriler/:id', yonetimController.deleteKategori);

// Birimler
router.get('/birimler', yonetimController.getBirimler);
router.post('/birimler', validate(birimEkleGuncelleSchema), yonetimController.addBirim);
router.put('/birimler/:id', validate(birimEkleGuncelleSchema), yonetimController.updateBirim);
router.patch('/birimler/:id/durum', validate(durumGuncelleSchema), yonetimController.updateBirimDurum);
router.delete('/birimler/:id', yonetimController.deleteBirim);
router.post('/birimler/sifre-sifirla', validate(birimSifreSifirlaSchema), yonetimController.sifirlaBirimSifre);

// Personel & Rehber Yönetimi (Görev 4)
router.get('/personel/ornek-sablon', yonetimController.indirPersonelSablonu);
router.post('/personel/excel-aktar', yonetimController.aktarPersonelExcel);
router.get('/personel', yonetimController.getPersoneller);
router.post('/personel', validate(personelEkleSchema), yonetimController.addPersonel);
router.put('/personel/:id', validate(personelGuncelleSchema), yonetimController.updatePersonel);
router.delete('/personel/:id', yonetimController.deletePersonel);
router.post('/personel/:id/sifre-sifirla', yonetimController.sifirlaPersonelSifre);
router.post('/personel/hesap-olustur', validate(personelHesapOlusturSchema), yonetimController.olusturPersonelHesaplari);

// Kurumsal Hiyerarşi & Ağaç (Görsel-3 Stili - Görev 6)
router.get('/hiyerarsi', yonetimController.getHiyerarsi);

// Denetim Logları
router.get('/denetim-loglari', yonetimController.getDenetimLoglari);

// Görev Devri & Saatli İzin Motoru
router.get('/gorev-devri/aktif', yonetimController.getAktifGorevDevri);
router.get('/gorev-devri/gecmis', yonetimController.getGorevDevriGecmisi);
router.post('/gorev-devri', yonetimController.kaydetGorevDevri);
router.post('/gorev-devri/sonlandir', yonetimController.sonlandirGorevDevri);

// Görsel Arama & Yükleme
router.get('/gorsel/ara', yonetimController.araGorsel);
router.post('/gorsel/indir', validate(gorselIndirSchema), yonetimController.indirGorselUrl);
router.post('/gorsel/yukle', validate(gorselYukleBase64Schema), yonetimController.yukleGorselBase64);

// Sistem & Veritabanı Yedekleri (Faz 7.6)
router.get('/yedekler', yonetimController.getYedekler);
router.post('/yedekler/al', yonetimController.alYedek);
router.post('/yedekler/geri-yukle', yonetimController.geriYukleYedek);
router.get('/yedekler/indir/:dosya', yonetimController.indirYedek);
router.delete('/yedekler/:dosya', yonetimController.silYedek);

export default router;
