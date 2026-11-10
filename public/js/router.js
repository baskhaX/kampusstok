// router.js - Hash Tabanlı İstemci Yönlendiricisi
import state from './state.js';
import api from './api.js';
import { renderNavbar } from './components/navbar.js';
import { renderSepetDrawer } from './components/sepetDrawer.js';
import showOnboardingModal from './components/onboardingModal.js';
import { renderGlobalFooter } from './components/globalFooter.js';
import { mountHeaderActions } from './components/headerActions.js';

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
    '#/katalog': { title: 'Malzeme Kataloğu', sub: 'Tüm Kırtasiye ve Ofis Gereçleri' },
    '#/sepet': { title: 'Malzeme Talep Sepeti', sub: 'Onay ve Sipariş Masası' },
    '#/taleplerim': { title: 'Taleplerim', sub: 'Talep ve Teslimat Takibi' },
    '#/yesil-kampus': { title: 'Yeşil Kampüs Portalı', sub: 'Sürdürülebilirlik ve Sıfır Atık' },
    '#/satinalma': { title: 'Satın Alma Masası', sub: 'Gelen Talepler ve Onay Akışı' },
    '#/yonetim': { title: 'Sistem Yönetimi', sub: 'Birimler ve Envanter Kontrolü' },
    '#/rehber': { title: 'Kurumsal Rehber', sub: 'Organizasyon ve Birim Personeli' },
    '#/raporlar': { title: 'Raporlar ve Analiz', sub: 'Stok ve Talep İstatistikleri' },
    '#/loglar': { title: 'Denetim Logları', sub: 'Sistem Hareket Kayıtları' },
    '#/istek-sahibi': { title: 'İstek Sahibi Seçimi', sub: 'Birim Personel Eşleştirme' }
  };
  const item = map[base] || { title: 'KampüsStok', sub: 'Kurumsal Talep Portalı' };
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
    document.body.classList.remove('auth-gate-loading');
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
    document.body.classList.remove('auth-gate-loading');
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

  // Rol yetki kontrolü
  if (user.rol === 'birim' && (hash === '#/satinalma' || hash === '#/yonetim' || hash === '#/yetkilendirme' || hash === '#/loglar' || hash === '#/rehber' || hash === '#/raporlar')) {
    window.location.hash = '#/katalog';
    return;
  }

  if (user.rol === 'satin_alma' && (hash === '#/katalog' || hash === '#/sepet' || hash === '#/istek-sahibi')) {
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

  const baseHash = hash.split('?')[0];
  const pageRenderer = routes[baseHash] || (user.rol === 'satin_alma' ? renderSatinalma : renderKatalog);

  appContainer.classList.remove('apple-page-transition');
  appContainer.innerHTML = '';
  await pageRenderer(appContainer);
  renderGlobalFooter(appContainer);
  // DOM reflow tetikleyerek Apple sayfa geçiş animasyonunu pürüzsüz başlat
  void appContainer.offsetWidth;
  appContainer.classList.add('apple-page-transition');
  document.body.classList.remove('auth-gate-loading');
}

export function initRouter() {
  window.addEventListener('hashchange', navigate);
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
