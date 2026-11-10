// headerActions.js - Standart Sağ Üst Çubuk Bileşeni (Bildirim Çanı, Kullanıcı Profili + Dropdown, Ses Aç/Kapat)
import state from '../state.js';
import api from '../api.js';
import toast from './toast.js';
import { confirmModal } from './modal.js';
import showOnboardingModal from './onboardingModal.js';
import { mountNotificationBell, playChimeSound } from './notificationBell.js';
import { openVekaletModal } from './vekaletModal.js';
import { escapeHtml } from '../utils/text.js';

function getInitials(name) {
  if (!name) return '??';
  const clean = name.replace(/^(prof\.|dr\.|doç\.|arş\.|öğr\.|gör\.|uzm\.)\s*/gi, '').trim().split(/\s+/);
  if (clean.length === 1) return clean[0].substring(0, 2).toLocaleUpperCase('tr-TR');
  return (clean[0][0] + clean[clean.length - 1][0]).toLocaleUpperCase('tr-TR');
}

/**
 * Sağ üst köşedeki standart işlem kümesini hedef DOM elemanına yerleştirir.
 * @param {HTMLElement} targetEl - Yerleştirilecek kapsayıcı eleman
 * @param {Object} options - Ek seçenekler (örn. onVekaletChange)
 */
