// onboardingModal.js - İlk Giriş Zorunlu Şifre Değiştirme ve Teslimat Adresi (Bina/Oda) Tanımlama
import createModal from './modal.js';
import api from '../api.js';
import state from '../state.js';
import toast from './toast.js';
import { t, getLanguage, tBuilding } from '../utils/i18n.js';

let modalInstance = null;

const BINA_SECENEKLERI = [
  'Ana Bina (Rektörlük)',
  'Mühendislik Fakültesi Binası',
  'İktisadi ve İdari Bilimler Fakültesi Binası',
  'Hukuk ve Tıp Fakültesi Binası',
  'Fen-Edebiyat Fakültesi Binası',
  'Teknoloji Merkezi',
  'Sosyal Tesisler',
  'Öğrenci Konukevi / Yurtlar',
  'Diğer / İdari Birimler'
];

export function showOnboardingModal(user = state.user, isMandatory = true) {
  if (modalInstance) return; // Zaten açık

  const isEn = getLanguage() === 'en';

  const title = isMandatory 
    ? (isEn ? 'Welcome! First Login & Delivery Setup' : 'Hoş Geldiniz! İlk Giriş & Teslimat Bilgileri')
    : (isEn ? 'Update Account Password & Delivery Details' : 'Hesap Şifresi ve Teslimat Bilgilerini Güncelle');

  const modal = createModal({
    title,
    maxWidth: '520px',
    closable: !isMandatory,
    contentHtml: `
      <form id="onboardingForm" style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: rgba(30, 58, 138, 0.05); border: 1px solid rgba(30, 58, 138, 0.15); border-radius: 10px; padding: 12px 14px; font-size: 13px; color: #1E3A8A; line-height: 1.45;">
          ${isMandatory 
            ? (isEn 
                ? '<strong>First-Time Login Notice:</strong> To ensure your stationery supplies reach your office directly, please enter your <strong>Building</strong> and <strong>Room Number</strong>, and update your temporary password.' 
                : '<strong>İlk Giriş Bilgilendirmesi:</strong> Kırtasiye siparişlerinizin ofisinize eksiksiz ve doğrudan teslim edilebilmesi için lütfen <strong>Bina</strong> ve <strong>Oda Numaranızı</strong> giriniz ve geçici şifrenizi güncelleyiniz.')
            : (isEn 
                ? 'You can update your security password or revise your building and room number in case of office relocation.' 
                : 'Güvenliğiniz için şifrenizi güncelleyebilir, ofis taşıma durumlarında teslimat bina ve oda numaranızı revize edebilirsiniz.')}
        </div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
          <div>
            <label style="font-size: 12.5px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--color-foreground);">
              ${isEn ? 'Current / Temporary Password' : 'Mevcut / Geçici Şifre'} <span style="color: var(--color-destructive);">*</span>
            </label>
            <input type="password" id="mevcutSifre" required placeholder="${isEn ? 'Your current or temporary password' : 'Mevcut veya geçici şifreniz'}">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-size: 12.5px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--color-foreground);">
                ${isEn ? 'New Password' : 'Yeni Şifre'} <span style="color: var(--color-destructive);">*</span>
              </label>
              <input type="password" id="yeniSifre" required minlength="6" placeholder="${isEn ? 'At least 6 characters' : 'En az 6 karakter'}">
            </div>
            <div>
              <label style="font-size: 12.5px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--color-foreground);">
                ${isEn ? 'Confirm New Password' : 'Yeni Şifre (Tekrar)'} <span style="color: var(--color-destructive);">*</span>
              </label>
              <input type="password" id="yeniSifreTekrar" required minlength="6" placeholder="${isEn ? 'Re-type password' : 'Tekrar yazın'}">
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--color-border); padding-top: 12px; display: flex; flex-direction: column; gap: 12px;">
          <h4 style="font-size: 13px; font-weight: 700; color: #0F172A; margin: 0;">${isEn ? 'Office & Delivery Location (For Courier Dispatch)' : 'Ofis & Teslimat Adresi (Kurye / Dağıtım İçin)'}</h4>

          <div>
            <label style="font-size: 12.5px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--color-foreground);">
              ${isEn ? 'Campus Building / Block' : 'Bulunduğunuz Bina / Blok'} <span style="color: var(--color-destructive);">*</span>
            </label>
            <select id="binaAdi" required style="width: 100%;">
              <option value="">${isEn ? 'Please select your building...' : 'Lütfen binanızı seçiniz...'}</option>
              ${BINA_SECENEKLERI.map(b => `
                <option value="${b}" ${user?.binaAdi === b ? 'selected' : ''}>${tBuilding(b)}</option>
              `).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-size: 12.5px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--color-foreground);">
                ${isEn ? 'Room / Office No' : 'Oda / Ofis No'} <span style="color: var(--color-destructive);">*</span>
              </label>
              <input type="text" id="odaNo" required value="${user?.odaNo || ''}" placeholder="${isEn ? 'e.g. B-314 or 245' : 'Örn: B-314 veya 245'}">
            </div>
            <div>
              <label style="font-size: 12.5px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--color-foreground);">
                ${isEn ? 'Extension Phone (Optional)' : 'Dahili Telefon (Opsiyonel)'}
              </label>
              <input type="text" id="telefon" placeholder="${isEn ? 'e.g. 8123' : 'Örn: 8123'}">
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px;">
          ${!isMandatory ? `<button type="button" class="btn btn-outline" id="btnIptal">${t('common.cancel', 'İptal')}</button>` : ''}
          <button type="submit" class="btn btn-primary" id="btnKaydet" style="min-width: 140px;">
            ${isMandatory ? (isEn ? 'Save Details & Start' : 'Bilgileri Kaydet ve Başla') : (isEn ? 'Update Changes' : 'Değişiklikleri Güncelle')}
          </button>
        </div>
      </form>
    `
  });

  modalInstance = modal;

  const form = modal.element.querySelector('#onboardingForm');
  if (!isMandatory) {
    const iptalBtn = modal.element.querySelector('#btnIptal');
    if (iptalBtn) {
      iptalBtn.addEventListener('click', () => {
        modal.close();
        modalInstance = null;
      });
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const mevcut_sifre = form.querySelector('#mevcutSifre').value;
    const yeni_sifre = form.querySelector('#yeniSifre').value;
    const yeni_sifre_tekrar = form.querySelector('#yeniSifreTekrar').value;
    const bina_adi = form.querySelector('#binaAdi').value;
    const oda_no = form.querySelector('#odaNo').value.trim();
    const telefon = form.querySelector('#telefon').value.trim();

    if (yeni_sifre !== yeni_sifre_tekrar) {
      toast.error(isEn ? 'New passwords do not match!' : 'Yeni şifreler birbirini tutmuyor!');
      return;
    }

    if (yeni_sifre.length < 6) {
      toast.error(isEn ? 'New password must be at least 6 characters.' : 'Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (!bina_adi) {
      toast.error(isEn ? 'Please select your building.' : 'Lütfen bulunduğunuz binayı seçiniz.');
      return;
    }

    if (!oda_no) {
      toast.error(isEn ? 'Please enter your room number.' : 'Lütfen oda numaranızı giriniz.');
      return;
    }

    const saveBtn = form.querySelector('#btnKaydet');
    saveBtn.disabled = true;
    saveBtn.textContent = isEn ? 'Saving...' : 'Kaydediliyor...';

    try {
      await api.sifreDegistir({
        mevcut_sifre,
        yeni_sifre,
        yeni_sifre_tekrar,
        bina_adi,
        oda_no,
        telefon
      });

      // State güncelle
      if (state.user) {
        state.user.sifreDegistirmeli = false;
        state.user.binaAdi = bina_adi;
        state.user.odaNo = oda_no;
      }

      toast.success(isEn ? 'Password and delivery address successfully updated!' : 'Şifreniz ve teslimat adresiniz başarıyla güncellendi!');
      modal.close();
      modalInstance = null;
    } catch (err) {
      toast.error(err.message || (isEn ? 'Update failed.' : 'Güncelleme yapılamadı.'));
      saveBtn.disabled = false;
      saveBtn.textContent = isMandatory ? (isEn ? 'Save Details & Start' : 'Bilgileri Kaydet ve Başla') : (isEn ? 'Update Changes' : 'Değişiklikleri Güncelle');
    }
  });
}

export default showOnboardingModal;
