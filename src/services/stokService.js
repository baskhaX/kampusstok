import getDb from '../db/connection.js';
import urunRepository from '../repositories/urunRepository.js';
import stokHareketRepository from '../repositories/stokHareketRepository.js';
import islemKayitRepository from '../repositories/islemKayitRepository.js';
import bildirimService from './bildirimService.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

export const stokService = {
  /**
   * Depodan stok düşer (Transaction içinde çağrılabilir)
   */
  dus({ urunId, miktar, talepId = null, aciklama = null, yapanHesapId = null }, customDb = null) {
    const db = customDb || getDb();
    if (miktar <= 0) return true;

    const urun = urunRepository.findById(urunId, db);
    if (!urun) {
      throw new NotFoundError(`Ürün bulunamadı: ID #${urunId}`);
    }

    if (urun.stok < miktar) {
      throw new ValidationError(`Yetersiz stok! "${urun.ad}" için mevcut stok: ${urun.stok}, düşülmek istenen: ${miktar}`);
    }

    const success = urunRepository.decrementStok(urunId, miktar, db);
    if (!success) {
      throw new ValidationError(`"${urun.ad}" ürünü için stok düşürme işlemi başarısız oldu (yetersiz stok veya eşzamanlı işlem).`);
    }

    stokHareketRepository.create({
      urun_id: urunId,
      tur: 'cikis',
      miktar,
      talep_id: talepId,
      aciklama: aciklama || (talepId ? `Talep onayından stok düşüşü` : 'Depo çıkışı'),
      yapan_hesap_id: yapanHesapId
    }, db);

    const yeniStok = urun.stok - miktar;
    islemKayitRepository.create({
      hesap_id: yapanHesapId,
      islem: 'stok_dus',
      nesne_tur: 'urun',
      nesne_id: urunId,
      eski_deger: { stok: urun.stok },
      yeni_deger: { stok: yeniStok, dusulen: miktar, talep_id: talepId }
    }, db);

    // Kritik stok kontrolü ve bildirim tetikleme
    if (yeniStok <= (urun.kritik_stok || 5)) {
      try {
        bildirimService.gonder({
          hedef_rol: 'satin_alma',
          hedef_birim_id: null,
          tur: 'kritik_stok',
          baslik: `Kritik Stok Uyarısı: ${urun.ad}`,
          mesaj: `"${urun.ad}" kritik stok seviyesine (${urun.kritik_stok || 5}) indi veya altına düştü. Kalan stok: ${yeniStok} ${urun.olcu_birimi || 'adet'}.`,
          extraData: { urun_id: urunId, kalan_stok: yeniStok, kritik_stok: urun.kritik_stok }
        });
      } catch (err) {
        // Bildirim hatası stok transaction'ını bozmasın
      }
    }

    return true;
  },

  /**
   * Depoya stok girişi ekler
   */
  giris({ urunId, miktar, aciklama = null, yapanHesapId = null }, customDb = null) {
    const db = customDb || getDb();
    if (miktar <= 0) {
      throw new ValidationError('Giriş miktarı 0\'dan büyük olmalıdır.');
    }

    const urun = urunRepository.findById(urunId, db);
    if (!urun) {
      throw new NotFoundError(`Ürün bulunamadı: ID #${urunId}`);
    }

    const process = () => {
      urunRepository.incrementStok(urunId, miktar, db);

      stokHareketRepository.create({
        urun_id: urunId,
        tur: 'giris',
        miktar,
        talep_id: null,
        aciklama: aciklama || 'Depo stok girişi',
        yapan_hesap_id: yapanHesapId
      }, db);

      islemKayitRepository.create({
        hesap_id: yapanHesapId,
        islem: 'stok_giris',
        nesne_tur: 'urun',
        nesne_id: urunId,
        eski_deger: { stok: urun.stok },
        yeni_deger: { stok: urun.stok + miktar, eklenen: miktar }
      }, db);

      return urunRepository.findById(urunId, db);
    };

    if (customDb) {
      return process();
    }
    return db.transaction(process)();
  },

  /**
   * Stok miktarını düzeltir (sayım farkı vb.)
   */
  duzelt({ urunId, yeniStok, aciklama = null, yapanHesapId = null }, customDb = null) {
    const db = customDb || getDb();
    if (yeniStok < 0) {
      throw new ValidationError('Stok miktarı negatif olamaz.');
    }

    const urun = urunRepository.findById(urunId, db);
    if (!urun) {
      throw new NotFoundError(`Ürün bulunamadı: ID #${urunId}`);
    }

    const fark = yeniStok - urun.stok;
    if (fark === 0) return urun;

    const process = () => {
      urunRepository.updateStok(urunId, yeniStok, db);

      stokHareketRepository.create({
        urun_id: urunId,
        tur: 'duzeltme',
        miktar: Math.abs(fark),
        talep_id: null,
        aciklama: aciklama || `Stok düzeltmesi (${fark > 0 ? '+' : ''}${fark})`,
        yapan_hesap_id: yapanHesapId
      }, db);

      islemKayitRepository.create({
        hesap_id: yapanHesapId,
        islem: 'stok_duzeltme',
        nesne_tur: 'urun',
        nesne_id: urunId,
        eski_deger: { stok: urun.stok },
        yeni_deger: { stok: yeniStok, fark }
      }, db);

      return urunRepository.findById(urunId, db);
    };

    if (customDb) {
      return process();
    }
    return db.transaction(process)();
  }
};

export default stokService;
