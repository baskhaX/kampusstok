// raporlar.js - Raporlama, Canlı Tüketim & Talep Analiz Tablosu ve Resmi Çıktılar (Apple Liquid Glass)
import api from '../api.js';
import toast from '../components/toast.js';
import { escapeHtml } from '../utils/text.js';
import { t, getLanguage, tCategory, tProduct, tDepartment, tUnit, tBuilding, tMonth } from '../utils/i18n.js';

let detayliSatirlar = [];

export async function renderRaporlar(appContainer) {
  let birimler = [];
  try {
    const resBirim = await api.getYonetimBirimler();
    birimler = resBirim.birimler || [];
  } catch {}

  const bugun = new Date();
  const gun = bugun.getDay();
  let eklenecek = (3 - gun + 7) % 7;
  if (eklenecek === 0 && bugun.getHours() >= 12) eklenecek = 7;
  const carsambaDate = new Date(bugun.setDate(bugun.getDate() + eklenecek));
  const defaultCarsambaStr = carsambaDate.toISOString().split('T')[0];

  appContainer.innerHTML = `
    <div class="yonetim-page-wrap">
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 26px; font-weight: 700; letter-spacing: -0.02em; color: #0F172A;">${t('raporlar.title', 'Raporlar & Canlı Tüketim Analizi')}</h2>
        <p style="color: var(--text-dim); font-size: 13.5px; margin-top: 4px;">
          ${t('raporlar.subtitle', 'Kurum geneli, departman, birim ve personel bazında canlı kırtasiye tüketim tablosu, KPI özetleri ve resmi çıktılar.')}
        </p>
      </div>

      <!-- 1) KPI ÖZET KARTLARI (Apple Liquid Glass) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <div class="card" style="padding: 18px 20px;">
          <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted-foreground);">${t('raporlar.kpiTotalItems', 'Toplam Kalem')}</div>
          <div id="kpiToplamKalem" style="font-size: 28px; font-weight: 800; color: #0F172A; margin-top: 6px;">-</div>
          <div style="font-size: 11.5px; color: var(--color-muted-foreground); margin-top: 2px;">${t('raporlar.kpiTotalItemsSub', 'Tüm taleplerdeki ürün satırı')}</div>
        </div>

        <div class="card" style="padding: 18px 20px;">
          <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #1E3A8A;">${t('raporlar.kpiDeliveredQty', 'Teslim Edilen Adet')}</div>
          <div id="kpiToplamVerilen" style="font-size: 28px; font-weight: 800; color: #1E3A8A; margin-top: 6px;">-</div>
          <div style="font-size: 11.5px; color: var(--color-muted-foreground); margin-top: 2px;">${t('raporlar.kpiDeliveredQtySub', 'Dağıtılan toplam malzeme')}</div>
        </div>

        <div class="card" style="padding: 18px 20px;">
          <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted-foreground);">${t('raporlar.kpiTopDept', 'En Çok Talep Eden Birim')}</div>
          <div id="kpiEnCokBirim" style="font-size: 16px; font-weight: 700; color: #0F172A; margin-top: 10px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">-</div>
          <div style="font-size: 11.5px; color: var(--color-muted-foreground); margin-top: 2px;">${t('raporlar.kpiTopDeptSub', 'En yüksek tüketim hacmi')}</div>
        </div>

        <div class="card" style="padding: 18px 20px;">
          <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-muted-foreground);">${t('raporlar.kpiTopItem', 'En Çok İstenen Malzeme')}</div>
          <div id="kpiEnCokUrun" style="font-size: 15px; font-weight: 700; color: #0F172A; margin-top: 10px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">-</div>
          <div style="font-size: 11.5px; color: var(--color-muted-foreground); margin-top: 2px;">${t('raporlar.kpiTopItemSub', 'En popüler kırtasiye ürünü')}</div>
        </div>
      </div>

      <!-- 2) CANLI TÜKETİM & TALEP TABLOSU -->
      <div class="card" style="padding: 24px; margin-bottom: 32px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 18px; font-weight: 700; color: #0F172A;">${t('raporlar.tableTitle', 'Canlı Tüketim & Talep Tablosu')}</h3>
            <p style="font-size: 13px; color: var(--color-muted-foreground); margin-top: 2px;">
              ${t('raporlar.tableSub', 'İndirmeden doğrudan tarayıcıda inceleyin, arayın ve tek tıkla filtrelenmiş veriyi Excel\'e dökün.')}
            </p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button id="btnTabloExcelIndir" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
              ${t('raporlar.downloadExcel', 'Excel (.xlsx) İndir')}
            </button>
            <button id="btnTabloYazdir" class="btn btn-outline btn-sm">
              ${t('raporlar.printTable', 'Tabloyu Yazdır')}
            </button>
          </div>
        </div>

        <!-- Canlı Filtre Çubuğu -->
        <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center; background: #F8FAFC; border: 1px solid var(--color-border); padding: 14px 16px; border-radius: 12px; margin-bottom: 16px;">
          <div style="flex: 1; min-width: 180px;">
            <label style="font-size: 11.5px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--color-foreground);">${t('raporlar.lblDept', 'Birim / Departman')}</label>
            <select id="analizBirimSelect" style="width: 100%;">
              <option value="">${t('raporlar.allDepts', 'Tüm Birimler (Kurum Geneli)')}</option>
              ${birimler.map(b => `<option value="${b.id}">${escapeHtml(tDepartment(b.ad))}</option>`).join('')}
            </select>
          </div>

          <div style="flex: 1; min-width: 140px;">
            <label style="font-size: 11.5px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--color-foreground);">${t('raporlar.lblStatus', 'Talep Durumu')}</label>
            <select id="analizDurumSelect" style="width: 100%;">
              <option value="">${t('raporlar.allStatuses', 'Tüm Durumlar')}</option>
              <option value="beklemede">${t('status.beklemede', 'Beklemede')}</option>
              <option value="onaylandi">${t('status.onaylandi', 'Onaylandı')}</option>
              <option value="revize_onaylandi">${t('status.revize_onaylandi', 'Revize Onaylandı')}</option>
              <option value="teslim_edildi">${t('status.teslim_edildi', 'Teslim Edildi')}</option>
              <option value="reddedildi">${t('status.reddedildi', 'Reddedildi')}</option>
            </select>
          </div>

          <div style="flex: 1.5; min-width: 200px;">
            <label style="font-size: 11.5px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--color-foreground);">${t('raporlar.quickSearch', 'Hızlı Arama')}</label>
            <input type="text" id="analizAramaInput" placeholder="${t('raporlar.searchPlaceholder', 'Personel adı, ürün adı, talep no...')}" style="width: 100%;">
          </div>

          <div style="display: flex; align-items: flex-end; gap: 8px;">
            <button id="btnFiltreleriSifirla" class="btn btn-outline btn-sm" style="height: 38px;">${t('raporlar.reset', 'Sıfırla')}</button>
          </div>
        </div>

        <!-- Canlı Veri Tablosu -->
        <div class="table-container" style="max-height: 520px; overflow-y: auto;">
          <table class="data-table" id="canliAnalizTablosu">
            <thead>
              <tr>
                <th style="width: 110px;">${t('raporlar.colReqNo', 'TALEP NO')}</th>
                <th style="width: 140px;">${t('raporlar.colDate', 'TARİH')}</th>
                <th>${t('raporlar.colDept', 'BİRİM / DEPARTMAN')}</th>
                <th>${t('raporlar.colStaff', 'TALEP EDEN PERSONEL')}</th>
                <th>${t('raporlar.colLocation', 'TESLİMAT YERİ (BİNA/ODA)')}</th>
                <th>${t('raporlar.colItem', 'MALZEME / ÜRÜN ADI')}</th>
                <th style="text-align: center; width: 90px;">${t('raporlar.colRequested', 'İSTENEN')}</th>
                <th style="text-align: center; width: 90px;">${t('raporlar.colDelivered', 'VERİLEN')}</th>
                <th style="width: 120px;">${t('raporlar.colStatus', 'DURUM')}</th>
              </tr>
            </thead>
            <tbody id="analizTbody">
              <tr><td colspan="9" style="text-align: center; padding: 30px;">${t('common.loading', 'Veriler yükleniyor...')}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 3) RESMİ ÇIKTILAR (Excel Export, Haftalık Toplama ve Yönetici Bülteni) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 20px; margin-bottom: 32px;">
        <!-- Excel Dışa Aktarma -->
        <div class="card" style="padding: 22px;">
          <h3 style="font-size: 16.5px; font-weight: 700; margin-bottom: 6px;">${t('raporlar.cardExcelTitle', 'Talepleri Excel\'e Aktar (.xlsx)')}</h3>
          <p style="font-size: 12.5px; color: var(--color-muted-foreground); margin-bottom: 16px;">
            ${t('raporlar.cardExcelSub', 'Filtrelenen tüm talepleri ve durumlarını Excel çalışma kitabı olarak bilgisayarınıza indirin.')}
          </p>

          <form id="excelExportForm" style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">${t('raporlar.lblDept', 'Birim (Alt birimler dahil)')}</label>
              <select id="excelBirimId">
                <option value="">${t('raporlar.allDepts', 'Tüm Birimler')}</option>
                ${birimler.map(b => `<option value="${b.id}">${escapeHtml(tDepartment(b.ad))}</option>`).join('')}
              </select>
            </div>

            <div>
              <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">${t('raporlar.lblStatus', 'Talep Durumu')}</label>
              <select id="excelDurum">
                <option value="">${t('raporlar.allStatuses', 'Tümü')}</option>
                <option value="beklemede">${t('status.beklemede', 'Beklemede')}</option>
                <option value="onaylandi">${t('status.onaylandi', 'Onaylandı')}</option>
                <option value="revize_onaylandi">${t('status.revize_onaylandi', 'Revize Onaylandı')}</option>
                <option value="teslim_edildi">${t('status.teslim_edildi', 'Teslim Edildi')}</option>
                <option value="reddedildi">${t('status.reddedildi', 'Reddedildi')}</option>
              </select>
            </div>

            <button type="submit" class="btn btn-primary" style="margin-top: 8px;">
              ${t('raporlar.btnExportExcel', 'Excel Raporunu İndir')}
            </button>
          </form>
        </div>

        <!-- Haftalık Toplama Listesi & Toplu Teslim Fişleri -->
        <div class="card" style="padding: 22px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <h3 style="font-size: 16.5px; font-weight: 700;">${t('raporlar.cardSlipsTitle', 'Haftalık Dağıtım & Fişler (A4)')}</h3>
            <span class="badge badge-primary" style="font-size: 11px;">${t('raporlar.wednesdayBadge', 'Çarşamba')}</span>
          </div>
          <p style="font-size: 12.5px; color: var(--color-muted-foreground); margin-bottom: 16px;">
            ${t('raporlar.cardSlipsSub', 'Depo toplama listesi ve birimlere imzalatılacak A4 Malzeme Teslim Fişlerini topluca yazdırın.')}
          </p>

          <form id="toplamaListesiForm" style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">${t('raporlar.deliveryDateWed', 'Teslimat Çarşambası')}</label>
              <input type="date" id="toplamaCarsambaTarihi" value="${defaultCarsambaStr}" required>
            </div>

            <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #1e293b; cursor: pointer; background: #f1f5f9; padding: 7px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <input type="checkbox" id="chkRotaSirali" checked>
              <span><strong>${t('raporlar.campusRouteSorted', 'Kampüs Rota Sıralı (Bina ve Kat/Oda Sıralaması)')}</strong></span>
            </label>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
              <button type="submit" id="btnToplamaGoruntule" class="btn btn-outline" style="font-size: 12px; font-weight: 600; padding: 8px 10px;">
                ${t('raporlar.pickingListBtn', 'Toplama Listesi')}
              </button>
              <button type="button" id="btnTopluTeslimFisleri" class="btn btn-primary" style="font-size: 12px; font-weight: 700; padding: 8px 10px; box-shadow: 0 4px 12px rgba(37,99,235,0.25);">
                ${t('raporlar.btnPrintSlips', 'Toplu Fişleri Yazdır')}
              </button>
            </div>
          </form>
        </div>

        <!-- Yönetim Tüketim & Tasarruf Bülteni -->
        <div class="card" style="padding: 22px; border: 1.5px solid #3b82f6; background: rgba(239, 246, 255, 0.45);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <h3 style="font-size: 16.5px; font-weight: 800; color: #1e3a8a;">${t('raporlar.bulletinTitle', 'Yönetici Tüketim Bülteni')}</h3>
            <span class="badge badge-primary" style="font-size: 11px;">${t('raporlar.bulletinBadge', 'Yönetim • GS')}</span>
          </div>
          <p style="font-size: 12.5px; color: var(--color-muted-foreground); margin-bottom: 16px;">
            ${t('raporlar.bulletinSub', 'Yönetim ve Genel Sekreterlik için aylık talep, birim sarfiyatı ve israf tasarruf oranlarını içeren resmi A4 bülten.')}
          </p>

          <form id="yoneticiBulteniForm" style="display: flex; flex-direction: column; gap: 12px;">
            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 8px;">
              <div>
                <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">${t('raporlar.reportingMonth', 'Dönem Ayı')}</label>
                <select id="bultenAy">
                  ${[11, 12, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(m => `<option value="${m}" ${m === 11 ? 'selected' : ''}>${tMonth(m)}</option>`).join('')}
                </select>
              </div>
              <div>
                <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">${t('raporlar.year', 'Yıl')}</label>
                <select id="bultenYil">
                  <option value="2026" selected>2026</option>
                  <option value="2027">2027</option>
                  <option value="2025">2025</option>
                </select>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
              <button type="submit" id="btnBultenEkrandaGoster" class="btn btn-outline" style="font-size: 12px; font-weight: 700; padding: 8px 8px;">
                ${t('raporlar.viewOnScreen', 'Ekranda İncele')}
              </button>
              <button type="button" id="btnBultenA4Yazdir" class="btn btn-primary" style="font-size: 12px; font-weight: 700; padding: 8px 8px; background: linear-gradient(180deg, #1e3a8a 0%, #0f172a 100%);">
                ${t('raporlar.officialBulletinA4', 'Resmi Bülten (A4)')}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Çıktı Önizleme Alanı -->
      <div id="raporOnizlemeContainer" style="margin-top: 24px; display: none;"></div>
    </div>
  `;

  // Canlı Analiz Tablosunu Yükle
  await loadCanliAnaliz(appContainer);

  // Excel Formu (Hata Düzeltildi - Parametreler undefined olarak gönderilir)
  const excelForm = appContainer.querySelector('#excelExportForm');
  excelForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const birimId = excelForm.querySelector('#excelBirimId').value;
    const durum = excelForm.querySelector('#excelDurum').value;

    try {
      const blob = await api.exportExcel({
        birimId: birimId ? birimId : undefined,
        durum: durum ? durum : undefined
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KampusStok_Kirtasiye_Raporu_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      const isEn = getLanguage() === 'en';
      toast.success(isEn ? 'Excel report downloaded successfully.' : 'Excel raporu başarıyla indirildi.');
    } catch (err) {
      toast.error((getLanguage() === 'en' ? 'Could not download Excel: ' : 'Excel indirilemedi: ') + err.message);
    }
  });

  // Toplama Listesi Formu
  const toplamaForm = appContainer.querySelector('#toplamaListesiForm');
  toplamaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const carsambaTarihi = toplamaForm.querySelector('#toplamaCarsambaTarihi').value;
    const binaSirali = toplamaForm.querySelector('#chkRotaSirali')?.checked ? 1 : 0;
    await renderToplamaOnizleme(appContainer, carsambaTarihi, binaSirali);
  });

  // Toplu Teslim Fişleri Butonu
  const btnTopluFisler = appContainer.querySelector('#btnTopluTeslimFisleri');
  if (btnTopluFisler) {
    btnTopluFisler.addEventListener('click', () => {
      const carsambaTarihi = toplamaForm.querySelector('#toplamaCarsambaTarihi').value;
      const binaSirali = toplamaForm.querySelector('#chkRotaSirali')?.checked ? 1 : 0;
      if (!carsambaTarihi) {
        toast.warning('Lütfen bir teslimat Çarşambası tarihi seçiniz.');
        return;
      }
      window.open(api.getTopluTeslimFisleriUrl(carsambaTarihi, true, binaSirali), '_blank');
    });
  }

  // Yönetici Bülteni Formu & Yazdırma
  const bultenForm = appContainer.querySelector('#yoneticiBulteniForm');
  if (bultenForm) {
    bultenForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const ay = bultenForm.querySelector('#bultenAy').value;
      const yil = bultenForm.querySelector('#bultenYil').value;
      await renderYoneticiBulteniOnizleme(appContainer, ay, yil);
    });

    const btnBultenA4 = appContainer.querySelector('#btnBultenA4Yazdir');
    btnBultenA4?.addEventListener('click', () => {
      const ay = bultenForm.querySelector('#bultenAy').value;
      const yil = bultenForm.querySelector('#bultenYil').value;
      window.open(api.getYoneticiBulteniUrl({ ay, yil }, true), '_blank');
    });
  }
}

