import atilMalzemeRepository from '../repositories/atilMalzemeRepository.js';
import yesilKampusRepository from '../repositories/yesilKampusRepository.js';
import birimRepository from '../repositories/birimRepository.js';
import bildirimService from './bildirimService.js';
import denetimService from './denetimService.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

export const atilMalzemeService = {
  /**
   * Personel/Birim ihtiyaç fazlası malzeme bildirir (10 saniyelik pratik giriş)
   */
  async bildir({ birimId, personelId, binaAdi, odaNo, detayNotu, aciklama, ipAdresi = null }) {
    const cleanNot = (detayNotu || aciklama || '').trim();
    if (!binaAdi || !odaNo || !cleanNot) {
      throw new ValidationError('Lütfen bina, oda no ve malzeme detay bilgilerini eksiksiz giriniz.');
    }

    const id = atilMalzemeRepository.create({
      birim_id: birimId,
      personel_id: personelId,
      bina_adi: binaAdi.trim(),
      oda_no: odaNo.trim(),
      detay_notu: cleanNot
    });

    const birim = birimRepository.findById(birimId);

    // Satın Alma çanına bildirim gönder
    try {
      bildirimService.gonder({
        hedef_rol: 'satin_alma',
        hedef_birim_id: null,
        tur: 'atil_malzeme',
        baslik: `Atıl Malzeme İadesi: ${birim?.ad || 'Birim'}`,
        mesaj: `${binaAdi} - Oda ${odaNo} konumundan atıl malzeme bildirildi: "${cleanNot.substring(0, 70)}${cleanNot.length > 70 ? '...' : ''}"`,
        extraData: { atil_id: id, birim_id: birimId, bina_adi: binaAdi, oda_no: odaNo }
      });
    } catch (e) {}

    return {
      id,
      durum: 'beklemede',
      basarili: true,
      mesaj: 'İhtiyaç fazlası malzeme bildirimi başarıyla alındı. Çarşamba dağıtımında odanızdan teslim alınacaktır.'
    };
  },

  /**
   * Satın alma yetkilisi malzemeyi depoya teslim alır ve birime +20 puan kazandırır
   */
  async teslimAl(id, user, ipAdresi = null) {
    const kayit = atilMalzemeRepository.findById(id);
    if (!kayit) {
      throw new NotFoundError('Atıl malzeme bildirimi bulunamadı.');
    }

    if (kayit.durum !== 'beklemede') {
      throw new ValidationError('Bu bildirim zaten teslim alınmış veya kapatılmıştır.');
    }

    const userObj = typeof user === 'object' && user !== null
      ? user
      : { hesapId: Number(user) || 1, kullaniciAdi: 'satinalma', rol: 'satin_alma' };

    atilMalzemeRepository.teslimAl(id, userObj.hesapId);

    // Birime anında +20 Yeşil Kampüs Puanı ekle
    yesilKampusRepository.puanEkle(kayit.birim_id, 'iade_puani', 20);

    // Birim kullanıcısına çandan tebrik bildirimi yolla
    try {
      bildirimService.gonder({
        hedef_rol: 'birim',
        hedef_birim_id: kayit.birim_id,
        tur: 'atil_malzeme',
        baslik: 'Malzeme Depoya Kazandırıldı (+20 Yeşil Puan!)',
        mesaj: `Bildirdiğiniz ihtiyaç fazlası malzemeler teslim alındı ve kuruma geri kazandırıldı. Biriminize +20 Yeşil Puan eklendi!`,
        extraData: { atil_id: id, kazanilan_puan: 20 }
      });
    } catch (e) {}

    // Denetim logu
    denetimService.log({
      kullanici_id: userObj.hesapId,
      kullanici_adi: userObj.kullaniciAdi,
      rol: userObj.rol,
      islem_turu: 'ATIL_MALZEME_TESLIM_ALINDI',
      aciklama: `${kayit.birim_adi} (Oda ${kayit.oda_no}) atıl malzemeleri depoya kazandırıldı. Birime +20 Yeşil Puan tanımlandı.`,
      detay: { atil_id: id, birim_id: kayit.birim_id, detay_notu: kayit.detay_notu },
      ip_adresi: ipAdresi
    });

    return {
      id,
      durum: 'depoya_alindi',
      basarili: true,
      mesaj: 'Malzemeler depoya başarıyla kazandırıldı ve birime +20 Yeşil Puan eklendi.'
    };
  },

  async depoyaTeslimAl(id, user, ipAdresi = null) {
    return this.teslimAl(id, user, ipAdresi);
  },

  /**
   * Bekleyen atıl malzeme bildirimlerini getirir
   */
  getBekleyenler() {
    return atilMalzemeRepository.findBekleyenler();
  },

  getById(id) {
    const item = atilMalzemeRepository.findById(id);
    if (!item) throw new NotFoundError('Atıl malzeme bildirimi bulunamadı.');
    return item;
  },

  getTumBildirimler() {
    return atilMalzemeRepository.findTumBildirimler();
  }
};

export default atilMalzemeService;
