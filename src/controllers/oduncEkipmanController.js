import oduncEkipmanService from '../services/oduncEkipmanService.js';

export const oduncEkipmanController = {
  async getEkipmanlar(req, res, next) {
    try {
      const ekipmanlar = oduncEkipmanService.getEkipmanlar();
      res.json({ basarili: true, ekipmanlar });
    } catch (err) {
      next(err);
    }
  },

  async getBirimRezervasyonlari(req, res, next) {
    try {
      const rezervasyonlar = oduncEkipmanService.getBirimRezervasyonlari(req.user.birimId);
      res.json({ basarili: true, rezervasyonlar });
    } catch (err) {
      next(err);
    }
  },

  async rezerveEt(req, res, next) {
    try {
      const { ekipman_id, baslangic_tarihi, bitis_tarihi, kullanim_amaci, teslim_alma_turu } = req.body;
      const birimId = req.user.birimId;
      const personelId = req.user.seciliPersonelId || req.user.hesapPersonelId || null;

      const sonuc = await oduncEkipmanService.rezerveEt({
        ekipmanId: parseInt(ekipman_id, 10),
        birimId,
        personelId,
        baslangicTarihi: baslangic_tarihi,
        bitisTarihi: bitis_tarihi,
        kullanimAmaci: kullanim_amaci,
        teslimAlmaTuru: teslim_alma_turu || 'elden',
        ipAdresi: req.ip
      });

      res.status(201).json(sonuc);
    } catch (err) {
      next(err);
    }
  },

  async getTumRezervasyonlar(req, res, next) {
    try {
      const rezervasyonlar = oduncEkipmanService.getTumRezervasyonlar();
      res.json({ basarili: true, rezervasyonlar });
    } catch (err) {
      next(err);
    }
  },

  async getRezervasyonById(req, res, next) {
    try {
      const { id } = req.params;
      const rezervasyon = oduncEkipmanService.getRezervasyonById(parseInt(id, 10));
      res.json({ basarili: true, rezervasyon });
    } catch (err) {
      next(err);
    }
  },

  async teslimEt(req, res, next) {
    try {
      const { id } = req.params;
      const sonuc = await oduncEkipmanService.teslimEt(parseInt(id, 10), req.user, req.ip);
      res.json(sonuc);
    } catch (err) {
      next(err);
    }
  },

  async iadeAl(req, res, next) {
    try {
      const { id } = req.params;
      const sonuc = await oduncEkipmanService.iadeAl(parseInt(id, 10), req.user, req.ip);
      res.json(sonuc);
    } catch (err) {
      next(err);
    }
  }
};

export default oduncEkipmanController;
