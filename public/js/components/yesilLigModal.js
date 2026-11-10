// yesilLigModal.js - Yeşil Kampüs Liderlik Ligi Detay Modalı
import api from '../api.js';
import toast from './toast.js';
import createModal from './modal.js';
import { escapeHtml } from '../utils/text.js';
import { t, getLanguage, tDepartment, tMonth } from '../utils/i18n.js';

export async function openYesilLigModal(ay = null) {
  const isEn = getLanguage() === 'en';
  let ligData;
  try {
    ligData = await api.getYesilKampus(ay ? { ay } : {});
  } catch (err) {
    toast.error((isEn ? 'Could not load Green League data: ' : 'Yeşil Lig verileri alınamadı: ') + err.message);
    return;
  }

  const { seciliAy, ayAdi, ilkYediGun, kutlamaMesaji, akademikLig, idariLig, kullaniciBirimi } = ligData;

  function renderTableRows(liste) {
    if (!liste || liste.length === 0) {
      return `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 24px;">${isEn ? 'No records found.' : 'Kayıt bulunamadı.'}</td></tr>`;
    }
    return liste.map(item => {
      let siraBadge = `<span style="font-weight: 700; color: #475569;">#${item.sira}</span>`;
      if (item.sira === 1) siraBadge = `<span style="font-weight: 800; color: #059669; background: rgba(16, 185, 129, 0.15); padding: 2px 8px; border-radius: 9999px;">#1</span>`;
      else if (item.sira === 2) siraBadge = `<span style="font-weight: 800; color: #2563eb; background: rgba(37, 99, 235, 0.12); padding: 2px 8px; border-radius: 9999px;">#2</span>`;
      else if (item.sira === 3) siraBadge = `<span style="font-weight: 800; color: #d97706; background: rgba(217, 119, 6, 0.15); padding: 2px 8px; border-radius: 9999px;">#3</span>`;

      const isMe = kullaniciBirimi && kullaniciBirimi.birim_id === item.birim_id;
      const rowBg = isMe ? 'background: rgba(16, 185, 129, 0.12); font-weight: 600;' : '';

      return `
        <tr style="${rowBg}">
          <td style="text-align: center; width: 48px;">${siraBadge}</td>
          <td>
            <div style="font-size: 13.5px; color: #0f172a; font-weight: ${isMe ? '700' : '600'};">
              ${escapeHtml(tDepartment(item.birim_adi))}
              ${isMe ? `<span style="margin-left: 6px; font-size: 10px; background: #10b981; color: #fff; padding: 2px 6px; border-radius: 9999px;">${isEn ? 'Your Dept' : 'Biriminiz'}</span>` : ''}
            </div>
            <div style="font-size: 11px; color: #64748b;">${item.personel_sayisi || 0} ${isEn ? 'Staff' : 'Personel'}</div>
          </td>
          <td style="text-align: center; font-size: 12px; color: #059669;">+${item.iade_puani}</td>
          <td style="text-align: center; font-size: 12px; color: #2563eb;">+${item.nudge_puani}</td>
          <td style="text-align: center; font-size: 12px; color: #7c3aed;">+${item.hizli_teslim_puani}</td>
          <td style="text-align: right; font-weight: 800; font-size: 14px; color: #065f46;">
            ${item.toplam_puan} P
          </td>
        </tr>
      `;
    }).join('');
  }

  const modalTitle = isEn ? `Green Campus Leadership League (${tMonth(ayAdi) || ayAdi})` : `Yeşil Kampüs Liderlik Ligi (${ayAdi})`;

  const modal = createModal({
    title: modalTitle,
    maxWidth: '740px',
    content: `
      ${ilkYediGun ? `
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #10b981; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; font-size: 13px; color: #065f46; display: flex; align-items: center; gap: 10px;">
          <div>${escapeHtml(kutlamaMesaji || (isEn ? 'Congratulations to last month\'s sustainability champions!' : 'Geçen ayın sürdürülebilirlik şampiyonları tebrik edilir!'))}</div>
        </div>
      ` : ''}

      <!-- Puanlama Kuralı Açıklaması -->
      <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; font-size: 11.5px; color: #475569; background: #f8fafc; border-radius: 10px; padding: 10px 14px; border: 1px solid #e2e8f0;">
        <span><strong>100 P</strong> ${isEn ? 'Base Foundation' : 'Başlangıç Tabanı'}</span>
        <span style="color: #cbd5e1;">•</span>
        <span><strong style="color: #059669;">+20 P</strong> ${isEn ? 'Surplus Return' : 'Atıl Malzeme İadesi'}</span>
        <span style="color: #cbd5e1;">•</span>
        <span><strong style="color: #2563eb;">+10 P</strong> ${isEn ? 'Nudge Optimization' : 'Nudge Tasarruf Uyumu'}</span>
        <span style="color: #cbd5e1;">•</span>
        <span><strong style="color: #0891b2;">+10 P</strong> ${isEn ? 'Shared Pool Item' : 'Ortak Havuz Ekipmanı'}</span>
        <span style="color: #cbd5e1;">•</span>
        <span><strong style="color: #7c3aed;">+5 P</strong> ${isEn ? 'On-Time Receipt' : 'Zamanında Teslim Onayı'}</span>
      </div>

      <!-- Tab Seçiciler -->
      <div style="display: flex; gap: 10px; border-bottom: 2px solid #e2e8f0; margin-bottom: 16px;">
        <button id="tabAka" style="padding: 8px 16px; font-size: 13px; font-weight: 700; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid #10b981; color: #065f46;">
          ${isEn ? 'Academic Departments' : 'Akademik Bölümler'} (${akademikLig.length})
        </button>
        <button id="tabIdari" style="padding: 8px 16px; font-size: 13px; font-weight: 600; border: none; background: transparent; cursor: pointer; border-bottom: 3px solid transparent; color: #64748b;">
          ${isEn ? 'Administrative Directorates' : 'İdari Müdürlükler'} (${idariLig.length})
        </button>
      </div>

      <!-- Akademik Liste -->
      <div id="panelAka" style="display: block; max-height: 420px; overflow-y: auto;">
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f1f5f9; font-size: 12px;">
              <th style="width: 48px; text-align: center;">${isEn ? 'Rank' : 'Sıra'}</th>
              <th>${isEn ? 'Department' : 'Birim'}</th>
              <th style="width: 75px; text-align: center;">${isEn ? 'Return' : 'İade'}</th>
              <th style="width: 75px; text-align: center;">Nudge</th>
              <th style="width: 75px; text-align: center;">${isEn ? 'Delivery' : 'Teslim'}</th>
              <th style="width: 90px; text-align: right;">${isEn ? 'Total' : 'Toplam'}</th>
            </tr>
          </thead>
          <tbody>${renderTableRows(akademikLig)}</tbody>
        </table>
      </div>

      <!-- İdari Liste -->
      <div id="panelIdari" style="display: none; max-height: 420px; overflow-y: auto;">
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f1f5f9; font-size: 12px;">
              <th style="width: 48px; text-align: center;">${isEn ? 'Rank' : 'Sıra'}</th>
              <th>${isEn ? 'Department' : 'Birim'}</th>
              <th style="width: 75px; text-align: center;">${isEn ? 'Return' : 'İade'}</th>
              <th style="width: 75px; text-align: center;">Nudge</th>
              <th style="width: 75px; text-align: center;">${isEn ? 'Delivery' : 'Teslim'}</th>
              <th style="width: 90px; text-align: right;">${isEn ? 'Total' : 'Toplam'}</th>
            </tr>
          </thead>
          <tbody>${renderTableRows(idariLig)}</tbody>
        </table>
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
        <button id="btnKapatYesilLig" class="btn btn-outline btn-sm" style="border-radius: 8px;">${t('common.close', 'Kapat')}</button>
      </div>
    `
  });

  const tabAka = modal.element.querySelector('#tabAka');
  const tabIdari = modal.element.querySelector('#tabIdari');
  const panelAka = modal.element.querySelector('#panelAka');
  const panelIdari = modal.element.querySelector('#panelIdari');
  const btnKapat = modal.element.querySelector('#btnKapatYesilLig');

  tabAka.addEventListener('click', () => {
    tabAka.style.borderBottom = '3px solid #10b981';
    tabAka.style.color = '#065f46';
    tabAka.style.fontWeight = '700';
    tabIdari.style.borderBottom = '3px solid transparent';
    tabIdari.style.color = '#64748b';
    tabIdari.style.fontWeight = '600';
    panelAka.style.display = 'block';
    panelIdari.style.display = 'none';
  });

  tabIdari.addEventListener('click', () => {
    tabIdari.style.borderBottom = '3px solid #10b981';
    tabIdari.style.color = '#065f46';
    tabIdari.style.fontWeight = '700';
    tabAka.style.borderBottom = '3px solid transparent';
    tabAka.style.color = '#64748b';
    tabAka.style.fontWeight = '600';
    panelIdari.style.display = 'block';
    panelAka.style.display = 'none';
  });

  btnKapat.addEventListener('click', () => modal.close());
}
