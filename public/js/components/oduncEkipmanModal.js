// oduncEkipmanModal.js - Acil Ödünç / Ortak Ekipman Havuzu Modalı (Kırtasiye Kütüphanesi)
import api from '../api.js';
import toast from './toast.js';
import createModal from './modal.js';
import { escapeHtml } from '../utils/text.js';
import { t, getLanguage, tProduct, tCategory } from '../utils/i18n.js';

export async function openOduncEkipmanModal(onSuccess = null) {
  const isEn = getLanguage() === 'en';
  let ekipmanlar = [];
  try {
    const res = await api.getOduncEkipmanlar();
    ekipmanlar = res.ekipmanlar || [];
  } catch (err) {
    toast.error((isEn ? 'Could not load equipment pool: ' : 'Ortak ekipman listesi alınamadı: ') + err.message);
    return;
  }

  // Varsayılan tarihler: Bugün ve 3 gün sonrası
  const today = new Date().toISOString().substring(0, 10);
  const defaultEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

  const modal = createModal({
    title: isEn ? 'Emergency Equipment Loan & Shared Pool (Stationery Library)' : 'Acil Ödünç & Ortak Ekipman Havuzu (Kırtasiye Kütüphanesi)',
    maxWidth: '680px',
    content: `
      <div style="font-size: 13.5px; color: #475569; margin-bottom: 14px; line-height: 1.5;">
        ${isEn ? 'Borrow expensive office, binding, and presentation equipment needed only occasionally directly from our central warehouse.' : 'Yılda birkaç gün ihtiyaç duyulan pahalı ofis ve ciltleme ekipmanlarını merkezi depomuzdan ödünç alarak kullanabilirsiniz.'}
      </div>

      <div style="background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); border: 1.2px solid #3B82F6; border-radius: 12px; padding: 10px 14px; margin-bottom: 18px; font-size: 12.5px; color: #1E40AF; display: flex; align-items: center; gap: 8px;">
        <div>
          ${isEn ? '<strong>Sharing Economy:</strong> Reserving shared equipment earns your department <strong>+10 Green Points</strong>, and <strong>+5 Points</strong> when returned on time!' : '<strong>Paylaşım Ekonomisi:</strong> Ortak havuz ekipmanı tercih ettiğinizde biriminize <strong>+10 Yeşil Puan</strong>, zamanında iade ettiğinizde ise <strong>+5 Puan</strong> eklenir!'}
        </div>
      </div>

      <form id="formOduncEkipman" style="display: flex; flex-direction: column; gap: 14px;">
        <div class="form-group" style="margin: 0;">
          <label style="font-size: 12.5px; font-weight: 700; color: #1E293B; margin-bottom: 6px; display: block;">
            ${isEn ? 'Equipment to Borrow *' : 'Ödünç Alınacak Ekipman *'}
          </label>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; max-height: 220px; overflow-y: auto; padding: 2px;">
            ${ekipmanlar.map((e, idx) => {
              const rez = e.aktif_rezervasyon;
              const isDolu = !!rez;
              return `
                <label style="display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border: 1.5px solid ${idx === 0 && !isDolu ? '#2563EB' : '#E2E8F0'}; border-radius: 12px; background: ${isDolu ? '#F8FAFC' : '#ffffff'}; cursor: ${isDolu ? 'not-allowed' : 'pointer'}; opacity: ${isDolu ? 0.65 : 1};">
                  <input type="radio" name="selectedEkipman" value="${e.id}" ${idx === 0 && !isDolu ? 'checked' : ''} ${isDolu ? 'disabled' : ''} style="margin-top: 3px;">
                  <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; font-size: 13px; color: #0F172A;">${escapeHtml(tProduct(e.ad))}</div>
                    <div style="font-size: 11px; color: #64748B;">${escapeHtml(tCategory(e.kategori))} • ${escapeHtml(e.demirbas_kodu || '')}</div>
                    ${isDolu ? `
                      <div style="font-size: 10.5px; color: #DC2626; font-weight: 600; margin-top: 2px;">
                        ${isEn ? 'Booked' : 'Dolu'} (${rez.baslangic_tarihi} - ${rez.bitis_tarihi})
                      </div>
                    ` : `
                      <div style="font-size: 10.5px; color: #059669; font-weight: 700; margin-top: 2px;">
                        ${isEn ? 'Available' : 'Müsait'}
                      </div>
                    `}
                  </div>
                </label>
              `;
            }).join('')}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group" style="margin: 0;">
            <label style="font-size: 12.5px; font-weight: 700; color: #1E293B; margin-bottom: 4px; display: block;">
              ${isEn ? 'Start Date *' : 'Kullanım Başlangıç Tarihi *'}
            </label>
            <input type="date" id="modalOduncBaslangic" class="form-control" value="${today}" min="${today}" style="width: 100%; border-radius: 10px; font-size: 13px; padding: 8px 12px;" required>
          </div>

          <div class="form-group" style="margin: 0;">
            <label style="font-size: 12.5px; font-weight: 700; color: #1E293B; margin-bottom: 4px; display: block;">
              ${isEn ? 'Return Date (Max 7 Days) *' : 'İade Tarihi (En Fazla 7 Gün) *'}
            </label>
            <input type="date" id="modalOduncBitis" class="form-control" value="${defaultEnd}" min="${today}" style="width: 100%; border-radius: 10px; font-size: 13px; padding: 8px 12px;" required>
          </div>
        </div>

        <div class="form-group" style="margin: 0;">
          <label style="font-size: 12.5px; font-weight: 700; color: #1E293B; margin-bottom: 4px; display: block;">
            ${isEn ? 'Purpose of Use / Event Information *' : 'Kullanım Amacı / Etkinlik Bilgisi *'}
          </label>
          <input type="text" id="modalOduncAmac" class="form-control" placeholder="${isEn ? 'e.g. International Economics Congress Booklet Binding' : 'Örn: Uluslararası İktisat Kongresi Bildiri Kitapçığı Ciltleme'}" style="width: 100%; border-radius: 10px; font-size: 13px; padding: 8px 12px;" required>
        </div>

        <div class="form-group" style="margin: 0;">
          <label style="font-size: 12.5px; font-weight: 700; color: #1E293B; margin-bottom: 6px; display: block;">
            ${isEn ? 'Delivery / Pickup Preference *' : 'Teslim Alma Tercihi *'}
          </label>
          <div style="display: flex; gap: 16px;">
            <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer;">
              <input type="radio" name="teslimTuru" value="elden" checked>
              <strong>${isEn ? 'Direct Warehouse Pickup (Urgent)' : 'Depodan Elden Alacağım (Acil)'}</strong>
            </label>
            <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer;">
              <input type="radio" name="teslimTuru" value="carsamba_dagitim">
              <span>${isEn ? 'Routine Wednesday Delivery to Room' : 'Çarşamba Rutin Dağıtımıyla Odaya Gelsin'}</span>
            </label>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; border-top: 1px solid #E2E8F0; padding-top: 14px;">
          <button type="button" class="btn btn-secondary" id="btnOduncModalKapat">${t('common.cancel', 'Vazgeç')}</button>
          <button type="submit" class="btn btn-primary" id="btnOduncModalGonder">
            ${isEn ? 'Reserve Equipment (+10 Points)' : 'Ekipmanı Rezerve Et (+10 Puan)'}
          </button>
        </div>
      </form>
    `
  });

  const form = modal.element.querySelector('#formOduncEkipman');
  const btnKapat = modal.element.querySelector('#btnOduncModalKapat');

  btnKapat.addEventListener('click', () => modal.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const selRadio = modal.element.querySelector('input[name="selectedEkipman"]:checked');
    if (!selRadio) {
      toast.error(isEn ? 'Please select an available equipment to reserve.' : 'Lütfen rezerve etmek istediğiniz müsait bir ekipman seçiniz.');
      return;
    }

    const ekipman_id = selRadio.value;
    const baslangic_tarihi = modal.element.querySelector('#modalOduncBaslangic').value;
    const bitis_tarihi = modal.element.querySelector('#modalOduncBitis').value;
    const kullanim_amaci = modal.element.querySelector('#modalOduncAmac').value.trim();
    const teslim_alma_turu = modal.element.querySelector('input[name="teslimTuru"]:checked')?.value || 'elden';

    if (!baslangic_tarihi || !bitis_tarihi || !kullanim_amaci) {
      toast.error(isEn ? 'Please fill in all required fields.' : 'Lütfen tüm zorunlu alanları doldurunuz.');
      return;
    }

    const btnSubmit = modal.element.querySelector('#btnOduncModalGonder');
    btnSubmit.disabled = true;
    btnSubmit.textContent = isEn ? 'Reserving...' : 'Rezerve Ediliyor...';

    try {
      const res = await api.rezerveEtEkipman({
        ekipman_id,
        baslangic_tarihi,
        bitis_tarihi,
        kullanim_amaci,
        teslim_alma_turu
      });
      toast.success(res.mesaj || (isEn ? 'Equipment successfully reserved!' : 'Ekipman başarıyla rezerve edildi!'));
      modal.close();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error((isEn ? 'Reservation failed: ' : 'Rezervasyon başarısız: ') + err.message);
      btnSubmit.disabled = false;
      btnSubmit.textContent = isEn ? 'Reserve Equipment (+10 Points)' : 'Ekipmanı Rezerve Et (+10 Puan)';
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default openOduncEkipmanModal;
