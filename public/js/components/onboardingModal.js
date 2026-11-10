// onboardingModal.js - İlk Giriş Zorunlu Şifre Değiştirme ve Teslimat Adresi (Bina/Oda) Tanımlama
import createModal from './modal.js';
import api from '../api.js';
import state from '../state.js';
import toast from './toast.js';

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

  const title = isMandatory 
    ? 'Hoş Geldiniz! İlk Giriş & Teslimat Bilgileri' 
    : 'Hesap Şifresi ve Teslimat Bilgilerini Güncelle';

  const modal = createModal({
    title,
    maxWidth: '520px',
    closable: !isMandatory,
    contentHtml: `
      <form id="onboardingForm" style="display: flex; flex-direction: column; gap: 14px;">
        <div style="background: rgba(30, 58, 138, 0.05); border: 1px solid rgba(30, 58, 138, 0.15); border-radius: 10px; padding: 12px 14px; font-size: 13px; color: #1E3A8A; line-height: 1.45;">
          ${isMandatory 
            ? '<strong>İlk Giriş Bilgilendirmesi:</strong> Kırtasiye siparişlerinizin ofisinize eksiksiz ve doğrudan teslim edilebilmesi için lütfen <strong>Bina</strong> ve <strong>Oda Numaranızı</strong> giriniz ve geçici şifrenizi güncelleyiniz.' 
            : 'Güvenliğiniz için şifrenizi güncelleyebilir, ofis taşıma durumlarında teslimat bina ve oda numaranızı revize edebilirsiniz.'}
        </div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
          <div>
            <label style="font-size: 12.5px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--color-foreground);">
              Mevcut / Geçici Şifre <span style="color: var(--color-destructive);">*</span>
            </label>
            <input type="password" id="mevcutSifre" required placeholder="Mevcut veya geçici şifreniz">
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-size: 12.5px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--color-foreground);">
                Yeni Şifre <span style="color: var(--color-destructive);">*</span>
              </label>
              <input type="password" id="yeniSifre" required minlength="6" placeholder="En az 6 karakter">
            </div>
            <div>
              <label style="font-size: 12.5px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--color-foreground);">
                Yeni Şifre (Tekrar) <span style="color: var(--color-destructive);">*</span>
              </label>
              <input type="password" id="yeniSifreTekrar" required minlength="6" placeholder="Tekrar yazın">
            </div>
          </div>
        </div>

        <div style="border-top: 1px solid var(--color-border); padding-top: 12px; display: flex; flex-direction: column; gap: 12px;">
          <h4 style="font-size: 13px; font-weight: 700; color: #0F172A; margin: 0;">Ofis & Teslimat Adresi (Kurye / Dağıtım İçin)</h4>

          <div>
            <label style="font-size: 12.5px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--color-foreground);">
              Bulunduğunuz Bina / Blok <span style="color: var(--color-destructive);">*</span>
            </label>
            <select id="binaAdi" required style="width: 100%;">
              <option value="">Lütfen binanızı seçiniz...</option>
              ${BINA_SECENEKLERI.map(b => `
                <option value="${b}" ${user?.binaAdi === b ? 'selected' : ''}>${b}</option>
              `).join('')}
            </select>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <label style="font-size: 12.5px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--color-foreground);">
                Oda / Ofis No <span style="color: var(--color-destructive);">*</span>
              </label>
              <input type="text" id="odaNo" required value="${user?.odaNo || ''}" placeholder="Örn: B-314 veya 245">
            </div>
            <div>
              <label style="font-size: 12.5px; font-weight: 600; display: block; margin-bottom: 4px; color: var(--color-foreground);">
                Dahili Telefon (Opsiyonel)
              </label>
              <input type="text" id="telefon" placeholder="Örn: 8123">
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px;">
          ${!isMandatory ? '<button type="button" class="btn btn-outline" id="btnIptal">İptal</button>' : ''}
          <button type="submit" class="btn btn-primary" id="btnKaydet" style="min-width: 140px;">
            ${isMandatory ? 'Bilgileri Kaydet ve Başla' : 'Değişiklikleri Güncelle'}
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
      toast.error('Yeni şifreler birbirini tutmuyor!');
      return;
    }

    if (yeni_sifre.length < 6) {
      toast.error('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    if (!bina_adi) {
      toast.error('Lütfen bulunduğunuz binayı seçiniz.');
      return;
    }

    if (!oda_no) {
      toast.error('Lütfen oda numaranızı giriniz.');
      return;
    }

    const saveBtn = form.querySelector('#btnKaydet');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Kaydediliyor...';

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

      toast.success('Şifreniz ve teslimat adresiniz başarıyla güncellendi!');
      modal.close();
      modalInstance = null;
    } catch (err) {
      toast.error(err.message || 'Güncelleme yapılamadı.');
      saveBtn.disabled = false;
      saveBtn.textContent = isMandatory ? 'Bilgileri Kaydet ve Başla' : 'Değişiklikleri Güncelle';
    }
  });
}

export default showOnboardingModal;
