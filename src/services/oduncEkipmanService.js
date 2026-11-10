import oduncEkipmanRepository from '../repositories/oduncEkipmanRepository.js';
import yesilKampusRepository from '../repositories/yesilKampusRepository.js';
import birimRepository from '../repositories/birimRepository.js';
import bildirimService from './bildirimService.js';
import denetimService from './denetimService.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';

export const oduncEkipmanService = {
  getEkipmanlar() {
    return oduncEkipmanRepository.findAll();
  },

  getBirimRezervasyonlari(birimId) {
    return oduncEkipmanRepository.findRezervasyonlarByBirim(birimId);
  },

  /**
   * Ekipman rezervasyonu oluşturur (Maksimum 7 gün, çakışma kontrollü)
   */
  async rezerveEt({ ekipmanId, birimId, personelId, baslangicTarihi, bitisTarihi, kullanimAmaci, amac, teslimAlmaTuru = 'elden', ipAdresi = null }) {
    const cleanAmac = (kullanimAmaci || amac || '').trim();
    if (!baslangicTarihi || !bitisTarihi || !cleanAmac) {
      throw new ValidationError('Lütfen tarih aralığını ve kullanım amacını eksiksiz belirtiniz.');
    }

    const d1 = new Date(baslangicTarihi);
    const d2 = new Date(bitisTarihi);

    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
      throw new ValidationError('Geçersiz tarih formatı.');
    }

    if (d2 < d1) {
      throw new ValidationError('İade tarihi, başlangıç tarihinden önce olamaz.');
    }

    // Maksimum 7 gün kuralı
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Başlangıç ve bitiş dahil
    if (diffDays > 7) {
      throw new ValidationError(`Ortak ekipmanlar tek seferde en fazla 7 günlüğüne rezerve edilebilir (Seçilen: ${diffDays} gün).`);
    }

    const ekipman = oduncEkipmanRepository.findById(ekipmanId);
    if (!ekipman || !ekipman.aktif) {
      throw new NotFoundError('Rezerve edilmek istenen ekipman bulunamadı veya hizmet dışı.');
    }

    // Çakışma kontrolü
    const cakismalar = oduncEkipmanRepository.findCakisma(ekipmanId, baslangicTarihi, bitisTarihi);
    if (cakismalar.length > 0) {
      const c = cakismalar[0];
      throw new ConflictError(
        `Bu ekipman seçtiğiniz tarihlerde (${c.baslangic_tarihi} - ${c.bitis_tarihi}) başka bir birim tarafından rezerve edilmiştir ("${c.birim_adi}"). Lütfen farklı bir tarih seçiniz.`
      );
    }

    const rezId = oduncEkipmanRepository.createRezervasyon({
      ekipman_id: ekipmanId,
      birim_id: birimId,
      personel_id: personelId,
      baslangic_tarihi: baslangicTarihi,
      bitis_tarihi: bitisTarihi,
      kullanim_amaci: cleanAmac,
      teslim_alma_turu: teslimAlmaTuru
    });

    // Satın alma yerine ortak havuz ekipmanı tercih eden birime anında +10 Yeşil Paylaşım Puanı!
    yesilKampusRepository.puanEkle(birimId, 'nudge_puani', 10);

    const birim = birimRepository.findById(birimId);

    // Satın Alma çanına bildirim yolla
    try {
      bildirimService.gonder({
        hedef_rol: 'satin_alma',
        hedef_birim_id: null,
        tur: 'ekipman_odunc',
        baslik: `Ortak Ekipman Rezervasyonu: ${ekipman.ad}`,
        mesaj: `${birim?.ad || 'Birim'} (${baslangicTarihi} - ${bitisTarihi}) tarihleri için ${ekipman.ad} rezerve etti. Tercih: ${teslimAlmaTuru === 'elden' ? 'Depodan Elden Teslim' : 'Çarşamba Dağıtımı'}.`,
        extraData: { rezervasyon_id: rezId, ekipman_id: ekipmanId, birim_id: birimId }
      });
    } catch (e) {}

    return {
      id: rezId,
      rezervasyonId: rezId,
      basarili: true,
      mesaj: `${ekipman.ad} başarıyla rezerve edildi (+10 Yeşil Paylaşım Puanı kazandınız). ${teslimAlmaTuru === 'elden' ? 'Belirttiğiniz tarihte depodan elden teslim alabilirsiniz.' : 'Çarşamba rutin dağıtımıyla odanıza ulaştırılacaktır.'}`
    };
  },

  getTumRezervasyonlar() {
    return oduncEkipmanRepository.findAllRezervasyonlar();
  },

  getRezervasyonById(id) {
    const rez = oduncEkipmanRepository.findRezervasyonById(id);
    if (!rez) throw new NotFoundError('Ekipman rezervasyonu bulunamadı.');
    return rez;
  },

  async teslimEt(rezervasyonId, user, ipAdresi = null) {
    const rez = oduncEkipmanRepository.findRezervasyonById(rezervasyonId);
    if (!rez) throw new NotFoundError('Rezervasyon bulunamadı.');
    oduncEkipmanRepository.teslimEt(rezervasyonId);
    return { basarili: true, mesaj: 'Ekipman birime teslim edildi olarak işaretlendi.' };
  },

  /**
   * Ekipman depoya iade edildiğinde teslim alımı onaylanır
   */
  async iadeAl(rezervasyonId, user, ipAdresi = null) {
    const db = (await import('../db/connection.js')).default();
    const rez = db.prepare(`SELECT * FROM ekipman_rezervasyonlari WHERE id = ?`).get(rezervasyonId);
    if (!rez) throw new NotFoundError('Rezervasyon bulunamadı.');

    oduncEkipmanRepository.teslimAlindi(rezervasyonId);

    // Zamanında iade eden birime +5 Yeşil Puan
    yesilKampusRepository.puanEkle(rez.birim_id, 'hizli_teslim_puani', 5);

    // Birim çanına teşekkür bildirimi
    try {
      bildirimService.gonder({
        hedef_rol: 'birim',
        hedef_birim_id: rez.birim_id,
        tur: 'ekipman_odunc',
        baslik: 'Ekipman İadesi Onaylandı (+5 Yeşil Puan)',
        mesaj: 'Ödünç aldığınız ekipman depoya eksiksiz teslim alındı. Zamanında iade için +5 Yeşil Puan kazandınız!',
        extraData: { rezervasyon_id: rezervasyonId, kazanilan_puan: 5 }
      });
    } catch (e) {}

    return { basarili: true, mesaj: 'Ekipman iadesi onaylandı ve birime +5 Yeşil Puan eklendi.' };
  }
};

export default oduncEkipmanService;
