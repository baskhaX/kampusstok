import getDb from '../db/connection.js';
import talepRepository from '../repositories/talepRepository.js';
import sepetRepository from '../repositories/sepetRepository.js';
import urunRepository from '../repositories/urunRepository.js';
import personelRepository from '../repositories/personelRepository.js';
import birimRepository from '../repositories/birimRepository.js';
import islemKayitRepository from '../repositories/islemKayitRepository.js';
import yesilKampusRepository from '../repositories/yesilKampusRepository.js';
import gorevDevriRepository from '../repositories/gorevDevriRepository.js';
import stokService from './stokService.js';
import teslimatTarihiService from './teslimatTarihiService.js';
import mailService from './mailService.js';
import bildirimService from './bildirimService.js';
import config from '../config/index.js';
import { talepOlusturulduTemplate } from '../templates/mail/talepOlusturuldu.js';
import { talepOnaylandiTemplate } from '../templates/mail/talepOnaylandi.js';
import { talepReddedildiTemplate } from '../templates/mail/talepReddedildi.js';
import denetimService from './denetimService.js';
import { ValidationError, NotFoundError, ConflictError, ForbiddenError } from '../utils/errors.js';
import { toUtcIsoString } from '../utils/date.js';

export const talepService = {
  /**
   * Sepetteki ürünlerle yeni bir talep oluşturur
   */
  async olusturTalep({ birimId, personelId, notlar = null, hesapId = null, nudgeUygulandi = false }) {
    const db = getDb();

    const personel = personelRepository.findById(personelId, db);
    if (!personel || personel.birim_id !== birimId) {
      throw new ValidationError('Seçili istek sahibi personeli bulunamadı.');
    }

    const sepetKalemleri = sepetRepository.findByBirimAndPersonel(birimId, personelId, db);
    if (!sepetKalemleri || sepetKalemleri.length === 0) {
      throw new ValidationError('Sepetiniz boş. Talep göndermek için en az bir ürün eklemelisiniz.');
    }

    const birim = birimRepository.findById(birimId, db);

    let talepId;
    let talepNo;
    const talepKalemleriToSave = [];

    // Veritabanı transaction'ı
    const transaction = db.transaction(() => {
      talepNo = talepRepository.generateNextTalepNo(db);

      talepId = talepRepository.create({
        talep_no: talepNo,
        birim_id: birimId,
        personel_id: personelId,
        personel_adi: personel.ad_soyad,
        personel_eposta: personel.eposta,
        notlar: notlar ? notlar.trim() : null
      }, db);

      for (const item of sepetKalemleri) {
        talepKalemleriToSave.push({
          talep_id: talepId,
          urun_id: item.urun_id,
          urun_adi: item.urun_adi,
          olcu_birimi: item.olcu_birimi,
          istenen_adet: item.adet
        });
      }

      talepRepository.createKalemler(talepKalemleriToSave, db);

      // Sepeti temizle
      sepetRepository.clear(birimId, personelId, db);

      // Yeşil Kampüs Nudge Puanı (Öneri dikkate alındıysa veya tasarruflu talepse +10 Puan)
      if (nudgeUygulandi) {
        yesilKampusRepository.puanEkle(birimId, 'nudge_puani', 10, null, db);
      }

      // İşlem kaydı
      islemKayitRepository.create({
        hesap_id: hesapId,
        islem: 'talep_olustur',
        nesne_tur: 'talep',
        nesne_id: talepId,
        yeni_deger: { talep_no: talepNo, kalem_sayisi: talepKalemleriToSave.length }
      }, db);
    });

    transaction();

    // Satın Alma'ya SSE bildirimi gönder
    bildirimService.gonder({
      hedef_rol: 'satin_alma',
      hedef_birim_id: null,
      tur: 'yeni_talep',
      baslik: `Yeni Talep: ${talepNo}`,
      mesaj: `${birim.ad} biriminden ${personel.ad_soyad} tarafından ${talepKalemleriToSave.length} kalem malzeme talep edildi.`,
      talep_id: talepId,
      extraData: {
        talepNo,
        birimAdi: birim.ad,
        personelAdi: personel.ad_soyad,
        kalemSayisi: talepKalemleriToSave.length
      }
    });

    // Satın Alma'ya e-posta bilgilendirmesi gönder
    const mailGovde = talepOlusturulduTemplate({
      talepNo,
      birimAdi: birim.ad,
      personelAdi: personel.ad_soyad,
      personelEposta: personel.eposta,
      notlar,
      kalemler: talepKalemleriToSave,
      panelUrl: `http://localhost:${config.port}/#/satinalma?talep=${talepNo}`
    });

    mailService.kuyrugaEkle({
      talepId,
      alici: config.smtp.satinalmaEmail,
      konu: `Yeni Kırtasiye Talebi: ${talepNo} (${birim.ad})`,
      govde: mailGovde
    }).catch(() => {});

    return talepRepository.findById(talepId, db);
  },

  /**
   * Satın Alma yetkilisinin talebi onaylama, revize etme veya reddetme işlemi
   */
  async sonuclandirTalep({ talepId, karar, kalemKararlari = [], gerekce = null, sonuclandiranHesapId, vekilPersonelId = null, vekilAdi = null }) {
    const db = getDb();
    const talep = talepRepository.findById(talepId, db);

    if (!talep) {
      throw new NotFoundError(`Talep bulunamadı: #${talepId}`);
    }

    if (talep.durum !== 'beklemede') {
      throw new ConflictError(`Bu talep zaten "${talep.durum}" durumunda ve daha önce sonuçlandırılmıştır.`);
    }

    const mevcutKalemler = talepRepository.findKalemlerByTalepId(talepId, db);
    const simdiUtc = toUtcIsoString();
    let yeniDurum = '';
    let teslimatBilgisi = null;

    if (!vekilAdi) {
      const aktifVekalet = gorevDevriRepository.findAktif(db);
      if (aktifVekalet) {
        vekilPersonelId = vekilPersonelId || aktifVekalet.alan_personel_id;
        vekilAdi = vekilAdi || aktifVekalet.alan_ad_soyad;
      }
    }

    if (karar === 'reddet') {
      if (!gerekce || !gerekce.trim()) {
        throw new ValidationError('Talep reddedilirken ret gerekçesi belirtilmesi zorunludur.');
      }
      yeniDurum = 'reddedildi';

      const transaction = db.transaction(() => {
        talepRepository.updateSonuc({
          id: talepId,
          durum: yeniDurum,
          sonuc_gerekcesi: gerekce.trim(),
          sonuclandiran_hesap_id: sonuclandiranHesapId,
          sonuc_tarihi: simdiUtc,
          teslimat_tarihi: null
        }, db);

        // Kalemlerin onaylanan adetlerini 0 yapalım
        for (const k of mevcutKalemler) {
          talepRepository.updateKalemOnay(k.id, 0, db);
        }

        islemKayitRepository.create({
          hesap_id: sonuclandiranHesapId,
          islem: 'talep_reddet',
          nesne_tur: 'talep',
          nesne_id: talepId,
          eski_deger: { durum: 'beklemede' },
          yeni_deger: { durum: 'reddedildi', gerekce, vekil_personel_id: vekilPersonelId, vekil_adi: vekilAdi }
        }, db);
      });

      transaction();

      // İstek sahibine ret e-postası
      const mailGovde = talepReddedildiTemplate({
        talepNo: talep.talep_no,
        birimAdi: talep.birim_adi,
        personelAdi: talep.personel_adi,
        gerekce: gerekce.trim()
      });

      mailService.kuyrugaEkle({
        talepId,
        alici: talep.personel_eposta,
        konu: `Kırtasiye Talebiniz Hakkında: ${talep.talep_no}`,
        govde: mailGovde
      }).catch(() => {});

      // Birim için ret bildirimi gönder
      bildirimService.gonder({
        hedef_rol: 'birim',
        hedef_birim_id: talep.birim_id,
        tur: 'talep_ret',
        baslik: `Talep Onaylanmadı: ${talep.talep_no}`,
        mesaj: `Talebiniz onaylanmadı. Karar gerekçesi: ${gerekce.trim()}`,
        talep_id: talepId
      });

      return talepRepository.findById(talepId, db);
    }

    // Onay veya Revize Onay
    teslimatBilgisi = teslimatTarihiService.hesaplaTeslimatTarihi(new Date());

    if (karar === 'onayla') {
      yeniDurum = 'onaylandi';

      // Stok yeterliliğini önceden kontrol et
      for (const k of mevcutKalemler) {
        const urun = urunRepository.findById(k.urun_id, db);
        if (!urun || urun.stok < k.istenen_adet) {
          throw new ValidationError(
            `"${k.urun_adi}" ürünü için depoda yeterli stok yok (Mevcut: ${urun ? urun.stok : 0}, İstenen: ${k.istenen_adet}). Lütfen miktarı revize ediniz.`
          );
        }
      }

      const transaction = db.transaction(() => {
        // Stokları düş ve kalemleri güncelle
        for (const k of mevcutKalemler) {
          talepRepository.updateKalemOnay(k.id, k.istenen_adet, db);
          stokService.dus({
            urunId: k.urun_id,
            miktar: k.istenen_adet,
            talepId,
            aciklama: `Talep #${talep.talep_no} onayı`,
            yapanHesapId: sonuclandiranHesapId
          }, db);
        }

        talepRepository.updateSonuc({
          id: talepId,
          durum: yeniDurum,
          sonuc_gerekcesi: gerekce ? gerekce.trim() : null,
          sonuclandiran_hesap_id: sonuclandiranHesapId,
          sonuc_tarihi: simdiUtc,
          teslimat_tarihi: teslimatBilgisi.isoDate
        }, db);

        islemKayitRepository.create({
          hesap_id: sonuclandiranHesapId,
          islem: 'talep_onayla',
          nesne_tur: 'talep',
          nesne_id: talepId,
          eski_deger: { durum: 'beklemede' },
          yeni_deger: { durum: 'onaylandi', teslimat_tarihi: teslimatBilgisi.isoDate, vekil_personel_id: vekilPersonelId, vekil_adi: vekilAdi }
        }, db);
      });

      transaction();
    } else if (karar === 'revize_onayla') {
      yeniDurum = 'revize_onaylandi';

      if (!gerekce || !gerekce.trim()) {
        throw new ValidationError('Miktar revizyonu yapıldığında revize gerekçesi belirtilmesi zorunludur.');
      }

      const kararHaritasi = new Map();
      for (const k of kalemKararlari) {
        kararHaritasi.set(Number(k.kalem_id), Number(k.onaylanan_adet));
      }

      // Doğrulama ve stok kontrolü
      for (const k of mevcutKalemler) {
        const onayAdet = kararHaritasi.has(k.id) ? kararHaritasi.get(k.id) : k.istenen_adet;
        if (onayAdet < 0) {
          throw new ValidationError(`Onaylanan adet 0'dan küçük olamaz: ${k.urun_adi}`);
        }
        if (onayAdet > k.istenen_adet) {
          throw new ValidationError(`Onaylanan adet (${onayAdet}), istenen adeti (${k.istenen_adet}) aşamaz: ${k.urun_adi}`);
        }

        const urun = urunRepository.findById(k.urun_id, db);
        if (onayAdet > 0 && (!urun || urun.stok < onayAdet)) {
          throw new ValidationError(
            `"${k.urun_adi}" ürünü için depoda yeterli stok yok (Mevcut: ${urun ? urun.stok : 0}, Onaylanan: ${onayAdet}).`
          );
        }
      }

      const transaction = db.transaction(() => {
        for (const k of mevcutKalemler) {
          const onayAdet = kararHaritasi.has(k.id) ? kararHaritasi.get(k.id) : k.istenen_adet;
          talepRepository.updateKalemOnay(k.id, onayAdet, db);

          if (onayAdet > 0) {
            stokService.dus({
              urunId: k.urun_id,
              miktar: onayAdet,
              talepId,
              aciklama: `Talep #${talep.talep_no} revize onayı`,
              yapanHesapId: sonuclandiranHesapId
            }, db);
          }
        }

        talepRepository.updateSonuc({
          id: talepId,
          durum: yeniDurum,
          sonuc_gerekcesi: gerekce.trim(),
          sonuclandiran_hesap_id: sonuclandiranHesapId,
          sonuc_tarihi: simdiUtc,
          teslimat_tarihi: teslimatBilgisi.isoDate
        }, db);

        islemKayitRepository.create({
          hesap_id: sonuclandiranHesapId,
          islem: 'talep_revize_onayla',
          nesne_tur: 'talep',
          nesne_id: talepId,
          eski_deger: { durum: 'beklemede' },
          yeni_deger: { durum: 'revize_onaylandi', gerekce: gerekce.trim(), teslimat_tarihi: teslimatBilgisi.isoDate, vekil_personel_id: vekilPersonelId, vekil_adi: vekilAdi }
        }, db);
      });

      transaction();
    } else {
      throw new ValidationError(`Geçersiz karar türü: ${karar}`);
    }

    // İstek sahibine onay / revize onay e-postası
    const guncelKalemler = talepRepository.findKalemlerByTalepId(talepId, db);
    const mailGovde = talepOnaylandiTemplate({
      talepNo: talep.talep_no,
      birimAdi: talep.birim_adi,
      personelAdi: talep.personel_adi,
      teslimatTarihiText: teslimatBilgisi.displayDate,
      kalemler: guncelKalemler,
      revizeGerekcesi: karar === 'revize_onayla' ? gerekce.trim() : null
    });

    mailService.kuyrugaEkle({
      talepId,
      alici: talep.personel_eposta,
      konu: `Kırtasiye Talebiniz Onaylandı: ${talep.talep_no}`,
      govde: mailGovde
    }).catch(() => {});

    // Birim için bildirim oluştur
    bildirimService.gonder({
      hedef_rol: 'birim',
      hedef_birim_id: talep.birim_id,
      tur: 'talep_sonuc',
      baslik: `Talep ${yeniDurum === 'onaylandi' ? 'Onaylandı' : 'Revize Edilerek Onaylandı'}: ${talep.talep_no}`,
      mesaj: `Talebiniz sonuçlandırıldı. Teslimat tarihi: ${teslimatBilgisi.displayDate}`,
      talep_id: talepId
    });

    return talepRepository.findById(talepId, db);
  },

  /**
   * Malzemeleri teslim edildi olarak işaretle
   */
  teslimEt(talepId, yapanHesapId) {
    const db = getDb();
    const talep = talepRepository.findById(talepId, db);
    if (!talep) throw new NotFoundError('Talep bulunamadı.');

    if (talep.durum !== 'onaylandi' && talep.durum !== 'revize_onaylandi') {
      throw new ValidationError('Yalnızca onaylanmış veya revize onaylanmış talepler teslim edildi olarak işaretlenebilir.');
    }

    talepRepository.updateDurumTeslimEdildi(talepId, db);

    islemKayitRepository.create({
      hesap_id: yapanHesapId,
      islem: 'talep_teslim_et',
      nesne_tur: 'talep',
      nesne_id: talepId,
      eski_deger: { durum: talep.durum },
      yeni_deger: { durum: 'teslim_edildi' }
    }, db);

    // Birim için teslim edildi ve onay bekliyor bildirimi gönder
    bildirimService.gonder({
      hedef_rol: 'birim',
      hedef_birim_id: talep.birim_id,
      tur: 'malzeme_teslim_edildi',
      baslik: `Malzemeniz Teslim Edildi: ${talep.talep_no}`,
      mesaj: `Kırtasiye malzemeleriniz biriminize teslim edilmiştir. Lütfen panelinizden teslim onayınızı veriniz.`,
      talep_id: talepId
    });

    return talepRepository.findById(talepId, db);
  },

  /**
   * Kullanıcının panelinden malzemeleri teslim aldığını teyit etmesi
   */
  async kullaniciTeslimAl({ talepId, user, not = null }) {
    const db = getDb();
    const talep = talepRepository.findById(talepId, db);
    if (!talep) throw new NotFoundError('Talep bulunamadı.');

    // Yetki kontrolü: Kullanıcı yalnızca kendi adına açılan talebi teslim alabilir (satın alma istisna)
    if (user.rol === 'birim') {
      if (talep.birim_id !== user.birimId) {
        throw new ForbiddenError('Bu talebi teslim alma yetkiniz bulunmamaktadır.');
      }
      if (user.seciliPersonelId && talep.personel_id !== user.seciliPersonelId) {
        throw new ForbiddenError('Yalnızca kendi adınıza açılan talebin teslimatını onaylayabilirsiniz.');
      }
    }

    // Durum kontrolü: Yalnızca onaylanmış, revize onaylanmış veya teslim edilmiş talepler için teyit verilebilir
    if (talep.durum !== 'onaylandi' && talep.durum !== 'revize_onaylandi' && talep.durum !== 'teslim_edildi') {
      throw new ValidationError('Yalnızca onaylanmış veya dağıtımı yapılmış talepler için teslim alma onayı verilebilir.');
    }

    if (talep.kullanici_teslim_aldi === 1) {
      throw new ConflictError('Bu talebin teslimatı daha önce zaten onaylanmıştır.');
    }

    const transaction = db.transaction(() => {
      talepRepository.kullaniciTeslimAl({
        id: talepId,
        hesapId: user.hesapId,
        not
      }, db);

      islemKayitRepository.create({
        hesap_id: user.hesapId,
        islem: 'kullanici_teslim_al',
        nesne_tur: 'talep',
        nesne_id: talepId,
        eski_deger: { durum: talep.durum, kullanici_teslim_aldi: talep.kullanici_teslim_aldi },
        yeni_deger: { durum: 'teslim_edildi', kullanici_teslim_aldi: 1, not }
      }, db);

      // Zamanında Hızlı Teslim Onayı Yeşil Kampüs Puanı (+5 Puan)
      yesilKampusRepository.puanEkle(talep.birim_id, 'hizli_teslim_puani', 5, null, db);
    });

    transaction();

    // Satın Alma yetkilisine anlık SSE ve sistem bildirimi gönder
    bildirimService.gonder({
      hedef_rol: 'satin_alma',
      hedef_birim_id: null,
      tur: 'talep_teslim_teyit',
      baslik: `Teslimat Teyit Edildi: ${talep.talep_no}`,
      mesaj: `${talep.birim_adi} (${talep.personel_adi}) malzemeleri eksiksiz teslim aldığını onayladı.`,
      talep_id: talepId
    });

    // Denetim logu
    denetimService.log({
      kullanici_id: user.hesapId,
      kullanici_adi: user.kullaniciAdi,
      rol: user.rol,
      islem_turu: 'TESLIMAT_KULLANICI_TEYIT',
      aciklama: `Kullanıcı ${talep.talep_no} numaralı talebin malzemelerini teslim aldığını panelinden onayladı.`
    });

    return talepRepository.findById(talepId, db);
  },

  /**
   * Eski bir talebin kalemlerini mevcut sepete kopyalar
   */
  talebiSepeteKopyala(talepId, birimId, personelId) {
    const db = getDb();
    const talep = talepRepository.findById(talepId, db);
    if (!talep || talep.birim_id !== birimId) {
      throw new NotFoundError('Talep bulunamadı veya biriminize ait değil.');
    }

    const kalemler = talepRepository.findKalemlerByTalepId(talepId, db);
    if (!kalemler || kalemler.length === 0) {
      throw new ValidationError('Talepte kopyalanacak kalem bulunamadı.');
    }

    for (const k of kalemler) {
      sepetRepository.upsertItem(birimId, personelId, k.urun_id, k.istenen_adet, db);
    }

    return sepetRepository.findByBirimAndPersonel(birimId, personelId, db);
  }
};

export default talepService;