export function mountHeaderActions(targetEl, options = {}) {
  if (!targetEl) return;

  const user = state.user;
  if (!user) {
    targetEl.innerHTML = '';
    return;
  }

  const isBirim = user.rol === 'birim';
  const isSatinAlma = user.rol === 'satin_alma';
  const isAdmin = user.kullaniciAdi === 'admin' || user.kullaniciAdi === 'yapici';

  // Vekalet / Görev Devri Bilgisi Kontrolü (Satın Alma ve Admin için)
  let vekilInfo = null;
  if (isSatinAlma || isAdmin) {
    if (user.aktifVekalet) {
      vekilInfo = {
        adSoyad: user.aktifVekalet.alan_ad_soyad,
        rolModelEtiket: user.aktifVekalet.rol_model_etiket,
        tur: user.aktifVekalet.tur,
        personelId: user.aktifVekalet.alan_personel_id
      };
    } else {
      try {
        const raw = localStorage.getItem('satinalma_vekil_info');
        if (raw) vekilInfo = JSON.parse(raw);
      } catch (e) {}
    }
  }

  const birimAd = user.birimAdi || user.birim_adi || '';

  let uName = '';
  let uRole = '';
  let customInitials = null;

  if (isAdmin) {
    uName = 'Yapıcı';
    uRole = 'Sistem Tasarımcısı';
    customInitials = 'YP';
  } else if (user.seciliPersonel && user.seciliPersonel.adSoyad) {
    uName = user.seciliPersonel.adSoyad;
    uRole = birimAd || (isSatinAlma ? 'Satın Alma Müdürlüğü' : 'Birim Kullanıcısı');
  } else if (user.personelAdi || user.adSoyad) {
    uName = user.personelAdi || user.adSoyad;
    uRole = birimAd || (isSatinAlma ? 'Satın Alma Müdürlüğü' : 'Birim Kullanıcısı');
  } else if (isSatinAlma) {
    if (user.kullaniciAdi === 'Atest') {
      uName = 'Satın Alma Yetkilisi';
      uRole = 'Satın Alma Müdürlüğü';
      customInitials = 'SY';
    } else {
      uName = user.kullaniciAdi || 'Satın Alma Yetkilisi';
      uRole = birimAd || 'Satın Alma Müdürlüğü';
    }
  } else {
    uName = birimAd || user.kullaniciAdi || 'Kullanıcı';
    uRole = birimAd || 'Birim Kullanıcısı';
  }

  let isVekil = false;
  let vekilBadgeText = 'Vekil';
  if (isSatinAlma && !isAdmin && vekilInfo && vekilInfo.adSoyad) {
    uName = vekilInfo.adSoyad;
    vekilBadgeText = vekilInfo.rolModelEtiket || 'Kırtasiye Sorumlusu';
    uRole = `Satın Alma Müdürlüğü (${vekilBadgeText})`;
    isVekil = true;
    customInitials = getInitials(vekilInfo.adSoyad);
  }

  const uInitials = customInitials || getInitials(uName);

  // Ses Durumu
  let isMuted = localStorage.getItem('satinalma_ses_durumu') === '0';

  targetEl.innerHTML = `
    <div class="satinalma-top-actions" style="display: flex; align-items: center; gap: 10px;">
      <!-- 1. Bildirim Çanı -->
      <div id="headerBellSlot"></div>

      <!-- 2. Kullanıcı Profili Kapsülü ve Dropdown -->
      <div class="profile-capsule-wrapper" style="position: relative;">
        <div id="headerProfileCapsule" class="profile-header-capsule" role="button" tabindex="0" title="Kullanıcı Menüsü">
          <div class="profile-avatar-circle" id="headerProfileAvatar">${escapeHtml(uInitials)}</div>
          <div class="profile-text-wrap">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="profile-user-name" id="headerProfileName">${escapeHtml(uName)}</span>
              ${isVekil ? `<span class="vekalet-badge">${escapeHtml(vekilBadgeText)}</span>` : ''}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="opacity: 0.6; transition: transform 0.2s;" id="profileChevron"><path d="m6 9 6 6 6-6"/></svg>
            </div>
            <span class="profile-user-role" id="headerProfileBirim">${escapeHtml(uRole)}</span>
          </div>
        </div>

        <!-- Açılır Profil Menüsü (Apple Liquid Glass) -->
        <div class="profile-dropdown-menu" id="headerProfileDropdown">
          <div class="profile-dropdown-header">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="profile-dropdown-name">${escapeHtml(uName)}</span>
              ${isVekil ? `<span class="vekalet-badge">${escapeHtml(vekilBadgeText)}</span>` : ''}
            </div>
            <div class="profile-dropdown-sub">${escapeHtml(uRole)}</div>
          </div>

          ${isBirim ? `
            <button type="button" class="profile-dropdown-item" id="btnDropdownIstekSahibi">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span>İstek Sahibi Değiştir</span>
            </button>
          ` : `
            <button type="button" class="profile-dropdown-item" id="btnDropdownVekalet">
              <div style="text-align: left; line-height: 1.25;">
                <div style="font-weight: 600;">Yetki Devri ve Görevlendirme</div>
                <div style="font-size: 11px; color: var(--text-muted, #64748B);">Satın Alma Müdürü Onay Masası</div>
              </div>
            </button>
          `}

          <button type="button" class="profile-dropdown-item" id="btnDropdownSifre">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>Şifre Değiştir</span>
          </button>

          <div class="profile-dropdown-divider"></div>

          <button type="button" class="profile-dropdown-item text-destructive" id="btnDropdownLogout">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>

      <!-- 3. Bildirim Sesi Düğmesi -->
      <div id="headerSesToggle" class="switch-ui ${isMuted ? 'is-off' : 'is-on'}" role="button" tabindex="0" title="Bildirim Sesini Aç veya Kapat">
        <span id="headerSesText">${isMuted ? 'Ses Kapalı' : 'Ses Açık'}</span>
        <div class="switch-handle"></div>
      </div>
    </div>
  `;

  // 1) Bildirim Çanını Monte Et
  const bellSlot = targetEl.querySelector('#headerBellSlot');
  if (bellSlot) {
    mountNotificationBell(bellSlot);
  }

  // 2) Dropdown Menü Aç / Kapat Olayları
  const capsule = targetEl.querySelector('#headerProfileCapsule');
  const dropdown = targetEl.querySelector('#headerProfileDropdown');
  const chevron = targetEl.querySelector('#profileChevron');

  const closeDropdown = () => {
    if (dropdown) dropdown.classList.remove('is-open');
    if (chevron) chevron.style.transform = 'rotate(0deg)';
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle('is-open');
    if (chevron) chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
  };

  capsule?.addEventListener('click', toggleDropdown);

  // Dışarı tıklandığında menüyü kapat
  const onDocClick = (e) => {
    if (!targetEl.contains(e.target)) {
      closeDropdown();
    }
  };
  if (targetEl._headerDocClickHandler) {
    document.removeEventListener('click', targetEl._headerDocClickHandler);
  }
  targetEl._headerDocClickHandler = onDocClick;
  document.addEventListener('click', onDocClick);

  // 3) Menü Aksiyonları
  const btnIstekSahibi = targetEl.querySelector('#btnDropdownIstekSahibi');
  btnIstekSahibi?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeDropdown();
    window.location.hash = '#/istek-sahibi';
  });

  const btnVekalet = targetEl.querySelector('#btnDropdownVekalet');
  btnVekalet?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeDropdown();
    openVekaletModal(() => {
      mountHeaderActions(targetEl, options);
      if (typeof options.onVekaletChange === 'function') {
        options.onVekaletChange();
      }
    });
  });

  const btnSifre = targetEl.querySelector('#btnDropdownSifre');
  btnSifre?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeDropdown();
    showOnboardingModal(state.user, false);
  });

  const btnLogout = targetEl.querySelector('#btnDropdownLogout');
  btnLogout?.addEventListener('click', async (e) => {
    e.stopPropagation();
    closeDropdown();
    const ok = await confirmModal({
      title: 'Çıkış Yap',
      message: 'Oturumunuz güvenli bir şekilde sonlandırılacaktır. Devam etmek istiyor musunuz?',
      confirmText: 'Çıkış Yap',
      confirmVariant: 'danger'
    });
    if (!ok) return;

    try {
      await api.logout();
      state.setUser(null);
      toast.info('Güvenli çıkış yapıldı.');
      window.location.hash = '#/giris';
    } catch (err) {
      toast.error(err.message);
    }
  });

  // 4) Ses Aç / Kapat Olayı
  const sesToggle = targetEl.querySelector('#headerSesToggle');
  const sesText = targetEl.querySelector('#headerSesText');

  sesToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    isMuted = !isMuted;
    localStorage.setItem('satinalma_ses_durumu', isMuted ? '0' : '1');

    if (isMuted) {
      sesToggle.classList.remove('is-on');
      sesToggle.classList.add('is-off');
      if (sesText) sesText.textContent = 'Ses Kapalı';
      toast.info('Bildirim sesleri kapatıldı.');
    } else {
      sesToggle.classList.remove('is-off');
      sesToggle.classList.add('is-on');
      if (sesText) sesText.textContent = 'Ses Açık';
      playChimeSound();
      toast.success('Bildirim sesleri açıldı.');
    }
  });
}

export default mountHeaderActions;
