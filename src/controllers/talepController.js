import talepService from '../services/talepService.js';
import talepRepository from '../repositories/talepRepository.js';
import denetimService from '../services/denetimService.js';
import { formatTurkishDate, formatTurkishDateTime } from '../utils/date.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { escapeHtml } from '../utils/text.js';
import { getKurumLogoDataUri } from '../utils/assets.js';
import { verifyHmacSignature } from '../utils/crypto.js';

function checkHmacOrAuth(talep, req) {
  // 1. Yetkili oturum kontrolü (Satın Alma veya ilgili Birim kullanıcısı)
  if (req.user) {
    if (req.user.rol === 'satin_alma') return true;
    if (req.user.rol === 'birim' && req.user.birimId === talep.birim_id) return true;
  }
  // 2. HMAC QR token doğrulaması (?k=token veya ?sig=token)
  const token = req.query.k || req.query.sig || req.body?.k || req.body?.sig || req.headers['x-hmac-token'];
  if (token && verifyHmacSignature(talep.talep_no, token)) {
    return true;
  }
  return false;
}

export const talepController = {
  async olustur(req, res, next) {
    try {
      const { birimId, seciliPersonelId, hesapId } = req.user;
      const { notlar, nudgeUygulandi } = req.body;

      const yeniTalep = await talepService.olusturTalep({
        birimId,
        personelId: seciliPersonelId,
        notlar,
        hesapId,
        nudgeUygulandi: Boolean(nudgeUygulandi)
      });

      res.status(201).json({
        basarili: true,
        mesaj: `Talebiniz başarıyla oluşturuldu ve Satın Alma Müdürlüğü'ne iletildi.`,
        talep: yeniTalep
      });
    } catch (err) {
      next(err);
    }
  },

  async getTaleplerim(req, res, next) {
    try {
      const { birimId, seciliPersonelId } = req.user;
      const { durum } = req.query;

      // Kişi bazlı talep görünürlüğü: Her personel yalnızca kendi adına açılan talepleri görür
      const effectivePersonelId = req.user.rol === 'birim' && seciliPersonelId
        ? seciliPersonelId
        : (req.query.personel_id ? parseInt(req.query.personel_id, 10) : null);

      const talepler = talepRepository.findFiltered({
        birimId,
        durum: durum || null,
        personelId: effectivePersonelId,
        limit: 100,
        offset: 0
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

      // Güvenlik: Birim personeli yalnızca kendi adına açılan talebi görebilir
      if (req.user.rol === 'birim') {
        if (talep.birim_id !== req.user.birimId) {
          throw new NotFoundError('Talep bulunamadı veya biriminize ait değil.');
        }
        if (req.user.seciliPersonelId && talep.personel_id !== req.user.seciliPersonelId) {
          throw new NotFoundError('Talep bulunamadı veya adınıza ait değil.');
        }
      }

      const kalemler = talepRepository.findKalemlerByTalepId(id);

      res.json({
        basarili: true,
        talep: {
          ...talep,
          olusturmaTarihiText: formatTurkishDateTime(talep.olusturma_tarihi),
          teslimatTarihiText: talep.teslimat_tarihi ? formatTurkishDate(talep.teslimat_tarihi) : '-',
          kalemler
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async sepeteKopyala(req, res, next) {
    try {
      const { id } = req.params;
      const { birimId, seciliPersonelId } = req.user;

      const guncelSepet = talepService.talebiSepeteKopyala(id, birimId, seciliPersonelId);

      res.json({
        basarili: true,
        mesaj: 'Önceki talebin kalemleri başarıyla sepetinize aktarıldı.',
        kalemSayisi: guncelSepet.length
      });
    } catch (err) {
      next(err);
    }
  },

  async kullaniciTeslimAl(req, res, next) {
    try {
      const { id } = req.params;
      const { not } = req.body || {};

      const guncelTalep = await talepService.kullaniciTeslimAl({
        talepId: parseInt(id, 10),
        user: req.user,
        not
      });

      res.json({
        basarili: true,
        mesaj: `${guncelTalep.talep_no} numaralı talebin malzemeleri başarıyla teslim alındı olarak onaylandı.`,
        talep: guncelTalep
      });
    } catch (err) {
      next(err);
    }
  },

  async getHizliTeslimBilgi(req, res, next) {
    try {
      const { talepNo } = req.params;
      const talep = talepRepository.findByTalepNo(talepNo);
      if (!talep) {
        throw new NotFoundError('Talep bulunamadı.');
      }
      if (!checkHmacOrAuth(talep, req)) {
        throw new ForbiddenError('Geçersiz veya yetkisiz QR kod teslimat bağlantısı (HMAC doğrulaması başarısız).');
      }
      const kalemler = talepRepository.findKalemlerByTalepId(talep.id);
      res.json({
        basarili: true,
        talep: {
          id: talep.id,
          talep_no: talep.talep_no,
          birim_adi: talep.birim_adi,
          personel_adi: talep.personel_adi,
          bina_adi: talep.bina_adi,
          oda_no: talep.oda_no,
          durum: talep.durum,
          kullanici_teslim_aldi: talep.kullanici_teslim_aldi,
          kullanici_teslim_tarihi: talep.kullanici_teslim_tarihi,
          olusturma_tarihi: talep.olusturma_tarihi,
          teslimat_tarihi: talep.teslimat_tarihi,
          teslimatTarihiText: talep.teslimat_tarihi ? formatTurkishDate(talep.teslimat_tarihi) : '-'
        },
        kalemler
      });
    } catch (err) {
      next(err);
    }
  },

  async hizliTeslimOnayla(req, res, next) {
    try {
      const { talepNo } = req.params;
      const { not } = req.body || {};
      const db = (await import('../db/connection.js')).default();

      const talep = talepRepository.findByTalepNo(talepNo, db);
      if (!talep) {
        throw new NotFoundError('Talep bulunamadı.');
      }

      if (!checkHmacOrAuth(talep, req)) {
        throw new ForbiddenError('Geçersiz veya yetkisiz QR kod teslimat bağlantısı (HMAC doğrulaması başarısız).');
      }

      if (talep.kullanici_teslim_aldi === 1) {
        return res.json({
          basarili: true,
          zatenOnayli: true,
          mesaj: `${talep.talep_no} teslimatı daha önce zaten onaylanmıştı.`,
          talep
        });
      }

      const simdi = new Date().toISOString();
      const teslimNotu = not ? `QR Kod: ${not}` : 'QR Kod ile Mobil Teslim Onayı Verildi';

      db.prepare(`
        UPDATE talepler 
        SET durum = 'teslim_edildi',
            kullanici_teslim_aldi = 1,
            kullanici_teslim_tarihi = ?,
            kullanici_teslim_notu = ?
        WHERE id = ?
      `).run(simdi, teslimNotu, talep.id);

      await denetimService.logla({
        hesap_id: req.user?.hesapId || null,
        islem_turu: 'HIZLI_TESLIM_QR',
        detay: `${talep.talep_no} teslimatı QR kod ile mobil üzerinden teyit edildi.`,
        ip_adresi: req.ip
      });

      res.json({
        basarili: true,
        mesaj: `${talep.talep_no} numaralı teslimat başarıyla tamamlandı.`,
        talep_no: talep.talep_no
      });
    } catch (err) {
      next(err);
    }
  },

  async renderHizliTeslimSayfasi(req, res, next) {
    try {
      const { talepNo } = req.params;
      const talep = talepRepository.findByTalepNo(talepNo);
      if (!talep) {
        return res.status(404).send(`
          <!DOCTYPE html>
          <html lang="tr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Talep Bulunamadı • KampüsStok</title>
            <style>
              body { font-family: system-ui, sans-serif; background: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; color: #0f172a; margin: 0; }
              .box { background: #fff; padding: 32px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 400px; width: 100%; }
              .icon { font-size: 40px; margin-bottom: 12px; }
              h2 { font-size: 18px; margin-bottom: 8px; }
              p { font-size: 14px; color: #64748b; margin-bottom: 20px; }
              a { display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="box">
              <div class="icon">!</div>
              <h2>Talep Bulunamadı</h2>
              <p>Belirtilen <strong>${escapeHtml(talepNo)}</strong> numaralı talep kaydına ulaşılamadı.</p>
              <a href="/">Portala Dön</a>
            </div>
          </body>
          </html>
        `);
      }

      if (!checkHmacOrAuth(talep, req)) {
        return res.status(403).send(`
          <!DOCTYPE html>
          <html lang="tr">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Yetkisiz Erişim • KampüsStok</title>
            <style>
              body { font-family: system-ui, sans-serif; background: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; color: #0f172a; margin: 0; }
              .box { background: #fff; padding: 32px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 440px; width: 100%; border: 1.5px solid #fecaca; }
              .icon { font-size: 40px; margin-bottom: 12px; }
              h2 { font-size: 18px; margin-bottom: 8px; color: #dc2626; }
              p { font-size: 13.5px; color: #64748b; margin-bottom: 20px; line-height: 1.5; }
              a { display: inline-block; padding: 10px 20px; background: #0f172a; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 13px; }
            </style>
          </head>
          <body>
            <div class="box">
              <div class="icon">#</div>
              <h2>Yetkisiz Teslimat Doğrulama Erişimi</h2>
              <p>Bu teslimatı onaylayabilmek için resmi basılı teslim fişi üzerindeki geçerli QR kodun taranması veya sisteme yetkili giriş yapılması gerekmektedir.</p>
              <a href="/#/giris">Portal Giriş Ekranına Git</a>
            </div>
          </body>
          </html>
        `);
      }

      const kalemler = talepRepository.findKalemlerByTalepId(talep.id) || [];
      const justApproved = req.query.onay === '1';
      const isDelivered = talep.kullanici_teslim_aldi === 1 || justApproved;
      const teslimatTarihiText = talep.teslimat_tarihi ? formatTurkishDate(talep.teslimat_tarihi) : '-';
      const adresText = [talep.bina_adi, talep.oda_no ? 'Oda ' + talep.oda_no : ''].filter(Boolean).join(' • ');
      const logoDataUri = getKurumLogoDataUri();

      const kalemlerHtml = kalemler.map((k, idx) => `
        <div class="item-row">
          <div>
            <div class="item-name">${escapeHtml(k.urun_adi)}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              ${escapeHtml(k.olcu_birimi)}
              ${k.demirbas ? '<span style="background: #ede9fe; color: #6d28d9; padding: 1px 6px; border-radius: 4px; font-size: 10px; margin-left: 4px; font-weight: 700;">Dayanıklı</span>' : ''}
            </div>
          </div>
          <div class="item-qty">
            ${k.onaylanan_adet !== null ? k.onaylanan_adet : k.istenen_adet} ${escapeHtml(k.olcu_birimi)}
          </div>
        </div>
      `).join('');

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(`
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Malzeme Teslim Onayı • ${escapeHtml(talep.talep_no)}</title>
  <link rel="icon" type="image/png" href="${logoDataUri}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif; -webkit-font-smoothing: antialiased; }
    body { background: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; color: #0f172a; }
    .card { background: #ffffff; max-width: 480px; width: 100%; border-radius: 20px; box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08); border: 1.5px solid rgba(226, 232, 240, 0.9); overflow: hidden; }
    .card-header { padding: 24px 24px 16px; text-align: center; border-bottom: 1px solid #f1f5f9; background: #ffffff; }
    .logo { height: 50px; width: auto; max-width: 100%; object-fit: contain; margin-bottom: 8px; display: inline-block; }
    .title { font-size: 19px; font-weight: 800; color: #0f172a; }
    .subtitle { font-size: 12.5px; color: #64748b; margin-top: 2px; }
    .card-body { padding: 20px 22px 24px; }
    .meta-box { background: rgba(241, 245, 249, 0.7); border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px 16px; margin-bottom: 18px; font-size: 13px; display: flex; flex-direction: column; gap: 6px; }
    .meta-row { display: flex; justify-content: space-between; align-items: center; }
    .talep-no { font-weight: 800; color: #2563eb; font-size: 15px; }
    .badge { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
    .badge-success { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
    .badge-primary { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
    .meta-text { color: #334155; }
    .section-title { font-size: 13.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px; display: flex; justify-content: space-between; }
    .item-list { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 18px; background: #ffffff; }
    .item-row { display: flex; justify-content: space-between; align-items: center; padding: 11px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .item-row:last-child { border-bottom: none; }
    .item-row:nth-child(even) { background: #f8fafc; }
    .item-name { font-weight: 700; color: #0f172a; }
    .item-qty { font-weight: 800; color: #1e3a8a; font-size: 13.5px; text-align: right; }
    .input-label { font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px; }
    .input-field { width: 100%; padding: 11px 13px; border-radius: 10px; border: 1px solid #cbd5e1; font-size: 13px; outline: none; margin-bottom: 16px; }
    .input-field:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15); }
    .btn-submit { width: 100%; padding: 14px; font-size: 15px; font-weight: 800; color: #ffffff; background: linear-gradient(180deg, #059669 0%, #047857 100%); border: none; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35); transition: all 0.15s; }
    .btn-submit:active { transform: scale(0.98); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
    .success-box { background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 14px; padding: 20px; text-align: center; }
    .footer-link { text-align: center; margin-top: 18px; font-size: 12.5px; }
    .footer-link a { color: #2563eb; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-header">
      <img src="${logoDataUri}" alt="KampüsStok" class="logo">
      <h1 class="title">Malzeme Teslim Onayı</h1>
      <p class="subtitle">KampüsStok Satın Alma Müdürlüğü</p>
    </div>

    <div class="card-body">
      <div class="meta-box">
        <div class="meta-row">
          <span class="talep-no">${escapeHtml(talep.talep_no)}</span>
          <span class="badge ${isDelivered ? 'badge-success' : 'badge-primary'}">
            ${isDelivered ? '✓ Teslim Edildi' : escapeHtml(talep.durum)}
          </span>
        </div>
        <div class="meta-text"><strong>Birim:</strong> ${escapeHtml(talep.birim_adi)}</div>
        <div class="meta-text"><strong>İstek Sahibi:</strong> ${escapeHtml(talep.personel_adi)}</div>
        ${adresText ? `<div class="meta-text"><strong>Teslimat Yeri:</strong> ${escapeHtml(adresText)}</div>` : ''}
        <div class="meta-text"><strong>Planlanan Tarih:</strong> ${escapeHtml(teslimatTarihiText)}</div>
      </div>

      <div class="section-title">
        <span>Teslim Edilecek Malzemeler</span>
        <span style="color: #64748b; font-weight: 600;">${kalemler.length} Kalem</span>
      </div>
      <div class="item-list">
        ${kalemlerHtml}
      </div>

      <div id="actionArea">
        ${justApproved ? `
          <div class="success-box">
            
            <div style="font-weight: 800; color: #065f46; font-size: 16px;">Teslimat Başarıyla Onaylandı!</div>
            <div style="font-size: 13px; color: #047857; margin-top: 4px;">Kayıt veritabanına işlendi ve süreç tamamlandı.</div>
          </div>
        ` : (isDelivered ? `
          <div class="success-box">
            
            <div style="font-weight: 800; color: #065f46; font-size: 16px;">Teslimat Daha Önce Onaylanmıştır</div>
            <div style="font-size: 12.5px; color: #047857; margin-top: 4px;">
              Onay Tarihi: ${talep.kullanici_teslim_tarihi ? escapeHtml(talep.kullanici_teslim_tarihi.substring(0, 16)) : 'Sistemde Kayıtlı'}
            </div>
            ${talep.kullanici_teslim_notu ? `
              <div style="font-size: 12px; color: #047857; margin-top: 6px; font-style: italic;">
                "${escapeHtml(talep.kullanici_teslim_notu)}"
              </div>
            ` : ''}
          </div>
        ` : `
          <form id="teslimForm" method="POST" action="/teslim/${encodeURIComponent(talep.talep_no)}">
            <input type="hidden" name="k" value="${escapeHtml(req.query.k || req.query.sig || '')}">
            <div>
              <label class="input-label" for="teslimNotu">Teslimat Notu (İsteğe Bağlı)</label>
              <input type="text" id="teslimNotu" name="not" class="input-field" placeholder="Örn: Eksiksiz teslim aldım / Elden teslim edildi">
            </div>
            <button type="submit" id="btnTeslimOnayla" class="btn-submit">
              Malzemeleri Teslim Aldım / Ettim
            </button>
          </form>
        `)}
      </div>

      <div class="footer-link">
        <a href="/">← Ana Sayfaya Git</a>
      </div>
    </div>
  </div>

  <script>
    const form = document.getElementById('teslimForm');
    const btn = document.getElementById('btnTeslimOnayla');
    if (form && btn) {
      form.addEventListener('submit', function() {
        btn.disabled = true;
        btn.textContent = 'Onaylanıyor, lütfen bekleyin...';
      });
    }
  </script>
</body>
</html>
      `);
    } catch (err) {
      next(err);
    }
  },

  async postHizliTeslimSayfasi(req, res, next) {
    try {
      const { talepNo } = req.params;
      const not = (req.body?.not || req.body?.teslimNotu || '').trim();
      const db = (await import('../db/connection.js')).default();

      const talep = talepRepository.findByTalepNo(talepNo, db);
      if (!talep) {
        throw new NotFoundError('Talep bulunamadı.');
      }

      if (!checkHmacOrAuth(talep, req)) {
        throw new ForbiddenError('Geçersiz veya yetkisiz QR kod teslimat bağlantısı (HMAC doğrulaması başarısız).');
      }

      if (talep.kullanici_teslim_aldi !== 1) {
        const simdi = new Date().toISOString();
        const teslimNotu = not ? `QR Kod: ${not}` : 'QR Kod ile Mobil Teslim Onayı Verildi';

        db.prepare(`
          UPDATE talepler 
          SET durum = 'teslim_edildi',
              kullanici_teslim_aldi = 1,
              kullanici_teslim_tarihi = ?,
              kullanici_teslim_notu = ?
          WHERE id = ?
        `).run(simdi, teslimNotu, talep.id);

        try {
          await denetimService.logla({
            hesap_id: req.user?.hesapId || null,
            islem_turu: 'HIZLI_TESLIM_QR',
            detay: `${talep.talep_no} teslimatı QR kod ile onaylandı. Not: ${teslimNotu}`,
            ip_adresi: req.ip
          });
        } catch (e) {
          // Log hatası işlemi engellemez
        }
      }

      const acceptsJson = req.xhr || req.headers.accept?.includes('application/json');
      if (acceptsJson) {
        return res.json({
          basarili: true,
          mesaj: `${talep.talep_no} numaralı teslimat başarıyla tamamlandı.`,
          talep_no: talep.talep_no
        });
      }

      return res.redirect(`/teslim/${encodeURIComponent(talep.talep_no)}?onay=1`);
    } catch (err) {
      next(err);
    }
  }
};

export default talepController;
