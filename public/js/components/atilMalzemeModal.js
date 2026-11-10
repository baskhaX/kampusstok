// atilMalzemeModal.js - İhtiyaç Fazlası Atıl Malzeme Bildirim Modalı (10 Saniyelik Hızlı Giriş)
import api from '../api.js';
import state from '../state.js';
import toast from './toast.js';
import createModal from './modal.js';
import { t, getLanguage, tBuilding } from '../utils/i18n.js';

const KAMPUS_BINACIKLARI = [
  'Ana Bina',
  'Mühendislik Binası',
  'Tıp Fakültesi',
  'GAR Binası',
  'Yabancı Diller Bölümü',
  'Teknoloji Merkezi',
  'İdari ve Mali İşler Depo',
  'Diğer'
];

export function openAtilMalzemeModal(onSuccess = null) {
  const isEn = getLanguage() === 'en';
  const user = state.user || {};
  const defaultBina = user.binaAdi || 'Ana Bina';
  const defaultOda = user.odaNo || '';

  const modal = createModal({
    title: isEn ? 'Surplus & Dormant Supplies Return Notification' : 'İhtiyaç Fazlası Atıl Malzeme Bildirimi',
    maxWidth: '560px',
    content: `
      <div style="font-size: 13.5px; color: #475569; margin-bottom: 16px; line-height: 1.5;">
        ${isEn ? 'Recover unused supplies stored in drawers or cabinets (unopened binders, clips, staples, toner, etc.) back to institution warehouse inventory.' : 'Odanızda veya biriminizde kullanmadığınız, çekmecede veya dolapta atıl duran malzemeleri (açılmamış klasör, ataş, zımba teli, toner vb.) kuruma geri kazandırabilirsiniz.'}
      </div>

      <div style="background: linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%); border: 1.2px solid #10B981; border-radius: 12px; padding: 10px 14px; margin-bottom: 18px; font-size: 12.5px; color: #065F46; display: flex; align-items: center; gap: 8px;">
        <div>
          ${isEn ? '<strong>Zero Waste Bonus:</strong> Each confirmed surplus return earns your department <strong>+20 Green Campus Points</strong>!' : '<strong>Sıfır Atık Bonusu:</strong> Teslim alınan her atıl malzeme partisi için biriminize <strong>+20 Yeşil Kampüs Puanı</strong> tanımlanır!'}
        </div>
      </div>

      <form id="formAtilMalzeme" style="display: flex; flex-direction: column; gap: 14px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="form-group" style="margin: 0;">
            <label style="font-size: 12.5px; font-weight: 700; color: #1E293B; margin-bottom: 4px; display: block;">
              ${isEn ? 'Campus Building *' : 'Bulunduğu Bina *'}
            </label>
            <select id="modalAtilBina" class="form-control" style="width: 100%; border-radius: 10px; font-size: 13px; padding: 8px 12px;" required>
              ${KAMPUS_BINACIKLARI.map(b => `
                <option value="${b}" ${b === defaultBina ? 'selected' : ''}>${tBuilding(b)}</option>
              `).join('')}
            </select>
          </div>

          <div class="form-group" style="margin: 0;">
            <label style="font-size: 12.5px; font-weight: 700; color: #1E293B; margin-bottom: 4px; display: block;">
              ${isEn ? 'Room / Floor Number *' : 'Oda / Kat Numarası *'}
            </label>
            <input type="text" id="modalAtilOda" class="form-control" placeholder="${isEn ? 'e.g. Floor 2 - Room 214' : 'Örn: Kat 2 - Oda 214'}" value="${defaultOda}" style="width: 100%; border-radius: 10px; font-size: 13px; padding: 8px 12px;" required>
          </div>
        </div>

        <div class="form-group" style="margin: 0;">
          <label style="font-size: 12.5px; font-weight: 700; color: #1E293B; margin-bottom: 4px; display: block;">
            ${isEn ? 'Supply Item Details (Free Text) *' : 'Malzeme Detay Notu (Serbest Metin) *'}
          </label>
          <textarea id="modalAtilDetay" class="form-control" rows="4" style="width: 100%; border-radius: 12px; font-size: 13px; padding: 10px 12px; line-height: 1.4;" placeholder="${isEn ? 'e.g. 4 unopened boxes of large paper clips, 2 blue binders, and 1 box of staples in our cabinet, we do not need them.' : 'Örn: Dolapta hiç açılmamış 4 kutu büyük boy ataç, 2 adet mavi arşiv klasörü ve 1 kutu zımba teli var, kullanmıyoruz.'}" required></textarea>
          <span style="font-size: 11px; color: #94A3B8; margin-top: 3px; display: block;">
            ${isEn ? 'No need to search catalog; simply describe what surplus items are available in your room.' : 'Katalogda ürün aramanıza gerek yoktur; elinizdeki fazla malzemeleri serbestçe yazabilirsiniz.'}
          </span>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; border-top: 1px solid #E2E8F0; padding-top: 14px;">
          <button type="button" class="btn btn-secondary" id="btnAtilModalKapat">${t('common.cancel', 'Vazgeç')}</button>
          <button type="submit" class="btn btn-primary" id="btnAtilModalGonder" style="background: #059669; border-color: #047857; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);">
            ${isEn ? 'Submit Return (+20 Points)' : 'Malzemeyi Bildir (+20 Puan)'}
          </button>
        </div>
      </form>
    `
  });

  const form = modal.element.querySelector('#formAtilMalzeme');
  const btnKapat = modal.element.querySelector('#btnAtilModalKapat');

  btnKapat.addEventListener('click', () => modal.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bina_adi = modal.element.querySelector('#modalAtilBina').value.trim();
    const oda_no = modal.element.querySelector('#modalAtilOda').value.trim();
    const detay_notu = modal.element.querySelector('#modalAtilDetay').value.trim();

    if (!bina_adi || !oda_no || !detay_notu) {
      toast.error(isEn ? 'Please fill in all required fields.' : 'Lütfen tüm zorunlu alanları doldurunuz.');
      return;
    }

    const btnSubmit = modal.element.querySelector('#btnAtilModalGonder');
    btnSubmit.disabled = true;
    btnSubmit.textContent = isEn ? 'Submitting...' : 'Gönderiliyor...';

    try {
      const res = await api.bildirAtilMalzeme({ bina_adi, oda_no, detay_notu });
      toast.success(res.mesaj || (isEn ? 'Surplus supplies successfully reported!' : 'İhtiyaç fazlası malzeme bildirildi!'));
      modal.close();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error((isEn ? 'Submission failed: ' : 'Bildirim gönderilemedi: ') + err.message);
      btnSubmit.disabled = false;
      btnSubmit.textContent = isEn ? 'Submit Return (+20 Points)' : 'Malzemeyi Bildir (+20 Puan)';
    }
  });
}

export default openAtilMalzemeModal;
