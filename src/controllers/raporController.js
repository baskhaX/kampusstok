import raporService from '../services/raporService.js';
import QRCode from 'qrcode';
import { formatTurkishDate, formatTurkishDateTime } from '../utils/date.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import { escapeHtml } from '../utils/text.js';
import { getQrBaseUrl } from '../utils/network.js';
import { getKurumLogoDataUri } from '../utils/assets.js';
import { generateHmacSignature } from '../utils/crypto.js';
import config from '../config/index.js';

export const raporController = {
  async exportTaleplerExcel(req, res, next) {
    try {
      const { birimId, durum, baslangic, bitis } = req.query;

      const workbook = await raporService.exportTaleplerExcel({
        birimId: birimId ? parseInt(birimId, 10) : null,
        durum,
        baslangic,
        bitis
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Kirtasiye_Talepler_${Date.now()}.xlsx"`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      next(err);
    }
  },

  async getHaftalikToplama(req, res, next) {
    try {
      let { carsambaTarihi } = req.query;
      if (!carsambaTarihi) {
        return res.status(400).json({ basarili: false, mesaj: 'carsambaTarihi parametresi zorunludur.' });
      }

      if (carsambaTarihi.includes('.')) {
        const parts = carsambaTarihi.split('.');
        if (parts.length === 3) {
          carsambaTarihi = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      const binaSirali = req.query.binaSirali !== '0';
      const sonuc = await raporService.getHaftalikToplamaListesi(carsambaTarihi, { binaSirali });

      if (req.query.print === '1' || req.query.format === 'html' || req.headers.accept?.includes('text/html')) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(renderHaftalikToplamaHtml(sonuc));
      }

      res.json({ basarili: true, ...sonuc });
    } catch (err) {
      next(err);
    }
  },

  async getTeslimFisi(req, res, next) {
    try {
      const { talepId } = req.params;
      const data = await raporService.getMalzemeTeslimFisi(talepId);
      if (!data || !data.talep) {
        throw new NotFoundError('Talep bulunamadı.');
      }

      // Yetki Kontrolü (IDOR Önlemi): Birim personeli yalnızca kendi adına açılan teslim fişini görebilir
      if (req.user && req.user.rol === 'birim') {
        if (data.talep.birim_id !== req.user.birimId) {
          throw new ForbiddenError('Bu teslim fişini görüntüleme yetkiniz bulunmamaktadır.');
        }
        if (req.user.seciliPersonelId && data.talep.personel_id !== req.user.seciliPersonelId) {
          throw new ForbiddenError('Yalnızca kendi adınıza ait teslim fişini görüntüleyebilirsiniz.');
        }
      }

      // Yalnızca format=json parametresi açıkça belirtilmişse JSON döndür
      if (req.query.format === 'json') {
        return res.json({ basarili: true, ...data });
      }

      const baseUrl = getQrBaseUrl(req);
      const hmacSig = generateHmacSignature(data.talep.talep_no);
      const qrUrl = `${baseUrl}/t/${encodeURIComponent(data.talep.talep_no)}?k=${hmacSig}`;
      let qrSvgHtml = '';
      try {
        qrSvgHtml = await QRCode.toString(qrUrl, {
          type: 'svg',
          width: 86,
          margin: 1,
          errorCorrectionLevel: 'M'
        });
      } catch (e) {}

      // Varsayılan olarak her zaman ultra okunaklı, şık ve resmi A4 teslim fişini üret
      const autoPrint = req.query.print === '1';
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(renderTeslimFisiHtml({ ...data, qrSvgHtml, autoPrint }));
    } catch (err) {
      next(err);
    }
  },

  async getTopluTeslimFisleri(req, res, next) {
    try {
      let { carsambaTarihi } = req.query;
      if (!carsambaTarihi) {
        return res.status(400).json({ basarili: false, mesaj: 'carsambaTarihi parametresi zorunludur.' });
      }

      if (carsambaTarihi.includes('.')) {
        const parts = carsambaTarihi.split('.');
        if (parts.length === 3) {
          carsambaTarihi = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }

      const binaSirali = req.query.binaSirali !== '0';
      const data = await raporService.getTopluTeslimFisleri(carsambaTarihi, { binaSirali });

      if (req.query.format === 'json') {
        return res.json({ basarili: true, ...data });
      }

      const baseUrl = getQrBaseUrl(req);
      for (const item of (data.fisler || [])) {
        const hmacSig = generateHmacSignature(item.talep.talep_no);
        const qrUrl = `${baseUrl}/t/${encodeURIComponent(item.talep.talep_no)}?k=${hmacSig}`;
        try {
          item.qrSvgHtml = await QRCode.toString(qrUrl, {
            type: 'svg',
            width: 86,
            margin: 1,
            errorCorrectionLevel: 'M'
          });
        } catch (e) {}
      }

      const autoPrint = req.query.print === '1';
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(renderTopluTeslimFisleriHtml({ ...data, autoPrint }));
    } catch (err) {
      next(err);
    }
  },

  async getYoneticiBulteni(req, res, next) {
    try {
      const { ay, yil } = req.query;
      const bulten = await raporService.getYoneticiBulteni({ ay, yil });

      if (req.query.format === 'html') {
        const autoPrint = req.query.print === '1';
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(renderYoneticiBulteniHtml({ bulten, autoPrint }));
      }

      res.json({ basarili: true, ...bulten });
    } catch (err) {
      next(err);
    }
  },

  async getDetayliAnaliz(req, res, next) {
    try {
      const { birimId, personelId, baslangic, bitis, durum, q } = req.query;
      const cleanBirimId = (birimId && birimId !== 'undefined' && birimId !== 'null') ? parseInt(birimId, 10) : null;
      const cleanPersonelId = (personelId && personelId !== 'undefined' && personelId !== 'null') ? parseInt(personelId, 10) : null;
      const cleanDurum = (durum && durum !== 'undefined' && durum !== 'null') ? durum : null;
      const cleanQ = (q && q !== 'undefined' && q !== 'null') ? q : null;
      const cleanBaslangic = (baslangic && baslangic !== 'undefined') ? baslangic : null;
      const cleanBitis = (bitis && bitis !== 'undefined') ? bitis : null;

      const sonuc = await raporService.getDetayliAnaliz({
        birimId: cleanBirimId,
        personelId: cleanPersonelId,
        baslangic: cleanBaslangic,
        bitis: cleanBitis,
        durum: cleanDurum,
        q: cleanQ
      });

      res.json({ basarili: true, ...sonuc });
    } catch (err) {
      next(err);
    }
  },

  async getYesilKampus(req, res, next) {
    try {
      const { ay } = req.query;
      const birimId = req.user?.birimId || req.query.birimId || null;

      const sonuc = await raporService.getYesilKampusSiralamasi({
        ay: ay || null,
        birimId
      });

      res.json({ basarili: true, ...sonuc });
    } catch (err) {
      next(err);
    }
  }
};

function getTeslimFisiCommonStyles() {
  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    body {
      background: radial-gradient(circle at 50% 20%, #edf2f7 0%, #dbe2ec 100%);
      color: #0f172a;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      padding: 24px 16px 48px;
    }

    /* Üst Eylem ve Kontrol Çubuğu (Yalnızca Ekranda Görünür) */
    .top-action-bar {
      max-width: 210mm;
      margin: 0 auto 20px;
      padding: 12px 20px;
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.95);
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(100, 115, 130, 0.12), 0 2px 6px rgba(100, 115, 130, 0.06);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }

    .top-action-bar .bar-title {
      font-size: 13.5px;
      font-weight: 700;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .top-action-bar .bar-sub {
      font-size: 12px;
      font-weight: 500;
      color: #64748b;
    }

    .top-action-bar .actions {
      display: flex;
      gap: 10px;
    }

    .btn-action-primary {
      background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.4);
      padding: 8px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-action-primary:hover {
      background: linear-gradient(180deg, #2563eb 0%, #1e40af 100%);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.45);
    }

    .btn-action-secondary {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-action-secondary:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    /* Resmi A4 Belge Sayfası (Konteyner) */
    .a4-sheet {
      width: 100%;
      max-width: 210mm;
      min-height: 297mm;
      margin: 0 auto 36px;
      background: #ffffff;
      padding: 16mm 20mm 18mm;
      border-radius: 8px;
      box-shadow: 0 16px 40px rgba(30, 41, 59, 0.12), 0 2px 8px rgba(30, 41, 59, 0.06);
      border: 1px solid rgba(226, 232, 240, 0.8);
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* Üst Kurumsal Başlık */
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }

    .doc-logo {
      height: 80px;
      width: auto;
      max-width: 130px;
      object-fit: contain;
    }

    .doc-titles {
      text-align: center;
      flex: 1;
      padding: 0 16px;
    }

    .doc-titles .gov-title {
      font-size: 10pt;
      font-weight: 700;
      color: #475569;
      letter-spacing: 0.8px;
      margin-bottom: 2px;
    }

    .doc-titles .uni-name {
      font-size: 14pt;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.5px;
      line-height: 1.25;
    }

    .doc-titles .dept-name {
      font-size: 10pt;
      font-weight: 600;
      color: #334155;
      margin-top: 3px;
    }

    .doc-titles .doc-badge {
      display: inline-block;
      margin-top: 8px;
      background: #0f172a;
      color: #ffffff;
      font-size: 10.5pt;
      font-weight: 800;
      letter-spacing: 1.2px;
      padding: 3px 18px;
      border-radius: 4px;
    }

    /* Üst Bilgi Kartı (Meta Grid) */
    .meta-box {
      border: 1.5px solid #94a3b8;
      border-radius: 8px;
      background-color: #f8fafc;
      padding: 12px 18px;
      margin-bottom: 20px;
      display: grid;
      grid-template-columns: 1.1fr 1fr;
      gap: 8px 24px;
      font-size: 10pt;
    }

    .meta-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
      border-bottom: 1px dashed rgba(203, 213, 225, 0.7);
    }

    .meta-item:last-child {
      border-bottom: none;
    }

    .meta-label {
      color: #475569;
      font-weight: 600;
    }

    .meta-value {
      font-weight: 700;
      color: #0f172a;
      text-align: right;
    }

    .talep-no-badge {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11pt;
      font-weight: 800;
      color: #1d4ed8;
      letter-spacing: 0.5px;
    }

    .durum-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 4px;
      color: #ffffff;
      font-size: 9pt;
      font-weight: 800;
      letter-spacing: 0.4px;
    }

    /* Not / Açıklama Kutusu */
    .note-box {
      margin-bottom: 18px;
      padding: 9px 14px;
      background: #fffbeb;
      border: 1px solid #f59e0b;
      border-radius: 6px;
      font-size: 9.5pt;
      color: #92400e;
      line-height: 1.45;
    }

    /* Tablo Düzeni */
    table.doc-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      border: 1.5px solid #64748b;
    }

    table.doc-table th {
      background-color: #e2e8f0;
      color: #0f172a;
      font-weight: 800;
      font-size: 9.5pt;
      padding: 9px 10px;
      border: 1px solid #94a3b8;
      text-align: left;
      letter-spacing: 0.3px;
    }

    table.doc-table td {
      border: 1px solid #cbd5e1;
    }

    table.doc-table tfoot td {
      background-color: #f1f5f9;
      border-top: 2px solid #64748b;
      padding: 9px 12px;
      font-weight: 700;
      font-size: 10pt;
      color: #0f172a;
    }

    /* Resmi Taahhüt ve Teslimat Notu */
    .clause-text {
      font-size: 9.5pt;
      line-height: 1.5;
      color: #334155;
      background: #f8fafc;
      border-left: 3.5px solid #2563eb;
      padding: 9px 14px;
      border-radius: 0 6px 6px 0;
      margin-bottom: 26px;
    }

    /* İmza Blokları */
    .signatures-container {
      display: flex;
      justify-content: space-between;
      gap: 32px;
      margin-top: 10px;
      page-break-inside: avoid;
    }

    .sig-box {
      flex: 1;
      border: 1.2px solid #94a3b8;
      border-radius: 8px;
      padding: 14px 16px;
      background: #ffffff;
      text-align: center;
      min-height: 135px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .sig-header {
      font-size: 11pt;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 6px;
      letter-spacing: 0.4px;
    }

    .sig-person {
      font-size: 10pt;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 2px;
    }

    .sig-sub {
      font-size: 9pt;
      color: #64748b;
    }

    .sig-line-area {
      margin-top: 36px;
      padding-top: 6px;
      border-top: 1px dashed #64748b;
      font-size: 9pt;
      color: #475569;
      display: flex;
      justify-content: space-between;
    }

    /* Alt Belge Bilgi Satırı */
    .doc-footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 12px;
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      font-size: 8.5pt;
      color: #64748b;
    }

    /* Yazdırma Modu (@media print) */
    @media print {
      @page {
        size: A4 portrait;
        margin: 12mm 15mm 15mm 15mm;
      }

      body {
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      .no-print, .top-action-bar {
        display: none !important;
      }

      .a4-sheet {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
        min-height: auto !important;
        border-radius: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
      }

      .a4-sheet:last-of-type {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }

      .signatures-container, table.doc-table, .meta-box {
        page-break-inside: avoid;
      }
    }
  `;
}

function renderTeslimFisiSheetHtml({ talep, kalemler, teslimatTarihiText, qrSvgHtml = null, index = 0, totalCount = 1, pageBreak = false }) {
  const olusturmaTarihiFormatted = talep.olusturma_tarihi
    ? formatTurkishDateTime(talep.olusturma_tarihi)
    : '-';
  const belgeTarihiFormatted = formatTurkishDateTime(new Date());

  let toplamIstenen = 0;
  let toplamOnaylanan = 0;

  const kalemSatirlari = kalemler.map((k, idx) => {
    toplamIstenen += Number(k.istenen_adet) || 0;
    const onayAdet = k.onaylanan_adet !== null ? Number(k.onaylanan_adet) : null;
    if (onayAdet !== null) toplamOnaylanan += onayAdet;

    const rowBg = idx % 2 === 1 ? '#f8fafc' : '#ffffff';

    return `
      <tr style="background-color: ${rowBg}; border-bottom: 1px solid #cbd5e1;">
        <td style="text-align: center; padding: 10px 8px; font-weight: 600; color: #475569; width: 44px; font-size: 10pt;">${idx + 1}</td>
        <td style="padding: 10px 14px; font-weight: 700; color: #0f172a; font-size: 10.5pt;">${escapeHtml(k.urun_adi)}</td>
        <td style="text-align: center; padding: 10px 10px; width: 90px; color: #334155; font-size: 10pt;">
          <span style="display: inline-block; padding: 2px 8px; background: #e2e8f0; border-radius: 4px; font-weight: 600; font-size: 9pt;">${escapeHtml(k.olcu_birimi)}</span>
        </td>
        <td style="text-align: center; padding: 10px 12px; width: 95px; font-weight: 600; color: #475569; font-size: 10.5pt;">${Number(k.istenen_adet) || 0}</td>
        <td style="text-align: center; padding: 10px 12px; width: 110px; font-weight: 800; color: #0f172a; background-color: rgba(37, 99, 235, 0.06); font-size: 11pt;">
          ${onayAdet !== null ? onayAdet : '-'}
        </td>
      </tr>
    `;
  }).join('');

  const durumEtiketi = (talep.durum || '').toUpperCase();
  const durumRenk = (durumEtiketi === 'ONAYLANDI' || durumEtiketi === 'TESLIM_EDILDI')
    ? '#059669'
    : (durumEtiketi.includes('REVIZE') ? '#d97706' : '#2563eb');

  return `
  <!-- A4 Kağıt Alanı: ${escapeHtml(talep.talep_no)} -->
  <div class="a4-sheet" id="fis-${escapeHtml(talep.talep_no)}">
    <div>
      <!-- Kurumsal Başlık -->
      <div class="doc-header">
        <img src="${getKurumLogoDataUri()}" class="doc-logo" alt="${escapeHtml(config.kurumAdi || 'Kurumsal Talep')}">
        <div class="doc-titles">
          <div class="gov-title">T.C.</div>
          <div class="uni-name">${escapeHtml(config.kurumAdi || 'Örnek Devlet Üniversitesi')}</div>
          <div class="dept-name">İdari İşler Müdürlüğü • Satın Alma Müdürlüğü</div>
          <div class="doc-badge">MALZEME TESLİM FİŞİ</div>
        </div>
        <!-- QR Kod (Mobil Hızlı Teslim) -->
        <div class="doc-qr-wrap" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 92px; min-width: 92px; text-align: center;">
          ${qrSvgHtml ? qrSvgHtml : `<img src="${getKurumLogoDataUri()}" class="doc-logo" alt="Logo" style="opacity: 0; pointer-events: none;">`}
          <div style="font-size: 7pt; font-weight: 700; color: #1e3a8a; margin-top: 3px; line-height: 1.1; white-space: nowrap;">
            Okut ve Teslim Al
          </div>
        </div>
      </div>

      <!-- Bilgi Kartı (Meta Grid) -->
      <div class="meta-box">
        <div>
          <div class="meta-item">
            <span class="meta-label">Talep Numarası:</span>
            <span class="meta-value talep-no-badge">${escapeHtml(talep.talep_no)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Talep Eden Birim:</span>
            <span class="meta-value">${escapeHtml(talep.birim_adi)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">İstek Sahibi:</span>
            <span class="meta-value">${escapeHtml(talep.personel_adi)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Kurumsal E-Posta:</span>
            <span class="meta-value">${escapeHtml(talep.personel_eposta)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Teslimat Adresi:</span>
            <span class="meta-value" style="color: #1e3a8a; font-weight: 800;">
              ${escapeHtml([talep.bina_adi, talep.oda_no ? 'Oda: ' + talep.oda_no : ''].filter(Boolean).join(' • ') || 'Bina / Oda Belirtilmedi')}
            </span>
          </div>
        </div>

        <div>
          <div class="meta-item">
            <span class="meta-label">Oluşturma Tarihi:</span>
            <span class="meta-value">${escapeHtml(olusturmaTarihiFormatted)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Planlanan Teslimat:</span>
            <span class="meta-value" style="color: #1d4ed8;">${escapeHtml(teslimatTarihiText)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Onay Durumu:</span>
            <span class="meta-value">
              <span class="durum-badge" style="background-color: ${durumRenk};">${escapeHtml(durumEtiketi)}</span>
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Onaylayan Yetkili:</span>
            <span class="meta-value">${talep.sonuclandiran_kullanici === 'satinalma' ? 'Satın Alma Müdürlüğü' : escapeHtml(talep.sonuclandiran_kullanici || 'Satın Alma')}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">İletişim (Dahili):</span>
            <span class="meta-value">${talep.personel_telefon ? 'Dahili: ' + escapeHtml(talep.personel_telefon) : '-'}</span>
          </div>
        </div>
      </div>

      ${talep.sonuc_gerekcesi ? `
        <div class="note-box">
          <strong>Yetkili Karar / Revize Açıklaması:</strong> ${escapeHtml(talep.sonuc_gerekcesi)}
        </div>
      ` : ''}

      ${talep.notlar ? `
        <div class="note-box" style="background: #eff6ff; border-color: #3b82f6; color: #1e40af;">
          <strong>Birim Talep Notu:</strong> ${escapeHtml(talep.notlar)}
        </div>
      ` : ''}

      <!-- Malzeme Listesi Tablosu -->
      <table class="doc-table">
        <thead>
          <tr>
            <th style="width: 44px; text-align: center;">Sıra</th>
            <th>Talep Edilen Malzeme / Ürün Tanımı</th>
            <th style="width: 90px; text-align: center;">Ölçü Birimi</th>
            <th style="width: 95px; text-align: center;">İstenen Miktar</th>
            <th style="width: 110px; text-align: center;">Teslim Edilen</th>
          </tr>
        </thead>
        <tbody>
          ${kalemSatirlari}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="text-align: left;">Toplam <strong>${kalemler.length} Kalem</strong> Malzeme Teslim Edilmiştir.</td>
            <td style="text-align: center;">${toplamIstenen}</td>
            <td style="text-align: center; color: #1d4ed8; font-weight: 800; font-size: 11pt;">${toplamOnaylanan}</td>
          </tr>
        </tfoot>
      </table>

      <!-- Yasal / İdari Teslim Şerhi -->
      <div class="clause-text">
        İşbu teslim fişinde kayıtlı bulunan yukarıdaki kırtasiye ve sarf malzemeleri; eksiksiz, sağlam ve üniversitemiz iç talep şartnamesine uygun olarak depodan birim yetkilisine teslim edilmiş ve teslim alınmıştır.
      </div>
    </div>

    <div>
      <!-- Çift Yetkili İmza Blokları -->
      <div class="signatures-container">
        <div class="sig-box">
          <div>
            <div class="sig-header">MALZEMELERİ TESLİM EDEN</div>
            <div class="sig-person">Satın Alma Müdürlüğü</div>
            ${talep.sonuclandiran_kullanici ? `
              <div class="sig-sub" style="font-weight: 600; color: #334155; margin-top: 3px;">
                ${escapeHtml(talep.sonuclandiran_kullanici)}
              </div>
            ` : ''}
          </div>
          <div class="sig-line-area">
            <span>Tarih: ..... / ..... / 2026</span>
            <span>İmza / Mühür</span>
          </div>
        </div>

        <div class="sig-box">
          <div>
            <div class="sig-header">MALZEMELERİ TESLİM ALAN</div>
            <div class="sig-person">${escapeHtml(talep.personel_adi)}</div>
            <div class="sig-sub">${escapeHtml(talep.birim_adi)}</div>
            ${(talep.bina_adi || talep.oda_no) ? `
              <div style="font-size: 8.5pt; color: #475569; margin-top: 3px; font-weight: 600;">
                ${escapeHtml([talep.bina_adi, talep.oda_no ? 'Oda: ' + talep.oda_no : ''].filter(Boolean).join(' • '))}
              </div>
            ` : ''}
            ${talep.kullanici_teslim_aldi === 1 ? `
              <div style="margin-top: 5px; font-size: 8pt; color: #059669; font-weight: 700; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 4px; padding: 2px 6px; display: inline-block;">
                ✓ Sistemden Teslim Alındı (${escapeHtml((talep.kullanici_teslim_tarihi || '').substring(0, 16))})
              </div>
            ` : ''}
          </div>
          <div class="sig-line-area">
            <span>Tarih: ..... / ..... / 2026</span>
            <span>İmza</span>
          </div>
        </div>
      </div>

      <!-- Alt Bilgi / Sistem Üretim Damgası -->
      <div class="doc-footer">
        <span>${escapeHtml(config.kurumAdi || 'Örnek Devlet Üniversitesi')} • ${escapeHtml(config.sistemAdi || 'KampüsStok Portalı')}</span>
        <span>${totalCount > 1 ? `Toplu Dağıtım Fişi (${index + 1} / ${totalCount}) • ` : ''}Belge Üretim: ${belgeTarihiFormatted} • Belge No: ${escapeHtml(talep.talep_no)}-TF</span>
      </div>
    </div>
  </div>
  `;
}

function renderTeslimFisiHtml({ talep, kalemler, teslimatTarihiText, qrSvgHtml = null, autoPrint = false }) {
  const commonCss = getTeslimFisiCommonStyles();
  const sheetHtml = renderTeslimFisiSheetHtml({ talep, kalemler, teslimatTarihiText, qrSvgHtml, index: 0, totalCount: 1 });

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Malzeme Teslim Fişi • ${escapeHtml(talep.talep_no)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${commonCss}
  </style>
</head>
<body>

  <!-- Ekran Eylem Çubuğu (Yazdırma sırasında gizlenir) -->
  <div class="top-action-bar no-print">
    <div>
      <div class="bar-title">
        <span>KampüsStok Üniversitesi Satın Alma & Depo Yönetimi</span>
        <span style="font-size: 11px; padding: 2px 7px; background: #e2e8f0; border-radius: 4px; color: #334155;">A4 Belge Formatı</span>
      </div>
      <div class="bar-sub">Bu belgeyi doğrudan yazdırabilir veya PDF olarak arşivleyebilirsiniz.</div>
    </div>
    <div class="actions">
      <button class="btn-action-primary" onclick="window.print()">Yazdır / PDF Olarak Kaydet</button>
      <button class="btn-action-secondary" onclick="window.close()">Pencereyi Kapat</button>
    </div>
  </div>

  ${sheetHtml}

  ${autoPrint ? `
    <script>
      window.addEventListener('load', () => {
        setTimeout(() => {
          window.print();
        }, 500);
      });
    </script>
  ` : ''}

</body>
</html>`;
}

function renderTopluTeslimFisleriHtml({ teslimatTarihiText, fisler = [], autoPrint = false }) {
  const commonCss = getTeslimFisiCommonStyles();

  if (fisler.length === 0) {
    return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Toplu Teslim Fişleri • ${escapeHtml(teslimatTarihiText)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${commonCss}
  </style>
</head>
<body>
  <div class="top-action-bar no-print">
    <div class="bar-title">KampüsStok Üniversitesi Çarşamba Teslimat Fişleri (${escapeHtml(teslimatTarihiText)})</div>
    <div class="actions">
      <button class="btn-action-secondary" onclick="window.close()">Pencereyi Kapat</button>
    </div>
  </div>
  <div class="a4-sheet" style="min-height: auto; padding: 48px; text-align: center; margin-top: 40px;">
    <div style="font-size: 16px; font-weight: 800; color: #1E3A8A; margin-bottom: 12px;">TESLİMAT</div>
    <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">Teslim Edilecek Talep Bulunamadı</h2>
    <p style="color: #64748b; font-size: 14px; max-width: 500px; margin: 0 auto 24px;">
      <strong>${escapeHtml(teslimatTarihiText)}</strong> Çarşamba teslimatına ait onaylanmış veya teslim aşamasında olan herhangi bir kırtasiye talebi bulunmamaktadır.
    </p>
    <button class="btn-action-secondary" onclick="window.close()">Pencereyi Kapat</button>
  </div>
</body>
</html>`;
  }

  const sheetsHtml = fisler.map((item, idx) => {
    return renderTeslimFisiSheetHtml({
      ...item,
      index: idx,
      totalCount: fisler.length,
      pageBreak: idx < fisler.length - 1
    });
  }).join('\n');

  // Hızlı atlama bağlantıları (Nav pills)
  const navPillsHtml = fisler.map((item, idx) => `
    <a href="#fis-${escapeHtml(item.talep.talep_no)}" style="text-decoration: none; padding: 5px 12px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 11.5px; font-weight: 700; color: #1e293b; display: inline-flex; align-items: center; gap: 5px; transition: all 0.15s; box-shadow: 0 1px 3px rgba(0,0,0,0.05);" onmouseover="this.style.borderColor='#2563eb'; this.style.color='#2563eb'" onmouseout="this.style.borderColor='#cbd5e1'; this.style.color='#1e293b'">
      <span style="color: #64748b; font-size: 10px;">#${idx + 1}</span>
      <span style="color: #2563eb;">${escapeHtml(item.talep.talep_no)}</span>
      <span style="color: #475569; font-weight: 500;">(${escapeHtml(item.talep.birim_adi)})</span>
    </a>
  `).join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Toplu Malzeme Teslim Fişleri (${fisler.length} Adet) • ${escapeHtml(teslimatTarihiText)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    ${commonCss}
  </style>
</head>
<body>

  <!-- Ekran Eylem Çubuğu (Yazdırma sırasında gizlenir) -->
  <div class="top-action-bar no-print">
    <div>
      <div class="bar-title">
        <span>KampüsStok Üniversitesi Çarşamba Dağıtımı Toplu Teslim Fişleri</span>
        <span style="font-size: 11.5px; padding: 3px 10px; background: #2563eb; color: #ffffff; border-radius: 999px; font-weight: 800;">${fisler.length} Birim / ${fisler.length} A4 Sayfa</span>
      </div>
      <div class="bar-sub"><strong>${escapeHtml(teslimatTarihiText)}</strong> tarihli tüm talepler için A4 boyutunda ayrı ayrı resmi teslim fişleri oluşturuldu. Sayfa sonları otomatik ayarlanmıştır.</div>
    </div>
    <div class="actions">
      <button class="btn-action-primary" onclick="window.print()">Tüm Fişleri Yazdır (${fisler.length} Sayfa A4)</button>
      <button class="btn-action-secondary" onclick="window.close()">Pencereyi Kapat</button>
    </div>
  </div>

  <!-- Hızlı Atlama Çubuğu -->
  <div class="top-action-bar no-print" style="margin-top: -10px; margin-bottom: 24px; padding: 10px 16px; flex-wrap: wrap; gap: 8px;">
    <span style="font-size: 11px; font-weight: 700; color: #64748b; margin-right: 4px;">Sayfaya Git:</span>
    ${navPillsHtml}
  </div>

  <!-- A4 Sayfaları Listesi -->
  ${sheetsHtml}

  ${autoPrint ? `
    <script>
      window.addEventListener('load', () => {
        setTimeout(() => {
          window.print();
        }, 600);
      });
    </script>
  ` : ''}

</body>
</html>`;
}

function renderYoneticiBulteniHtml({ bulten, autoPrint = false }) {
  const { donem, ozet, enCokTuketenBirimler = [], enCokTalepEdilenUrunler = [], demirbasDagitimlari = [] } = bulten;
  const belgeTarihi = formatTurkishDateTime(new Date());

  const birimRows = enCokTuketenBirimler.map((b, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
      <td style="padding: 8px 10px; font-weight: 700; color: #475569; text-align: center; width: 36px;">#${idx + 1}</td>
      <td style="padding: 8px 12px; font-weight: 700; color: #0f172a;">${escapeHtml(b.birim_adi)}</td>
      <td style="padding: 8px 10px; text-align: center; color: #475569;">${b.talep_sayisi} Talep</td>
      <td style="padding: 8px 12px; text-align: right; font-weight: 800; color: #1e3a8a;">${b.toplam_adet} Adet</td>
    </tr>
  `).join('') || '<tr><td colspan="4" style="text-align: center; padding: 14px; color: #64748b;">Bu dönemde kayıtlı birim sarfiyatı bulunmuyor.</td></tr>';

  const urunRows = enCokTalepEdilenUrunler.map((u, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
      <td style="padding: 8px 10px; font-weight: 700; color: #475569; text-align: center; width: 36px;">#${idx + 1}</td>
      <td style="padding: 8px 12px; font-weight: 700; color: #0f172a;">${escapeHtml(u.urun_adi)}</td>
      <td style="padding: 8px 10px; text-align: center; color: #475569;">${escapeHtml(u.olcu_birimi)}</td>
      <td style="padding: 8px 12px; text-align: right; font-weight: 800; color: #059669;">${u.toplam_adet} Adet</td>
    </tr>
  `).join('') || '<tr><td colspan="4" style="text-align: center; padding: 14px; color: #64748b;">Bu dönemde kayıtlı malzeme talebi bulunmuyor.</td></tr>';

  const demirbasRows = demirbasDagitimlari.map((d, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; background: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
      <td style="padding: 7px 10px; font-weight: 600; color: #0f172a;">${escapeHtml(d.urun_adi)}</td>
      <td style="padding: 7px 10px; color: #334155;">${escapeHtml(d.birim_adi)}</td>
      <td style="padding: 7px 10px; color: #475569;">${escapeHtml(d.personel_adi)}</td>
      <td style="padding: 7px 10px; text-align: center; font-weight: 700; color: #d97706;">${d.adet} Adet</td>
      <td style="padding: 7px 10px; text-align: center; font-family: monospace; font-size: 8.5pt;">${escapeHtml(d.talep_no)}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="text-align: center; padding: 10px; color: #64748b; font-size: 8.5pt;">Bu ay dağıtılan demirbaş malzeme bulunmamaktadır.</td></tr>';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aylık Tüketim ve Tasarruf Bülteni • ${escapeHtml(donem.donemAdi)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      padding: 24px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .top-action-bar {
      max-width: 210mm;
      margin: 0 auto 20px;
      padding: 12px 20px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }
    .btn-action-primary {
      background: #2563eb; color: #fff; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 700; cursor: pointer;
    }
    .btn-action-secondary {
      background: #fff; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;
    }
    .a4-sheet {
      width: 100%;
      max-width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 18mm 20mm 16mm;
      border-radius: 8px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .bulten-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 18px;
    }
    .kpi-box {
      border: 1.5px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      background: #f8fafc;
      text-align: center;
    }
    .kpi-num {
      font-size: 18pt;
      font-weight: 800;
      line-height: 1.2;
    }
    .kpi-label {
      font-size: 8pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 3px;
    }
    .bulten-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      border: 1px solid #cbd5e1;
    }
    .bulten-table th {
      background: #0f172a;
      color: #ffffff;
      font-weight: 700;
      padding: 7px 10px;
      text-align: left;
      font-size: 8.5pt;
    }
    .signatures-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 20px;
      border-top: 1.5px dashed #cbd5e1;
      padding-top: 14px;
    }
    .sig-col {
      text-align: center;
      font-size: 8.5pt;
    }
    @media print {
      body { background: #fff !important; padding: 0 !important; }
      .no-print { display: none !important; }
      .a4-sheet { border: none !important; box-shadow: none !important; padding: 12mm 15mm !important; }
    }
  </style>
</head>
<body>
  <div class="top-action-bar no-print">
    <div>
      <strong style="font-size: 14px;">KampüsStok Üniversitesi Rektörlük & Genel Sekreterlik Kırtasiye Tüketim Bülteni</strong>
      <div style="font-size: 12px; color: #64748b;">Dönem: ${escapeHtml(donem.donemAdi)} • 1 Sayfa Yönetici Raporu</div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn-action-primary" onclick="window.print()">Bülteni Yazdır (A4)</button>
      <button class="btn-action-secondary" onclick="window.close()">Kapat</button>
    </div>
  </div>

  <div class="a4-sheet">
    <div>
      <div class="bulten-header">
        <img src="${getKurumLogoDataUri()}" style="height: 60px; width: auto;" alt="${escapeHtml(config.kurumAdi || 'Logo')}">
        <div style="text-align: center; flex: 1; padding: 0 14px;">
          <div style="font-size: 9.5pt; font-weight: 700; color: #475569;">T.C. ${escapeHtml(config.kurumAdi || 'Örnek Devlet Üniversitesi').toUpperCase()}</div>
          <div style="font-size: 13pt; font-weight: 800; color: #0f172a; margin-top: 2px;">REKTÖRLÜK & GENEL SEKRETERLİK İCRA RAPORU</div>
          <div style="font-size: 9pt; font-weight: 600; color: #2563eb; margin-top: 2px;">AYLIK KIRTASİYE TÜKETİM VE TASARRUF BÜLTENİ (${escapeHtml(donem.donemAdi)})</div>
        </div>
        <div style="text-align: right; font-size: 8pt; color: #64748b;">
          <div>Rapor Kodu: <strong>BLT-${escapeHtml(donem.yil)}-${escapeHtml(donem.ay)}</strong></div>
          <div>Tarih: ${belgeTarihi.substring(0, 10)}</div>
        </div>
      </div>

      <!-- 4 Ana Gösterge Kartı -->
      <div class="kpi-grid">
        <div class="kpi-box" style="border-top: 3px solid #0f172a;">
          <div class="kpi-num" style="color: #0f172a;">${ozet.toplamTalep}</div>
          <div class="kpi-label">Toplam Talep</div>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">${ozet.aktifBirimSayisi} Birim • ${ozet.aktifPersonelSayisi} Personel</div>
        </div>
        <div class="kpi-box" style="border-top: 3px solid #1e3a8a;">
          <div class="kpi-num" style="color: #1e3a8a;">${ozet.toplamKarsilanan}</div>
          <div class="kpi-label">Karşılanan Malzeme</div>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">İstenen: ${ozet.toplamIstenen} Adet</div>
        </div>
        <div class="kpi-box" style="border-top: 3px solid #059669; background: rgba(5, 150, 105, 0.04);">
          <div class="kpi-num" style="color: #059669;">%${ozet.tasarrufOrani}</div>
          <div class="kpi-label" style="color: #047857;">İsraf Tasarrufu</div>
          <div style="font-size: 7.5pt; color: #047857; margin-top: 2px; font-weight: 700;">${ozet.tasarrufAdet} Adet Tasarruf</div>
        </div>
        <div class="kpi-box" style="border-top: 3px solid #d97706;">
          <div class="kpi-num" style="color: #d97706;">${ozet.teslimEdilenTalep + ozet.onayliTalep}</div>
          <div class="kpi-label">Sonuçlanan Talep</div>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">${ozet.reddedilenTalep} Reddedilen</div>
        </div>
      </div>

      <!-- İki Kolonlu Tablo Grubu -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 16px;">
        <!-- Sol: En Çok Tüketen Birimler -->
        <div>
          <div style="font-size: 9pt; font-weight: 800; color: #0f172a; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>En Çok Tüketen İlk 5 Birim</span>
            <span style="font-size: 8pt; font-weight: 600; color: #64748b;">Hacim Sıralaması</span>
          </div>
          <table class="bulten-table">
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Birim / Fakülte</th>
                <th style="text-align: center; width: 65px;">Talep</th>
                <th style="text-align: right; width: 65px;">Adet</th>
              </tr>
            </thead>
            <tbody>
              ${birimRows}
            </tbody>
          </table>
        </div>

        <!-- Sağ: En Popüler Malzemeler -->
        <div>
          <div style="font-size: 9pt; font-weight: 800; color: #0f172a; margin-bottom: 6px; display: flex; justify-content: space-between;">
            <span>En Çok Talep Edilen İlk 5 Kalem</span>
            <span style="font-size: 8pt; font-weight: 600; color: #64748b;">Miktar Sıralaması</span>
          </div>
          <table class="bulten-table">
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Malzeme Tanımı</th>
                <th style="text-align: center; width: 50px;">Birim</th>
                <th style="text-align: right; width: 65px;">Adet</th>
              </tr>
            </thead>
            <tbody>
              ${urunRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Alt: Demirbaş ve Zimmet Durumu -->
      <div style="margin-bottom: 10px;">
        <div style="font-size: 9pt; font-weight: 800; color: #0f172a; margin-bottom: 6px; display: flex; justify-content: space-between;">
          <span>Dağıtılan Demirbaş ve Dayanıklı Ofis Gereçleri (Zimmet ve İsraf Kontrolü)</span>
          <span style="font-size: 8pt; font-weight: 600; color: #d97706;">Dayanıklı Donanım</span>
        </div>
        <table class="bulten-table">
          <thead>
            <tr>
              <th>Malzeme Adı</th>
              <th>Teslim Edilen Birim</th>
              <th>Teslim Alan Yetkili</th>
              <th style="text-align: center; width: 65px;">Adet</th>
              <th style="text-align: center; width: 90px;">Talep No</th>
            </tr>
          </thead>
          <tbody>
            ${demirbasRows}
          </tbody>
        </table>
      </div>

      <!-- Yönetici Değerlendirme Notu -->
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 3px solid #2563eb; padding: 8px 12px; border-radius: 4px; font-size: 8pt; line-height: 1.4; color: #334155;">
        <strong>Yönetici Değerlendirmesi:</strong> Üniversitemiz kırtasiye taleplerinde dayanıklı malzemeler (delgeç, zımba, hesap makinesi vb.) mükerrer talepleri önlemek amacıyla 6 aylık zimmet filtresinden geçirilmektedir. Haftalık Çarşamba toplu dağıtım modeli ile lojistik maliyetler ve gereksiz personel iş yükü asgari düzeye indirilmiştir.
      </div>
    </div>

    <div>
      <!-- İmza Blokları -->
      <div class="signatures-row">
        <div class="sig-col">
          <div style="font-weight: 700; color: #475569;">HAZIRLAYAN</div>
          <div style="font-weight: 800; color: #0f172a; margin-top: 2px;">Satın Alma & Depo Şefliği</div>
          <div style="color: #64748b; font-size: 7.5pt;">İdari ve Mali İşler D.B.</div>
          <div style="margin-top: 28px; color: #94a3b8; font-size: 7.5pt;">İmza: .........................</div>
        </div>
        <div class="sig-col">
          <div style="font-weight: 700; color: #475569;">KONTROL EDEN</div>
          <div style="font-weight: 800; color: #0f172a; margin-top: 2px;">Genel Sekreterlik</div>
          <div style="color: #64748b; font-size: 7.5pt;">Kurumsal Koordinasyon</div>
          <div style="margin-top: 28px; color: #94a3b8; font-size: 7.5pt;">İmza: .........................</div>
        </div>
        <div class="sig-col">
          <div style="font-weight: 700; color: #475569;">ONAYLAYAN</div>
          <div style="font-weight: 800; color: #0f172a; margin-top: 2px;">Rektörlük Makamı</div>
          <div style="color: #64748b; font-size: 7.5pt;">KampüsStok Üniversitesi Rektörlüğü</div>
          <div style="margin-top: 28px; color: #94a3b8; font-size: 7.5pt;">İmza: .........................</div>
        </div>
      </div>

      <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 12px; display: flex; justify-content: space-between; font-size: 7.5pt; color: #94a3b8;">
        <span>${escapeHtml(config.kurumAdi || 'Örnek Devlet Üniversitesi')} • Satın Alma Müdürlüğü</span>
        <span>Rapor Tarihi: ${belgeTarihi} • Sayfa: 1 / 1 (A4)</span>
      </div>
    </div>
  </div>

  ${autoPrint ? `
    <script>
      window.addEventListener('load', () => {
        setTimeout(() => { window.print(); }, 500);
      });
    </script>
  ` : ''}
</body>
</html>`;
}

function renderHaftalikToplamaHtml({ teslimatTarihiText, talepler, urunOzet, kalemler, atilIadeler = [] }) {
  const urunSatirlari = urunOzet.map((u, i) => `
    <tr style="background-color: ${i % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #cbd5e1;">
      <td style="text-align: center; width: 44px; padding: 8px; font-weight: 600; color: #475569;">${i + 1}</td>
      <td style="padding: 8px 12px; font-weight: 700; color: #0f172a;">${escapeHtml(u.urun_adi)}</td>
      <td style="text-align: center; width: 100px; padding: 8px;">
        <span style="display: inline-block; padding: 2px 8px; background: #e2e8f0; border-radius: 4px; font-weight: 600; font-size: 9pt;">${escapeHtml(u.olcu_birimi)}</span>
      </td>
      <td style="text-align: center; width: 120px; font-weight: 800; font-size: 11pt; color: #0f172a; background-color: rgba(37, 99, 235, 0.06);">${Number(u.toplam_onaylanan) || 0}</td>
    </tr>
  `).join('');

  const birimSatirlari = talepler.map((t, idx) => {
    const buKalemler = kalemler.filter(k => k.talep_id === t.id);
    const detay = buKalemler.map(k => `${escapeHtml(k.urun_adi)} (${Number(k.onaylanan_adet) || 0} ${escapeHtml(k.olcu_birimi)})`).join(', ');
    const binaOda = `<strong>${escapeHtml(t.bina_adi || 'Bina Belirtilmemiş')}</strong>${t.oda_no ? `<br><span style="font-size: 8.5pt; color: #64748b;">Oda: ${escapeHtml(t.oda_no)}</span>` : ''}`;
    return `
      <tr style="background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #cbd5e1;">
        <td style="padding: 8px 10px; font-family: monospace; font-weight: 700; color: #1d4ed8;">${escapeHtml(t.talep_no)}</td>
        <td style="padding: 8px 10px; font-weight: 700; color: #0f172a;">${escapeHtml(t.birim_adi)}</td>
        <td style="padding: 8px 10px; font-size: 9pt;">${binaOda}</td>
        <td style="padding: 8px 10px; color: #334155;">${escapeHtml(t.personel_adi)}</td>
        <td style="padding: 8px 10px; font-size: 9.5pt; color: #1e293b;">${detay}</td>
      </tr>
    `;
  }).join('');

  const atilSatirlari = (atilIadeler || []).length > 0 ? atilIadeler.map((a, idx) => `
    <tr style="background-color: ${idx % 2 === 1 ? '#f0fdf4' : '#ffffff'}; border-bottom: 1px solid #cbd5e1;">
      <td style="text-align: center; width: 70px; padding: 8px; font-weight: 700; color: #047857;">#${a.id}</td>
      <td style="padding: 8px 10px; font-weight: 700; color: #065f46;">${escapeHtml(a.bina_adi || 'Bina Belirtilmemiş')} - Oda ${escapeHtml(a.oda_no || '')}</td>
      <td style="padding: 8px 10px; font-weight: 600; color: #0f172a;">${escapeHtml(a.birim_adi)} (${escapeHtml(a.bildiren_adi)})</td>
      <td style="padding: 8px 10px; color: #1e293b; font-size: 9.5pt;">${escapeHtml(a.aciklama)}</td>
      <td style="text-align: center; width: 110px; padding: 8px; font-weight: 700; color: #059669; font-size: 8.5pt;">[  ] Teslim Alındı</td>
    </tr>
  `).join('') : `
    <tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 14px;">Bu hafta için bekleyen atıl malzeme iadesi bulunmamaktadır.</td></tr>
  `;

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Haftalık Depo Toplama Listesi • ${teslimatTarihiText}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    body {
      background: radial-gradient(circle at 50% 20%, #edf2f7 0%, #dbe2ec 100%);
      color: #0f172a;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      padding: 24px 16px 48px;
    }
    .top-action-bar {
      max-width: 210mm;
      margin: 0 auto 20px;
      padding: 12px 20px;
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.95);
      border-radius: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      box-shadow: 0 10px 25px rgba(100, 115, 130, 0.12);
    }
    .btn-action-primary {
      background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.4);
      padding: 8px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-action-secondary {
      background: #ffffff;
      color: #334155;
      border: 1px solid #cbd5e1;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .a4-sheet {
      width: 100%;
      max-width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 16mm 20mm 18mm;
      border-radius: 8px;
      box-shadow: 0 16px 40px rgba(30, 41, 59, 0.12);
      border: 1px solid rgba(226, 232, 240, 0.8);
    }
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .doc-logo { height: 80px; width: auto; object-fit: contain; }
    .doc-titles { text-align: center; flex: 1; padding: 0 16px; }
    .doc-titles .gov-title { font-size: 10pt; font-weight: 700; color: #475569; }
    .doc-titles .uni-name { font-size: 14pt; font-weight: 800; color: #0f172a; }
    .doc-titles .dept-name { font-size: 10pt; font-weight: 600; color: #334155; margin-top: 3px; }
    .doc-titles .doc-badge {
      display: inline-block;
      margin-top: 8px;
      background: #0f172a;
      color: #ffffff;
      font-size: 10.5pt;
      font-weight: 800;
      padding: 3px 18px;
      border-radius: 4px;
    }
    table.doc-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1.5px solid #64748b; font-size: 9.5pt; }
    table.doc-table th { background: #e2e8f0; color: #0f172a; font-weight: 800; padding: 8px 10px; border: 1px solid #94a3b8; text-align: left; }
    table.doc-table td { border: 1px solid #cbd5e1; }
    .section-title { font-size: 11pt; font-weight: 800; color: #0f172a; margin: 18px 0 8px; display: flex; align-items: center; gap: 8px; }
    @media print {
      @page { size: A4 portrait; margin: 12mm 15mm 15mm 15mm; }
      body { background: #ffffff !important; padding: 0 !important; }
      .no-print, .top-action-bar { display: none !important; }
      .a4-sheet { border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
      table.doc-table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="top-action-bar no-print">
    <div>
      <div style="font-weight: 700; font-size: 13.5px;">KampüsStok Üniversitesi Depo Toplama Listesi</div>
      <div style="font-size: 12px; color: #64748b;">Teslimat Günü: ${teslimatTarihiText}</div>
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn-action-primary" onclick="window.print()">Yazdır / PDF Olarak Kaydet</button>
      <button class="btn-action-secondary" onclick="window.close()">Pencereyi Kapat</button>
    </div>
  </div>

  <div class="a4-sheet">
    <div class="doc-header">
      <img src="${getKurumLogoDataUri()}" class="doc-logo" alt="${escapeHtml(config.kurumAdi || 'Logo')}">
      <div class="doc-titles">
        <div class="gov-title">T.C.</div>
        <div class="uni-name">${escapeHtml(config.kurumAdi || 'Örnek Devlet Üniversitesi').toUpperCase()}</div>
        <div class="dept-name">İdari İşler Müdürlüğü • Satın Alma Müdürlüğü</div>
        <div class="doc-badge">HAFTALIK DEPO TOPLAMA VE DAĞITIM LİSTESİ</div>
      </div>
      <img src="${getKurumLogoDataUri()}" class="doc-logo" alt="Logo" style="opacity: 0;">
    </div>

    <div style="margin-bottom: 16px; padding: 10px 14px; background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; display: flex; justify-content: space-between;">
      <div><strong>Planlanan Teslimat Günü:</strong> ${teslimatTarihiText}</div>
      <div>Toplam <strong>${talepler.length} Adet Birim Talebi</strong></div>
    </div>

    <div class="section-title">1) Depodan Hazırlanacak Toplam Malzemeler (Konsolide Özet)</div>
    <table class="doc-table">
      <thead>
        <tr>
          <th style="width: 44px; text-align: center;">Sıra</th>
          <th>Malzeme / Ürün Tanımı</th>
          <th style="width: 100px; text-align: center;">Ölçü Birimi</th>
          <th style="width: 120px; text-align: center;">Toplam Onaylanan</th>
        </tr>
      </thead>
      <tbody>${urunSatirlari}</tbody>
    </table>

    <div class="section-title">2) Kampüs Dağıtım Rotası & Birim Dağıtım Dökümü (Bina & Kat Sıralı)</div>
    <table class="doc-table">
      <thead>
        <tr>
          <th style="width: 100px;">Talep No</th>
          <th style="width: 170px;">Birim</th>
          <th style="width: 140px;">Bina / Oda</th>
          <th style="width: 140px;">İstek Sahibi</th>
          <th>Teslim Edilecek Malzemeler</th>
        </tr>
      </thead>
      <tbody>${birimSatirlari}</tbody>
    </table>

    <div class="section-title" style="color: #065f46; margin-top: 24px;">
      3) Çarşamba Odalardan Teslim Alınacak Atıl Malzemeler ve İadeler (+20 Yeşil Kampüs Puanı)
    </div>
    <table class="doc-table">
      <thead>
        <tr style="background: #dcfce7; color: #065f46;">
          <th style="width: 70px; text-align: center;">Kayıt No</th>
          <th style="width: 160px;">Bina & Oda</th>
          <th style="width: 160px;">Birim / Bildiren</th>
          <th>Teslim Alınacak Malzeme Notu</th>
          <th style="width: 110px; text-align: center;">Dağıtıcı Onay</th>
        </tr>
      </thead>
      <tbody>${atilSatirlari}</tbody>
    </table>
  </div>
</body>
</html>`;
}

export default raporController;
