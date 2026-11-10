import talepRepository from '../repositories/talepRepository.js';
import talepService from '../services/talepService.js';
import mailService from '../services/mailService.js';
import mailKuyrukRepository from '../repositories/mailKuyrukRepository.js';
import { formatTurkishDate, formatTurkishDateTime } from '../utils/date.js';
import { NotFoundError } from '../utils/errors.js';

export const satinalmaController = {
  async getGelenTalepler(req, res, next) {
    try {
      const { durum, birim_id, search, limit, offset } = req.query;

      const talepler = talepRepository.findFiltered({
        durum: durum || null,
        birimId: birim_id ? parseInt(birim_id, 10) : null,
        search: search || null,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0
      });

      const sonuc = talepler.map(t => ({
        ...t,
        olusturmaTarihiText: formatTurkishDateTime(t.olusturma_tarihi),
        teslimatTarihiText: t.teslimat_tarihi ? formatTurkishDate(t.teslimat_tarihi) : '-'
      }));

      res.json({ basarili: true, talepler: sonuc });
    } catch (err) {
      next(err);
    }
  },

  async getTalepDetay(req, res, next) {
    try {
      const { id } = req.params;
      const talep = talepRepository.findById(id);

      if (!talep) {
        throw new NotFoundError('Talep bulunamadı.');
      }

      const kalemler = talepRepository.findKalemlerByTalepId(id);

      // Karşılanabilirlik durumu ekle (tam, kismi, karsilanamaz)
      let tumuKarsilanabilir = true;
      const analizliKalemler = kalemler.map(k => {
        let durum = 'karsilanabilir';
        if (k.mevcut_stok <= 0) {
          durum = 'karsilanamaz';
          tumuKarsilanabilir = false;
        } else if (k.mevcut_stok < k.istenen_adet) {
          durum = 'kismi';
          tumuKarsilanabilir = false;
        }

        return {
          ...k,
          karsilamaDurumu: durum
        };
      });

      const mailler = mailKuyrukRepository.findByTalepId(id);

      // Demirbaş / Dayanıklı Malzeme İsraf ve Zimmet Kontrolü (Son 6 ay)
      const db = (await import('../db/connection.js')).default();
      const demirbasUyarilari = [];
      for (const k of analizliKalemler) {
        if (k.demirbas) {
          const gecmis = db.prepare(`
            SELECT t.talep_no, t.teslimat_tarihi, t.olusturma_tarihi, t.personel_adi, tk.onaylanan_adet, tk.istenen_adet
            FROM talep_kalemleri tk
            JOIN talepler t ON tk.talep_id = t.id
            WHERE t.birim_id = ? 
              AND tk.urun_id = ? 
              AND t.id != ? 
              AND t.durum IN ('teslim_edildi', 'onaylandi', 'revize_onaylandi')
              AND t.olusturma_tarihi >= datetime('now', '-180 days')
            ORDER BY t.id DESC
            LIMIT 3
          `).all(talep.birim_id, k.urun_id, id);

          if (gecmis.length > 0) {
            const sonGecmis = gecmis[0];
            demirbasUyarilari.push({
              urunId: k.urun_id,
              urunAdi: k.urun_adi,
              oncekiTalepNo: sonGecmis.talep_no,
              istekSahibi: sonGecmis.personel_adi,
              teslimTarihiText: sonGecmis.teslimat_tarihi ? formatTurkishDate(sonGecmis.teslimat_tarihi) : formatTurkishDate(sonGecmis.olusturma_tarihi),
              adet: sonGecmis.onaylanan_adet || sonGecmis.istenen_adet || 1
            });
          }
        }
      }

      // Tüketim Anomalisi ve Sızıntı / Arıza Erken Uyarı Radarı (Son 6 ay tüketim ortalaması)
      const tuketimAnomalileri = [];
      for (const k of analizliKalemler) {
        const tuketimGecmisi = db.prepare(`
          SELECT COALESCE(SUM(COALESCE(tk.onaylanan_adet, tk.istenen_adet)), 0) as toplam_adet
          FROM talep_kalemleri tk
          JOIN talepler t ON tk.talep_id = t.id
          WHERE t.birim_id = ?
            AND tk.urun_id = ?
            AND t.id != ?
            AND t.durum IN ('teslim_edildi', 'onaylandi', 'revize_onaylandi')
            AND t.olusturma_tarihi >= datetime('now', '-180 days')
        `).get(talep.birim_id, k.urun_id, id);

        const toplamGecmis = tuketimGecmisi ? Number(tuketimGecmisi.toplam_adet) : 0;
        const ortalamaAylik = Math.max(1, Math.round(toplamGecmis / 6));

        if (k.istenen_adet >= Math.max(4, Math.round(ortalamaAylik * 2.5))) {
          const katSapma = Math.round((k.istenen_adet / ortalamaAylik) * 10) / 10;
          const adLower = (k.urun_adi || '').toLowerCase();
          let oneriTuru = 'gerekce';
          let oneriMetni = 'Aşırı tüketim gerekçesi sorulması önerilir.';
          let oneriAksiyonu = `Tüketiminiz son 6 aylık ortalamanızın (${ortalamaAylik} adet) ${katSapma} katı görünmektedir. Özel bir proje veya arıza durumu mu var?`;

          if (adLower.includes('pil') || adLower.includes('battery')) {
            oneriTuru = 'sarjli_pil';
            oneriMetni = 'Tek kullanımlık pil yerine Şarj Edilebilir Pil + Şarj Cihazı verilerek 2 yıllık maliyet sıfırlanabilir.';
            oneriAksiyonu = 'Tek kullanımlık pil yerine Şarj Edilebilir Pil + Şarj Cihazı seti verilmesi önerildi.';
          } else if (adLower.includes('kağıt') || adLower.includes('kagit') || adLower.includes('fotokopi')) {
            oneriTuru = 'yazici_bakim';
            oneriMetni = 'Yazıcı kağıt sıkıştırma arızası şüphesi! Bilgi İşlem / Teknik Servis arıza kontrolü önerilir.';
            oneriAksiyonu = 'Kağıt tüketimi normalin çok üzerinde. Bilgi İşlem teknik servisine yazıcı mekanik kontrol kaydı yönlendirildi.';
          }

          tuketimAnomalileri.push({
            kalemId: k.id,
            urunId: k.urun_id,
            urunAdi: k.urun_adi,
            istenenAdet: k.istenen_adet,
            ortalamaAylik,
            katSapma,
            oneriTuru,
            oneriMetni,
            oneriAksiyonu
          });
        }
      }

      res.json({
        basarili: true,
        talep: {
          ...talep,
          olusturmaTarihiText: formatTurkishDateTime(talep.olusturma_tarihi),
          teslimatTarihiText: talep.teslimat_tarihi ? formatTurkishDate(talep.teslimat_tarihi) : '-',
          tumuKarsilanabilir,
          demirbasUyarilari,
          tuketimAnomalileri,
          kalemler: analizliKalemler,
          mailler
        },
        kalemler: analizliKalemler
      });
    } catch (err) {
      next(err);
    }
  },

  async sonuclandir(req, res, next) {
    try {
      const { id } = req.params;
      const { karar, kalem_kararlari, gerekce, vekil_personel_id, vekil_adi } = req.body;

      const sonucTalep = await talepService.sonuclandirTalep({
        talepId: parseInt(id, 10),
        karar,
        kalemKararlari: kalem_kararlari || [],
        gerekce,
        sonuclandiranHesapId: req.user.hesapId,
        vekilPersonelId: vekil_personel_id || null,
        vekilAdi: vekil_adi || null
      });

      res.json({
        basarili: true,
        mesaj: `Talep başarıyla ${karar === 'reddet' ? 'reddedildi' : 'onaylandı'}.`,
        talep: sonucTalep
      });
    } catch (err) {
      next(err);
    }
  },

  async teslimEt(req, res, next) {
    try {
      const { id } = req.params;
      const sonucTalep = talepService.teslimEt(parseInt(id, 10), req.user.hesapId);

      res.json({
        basarili: true,
        mesaj: 'Malzemeler teslim edildi olarak işaretlendi.',
        talep: sonucTalep
      });
    } catch (err) {
      next(err);
    }
  },

  async topluTeslimEt(req, res, next) {
    try {
      const { talep_idleri } = req.body || {};
      let count = 0;
      if (Array.isArray(talep_idleri) && talep_idleri.length > 0) {
        for (const id of talep_idleri) {
          try {
            talepService.teslimEt(parseInt(id, 10), req.user.hesapId);
            count++;
          } catch (e) {
            // atla
          }
        }
      } else {
        const onaylilar = talepRepository.findFiltered({ durum: 'onaylandi', limit: 500 });
        const revizeliler = talepRepository.findFiltered({ durum: 'revize_onaylandi', limit: 500 });
        const hepsi = [...onaylilar, ...revizeliler];
        for (const t of hepsi) {
          try {
            talepService.teslimEt(t.id, req.user.hesapId);
            count++;
          } catch (e) {
            // atla
          }
        }
      }

      res.json({
        basarili: true,
        teslimEdilenSayi: count,
        mesaj: count > 0 
          ? `${count} adet talep başarıyla teslim edildi olarak güncellendi.` 
          : 'Teslim edilecek onaylı talep bulunamadı.'
      });
    } catch (err) {
      next(err);
    }
  },

  async yenidenGonderMail(req, res, next) {
    try {
      const { kuyrukId } = req.params;
      await mailService.yenidenGonder(parseInt(kuyrukId, 10));
      res.json({ basarili: true, mesaj: 'E-posta tekrar gönderildi.' });
    } catch (err) {
      next(err);
    }
  },

  async getKritikStok(req, res, next) {
    try {
      const db = (await import('../db/connection.js')).default();
      const urunler = db.prepare(`
        SELECT u.id, u.ad, u.marka, u.stok, u.kritik_stok, u.olcu_birimi, k.ad as kategori_adi,
               COALESCE((
                 SELECT SUM(tk.istenen_adet)
                 FROM talep_kalemleri tk
                 JOIN talepler t ON tk.talep_id = t.id
                 WHERE tk.urun_id = u.id AND t.durum = 'beklemede'
               ), 0) as bekleyen_talep_adedi
        FROM urunler u
        LEFT JOIN kategoriler k ON u.kategori_id = k.id
        WHERE u.aktif = 1 AND (u.stok <= u.kritik_stok OR (
          SELECT COALESCE(SUM(tk.istenen_adet), 0) FROM talep_kalemleri tk JOIN talepler t ON tk.talep_id = t.id WHERE tk.urun_id = u.id AND t.durum = 'beklemede'
        ) > u.stok)
        ORDER BY u.stok ASC
      `).all();

      const liste = urunler.map(u => ({
        ...u,
        oneriSiparisMiktari: Math.max(10, (u.kritik_stok * 3) - u.stok + u.bekleyen_talep_adedi)
      }));

      res.json({ basarili: true, urunler: liste });
    } catch (err) {
      next(err);
    }
  },

  async getOzet(req, res, next) {
    try {
      const db = (await import('../db/connection.js')).default();
      const talepOzeti = db.prepare(`
        SELECT 
          COUNT(CASE WHEN durum = 'beklemede' THEN 1 END) as beklemede,
          COUNT(CASE WHEN durum IN ('onaylandi', 'revize_onaylandi') THEN 1 END) as onayli,
          COUNT(CASE WHEN durum = 'teslim_edildi' THEN 1 END) as teslimEdildi,
          COUNT(CASE WHEN durum = 'reddedildi' THEN 1 END) as reddedildi,
          COUNT(*) as toplamTalep
        FROM talepler
      `).get();

      const kritikStokRow = db.prepare(`
        SELECT COUNT(*) as kritikStok FROM urunler WHERE aktif = 1 AND stok <= kritik_stok
      `).get();

      let bekleyenAtil = 0;
      try {
        const atilRow = db.prepare(`SELECT COUNT(*) as bekleyen FROM atil_malzeme_bildirimleri WHERE durum = 'beklemede'`).get();
        bekleyenAtil = atilRow?.bekleyen || 0;
      } catch {}

      let aktifRezervasyon = 0;
      try {
        const rezRow = db.prepare(`SELECT COUNT(*) as aktif FROM ekipman_rezervasyonlari WHERE durum = 'onaylandi'`).get();
        aktifRezervasyon = rezRow?.aktif || 0;
      } catch {}

      res.json({
        basarili: true,
        ozet: {
          ...talepOzeti,
          kritikStok: kritikStokRow?.kritikStok || 0,
          bekleyenAtil,
          aktifRezervasyon
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

export default satinalmaController;
