import sepetRepository from '../repositories/sepetRepository.js';
import urunRepository from '../repositories/urunRepository.js';
import { NotFoundError } from '../utils/errors.js';

export const sepetController = {
  async getSepet(req, res, next) {
    try {
      const { birimId, seciliPersonelId } = req.user;
      const kalemler = sepetRepository.findByBirimAndPersonel(birimId, seciliPersonelId);

      const isBirim = req.user.rol === 'birim';
      const guvenliKalemler = kalemler.map(k => {
        let stokDurumu = 'tukendi';
        if (k.mevcut_stok > k.kritik_stok) stokDurumu = 'stokta';
        else if (k.mevcut_stok > 0) stokDurumu = 'sinirli';

        return {
          id: k.id,
          urunId: k.urun_id,
          urunAdi: k.urun_adi,
          urunMarka: k.urun_marka,
          olcuBirimi: k.olcu_birimi,
          adet: k.adet,
          gorselYolu: k.gorsel_yolu,
          stokDurumu,
          ...(isBirim ? {} : { mevcutStok: k.mevcut_stok })
        };
      });

      res.json({
        basarili: true,
        sepet: {
          kalemler: guvenliKalemler,
          toplamKalem: guvenliKalemler.length,
          toplamAdet: guvenliKalemler.reduce((acc, curr) => acc + curr.adet, 0)
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async addItem(req, res, next) {
    try {
      const { birimId, seciliPersonelId } = req.user;
      const { urun_id, adet } = req.body;

      const urun = urunRepository.findById(urun_id);
      if (!urun || !urun.aktif) {
        throw new NotFoundError('Talep edilmek istenen ürün bulunamadı veya pasif durumda.');
      }

      sepetRepository.upsertItem(birimId, seciliPersonelId, urun_id, adet);
      const sepet = sepetRepository.findByBirimAndPersonel(birimId, seciliPersonelId);

      res.json({
        basarili: true,
        mesaj: `"${urun.ad}" sepete eklendi.`,
        toplamKalem: sepet.length
      });
    } catch (err) {
      next(err);
    }
  },

  async updateItem(req, res, next) {
    try {
      const { birimId, seciliPersonelId } = req.user;
      const { urun_id, adet } = req.body;

      sepetRepository.updateQuantity(birimId, seciliPersonelId, urun_id, adet);
      res.json({ basarili: true, mesaj: 'Sepet miktarı güncellendi.' });
    } catch (err) {
      next(err);
    }
  },

  async removeItem(req, res, next) {
    try {
      const { birimId, seciliPersonelId } = req.user;
      const urunId = parseInt(req.params.urunId, 10);

      sepetRepository.removeItem(birimId, seciliPersonelId, urunId);
      res.json({ basarili: true, mesaj: 'Ürün sepetten çıkarıldı.' });
    } catch (err) {
      next(err);
    }
  },

  async clearCart(req, res, next) {
    try {
      const { birimId, seciliPersonelId } = req.user;
      sepetRepository.clear(birimId, seciliPersonelId);
      res.json({ basarili: true, mesaj: 'Sepet temizlendi.' });
    } catch (err) {
      next(err);
    }
  }
};

export default sepetController;
