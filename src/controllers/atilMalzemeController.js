import atilMalzemeService from '../services/atilMalzemeService.js';

export const atilMalzemeController = {
  async bildir(req, res, next) {
    try {
      const { bina_adi, oda_no, detay_notu } = req.body;
      const birimId = req.user.birimId;
      const personelId = req.user.seciliPersonelId || req.user.hesapPersonelId || null;

      const sonuc = await atilMalzemeService.bildir({
        birimId,
        personelId,
        binaAdi: bina_adi,
        odaNo: oda_no,
        detayNotu: detay_notu,
        ipAdresi: req.ip
      });

      res.status(201).json(sonuc);
    } catch (err) {
      next(err);
    }
  },

  async getBekleyenler(req, res, next) {
    try {
      const liste = atilMalzemeService.getBekleyenler();
      res.json({ basarili: true, bildirimler: liste });
    } catch (err) {
      next(err);
    }
  },

  async getTumBildirimler(req, res, next) {
    try {
      const liste = atilMalzemeService.getTumBildirimler();
      res.json({ basarili: true, bildirimler: liste });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const kayit = atilMalzemeService.getById(parseInt(id, 10));
      res.json({ basarili: true, bildirim: kayit });
    } catch (err) {
      next(err);
    }
  },

  async teslimAl(req, res, next) {
    try {
      const { id } = req.params;
      const sonuc = await atilMalzemeService.teslimAl(parseInt(id, 10), req.user, req.ip);
      res.json(sonuc);
    } catch (err) {
      next(err);
    }
  }
};

export default atilMalzemeController;
