// giris.js - Giriş Ekranı (Tam Ekran Mimari Teknik Çizim Arka Planı & Şifre Göster/Gizle Butonlu)
import api from '../api.js';
import state from '../state.js';
import toast from '../components/toast.js';
import createModal from '../components/modal.js';
import { t } from '../utils/i18n.js';

export function renderGiris(appContainer) {
  // Eski tema kalıntısı varsa temizle
  try {
    localStorage.removeItem('kirtasiye_login_theme');
  } catch (e) {}

  const savedUser = localStorage.getItem('kirtasiye_beni_hatirla_kullanici') || '';

  // SVG İkonları (Görsel Çeviren Şifre Göster / Gizle)
  const eyeIconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  `;
  const eyeOffIconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
      <line x1="2" x2="22" y1="2" y2="22"/>
    </svg>
  `;

  appContainer.innerHTML = `
    <!-- Tam Ekran Kapsayıcı (100vw x 100vh) - Modern Apple Cam Efektli & Nötr Arduvaz Gradyan -->
    <div style="position: relative; width: 100vw; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px; box-sizing: border-box; overflow-x: hidden; background: radial-gradient(circle at 20% 20%, rgba(16, 185, 129, 0.08) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(59, 130, 246, 0.08) 0%, transparent 40%), linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 50%, #cbd5e1 100%);">
      
      <!-- Arka Plan İnce Geometrik Izgara Çizgileri (Nötr ve Soyut) -->
      <div style="position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 0; pointer-events: none; opacity: 0.35; background-image: radial-gradient(#94a3b8 1px, transparent 1px); background-size: 32px 32px;"></div>

      <!-- Ana Giriş Kartı -->
      <div class="card" style="max-width: 440px; width: 100%; padding: 36px 32px; margin: auto; position: relative; z-index: 10; border-radius: 20px; background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1.5px solid rgba(255, 255, 255, 0.95); box-shadow: 0 20px 48px rgba(15, 23, 42, 0.12);">
        <div style="text-align: center; margin-bottom: 24px;">
          <img src="/assets/logo.svg" alt="KampüsStok" style="height: 64px; width: auto; object-fit: contain; margin-bottom: 12px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.08));">
          <h2 style="font-size: 22px; margin-bottom: 6px; font-weight: 800; letter-spacing: -0.02em; color: #0f172a;">${t('auth.title', 'KampüsStok Portalı')}</h2>
          <p style="font-size: 13.5px; margin: 0; color: #64748b;">${t('auth.subtitle', 'Birim veya Satın Alma hesabınızla giriş yapınız.')}</p>
        </div>

        <form id="loginForm" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px; color: #0f172a;">${t('auth.identifier', 'Kullanıcı Adı veya Kurumsal E-Posta')}</label>
            <input type="text" id="kullaniciAdi" value="${savedUser}" placeholder="" required autofocus autocomplete="username" style="width: 100%; padding: 11px 14px; border-radius: 10px; font-size: 14px; outline: none; box-sizing: border-box; border: 1.2px solid #cbd5e1; background: #ffffff; color: #0f172a; transition: all 0.2s ease;">
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label style="font-size: 13px; font-weight: 600; margin: 0; color: #0f172a;">${t('auth.password', 'Şifre')}</label>
              <a href="javascript:void(0)" id="btnSifremiUnuttum" style="font-size: 12px; color: var(--color-primary); text-decoration: none; font-weight: 600;">${t('auth.forgotPassword', 'Şifremi Unuttum?')}</a>
            </div>
            <div style="position: relative; display: flex; align-items: center;">
              <input type="password" id="sifre" placeholder="••••••••" required autocomplete="current-password" style="width: 100%; padding: 11px 42px 11px 14px; border-radius: 10px; font-size: 14px; outline: none; box-sizing: border-box; border: 1.2px solid #cbd5e1; background: #ffffff; color: #0f172a; transition: all 0.2s ease;">
              <button type="button" id="btnToggleSifre" title="Şifreyi Göster / Gizle" aria-label="Şifreyi Göster" style="position: absolute; right: 8px; background: none; border: none; cursor: pointer; color: #64748b; padding: 6px; display: flex; align-items: center; justify-content: center; outline: none; border-radius: 6px; transition: color 0.15s ease;">
                ${eyeIconSvg}
              </button>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; margin-top: -2px;">
            <input type="checkbox" id="beniHatirla" ${savedUser ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
            <label for="beniHatirla" style="font-size: 13px; color: var(--color-foreground); cursor: pointer; user-select: none;">
              ${t('auth.rememberMe', 'Beni Hatırla (30 gün oturumu açık tut)')}
            </label>
          </div>

          <button type="submit" id="btnLoginSubmit" class="btn btn-primary" style="width: 100%; padding: 12.5px; margin-top: 8px; font-size: 14.5px; font-weight: 700; border-radius: 10px;">
            ${t('auth.signIn', 'Giriş Yap')}
          </button>
        </form>

        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; display: flex; flex-direction: column; gap: 4px;">
          <p style="margin: 0;">${t('auth.loginNotice', 'Kurumsal E-posta veya Kullanıcı Adınız ile giriş yapabilirsiniz.')}</p>
        </div>
      </div>
    </div>
  `;

  const form = appContainer.querySelector('#loginForm');
  const btnSubmit = appContainer.querySelector('#btnLoginSubmit');
  const btnForgot = appContainer.querySelector('#btnSifremiUnuttum');
  const sifreInput = appContainer.querySelector('#sifre');
  const btnToggleSifre = appContainer.querySelector('#btnToggleSifre');

  // Şifre Göster / Gizle (Görsel Çeviren) Dinleyicisi
  btnToggleSifre?.addEventListener('click', () => {
    const isPassword = sifreInput.type === 'password';
    sifreInput.type = isPassword ? 'text' : 'password';
    btnToggleSifre.innerHTML = isPassword ? eyeOffIconSvg : eyeIconSvg;
    btnToggleSifre.setAttribute('aria-label', isPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster');
    btnToggleSifre.title = isPassword ? 'Şifreyi Gizle' : 'Şifreyi Göster';
    btnToggleSifre.style.color = isPassword ? '#1e293b' : '#64748b';
    sifreInput.focus();
  });

  // Şifremi Unuttum Modalı
  btnForgot?.addEventListener('click', (e) => {
    e.preventDefault();
    openSifremiUnuttumModal();
  });

  // Giriş Yap Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const kullanici_adi = form.querySelector('#kullaniciAdi').value.trim();
    const sifre = sifreInput.value;
    const beni_hatirla = form.querySelector('#beniHatirla').checked;

    try {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Giriş yapılıyor...';

      if (beni_hatirla) {
        localStorage.setItem('kirtasiye_beni_hatirla_kullanici', kullanici_adi);
      } else {
        localStorage.removeItem('kirtasiye_beni_hatirla_kullanici');
      }

      const res = await api.login({ kullanici_adi, sifre, beni_hatirla });
      state.setUser(res.kullanici);
      toast.success(`Hoş geldiniz, ${res.kullanici.birimAdi || res.kullanici.kullaniciAdi}`);

      if (res.kullanici.rol === 'satin_alma') {
        location.hash = '#/satinalma';
      } else if (res.kullanici.seciliPersonel || res.kullanici.hesapPersonelId) {
        location.hash = '#/katalog';
      } else {
        location.hash = '#/istek-sahibi';
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = 'Giriş Yap';
    }
  });
}