// Canlı Analiz Yükleyici ve Filtreleyici
async function loadCanliAnaliz(appContainer) {
  const tbody = appContainer.querySelector('#analizTbody');
  const birimSelect = appContainer.querySelector('#analizBirimSelect');
  const durumSelect = appContainer.querySelector('#analizDurumSelect');
  const aramaInput = appContainer.querySelector('#analizAramaInput');
  const btnSifirla = appContainer.querySelector('#btnFiltreleriSifirla');
  const btnExcel = appContainer.querySelector('#btnTabloExcelIndir');
  const btnYazdir = appContainer.querySelector('#btnTabloYazdir');

  const kpiToplamKalem = appContainer.querySelector('#kpiToplamKalem');
  const kpiToplamVerilen = appContainer.querySelector('#kpiToplamVerilen');
  const kpiEnCokBirim = appContainer.querySelector('#kpiEnCokBirim');
  const kpiEnCokUrun = appContainer.querySelector('#kpiEnCokUrun');

  const fetchData = async () => {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 25px;">Veriler güncelleniyor...</td></tr>`;

    try {
      const birimId = birimSelect.value ? birimSelect.value : undefined;
      const durum = durumSelect.value ? durumSelect.value : undefined;
      const q = aramaInput.value.trim() ? aramaInput.value.trim() : undefined;

      const res = await api.getDetayliAnaliz({ birimId, durum, q });
      detayliSatirlar = res.satirlar || [];
      const ozet = res.ozet || {};

      // KPI Kartları
      kpiToplamKalem.textContent = ozet.toplamKalem ?? detayliSatirlar.length;
      kpiToplamVerilen.textContent = ozet.toplamVerilenAdet ?? 0;
      kpiEnCokBirim.textContent = tDepartment(ozet.enCokBirim) || '-';
      kpiEnCokUrun.textContent = tProduct(ozet.enCokUrun) || '-';

      if (detayliSatirlar.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 30px; color: var(--color-muted-foreground);">${t('raporlar.noData', 'Filtre kriterlerine uygun talep kaydı bulunamadı.')}</td></tr>`;
        return;
      }

      tbody.innerHTML = detayliSatirlar.map(s => {
        let durumBadge = `<span class="badge badge-neutral">${t('status.beklemede', 'Beklemede')}</span>`;
        if (s.talep_durumu === 'onaylandi') durumBadge = `<span class="badge badge-primary">${t('status.onaylandi', 'Onaylandı')}</span>`;
        else if (s.talep_durumu === 'revize_onaylandi') durumBadge = `<span class="badge badge-accent">${t('status.revize_onaylandi', 'Revize Onay')}</span>`;
        else if (s.talep_durumu === 'teslim_edildi') durumBadge = `<span class="badge badge-success">${t('status.teslim_edildi', 'Teslim Edildi')}</span>`;
        else if (s.talep_durumu === 'reddedildi') durumBadge = `<span class="badge badge-danger">${t('status.reddedildi', 'Reddedildi')}</span>`;

        const bAd = s.bina_adi ? tBuilding(s.bina_adi) : '';
        const oNo = s.oda_no ? `${t('common.room', 'Oda')}: ${s.oda_no}` : '';
        const adres = [bAd, oNo].filter(Boolean).join(' - ') || `<span style="color: var(--color-muted-foreground); font-size: 11px;">${t('common.unspecified', 'Belirtilmemiş')}</span>`;

        const uAd = escapeHtml(tProduct(s.urun_adi));
        const uBirim = tUnit(s.olcu_birimi);

        return `
          <tr>
            <td><strong style="font-family: monospace; color: #1E3A8A;">${escapeHtml(s.talep_no)}</strong></td>
            <td style="font-size: 12px; color: var(--color-muted-foreground);">${escapeHtml(s.olusturma_tarihi)}</td>
            <td>
              <strong>${escapeHtml(tDepartment(s.birim_adi))}</strong>
              ${s.ust_birim_adi ? `<div style="font-size: 11px; color: var(--color-muted-foreground);">${escapeHtml(tDepartment(s.ust_birim_adi))}</div>` : ''}
            </td>
            <td>
              <div><strong>${escapeHtml(s.personel_adi || t('satinalma.deptOfficer', 'Birim Sorumlusu'))}</strong></div>
              ${s.personel_eposta ? `<div style="font-size: 11px; color: #1E3A8A;">${escapeHtml(s.personel_eposta)}</div>` : ''}
            </td>
            <td style="font-size: 12px;">${adres}</td>
            <td>
              <strong>${uAd}</strong>
              ${s.marka ? `<div style="font-size: 11px; color: var(--color-muted-foreground);">${escapeHtml(s.marka)}</div>` : ''}
            </td>
            <td style="text-align: center; font-weight: 600;">${s.istenen_adet} ${uBirim}</td>
            <td style="text-align: center; font-weight: 700; color: #1E3A8A;">${s.onaylanan_adet !== null ? `${s.onaylanan_adet} ${uBirim}` : '-'}</td>
            <td>${durumBadge}</td>
          </tr>
        `;
      }).join('');

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" style="color: var(--color-destructive);">${err.message}</td></tr>`;
    }
  };

  birimSelect.addEventListener('change', fetchData);
  durumSelect.addEventListener('change', fetchData);
  aramaInput.addEventListener('input', () => {
    clearTimeout(aramaInput._timer);
    aramaInput._timer = setTimeout(fetchData, 300);
  });

  btnSifirla.addEventListener('click', () => {
    birimSelect.value = '';
    durumSelect.value = '';
    aramaInput.value = '';
    fetchData();
  });

  btnExcel.addEventListener('click', async () => {
    try {
      const blob = await api.exportExcel({
        birimId: birimSelect.value || undefined,
        durum: durumSelect.value || undefined
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KampusStok_Filtreli_Tuketim_Raporu_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Filtrelenen veriler Excel olarak indirildi.');
    } catch (e) {
      toast.error('Excel indirilemedi: ' + e.message);
    }
  });

  btnYazdir.addEventListener('click', () => {
    window.print();
  });

  await fetchData();
}

async function renderToplamaOnizleme(appContainer, carsambaTarihi, binaSirali = 1) {
  const container = appContainer.querySelector('#raporOnizlemeContainer');
  container.style.display = 'block';
  const isEn = getLanguage() === 'en';
  container.innerHTML = `<p style="text-align: center; padding: 30px;">${isEn ? 'Loading picking list...' : 'Toplama verileri yükleniyor...'}</p>`;

  try {
    const res = await api.getHaftalikToplama(carsambaTarihi, binaSirali);
    const { teslimatTarihiText, talepler, urunOzet, kalemler, atilIadeler = [] } = res;

    container.innerHTML = `
      <div class="card" style="padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;" class="no-print">
          <div>
            <h3 style="font-size: 18px; font-weight: 700;">${isEn ? 'Weekly Warehouse Picking List' : 'Haftalık Depo Toplama Listesi'} (${teslimatTarihiText})</h3>
            <span style="font-size: 13px; color: var(--color-muted-foreground);">${isEn ? `Total ${talepler.length} department requisitions • ${kalemler.length} items` : `Toplam ${talepler.length} birim talebi • ${kalemler.length} kalem malzeme`}</span>
          </div>
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <a href="/api/raporlar/toplu-teslim-fisleri?carsambaTarihi=${encodeURIComponent(carsambaTarihi)}&print=1" target="_blank" class="btn btn-primary" style="box-shadow: 0 4px 12px rgba(37,99,235,0.25); font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              ${isEn ? `Print All Delivery Slips (${talepler.length} Depts A4)` : `Tüm Teslim Fişlerini Toplu Yazdır (${talepler.length} Birim A4)`}
            </a>
            <button class="btn btn-outline" id="btnA4ToplamaYazdir" style="font-weight: 600;">
              ${isEn ? 'Print A4 Picking List' : 'A4 Toplama Listesini Yazdır'}
            </button>
          </div>
        </div>

        <div class="print-header">
          <div>
            <h1 style="font-size: 18px; font-weight: 800;">${isEn ? 'INSTITUTIONAL STATIONERY & INVENTORY MANAGEMENT' : 'KURUMSAL KIRTASİYE VE DEPO YÖNETİMİ'}</h1>
            <p style="font-size: 13px; color: #475569;">${isEn ? 'Procurement Directorate • Weekly Warehouse Picking List' : 'Satın Alma Müdürlüğü • Haftalık Depo Malzeme Toplama Listesi'}</p>
          </div>
          <div style="text-align: right;">
            <strong>${isEn ? 'Delivery Day:' : 'Teslimat Günü:'}</strong> ${teslimatTarihiText}
          </div>
        </div>

        <h4 style="font-size: 14px; font-weight: 700; margin: 16px 0 8px 0;">${isEn ? '1. Total Items to Pick from Warehouse (Summary)' : '1. Depodan Çıkarılacak Toplam Malzemeler (Özet)'}</h4>
        <table class="data-table" style="margin-bottom: 24px;">
          <thead>
            <tr>
              <th>${isEn ? 'Item Name' : 'Ürün Adı'}</th>
              <th>${isEn ? 'Unit' : 'Ölçü Birimi'}</th>
              <th style="text-align: right;">${isEn ? 'Total Units' : 'Toplam Adet'}</th>
            </tr>
          </thead>
          <tbody>
            ${urunOzet.map(u => `
              <tr>
                <td><strong>${escapeHtml(tProduct(u.urun_adi))}</strong></td>
                <td>${escapeHtml(tUnit(u.olcu_birimi))}</td>
                <td style="text-align: right;"><strong>${u.toplam_adet ?? u.toplam_onaylanan ?? 0}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h4 style="font-size: 14px; font-weight: 700; margin: 16px 0 8px 0;">${isEn ? '2. Distribution Details by Department & Room' : '2. Birim ve Oda Bazında Dağıtım Detayı'}</h4>
        <table class="data-table">
          <thead>
            <tr>
              <th>${isEn ? 'Req No' : 'Talep No'}</th>
              <th>${isEn ? 'Department' : 'Birim'}</th>
              <th>${isEn ? 'Recipient & Location' : 'Teslim Alacak Kişi & Yer'}</th>
              <th>${isEn ? 'Item' : 'Malzeme'}</th>
              <th style="text-align: right;">${isEn ? 'Qty' : 'Adet'}</th>
              <th style="width: 70px; text-align: center;">${isEn ? 'Delivered' : 'Teslim'}</th>
              <th style="width: 95px; text-align: center;" class="no-print">${isEn ? 'Slip' : 'Fiş'}</th>
            </tr>
          </thead>
          <tbody>
            ${kalemler.map(k => `
              <tr>
                <td><strong style="color: #1e3a8a; font-family: monospace;">${k.talep_no}</strong></td>
                <td><strong>${escapeHtml(tDepartment(k.birim_adi))}</strong></td>
                <td>
                  <strong>${escapeHtml(k.personel_adi || '-')}</strong>
                  <div style="font-size: 11px; color: #475569;">${[tBuilding(k.bina_adi), k.oda_no ? `${isEn ? 'Room' : 'Oda'}: ${k.oda_no}` : ''].filter(Boolean).join(' - ') || (isEn ? 'Room Unspecified' : 'Oda Belirtilmemiş')}</div>
                </td>
                <td>${escapeHtml(tProduct(k.urun_adi))}</td>
                <td style="text-align: right;"><strong>${k.onaylanan_adet} ${escapeHtml(tUnit(k.olcu_birimi))}</strong></td>
                <td style="text-align: center;">[ &nbsp; ]</td>
                <td style="text-align: center;" class="no-print">
                  <a href="/api/raporlar/teslim-fisi/${k.talep_id}?print=1" target="_blank" class="btn btn-sm btn-outline" title="${isEn ? 'Print delivery slip for this department' : 'Bu birimin teslim fişini yazdır'}" style="padding: 4px 10px; font-size: 11.5px; font-weight: 600; white-space: nowrap; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
                    ${isEn ? 'Print Slip' : 'Fişi Yazdır'}
                  </a>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${atilIadeler.length > 0 ? `
          <h4 style="font-size: 14px; font-weight: 700; margin: 24px 0 8px 0; color: #065f46;">
            ${isEn ? '3. Surplus Materials & Returns to Collect on Wednesday (+20 Green Points)' : '3. Çarşamba Odalardan Teslim Alınacak Atıl Malzemeler ve İadeler (+20 Yeşil Puan)'}
          </h4>
          <table class="data-table">
            <thead>
              <tr style="background: #ecfdf5; color: #065f46;">
                <th style="width: 70px;">${isEn ? 'Record' : 'Kayıt'}</th>
                <th style="width: 180px;">${isEn ? 'Building / Room' : 'Bina / Oda'}</th>
                <th style="width: 180px;">${isEn ? 'Department & Reporter' : 'Birim & Bildiren'}</th>
                <th>${isEn ? 'Item Collection Notes' : 'Teslim Alınacak Malzeme Notu'}</th>
                <th style="width: 90px; text-align: center;">${isEn ? 'Status' : 'Durum'}</th>
              </tr>
            </thead>
            <tbody>
              ${atilIadeler.map(a => `
                <tr>
                  <td><strong style="color: #059669;">#${a.id}</strong></td>
                  <td><strong>${escapeHtml(tBuilding(a.bina_adi) || (isEn ? 'Building Unspecified' : 'Bina Belirtilmemiş'))}</strong><br><span style="font-size: 11px; color: #475569;">${isEn ? 'Room' : 'Oda'}: ${escapeHtml(a.oda_no || '-')}</span></td>
                  <td><strong>${escapeHtml(tDepartment(a.birim_adi))}</strong><br><span style="font-size: 11px; color: #475569;">${escapeHtml(a.bildiren_adi)}</span></td>
                  <td>${escapeHtml(a.aciklama)}</td>
                  <td style="text-align: center;"><span class="badge badge-warning">${isEn ? 'Pending' : 'Beklemede'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </div>
    `;

    container.querySelector('#btnA4ToplamaYazdir')?.addEventListener('click', () => {
      window.print();
    });

    container.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    container.innerHTML = `<p style="color: var(--color-destructive); text-align: center; padding: 20px;">Hata: ${err.message}</p>`;
  }
}

async function renderYoneticiBulteniOnizleme(appContainer, ay, yil) {
  const container = appContainer.querySelector('#raporOnizlemeContainer');
  if (!container) return;

  const isEn = getLanguage() === 'en';
  container.style.display = 'block';
  container.innerHTML = `
    <div class="card" style="padding: 32px; text-align: center;">
      <p style="color: var(--color-muted-foreground);">${isEn ? 'Preparing executive consumption bulletin...' : 'Yönetici bülteni hazırlanıyor...'}</p>
    </div>
  `;

  try {
    const res = await api.getYoneticiBulteni({ ay, yil });
    const { donem, ozet, enCokTuketenBirimler = [], enCokTalepEdilenUrunler = [], demirbasDagitimlari = [] } = res;
    const donemLabel = isEn ? `${tMonth(ay)} ${yil} Period` : `${donem.donemAdi} Dönemi`;

    container.innerHTML = `
      <div class="card" style="padding: 28px; margin-bottom: 24px; border: 1.5px solid #3b82f6; background: rgba(255, 255, 255, 0.95); box-shadow: 0 16px 40px rgba(37,99,235,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="badge badge-primary" style="font-size: 11px;">${isEn ? 'Executive Leadership • General Secretariat' : 'Rektörlük • Genel Sekreterlik'}</span>
              <span style="font-size: 13px; color: #64748b;">${donemLabel}</span>
            </div>
            <h3 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px;">${isEn ? 'Monthly Stationery Consumption & Savings Bulletin' : 'Aylık Kırtasiye Tüketim & Tasarruf Bülteni'}</h3>
          </div>
          <div style="display: flex; gap: 10px;">
            <a href="/api/raporlar/yonetici-bulteni?ay=${ay}&yil=${yil}&format=html&print=1" target="_blank" class="btn btn-primary" style="box-shadow: 0 4px 12px rgba(37,99,235,0.25); font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              ${isEn ? 'Print Official A4 Bulletin' : 'Resmi A4 Bülteni Yazdır'}
            </a>
            <button class="btn btn-outline" id="btnBultenKapat">${t('common.close', 'Kapat')}</button>
          </div>
        </div>

        <!-- 4 KPI Kartı -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 24px;">
          <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-top: 3px solid #0f172a; border-radius: 12px; padding: 14px 16px; text-align: center;">
            <div style="font-size: 26px; font-weight: 800; color: #0f172a;">${ozet.toplamTalep}</div>
            <div style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 2px;">${isEn ? 'Total Requisitions' : 'Toplam Talep'}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">${ozet.aktifBirimSayisi} ${isEn ? 'Active Departments' : 'Aktif Birim'}</div>
          </div>

          <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-top: 3px solid #1e3a8a; border-radius: 12px; padding: 14px 16px; text-align: center;">
            <div style="font-size: 26px; font-weight: 800; color: #1e3a8a;">${ozet.toplamKarsilanan}</div>
            <div style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 2px;">${isEn ? 'Fulfilled Units' : 'Karşılanan Adet'}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">${isEn ? 'Requested' : 'İstenen'}: ${ozet.toplamIstenen} ${isEn ? 'Units' : 'Adet'}</div>
          </div>

          <div style="background: rgba(236, 253, 245, 0.6); border: 1.5px solid #a7f3d0; border-top: 3px solid #059669; border-radius: 12px; padding: 14px 16px; text-align: center;">
            <div style="font-size: 26px; font-weight: 800; color: #059669;">%${ozet.tasarrufOrani}</div>
            <div style="font-size: 11.5px; font-weight: 700; color: #047857; text-transform: uppercase; margin-top: 2px;">${isEn ? 'Waste Prevention' : 'İsraf Tasarrufu'}</div>
            <div style="font-size: 11px; color: #047857; font-weight: 700; margin-top: 4px;">${ozet.tasarrufAdet} ${isEn ? 'Units Saved' : 'Adet Tasarruf'}</div>
          </div>

          <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-top: 3px solid #d97706; border-radius: 12px; padding: 14px 16px; text-align: center;">
            <div style="font-size: 26px; font-weight: 800; color: #d97706;">${ozet.teslimEdilenTalep + ozet.onayliTalep}</div>
            <div style="font-size: 11.5px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 2px;">${isEn ? 'Completed Requisitions' : 'Sonuçlanan Talep'}</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">${ozet.reddedilenTalep} ${isEn ? 'Rejected' : 'Reddedilen'}</div>
          </div>
        </div>

        <!-- 2 Kolon: Birimler ve Ürünler -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; margin-bottom: 20px;">
          <div>
            <h4 style="font-size: 14.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${isEn ? 'Top 5 Consuming Departments' : 'En Çok Tüketen İlk 5 Birim'}</h4>
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 30px;">#</th>
                  <th>${isEn ? 'Department / Faculty' : 'Birim / Fakülte'}</th>
                  <th style="text-align: center; width: 80px;">${isEn ? 'Requisitions' : 'Talep'}</th>
                  <th style="text-align: right; width: 90px;">${isEn ? 'Total Units' : 'Toplam Adet'}</th>
                </tr>
              </thead>
              <tbody>
                ${enCokTuketenBirimler.map((b, idx) => `
                  <tr>
                    <td style="text-align: center; font-weight: 700; color: #64748b;">${idx + 1}</td>
                    <td><strong>${escapeHtml(tDepartment(b.birim_adi))}</strong></td>
                    <td style="text-align: center;">${b.talep_sayisi} ${isEn ? 'Reqs' : 'Talep'}</td>
                    <td style="text-align: right; font-weight: 800; color: #1e3a8a;">${b.toplam_adet} ${isEn ? 'Units' : 'Adet'}</td>
                  </tr>
                `).join('') || `<tr><td colspan="4" style="text-align: center; padding: 14px;">${isEn ? 'No records found.' : 'Kayıt bulunamadı.'}</td></tr>`}
              </tbody>
            </table>
          </div>

          <div>
            <h4 style="font-size: 14.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${isEn ? 'Top 5 Most Requested Items' : 'En Çok Talep Edilen İlk 5 Malzeme'}</h4>
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 30px;">#</th>
                  <th>${isEn ? 'Item Name' : 'Malzeme Adı'}</th>
                  <th style="text-align: center; width: 70px;">${isEn ? 'Unit' : 'Birim'}</th>
                  <th style="text-align: right; width: 90px;">${isEn ? 'Qty' : 'Miktar'}</th>
                </tr>
              </thead>
              <tbody>
                ${enCokTalepEdilenUrunler.map((u, idx) => `
                  <tr>
                    <td style="text-align: center; font-weight: 700; color: #64748b;">${idx + 1}</td>
                    <td><strong>${escapeHtml(tProduct(u.urun_adi))}</strong></td>
                    <td style="text-align: center;"><span class="badge badge-neutral" style="font-size: 10px;">${escapeHtml(tUnit(u.olcu_birimi))}</span></td>
                    <td style="text-align: right; font-weight: 800; color: #059669;">${u.toplam_adet} ${isEn ? 'Units' : 'Adet'}</td>
                  </tr>
                `).join('') || `<tr><td colspan="4" style="text-align: center; padding: 14px;">${isEn ? 'No records found.' : 'Kayıt bulunamadı.'}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        ${demirbasDagitimlari.length > 0 ? `
          <div style="margin-top: 10px;">
            <h4 style="font-size: 14.5px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${isEn ? 'Dispatched Fixtures & Durable Assets (Custodian Tracking)' : 'Dağıtılan Demirbaş ve Dayanıklı Malzemeler (Zimmet Takibi)'}</h4>
            <table class="data-table">
              <thead>
                <tr>
                  <th>${isEn ? 'Asset Description' : 'Malzeme Tanımı'}</th>
                  <th>${isEn ? 'Recipient Department' : 'Teslim Edilen Birim'}</th>
                  <th>${isEn ? 'Recipient Person' : 'Teslim Alan Kişi'}</th>
                  <th style="text-align: center; width: 80px;">${isEn ? 'Qty' : 'Adet'}</th>
                  <th style="text-align: center; width: 110px;">${isEn ? 'Req No' : 'Talep No'}</th>
                </tr>
              </thead>
              <tbody>
                ${demirbasDagitimlari.map(d => `
                  <tr>
                    <td><strong>${escapeHtml(tProduct(d.urun_adi))}</strong></td>
                    <td>${escapeHtml(tDepartment(d.birim_adi))}</td>
                    <td>${escapeHtml(d.personel_adi)}</td>
                    <td style="text-align: center; font-weight: 700; color: #d97706;">${d.adet} ${isEn ? 'Units' : 'Adet'}</td>
                    <td style="text-align: center; font-family: monospace; font-size: 11.5px; color: #2563eb;">${d.talep_no}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      </div>
    `;

    container.querySelector('#btnBultenKapat')?.addEventListener('click', () => {
      container.style.display = 'none';
    });

    container.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    container.innerHTML = `<p style="color: var(--color-destructive); text-align: center; padding: 20px;">${isEn ? 'Bulletin failed to load' : 'Bülten yüklenemedi'}: ${err.message}</p>`;
  }
}

export default renderRaporlar;
