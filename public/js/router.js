// router.js - Hash Tabanlı İstemci Yönlendiricisi
import state from './state.js';
import api from './api.js';
import { renderNavbar } from './components/navbar.js';
import { renderSepetDrawer } from './components/sepetDrawer.js';
import showOnboardingModal from './components/onboardingModal.js';
import { renderGlobalFooter } from './components/globalFooter.js';
import { mountHeaderActions } from './components/headerActions.js';
import { initI18n, t } from './utils/i18n.js';

import renderGiris from './pages/giris.js';
import renderIstekSahibi from './pages/istekSahibi.js';
import renderKatalog from './pages/katalog.js?v=20261107_phase1';
import renderSepet from './pages/sepet.js';
import renderTaleplerim from './pages/taleplerim.js';
import renderSatinalma from './pages/satinalma.js';
import renderRehber from './pages/rehber.js';
import { renderYonetim, renderYetkilendirme, renderLoglar } from './pages/yonetim.js';
import renderRaporlar from './pages/raporlar.js';
import renderHizliTeslim from './pages/hizliTeslim.js';
import renderYesilKampus from './pages/yesilKampus.js';

const routes = {
  '#/giris': renderGiris,
  '#/istek-sahibi': renderIstekSahibi,
  '#/katalog': renderKatalog,
  '#/yesil-kampus': renderYesilKampus,
  '#/sepet': renderSepet,
  '#/taleplerim': renderTaleplerim,
  '#/satinalma': renderSatinalma,
  '#/rehber': renderRehber,
  '#/yonetim': renderYonetim,
  '#/yetkilendirme': (appContainer) => { window.location.hash = '#/rehber'; },
  '#/loglar': renderLoglar,
  '#/raporlar': renderRaporlar
};

function getBreadcrumbHtml(hash, user) {
  const base = hash.split('?')[0] || '';
  const map = {
    '#/katalog': { title: t('breadcrumb.catalog', 'Malzeme Kataloğu'), sub: t('breadcrumb.catalogSub', 'Tüm Kırtasiye ve Ofis Gereçleri') },
    '#/sepet': { title: t('breadcrumb.cart', 'Malzeme Talep Sepeti'), sub: t('breadcrumb.cartSub', 'Onay ve Sipariş Masası') },
    '#/taleplerim': { title: t('breadcrumb.requests', 'Taleplerim'), sub: t('breadcrumb.requestsSub', 'Talep ve Teslimat Takibi') },
    '#/yesil-kampus': { title: t('breadcrumb.greenCampus', 'Yeşil Kampüs Portalı'), sub: t('breadcrumb.greenCampusSub', 'Sürdürülebilirlik ve Sıfır Atık') },
    '#/satinalma': { title: t('breadcrumb.procurement', 'Satın Alma Masası'), sub: t('breadcrumb.procurementSub', 'Gelen Talepler ve Onay Akışı') },
    '#/yonetim': { title: t('breadcrumb.admin', 'Sistem Yönetimi'), sub: t('breadcrumb.adminSub', 'Birimler ve Envanter Kontrolü') },
    '#/rehber': { title: t('breadcrumb.directory', 'Kurumsal Rehber'), sub: t('breadcrumb.directorySub', 'Organizasyon ve Birim Personeli') },
    '#/raporlar': { title: t('breadcrumb.reports', 'Raporlar ve Analiz'), sub: t('breadcrumb.reportsSub', 'Stok ve Talep İstatistikleri') },
    '#/loglar': { title: t('breadcrumb.logs', 'Denetim Logları'), sub: t('breadcrumb.logsSub', 'Sistem Hareket Kayıtları') },
    '#/istek-sahibi': { title: t('breadcrumb.requesterSelect', 'İstek Sahibi Seçimi'), sub: t('breadcrumb.requesterSelectSub', 'Birim Personel Eşleştirme') }
  };
  const item = map[base] || { title: t('breadcrumb.defaultTitle', 'KampüsStok'), sub: t('breadcrumb.defaultSub', 'Kurumsal Talep Portalı') };
  return `
    <div class="breadcrumb-chip">
      <span class="breadcrumb-title">${item.title}</span>
      <span class="breadcrumb-sep">•</span>
      <span class="breadcrumb-sub">${item.sub}</span>
    </div>
  `;
}

function updateGlobalHeader(hash, user) {
  const header = document.getElementById('globalAppHeader');
  const slot = document.getElementById('globalHeaderActionsSlot');
  const breadcrumb = document.getElementById('globalHeaderBreadcrumb');

  if (!header || !slot) return;

  if (!user || hash.startsWith('#/hizli-teslim/')) {
    header.style.display = 'none';
    return;
  }

  header.style.display = 'flex';
  if (breadcrumb) {
    breadcrumb.innerHTML = getBreadcrumbHtml(hash, user);
  }
  mountHeaderActions(slot, {
    onVekaletChange: () => {
      window.dispatchEvent(new CustomEvent('vekalet-changed'));
    }
  });
}

