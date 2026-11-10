import kategoriRepository from '../repositories/kategoriRepository.js';
import urunRepository from '../repositories/urunRepository.js';
import { matchesTurkish } from '../utils/text.js';

export const katalogController = {
  async getKategoriler(req, res, next) {
    try {
      const allKategoriler = kategoriRepository.findActive();

      // Ağaç yapısına dönüştür (Ana kategoriler ve altları)
      const anaKategoriler = allKategoriler.filter(k => !k.ust_kategori_id);
      const sonuc = anaKategoriler.map(ana => ({
        ...ana,
        altKategoriler: allKategoriler.filter(alt => alt.ust_kategori_id === ana.id)
      }));

      res.json({ basarili: true, kategoriler: sonuc });
    } catch (err) {
      next(err);
    }
  },

  async getUrunler(req, res, next) {
    try {
      const { kategori_id, arama } = req.query;
      let urunler = urunRepository.findActive();

      if (kategori_id) {
        const katId = parseInt(kategori_id, 10);
        const katFiltered = urunler.filter(u => u.kategori_id === katId || u.ust_kategori_id === katId);

        if (arama && arama.trim()) {
          const query = arama.trim();
          const katVeArama = katFiltered.filter(u =>
            matchesTurkish(u.ad, query) ||
            matchesTurkish(u.marka, query) ||
            matchesTurkish(u.kategori_adi, query) ||
            (u.barkod && u.barkod.includes(query))
          );

          // Seçili kategoride eşleşme varsa onu sun, yoksa kullanıcıyı yanıtsız bırakmayıp tüm katalogda ara
          if (katVeArama.length > 0) {
            urunler = katVeArama;
          } else {
            urunler = urunler.filter(u =>
              matchesTurkish(u.ad, query) ||
              matchesTurkish(u.marka, query) ||
              matchesTurkish(u.kategori_adi, query) ||
              (u.barkod && u.barkod.includes(query))
            );
          }
        } else {
          urunler = katFiltered;
        }
      } else if (arama && arama.trim()) {
        const query = arama.trim();
        urunler = urunler.filter(u =>
          matchesTurkish(u.ad, query) ||
          matchesTurkish(u.marka, query) ||
          matchesTurkish(u.kategori_adi, query) ||
          (u.barkod && u.barkod.includes(query))
        );
      }

      const isBirim = req.user?.rol === 'birim';

      // Birim ekranında kesin stok sayısı gizlenir, rozet durumu sunulur
      const filtrelenmisUrunler = urunler.map(u => {
        let stokDurumu = 'tukendi';
        if (u.stok > u.kritik_stok) {
          stokDurumu = 'stokta';
        } else if (u.stok > 0) {
          stokDurumu = 'sinirli';
        }

        return {
          id: u.id,
          kategoriId: u.kategori_id,
          ustKategoriId: u.ust_kategori_id || null,
          kategoriAdi: u.kategori_adi,
          ad: u.ad,
          marka: u.marka,
          olcuBirimi: u.olcu_birimi,
          gorselYolu: u.gorsel_yolu,
          demirbas: u.demirbas ? 1 : 0,
          stokDurumu,
          ...(isBirim ? {} : { stok: u.stok, kritikStok: u.kritik_stok })
        };
      });

      res.json({ basarili: true, urunler: filtrelenmisUrunler });
    } catch (err) {
      next(err);
    }
  },

  async getUrunDetay(req, res, next) {
    try {
      const { id } = req.params;
      const urun = urunRepository.findById(id);
      if (!urun || !urun.aktif) {
        return res.status(404).json({ basarili: false, mesaj: 'Ürün bulunamadı.' });
      }

      const isBirim = req.user?.rol === 'birim';
      let stokDurumu = 'tukendi';
      if (urun.stok > urun.kritik_stok) {
        stokDurumu = 'stokta';
      } else if (urun.stok > 0) {
        stokDurumu = 'sinirli';
      }

      res.json({
        basarili: true,
        urun: {
          id: urun.id,
          kategoriId: urun.kategori_id,
          kategoriAdi: urun.kategori_adi,
          ad: urun.ad,
          marka: urun.marka,
          olcuBirimi: urun.olcu_birimi,
          gorselYolu: urun.gorsel_yolu,
          stokDurumu,
          ...(isBirim ? {} : { stok: urun.stok, kritikStok: urun.kritik_stok })
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

export default katalogController;
