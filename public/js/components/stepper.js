// stepper.js - Görsel-3 Dikey İlerleme Takip Şeridi (Progress Rail Stepper)
// Apple-Like Liquid Glass UI & Adım Adım Talep Takibi
import { getLanguage, tDepartment, tProduct, tUnit, tBuilding } from '../utils/i18n.js';
import { escapeHtml } from '../utils/text.js';

export function renderProgressRailStepperHtml(talep) {
  const isEn = getLanguage() === 'en';
  const durum = talep.durum || 'beklemede';
  const isRevize = durum === 'revize_onaylandi';
  const isRed = durum === 'reddedildi';
  const isOnay = durum === 'onaylandi';
  const isTeslim = durum === 'teslim_edildi';

  // 1. Adım: Talep Ulaştı (Daima Tamamlandı)
  const step1State = 'completed';
  const step1Tarih = (talep.olusturmaTarihiText || talep.olusturma_tarihi || '').substring(0, 16);

  // 2. Adım: Talep Onaylandı veya Sipariş Değiştirildi
  let step2State = 'upcoming';
  let step2Title = isEn ? 'Requisition Approved' : 'Talep Onaylandı';
  let step2Metric = isEn ? 'Pending Review' : 'İnceleme Bekliyor';
  let step2Desc = isEn ? 'Under procurement review.' : 'Satın alma incelemesi yapılıyor.';
  let step2Note = '';

  if (durum === 'beklemede') {
    step2State = 'active';
    step2Metric = isEn ? 'Evaluating' : 'İnceleniyor';
    step2Desc = isEn ? 'Procurement Directorate is evaluating your request.' : 'Satın Alma Müdürlüğü talebinizi değerlendiriyor.';
  } else if (isOnay || (isTeslim && !talep.sonuc_gerekcesi)) {
    step2State = 'completed';
    step2Title = isEn ? 'Requisition Approved' : 'Talep Onaylandı';
    step2Metric = isEn ? 'Approved' : 'Onaylandı';
    step2Desc = isEn ? 'Requisition items have been approved.' : 'Talebinizdeki malzemeler onaylandı.';
    step2Note = isEn ? 'All items approved by procurement.' : 'Tüm ürünler satın alma tarafından onaylandı.';
  } else if (isRevize || (isTeslim && talep.sonuc_gerekcesi)) {
    step2State = 'completed';
    step2Title = isEn ? 'Order Adjusted' : 'Sipariş Düzenlendi';
    step2Metric = isEn ? 'Quantity Adjusted' : 'Miktar Düzenlendi';
    step2Desc = isEn ? 'Approved with updated quantities based on inventory.' : 'Depo stok durumuna göre miktarlar güncellenerek onaylandı.';
    step2Note = talep.sonuc_gerekcesi 
      ? `${isEn ? 'Adjustment Note: ' : 'Değişiklik Notu: '}${talep.sonuc_gerekcesi}` 
      : (isEn ? 'Item quantities adjusted according to warehouse balance.' : 'Depo stok durumuna göre ürün adetleri düzenlenerek onaylandı.');
  } else if (isRed) {
    step2State = 'rejected';
    step2Title = isEn ? 'Requisition Rejected' : 'Talep Reddedildi';
    step2Metric = isEn ? 'Cancelled' : 'İptal';
    step2Desc = isEn ? 'Requisition was not approved.' : 'Talep onaylanmadı.';
    step2Note = talep.sonuc_gerekcesi 
      ? `${isEn ? 'Rejection Reason: ' : 'Ret Nedeni: '}${talep.sonuc_gerekcesi}` 
      : (isEn ? 'Requisition not approved by Procurement.' : 'Talep satın alma tarafından uygun görülmedi.');
  }

  // 3. Adım: Teslim Günü Belirlendi
  let step3State = 'upcoming';
  let step3Metric = isEn ? 'Scheduled' : 'Planlanıyor';
  let step3Desc = isEn ? 'Dispatches on Wednesday following approval.' : 'Onay sonrası ilk Çarşamba dağıtıma çıkar.';
  let step3Note = '';

  const teslimatTarihi = talep.teslimatTarihiText || talep.teslimat_tarihi;

  if (isOnay || isRevize) {
    step3State = 'active';
    step3Metric = teslimatTarihi ? teslimatTarihi.replace(' 00:00:00', '') : (isEn ? 'Upcoming Wednesday' : 'İlk Çarşamba');
    step3Desc = isEn ? 'Being packed in warehouse for delivery.' : 'Depoda teslimat için paketleniyor.';
    step3Note = isEn ? `Delivery Day: ${step3Metric} (Delivered to departments every Wednesday).` : `Teslimat Günü: ${step3Metric} (Her Çarşamba birimlere teslim edilir).`;
  } else if (isTeslim) {
    step3State = 'completed';
    step3Metric = teslimatTarihi ? teslimatTarihi.replace(' 00:00:00', '') : (isEn ? 'Wednesday' : 'Çarşamba');
    step3Desc = isEn ? 'Dispatched on scheduled delivery day.' : 'Teslimat günü gerçekleştirildi.';
    step3Note = isEn ? `Distribution Schedule: ${step3Metric}` : `Dağıtım Planı: ${step3Metric}`;
  }

  // 4. Adım: Malzemeler Teslim Edildi
  let step4State = 'upcoming';
  let step4Metric = talep.personel_adi || (isEn ? 'Department Officer' : 'Birim Yetkilisi');
  let step4Desc = isEn ? 'Delivered against signature to department officer.' : 'Birim yetkilisine imza karşılığı teslim.';
  let step4Note = isEn 
    ? `Recipient: ${talep.personel_adi || 'Department Officer'} (${tDepartment(talep.birim_adi) || ''})` 
    : `Teslim Alacak: ${talep.personel_adi || 'Birim Sorumlusu'} (${talep.birim_adi || ''})`;

  const kullaniciTeslimAldi = talep.kullanici_teslim_aldi === 1;

  if (kullaniciTeslimAldi) {
    step4State = 'completed';
    step4Metric = isEn ? '✓ Confirmed' : '✓ Teyit Edildi';
    step4Desc = isEn ? 'Materials received and confirmed by department user.' : 'Malzemeler teslim alındı ve birim kullanıcısı tarafından onaylandı.';
    step4Note = isEn 
      ? `Received by: ${talep.personel_adi || 'Officer'} (${talep.kullanici_teslim_tarihi ? talep.kullanici_teslim_tarihi.substring(0, 16) : ''})` 
      : `Teslim Alan: ${talep.personel_adi || 'Yetkili'} (${talep.kullanici_teslim_tarihi ? talep.kullanici_teslim_tarihi.substring(0, 16) : ''})`;
  } else if (isTeslim) {
    step4State = 'active';
    step4Metric = isEn ? 'Awaiting User Confirmation' : 'Kullanıcı Onayı Bekliyor';
    step4Desc = isEn ? 'Procurement completed delivery; awaiting department confirmation.' : 'Satın alma teslimatı gerçekleştirdi, birim onayı bekleniyor.';
    step4Note = isEn ? 'Please confirm receipt by clicking "Received" upon delivery.' : 'Lütfen malzemeleri aldığınızda "Teslim Aldım" butonuna basarak onaylayınız.';
  }

  // 5. Adım: Arşivlendi
  let step5State = 'upcoming';
  let step5Metric = isEn ? 'Process End' : 'Süreç Sonu';
  let step5Desc = isEn ? 'Digital record closed following completed delivery.' : 'Teslim sonrası dijital kayıt kapatılır.';
  let step5Note = '';

  if (kullaniciTeslimAldi) {
    step5State = 'completed';
    step5Metric = isEn ? 'Archived (Closed)' : 'Arşivde (Kapandı)';
    step5Desc = isEn ? 'Requisition fulfilled and archived successfully.' : 'Talep başarıyla tamamlandı ve süreç arşivlendi.';
    step5Note = isEn ? 'Stationery supply delivery closed with mutual confirmation.' : 'Kırtasiye malzeme teslimatı karşılıklı teyit edilerek kapatıldı.';
  } else if (isTeslim) {
    step5State = 'upcoming';
    step5Metric = isEn ? 'Awaiting Confirmation' : 'Teyit Bekliyor';
    step5Desc = isEn ? 'Archiving will finalize once user confirms receipt.' : 'Kullanıcı teslim onayı verdiğinde arşivleme tamamlanacaktır.';
    step5Note = isEn ? 'Awaiting user confirmation.' : 'Kullanıcı teyidi bekleniyor.';
  }

  const renderNodeIcon = (state, stepNum) => {
    if (state === 'completed') return '✓';
    if (state === 'rejected') return '✕';
    if (state === 'active') return '';
    return stepNum;
  };

  const statusLabel = durum === 'onaylandi' 
    ? (isEn ? 'Approved' : 'Onaylandı') 
    : (durum === 'revize_onaylandi' 
      ? (isEn ? 'Revised' : 'Revize Edildi') 
      : (durum === 'reddedildi' 
        ? (isEn ? 'Rejected' : 'Reddedildi') 
        : (durum === 'teslim_edildi' 
          ? (isEn ? 'Delivered' : 'Teslim Edildi') 
          : (isEn ? 'Pending' : 'Beklemede'))));

  return `
    <div class="workflow-stepper-container">
      <!-- Sol Sütun: Dikey İlerleme Takip Şeridi (Visual 3 Stepper) -->
      <div class="workflow-rail-col">
        <div class="rail-header">
          <div class="rail-title">${isEn ? 'Requisition Workflow Rail' : 'Süreç Takip Şeridi'}</div>
          <div class="rail-subtitle">${talep.talep_no} • ${isEn ? 'Hierarchical Workflow' : 'Hiyerarşik İş Akışı'}</div>
        </div>

        <div class="progress-rail">
          <!-- 1. Adım: Talep Ulaştı -->
          <div class="rail-step ${step1State}">
            <div class="rail-step-node">${renderNodeIcon(step1State, 1)}</div>
            <div class="rail-step-content">
              <div class="rail-step-top">
                <span class="rail-step-title">${isEn ? 'Requisition Received' : 'Talep Ulaştı'}</span>
                <span class="rail-step-metric">${step1Tarih || (isEn ? 'Logged' : 'Kaydedildi')}</span>
              </div>
              <div class="rail-step-desc">${isEn ? 'Requisition logged and forwarded to Procurement.' : 'Talep sisteme kaydedildi ve satın almaya iletildi.'}</div>
              <div class="rail-step-note">${isEn ? 'Req No:' : 'Talep No:'} ${talep.talep_no} • ${isEn ? 'Requester:' : 'İstek Sahibi:'} ${talep.personel_adi}</div>
            </div>
          </div>

          <!-- 2. Adım: Talep Onaylandı veya Sipariş Değiştirildi -->
          <div class="rail-step ${step2State}">
            <div class="rail-step-node">${renderNodeIcon(step2State, 2)}</div>
            <div class="rail-step-content">
              <div class="rail-step-top">
                <span class="rail-step-title">${step2Title}</span>
                <span class="rail-step-metric">${step2Metric}</span>
              </div>
              <div class="rail-step-desc">${step2Desc}</div>
              ${step2Note ? `<div class="rail-step-note">${step2Note}</div>` : ''}
            </div>
          </div>

          <!-- 3. Adım: Teslim Günü Belirlendi -->
          <div class="rail-step ${step3State}">
            <div class="rail-step-node">${renderNodeIcon(step3State, 3)}</div>
            <div class="rail-step-content">
              <div class="rail-step-top">
                <span class="rail-step-title">${isEn ? 'Delivery Day Scheduled' : 'Teslim Günü Belirlendi'}</span>
                <span class="rail-step-metric">${step3Metric}</span>
              </div>
              <div class="rail-step-desc">${step3Desc}</div>
              ${step3Note ? `<div class="rail-step-note">${step3Note}</div>` : ''}
            </div>
          </div>

          <!-- 4. Adım: Malzemeler Teslim Edildi -->
          <div class="rail-step ${step4State}">
            <div class="rail-step-node">${renderNodeIcon(step4State, 4)}</div>
            <div class="rail-step-content">
              <div class="rail-step-top">
                <span class="rail-step-title">${isEn ? 'Materials Delivered' : 'Malzemeler Teslim Edildi'}</span>
                <span class="rail-step-metric">${step4Metric}</span>
              </div>
              <div class="rail-step-desc">${step4Desc}</div>
              ${step4Note ? `<div class="rail-step-note">${step4Note}</div>` : ''}
            </div>
          </div>

          <!-- 5. Adım: Arşivlendi -->
          <div class="rail-step ${step5State}">
            <div class="rail-step-node">${renderNodeIcon(step5State, 5)}</div>
            <div class="rail-step-content">
              <div class="rail-step-top">
                <span class="rail-step-title">${isEn ? 'Archived' : 'Arşivlendi'}</span>
                <span class="rail-step-metric">${step5Metric}</span>
              </div>
              <div class="rail-step-desc">${step5Desc}</div>
              ${step5Note ? `<div class="rail-step-note">${step5Note}</div>` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Sağ Sütun: Aktif Bilgi Paneli (Visual 3 Active Configuration Panel) -->
      <div class="workflow-panel-col">
        <div class="workflow-card">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
            <div>
              <span class="badge badge-primary" style="font-size: 11px; margin-bottom: 6px; display: inline-block;">
                ${talep.talep_no}
              </span>
              <h3 style="font-size: 17px; font-weight: 700; color: #0F172A; margin: 0;">
                ${escapeHtml(tDepartment(talep.birim_adi))}
              </h3>
              <div style="font-size: 12.5px; color: var(--text-dim); margin-top: 2px;">
                ${isEn ? 'Requester:' : 'İstek Sahibi:'} <strong>${escapeHtml(talep.personel_adi)}</strong> (${escapeHtml(talep.personel_eposta || '')})
                ${(talep.bina_adi || talep.oda_no) ? ` • <span style="color: #2563eb; font-weight: 600;">${talep.bina_adi ? escapeHtml(tBuilding(talep.bina_adi)) : ''}${talep.bina_adi && talep.oda_no ? ' / ' : ''}${talep.oda_no ? (isEn ? 'Room ' : 'Oda: ') + escapeHtml(talep.oda_no) : ''}</span>` : ''}
              </div>
            </div>

            <div style="text-align: right;">
              <span class="badge badge-${durum === 'onaylandi' ? 'success' : (durum === 'revize_onaylandi' ? 'warning' : (durum === 'reddedildi' ? 'danger' : 'neutral'))}" style="font-size: 12px; padding: 5px 12px;">
                ${statusLabel}
              </span>
            </div>
          </div>

          <!-- Meta Grid -->
          <div class="workflow-meta-grid">
            <div class="workflow-meta-item">
              <span class="workflow-meta-label">${isEn ? 'Requisition Date' : 'Talep Tarihi'}</span>
              <strong>${talep.olusturmaTarihiText || talep.olusturma_tarihi || '-'}</strong>
            </div>
            <div class="workflow-meta-item">
              <span class="workflow-meta-label">${isEn ? 'Planned Delivery' : 'Planlanan Teslimat'}</span>
              <strong style="color: #2563EB;">${talep.teslimatTarihiText || talep.teslimat_tarihi || (isEn ? 'Wednesday Distribution' : 'Çarşamba Dağıtımı')}</strong>
            </div>
            <div class="workflow-meta-item">
              <span class="workflow-meta-label">${isEn ? 'Total Items' : 'Toplam Kalem'}</span>
              <strong>${talep.kalemler ? talep.kalemler.length : (talep.kalem_sayisi || 0)} ${isEn ? 'Types of Supplies' : 'Çeşit Malzeme'}</strong>
            </div>
            <div class="workflow-meta-item">
              <span class="workflow-meta-label">${isEn ? 'Delivery Address & Recipient' : 'Teslimat Adresi & Yetkili'}</span>
              <strong>${escapeHtml(talep.personel_adi)}${talep.bina_adi ? ` (${escapeHtml(tBuilding(talep.bina_adi))}${talep.oda_no ? (isEn ? ' - Room ' : ' - Oda ') + escapeHtml(talep.oda_no) : ''})` : ''}</strong>
            </div>
          </div>

          ${talep.sonuc_gerekcesi ? `
            <div style="background: rgba(254, 243, 199, 0.7); border: 1.2px solid rgba(245, 158, 11, 0.4); border-left: 4px solid #D97706; padding: 12px 16px; border-radius: 12px; margin-bottom: 18px; font-size: 13px; color: #92400E;">
              <strong>${isEn ? 'Procurement Remarks / Revision Reason:' : 'Satın Alma Açıklaması / Değişiklik Gerekçesi:'}</strong>
              <div style="margin-top: 3px;">${escapeHtml(talep.sonuc_gerekcesi)}</div>
            </div>
          ` : ''}

          <!-- Kalemler Tablosu -->
          <div style="margin-top: 10px;">
            <h4 style="font-size: 14px; font-weight: 700; color: #0F172A; margin-bottom: 10px;">
              ${isEn ? 'Requisition Items & Fulfillment Status' : 'Talep Kalemleri & Karşılanma Durumu'}
            </h4>
            <div class="table-container" style="max-height: 240px; overflow-y: auto;">
              <table class="data-table" style="font-size: 13px;">
                <thead>
                  <tr>
                    <th>${isEn ? 'Item' : 'Ürün'}</th>
                    <th style="text-align: center;">${isEn ? 'Requested' : 'İstenen'}</th>
                    <th style="text-align: center;">${isEn ? 'Approved' : 'Onaylanan'}</th>
                  </tr>
                </thead>
                <tbody>
                  ${(talep.kalemler || []).map(k => `
                    <tr>
                      <td>
                        <strong>${escapeHtml(tProduct(k.urun_adi))}</strong>
                        <div style="font-size: 11px; color: var(--text-dim);">${escapeHtml(tUnit(k.olcu_birimi))}</div>
                      </td>
                      <td style="text-align: center; font-weight: 600;">
                        ${k.istenen_adet} ${escapeHtml(tUnit(k.olcu_birimi))}
                      </td>
                      <td style="text-align: center; font-weight: 700; color: ${k.onaylanan_adet !== null ? '#2563EB' : 'inherit'};">
                        ${k.onaylanan_adet !== null ? `${k.onaylanan_adet} ${escapeHtml(tUnit(k.olcu_birimi))}` : '-'}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