export async function navigate() {
  try {
    const navContainer = document.getElementById('navbarContainer');
    const appContainer = document.getElementById('appContent');
    let hash = window.location.hash || '';

    // Hızlı Teslimat (Mobil QR Kod) Sayfası - Kimlik zorunluluğu olmadan açılır
    if (hash.startsWith('#/hizli-teslim/')) {
      updateGlobalHeader('#/hizli-teslim/', null);
      const talepNo = decodeURIComponent(hash.replace('#/hizli-teslim/', '').split('?')[0]);
      document.body.classList.add('is-login');
      const mobileToggleBtn = document.getElementById('btnMobileNavToggle');
      if (mobileToggleBtn) mobileToggleBtn.style.display = 'none';
      const mainPane = document.getElementById('mainContentPane');
      if (mainPane) mainPane.classList.add('full-width');
      if (navContainer) navContainer.innerHTML = '';
      renderHizliTeslim(appContainer, talepNo);
      return;
    }

    // Giriş durumunu sunucudan kontrol et
    if (!state.user && hash !== '#/giris') {
      try {
        const res = await api.getMe();
        state.setUser(res.kullanici);
      } catch {
        state.setUser(null);
        window.location.hash = '#/giris';
        return;
      }
    }

    // Kullanıcı yoksa sadece giriş sayfası açılır
    if (!state.user) {
      updateGlobalHeader('#/giris', null);
      document.body.classList.add('is-login');
      renderNavbar(navContainer);
      renderGiris(appContainer);
      return;
    }

    document.body.classList.remove('is-login');

    const user = state.user;

    // İlk Giriş & Teslimat Bilgileri Onboarding Kontrolü
    if (user && (user.sifreDegistirmeli || (user.hesapPersonelId && !user.binaAdi))) {
      showOnboardingModal(user, true);
    }

    // Varsayılan sayfa yönlendirmesi
    if (!hash || hash === '#/' || hash === '#/giris') {
      if (user.rol === 'satin_alma') {
        window.location.hash = '#/satinalma';
        return;
      } else {
        if (!user.seciliPersonel && !user.hesapPersonelId) {
          window.location.hash = '#/istek-sahibi';
          return;
        }
        window.location.hash = '#/katalog';
        return;
      }
    }

    // Bireysel personel hesabı olan kullanıcılar istek sahibi seçimine gitmez, doğrudan kataloğa yönlendirilir
    if (user.rol === 'birim' && user.hesapPersonelId && hash === '#/istek-sahibi') {
      window.location.hash = '#/katalog';
      return;
    }

    // İstek sahibi zorunluluğu kontrolü (Sadece genel/ortak birim hesapları için)
    if (user.rol === 'birim' && !user.seciliPersonel && !user.hesapPersonelId && hash !== '#/istek-sahibi') {
      window.location.hash = '#/istek-sahibi';
      return;
    }

    const baseHash = hash.split('?')[0];

    // Rol yetki kontrolü
    if (user.rol === 'birim' && (baseHash === '#/satinalma' || baseHash === '#/yonetim' || baseHash === '#/yetkilendirme' || baseHash === '#/loglar' || baseHash === '#/rehber' || baseHash === '#/raporlar')) {
      window.location.hash = '#/katalog';
      return;
    }

    if (user.rol === 'satin_alma' && (baseHash === '#/katalog' || baseHash === '#/sepet' || baseHash === '#/istek-sahibi')) {
      window.location.hash = '#/satinalma';
      return;
    }

    // Sepet drawer'ını başlat ve sepet sayısını güncelle
    if (user.rol === 'birim') {
      renderSepetDrawer();
      api.getSepet().then(res => {
        state.setCartCount(res.sepet?.toplamKalem || 0);
      }).catch(() => {});
    }

    // Global üst başlık ve işlem çubuğunu güncelle
    updateGlobalHeader(hash, user);

    // Sayfayı render et
    renderNavbar(navContainer);

    const pageRenderer = routes[baseHash] || (user.rol === 'satin_alma' ? renderSatinalma : renderKatalog);

    try {
      appContainer.classList.remove('apple-page-transition');
      appContainer.innerHTML = '';
      await pageRenderer(appContainer);
      renderGlobalFooter(appContainer);
      // DOM reflow tetikleyerek Apple sayfa geçiş animasyonunu pürüzsüz başlat
      void appContainer.offsetWidth;
      appContainer.classList.add('apple-page-transition');
    } catch (err) {
      console.error('Page rendering error:', err);
      appContainer.innerHTML = `
        <div style="padding: 40px; text-align: center; color: #DC2626;">
          <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px;">${t('common.pageLoadError', 'Sayfa Yüklenemedi')}</h3>
          <p style="font-size: 13px; color: #64748B;">${err.message || t('common.unknownError', 'Bilinmeyen bir hata oluştu.')}</p>
          <button onclick="window.location.hash='#/'" class="btn btn-primary" style="margin-top: 16px;">${t('common.returnHome', 'Ana Sayfaya Dön')}</button>
        </div>
      `;
    }
  } catch (outerErr) {
    console.error('Routing critical error:', outerErr);
  } finally {
    document.body.classList.remove('auth-gate-loading');
  }
}

export function initRouter() {
  initI18n();
  window.addEventListener('hashchange', navigate);
  window.addEventListener('app:languageChanged', () => {
    navigate();
  });
  state.subscribe(() => {
    const navContainer = document.getElementById('navbarContainer');
    if (navContainer) renderNavbar(navContainer);
    if (state.user) {
      updateGlobalHeader(window.location.hash || '', state.user);
    }
  });
  navigate();
}

export default initRouter;