function openSifremiUnuttumModal() {
  const modal = createModal({
    title: 'Şifremi Unuttum',
    maxWidth: '520px',
    content: `
      <form id="sifremiUnuttumForm" style="display: flex; flex-direction: column; gap: 16px; padding: 4px 0;">
        <p style="font-size: 13.5px; color: #475569; line-height: 1.5; margin: 0;">
          Kurumsal e-posta adresinizi veya kullanıcı adınızı giriniz. Şifre sıfırlama talebiniz sistem yöneticisine (Satın Alma Müdürlüğü) iletilecek ve geçici şifreniz kurumsal e-posta adresinize gönderilecektir.
        </p>

        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px; color: #0f172a;">
            Kurumsal E-Posta / Kullanıcı Adı <span style="color: #ef4444;">*</span>
          </label>
          <input type="text" id="unuttumInput" placeholder="ad.soyad@kurum.edu.tr veya kullanıcı adı" required style="width: 100%; font-size: 13.5px; padding: 10px 12px; border-radius: 8px; border: 1.2px solid #cbd5e1; outline: none; box-sizing: border-box;" autofocus>
        </div>

        <div id="unuttumSonucAlani" style="display: none;"></div>

        <div id="unuttumButtonRow" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px;">
          <button type="button" id="btnUnuttumIptal" class="btn btn-outline" style="padding: 9px 18px; font-weight: 600;">Vazgeç</button>
          <button type="submit" id="btnUnuttumGonder" class="btn btn-primary" style="padding: 9px 20px; font-weight: 700;">
            Yetkiliye Sıfırlama Talebi Gönder
          </button>
        </div>
      </form>
    `
  });

  const form = modal.element.querySelector('#sifremiUnuttumForm');
  const input = modal.element.querySelector('#unuttumInput');
  const btnIptal = modal.element.querySelector('#btnUnuttumIptal');
  const btnGonder = modal.element.querySelector('#btnUnuttumGonder');
  const sonucAlani = modal.element.querySelector('#unuttumSonucAlani');
  const buttonRow = modal.element.querySelector('#unuttumButtonRow');

  btnIptal?.addEventListener('click', () => modal.close());

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const val = input ? input.value.trim() : '';
    if (!val) {
      toast.warning('Lütfen kurumsal e-posta adresinizi veya kullanıcı adınızı giriniz.');
      input?.focus();
      return;
    }

    try {
      btnGonder.disabled = true;
      btnGonder.textContent = 'İletiliyor...';

      const res = await api.sifremiUnuttum(val);
      toast.success('Şifre sıfırlama talebiniz yetkiliye iletildi.');

      const targetEmail = res.eposta || val;
      const targetName = res.ad_soyad || val;

      sonucAlani.style.display = 'block';
      sonucAlani.innerHTML = `
        <div style="background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 12px; padding: 16px; margin-top: 4px;">
          <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; color: #065f46; font-size: 14.5px; margin-bottom: 6px;">
            <span style="font-size: 18px;">✓</span>
            <span>Talebiniz Başarıyla Alındı</span>
          </div>
          <p style="font-size: 13px; color: #047857; line-height: 1.45; margin: 0 0 10px 0;">
            Sayın <strong>${targetName}</strong>, şifre sıfırlama talebiniz sistem yöneticisine iletilmiştir.
          </p>
          <div style="font-size: 12.5px; color: #334155; background: #ffffff; border: 1px solid #d1fae5; border-radius: 8px; padding: 10px 12px;">
            Geçici şifreniz yönetici onayından sonra <strong>${targetEmail}</strong> kurumsal e-posta adresinize iletilecektir.
          </div>
        </div>
      `;

      input.disabled = true;
      buttonRow.innerHTML = `
        <button type="button" id="btnUnuttumKapat" class="btn btn-primary" style="padding: 9px 24px; font-weight: 700;">
          Tamam, Kapat
        </button>
      `;
      buttonRow.querySelector('#btnUnuttumKapat')?.addEventListener('click', () => modal.close());

    } catch (err) {
      toast.error(err.message);
      btnGonder.disabled = false;
      btnGonder.textContent = 'Yetkiliye Sıfırlama Talebi Gönder';
    }
  });
}

export default renderGiris;
