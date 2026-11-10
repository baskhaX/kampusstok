// navbar.js - Sol Tarafta Sabit Dikey Apple Liquid Glass Menüsü & Ağaç Hiyerarşisi (Accordion & Mini Dock)
import state from '../state.js';
import api from '../api.js';
import createModal, { confirmModal } from './modal.js';
import toast from './toast.js';
import showOnboardingModal from './onboardingModal.js';
import { initCommandPalette, toggleCommandPalette } from './commandPalette.js';

let commandPaletteInitialized = false;
let isSidebarCollapsed = localStorage.getItem('etu_sidebar_collapsed') === '1';
let isSatinalmaTreeOpen = true;
let isYonetimTreeOpen = false;

export function renderNavbar(container) {
  if (!commandPaletteInitialized) {
    initCommandPalette();
    commandPaletteInitialized = true;
  }

  const user = state.user;
  const mainPane = document.getElementById('mainContentPane');
  const mobileToggleBtn = document.getElementById('btnMobileNavToggle');
  const mobileBackdrop = document.getElementById('mobileNavBackdrop');

  if (!user) {
    if (container) {
      container.innerHTML = '';
      container.style.display = 'none';
      container.classList.remove('mobile-open');
    }
    if (mobileToggleBtn) mobileToggleBtn.style.display = 'none';
    if (mobileBackdrop) mobileBackdrop.classList.remove('open');
    if (mainPane) mainPane.classList.add('full-width');
    document.body.classList.add('is-login');
    document.body.classList.remove('sidebar-collapsed');
    return;
  }

  // Giriş yapılmışsa düzeni ayarla
  if (mobileToggleBtn) mobileToggleBtn.style.display = '';
  if (mainPane) mainPane.classList.remove('full-width');
  document.body.classList.remove('is-login');

  // Kompakt durum sınıfı
  if (isSidebarCollapsed) {
    document.body.classList.add('sidebar-collapsed');
  } else {
    document.body.classList.remove('sidebar-collapsed');
  }

  if (!container) return;
  container.style.display = 'flex';

  const isBirim = user.rol === 'birim';
  const isSatinAlma = user.rol === 'satin_alma';

  const fullHash = window.location.hash || '';
  const currentBaseHash = fullHash.split('?')[0];
  const queryStr = fullHash.split('?')[1] || '';
  const searchParams = new URLSearchParams(queryStr);

  if (currentBaseHash === '#/satinalma') {
    isSatinalmaTreeOpen = true;
    isYonetimTreeOpen = false;
  } else if (currentBaseHash === '#/yonetim') {
    isYonetimTreeOpen = true;
    isSatinalmaTreeOpen = false;
  } else {
    isSatinalmaTreeOpen = false;
    isYonetimTreeOpen = false;
  }

  // Logo Ortalanmış Başlık Bloğu (Kapatıp açma butonu buradan kaldırıldı, en alta alındı)
  const brandBlockHtml = `
    <div class="dock-brand">
      <img src="/assets/logo.svg" alt="KampüsStok" style="width: 32px; height: 32px; border-radius: 6px;">
      <div class="dock-brand-text">
        <h2>KampüsStok</h2>
        <p>Kırtasiye & Depo Portalı</p>
      </div>
    </div>
  `;

  // En Alttan Çıkan Aç/Kapa Düğmesi (Açıkken <<< , Kapalıyken >>>)
  const collapseBarHtml = `
    <div class="dock-collapse-bar">
      <button type="button" class="btn-dock-collapse-bottom" id="btnDockCollapse" title="${isSidebarCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}">
        <span class="collapse-icon">
          ${isSidebarCollapsed ? `
            <svg width="22" height="13" viewBox="0 0 24 16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 3 11 8 6 13"></polyline>
              <polyline points="11 3 16 8 11 13"></polyline>
              <polyline points="16 3 21 8 16 13"></polyline>
            </svg>
          ` : `
            <svg width="22" height="13" viewBox="0 0 24 16" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="18 3 13 8 18 13"></polyline>
              <polyline points="13 3 8 8 13 13"></polyline>
              <polyline points="8 3 3 8 8 13"></polyline>
            </svg>
          `}
        </span>
        <span class="collapse-text">${isSidebarCollapsed ? '' : 'Menüyü Daralt'}</span>
      </button>
    </div>
  `;

  if (isSatinAlma) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; flex: 1; min-height: 0;">
        ${brandBlockHtml}

        <nav class="dock-nav-list">
          <!-- Gelen Kutusu (Ağaç Hiyerarşisi + Hover Popover) -->
          <div class="dock-nav-wrapper ${isSatinalmaTreeOpen ? 'is-open' : ''}" id="wrapperSatinalma">
            <a href="#/satinalma" class="dock-nav-item" id="navSatinalma">
              <span class="dock-icon-wrap" title="Gelen Kutusu & Talep Yönetimi">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                  <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                </svg>
              </span>
              <span class="dock-nav-label">Gelen Kutusu</span>
              <span class="sidebar-accordion-chevron" id="chevronSatinalma">▼</span>
            </a>

            <!-- Açık Mod Ağaç Dalları (Alt Tablarda İkonsuz - Temiz Metin) -->
            <div class="sidebar-tree-container" id="treeSatinalma">
              <div class="sidebar-tree-list">
                <a href="#/satinalma?durum=beklemede" class="sidebar-tree-item" data-durum="beklemede">
                  <span>Bekleyen Talepler</span>
                </a>
                <a href="#/satinalma?durum=teslimat" class="sidebar-tree-item" data-durum="teslimat">
                  <span>Teslim Bekleyenler</span>
                </a>
                <a href="#/satinalma?durum=revize_onaylandi" class="sidebar-tree-item" data-durum="revize_onaylandi">
                  <span>Revize Edilenler</span>
                </a>
                <a href="#/satinalma?durum=reddedildi" class="sidebar-tree-item" data-durum="reddedildi">
                  <span>Reddedilenler</span>
                </a>
                <a href="#/satinalma?durum=teslim_edildi" class="sidebar-tree-item" data-durum="teslim_edildi">
                  <span>Teslim Edilenler</span>
                </a>
                <a href="#/satinalma?durum=atil_malzeme" class="sidebar-tree-item" data-durum="atil_malzeme">
                  <span>İade Malzemeler</span>
                </a>
                <a href="#/satinalma?durum=odunc_ekipman" class="sidebar-tree-item" data-durum="odunc_ekipman">
                  <span>Ödünç Ekipmanlar</span>
                </a>
              </div>
            </div>

            <!-- Kompakt Modda Hover Flyout Popover -->
            <div class="dock-flyout-popover">
              <div class="flyout-header">
                <span class="flyout-title">Gelen Kutusu & Talepler</span>
                <span class="flyout-tag">Alt Menü</span>
              </div>
              <div class="flyout-list">
                <a href="#/satinalma?durum=beklemede" class="flyout-item">Bekleyen Talepler</a>
                <a href="#/satinalma?durum=teslimat" class="flyout-item">Teslim Bekleyenler</a>
                <a href="#/satinalma?durum=revize_onaylandi" class="flyout-item">Revize Edilenler</a>
                <a href="#/satinalma?durum=reddedildi" class="flyout-item">Reddedilenler</a>
                <a href="#/satinalma?durum=teslim_edildi" class="flyout-item">Teslim Edilenler</a>
                <a href="#/satinalma?durum=atil_malzeme" class="flyout-item">İade Malzemeler</a>
                <a href="#/satinalma?durum=odunc_ekipman" class="flyout-item">Ödünç Ekipmanlar</a>
              </div>
            </div>
          </div>

          <!-- Depo Yönetimi (Ağaç Hiyerarşisi + Hover Popover) -->
          <div class="dock-nav-wrapper ${isYonetimTreeOpen ? 'is-open' : ''}" id="wrapperYonetim">
            <a href="#/yonetim" class="dock-nav-item" id="navYonetim">
              <span class="dock-icon-wrap" title="Depo & Malzeme Yönetimi">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </span>
              <span class="dock-nav-label">Depo Yönetimi</span>
              <span class="sidebar-accordion-chevron" id="chevronYonetim">▼</span>
            </a>

            <!-- Açık Mod Ağaç Dalları (Alt Tablarda İkonsuz - Temiz Metin) -->
            <div class="sidebar-tree-container" id="treeYonetim">
              <div class="sidebar-tree-list">
                <a href="#/yonetim?tab=urunler" class="sidebar-tree-item" data-tab="urunler">
                  <span>Ürünler & Stok</span>
                </a>
                <a href="#/yonetim?tab=stok" class="sidebar-tree-item" data-tab="stok">
                  <span>Stok Hareketleri</span>
                </a>
                <a href="#/yonetim?tab=kategoriler" class="sidebar-tree-item" data-tab="kategoriler">
                  <span>Kategori Ağacı</span>
                </a>
                <a href="#/satinalma?durum=teslim_edildi" class="sidebar-tree-item" data-tab="teslimat">
                  <span>Teslim Edilen Siparişler</span>
                </a>
              </div>
            </div>

            <!-- Kompakt Modda Hover Flyout Popover -->
            <div class="dock-flyout-popover">
              <div class="flyout-header">
                <span class="flyout-title">Depo Yönetimi</span>
                <span class="flyout-tag">Alt Menü</span>
              </div>
              <div class="flyout-list">
                <a href="#/yonetim?tab=urunler" class="flyout-item">Ürünler & Stok</a>
                <a href="#/yonetim?tab=stok" class="flyout-item">Stok Hareketleri</a>
                <a href="#/yonetim?tab=kategoriler" class="flyout-item">Kategori Ağacı</a>
                <a href="#/satinalma?durum=teslim_edildi" class="flyout-item">Teslim Edilen Siparişler</a>
              </div>
            </div>
          </div>

          <!-- Kurumsal Rehber & Yetki -->
          <a href="#/rehber" class="dock-nav-item" id="navRehber">
            <span class="dock-icon-wrap" title="Kurumsal Rehber & Yetki">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </span>
            <span class="dock-nav-label">Kurumsal Rehber & Yetki</span>
          </a>

          <!-- Denetim Logları -->
          <a href="#/loglar" class="dock-nav-item" id="navLoglar">
            <span class="dock-icon-wrap" title="Denetim Logları">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </span>
            <span class="dock-nav-label">Denetim Logları</span>
          </a>

          <!-- Raporlar -->
          <a href="#/raporlar" class="dock-nav-item" id="navRaporlar">
            <span class="dock-icon-wrap" title="Raporlar ve İstatistikler">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"></line>
                <line x1="12" y1="20" x2="12" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="14"></line>
              </svg>
            </span>
            <span class="dock-nav-label">Raporlar</span>
          </a>

          <!-- Yeşil Kampüs -->
          <a href="#/yesil-kampus" class="dock-nav-item" id="navYesilKampus">
            <span class="dock-icon-wrap" title="Yeşil Kampüs & Sürdürülebilirlik">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
              </svg>
            </span>
            <span class="dock-nav-label">Yeşil Kampüs</span>
          </a>

          <!-- Hızlı Spotlight Arama -->
          <button type="button" class="dock-nav-item btn-dock-spotlight" id="btnDockSpotlight" style="background: rgba(59, 130, 246, 0.08); border: 1.2px dashed rgba(59, 130, 246, 0.4); margin-top: 10px; cursor: pointer; text-align: left; width: 100%;">
            <span class="dock-icon-wrap" style="display: none;"></span>
            <span style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <span>Hızlı Arama</span>
              <kbd style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(100,116,139,0.2); font-family: monospace; font-weight: 700;">Ctrl K</kbd>
            </span>
          </button>
        </nav>
      </div>

      <div class="dock-footer" style="padding: 8px 0 4px 0; border-top: 1px solid rgba(148, 163, 184, 0.2);">
        ${collapseBarHtml}
      </div>
    `;
  } else {
    const uName = user.seciliPersonel ? user.seciliPersonel.adSoyad : (user.birim_adi || 'Kullanıcı');
    const uRole = user.birim_adi || 'Birim Kullanıcısı';
    const uInitials = uName.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

    // Birim Kullanıcısı
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; flex: 1; min-height: 0;">
        ${brandBlockHtml}

        <nav class="dock-nav-list">
          <a href="#/katalog" class="dock-nav-item" id="navKatalog">
            <span class="dock-icon-wrap" title="Malzeme Kataloğu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </span>
            <span class="dock-nav-label">Malzeme Kataloğu</span>
          </a>

          <!-- Yeşil Kampüs -->
          <a href="#/yesil-kampus" class="dock-nav-item" id="navYesilKampus">
            <span class="dock-icon-wrap" title="Yeşil Kampüs & Sürdürülebilirlik">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"></path>
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"></path>
              </svg>
            </span>
            <span class="dock-nav-label">Yeşil Kampüs</span>
          </a>

          <a href="#/sepet" class="dock-nav-item ${state.cartCount > 0 ? 'has-cart-items' : ''}" id="navSepet">
            <span class="dock-icon-wrap" title="Sepetim">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
              </svg>
            </span>
            <span class="dock-nav-label">Sepetim</span>
            <span class="dock-cart-badge ${state.cartCount > 0 ? 'is-active' : ''}">${state.cartCount}</span>
          </a>

          <a href="#/taleplerim" class="dock-nav-item" id="navTaleplerim">
            <span class="dock-icon-wrap" title="Taleplerim">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </span>
            <span class="dock-nav-label">Taleplerim</span>
          </a>

          <!-- Hızlı Spotlight Arama -->
          <button type="button" class="dock-nav-item btn-dock-spotlight" id="btnDockSpotlight" style="background: rgba(59, 130, 246, 0.08); border: 1.2px dashed rgba(59, 130, 246, 0.4); margin-top: 10px; cursor: pointer; text-align: left; width: 100%;">
            <span class="dock-icon-wrap" style="display: none;"></span>
            <span style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <span>Hızlı Arama</span>
              <kbd style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(100,116,139,0.2); font-family: monospace; font-weight: 700;">Ctrl K</kbd>
            </span>
          </button>
        </nav>
      </div>

      <div class="dock-footer" style="padding: 8px 0 4px 0; border-top: 1px solid rgba(148, 163, 184, 0.2);">
        ${collapseBarHtml}
      </div>
    `;
  }

  // Daralt / Genişlet Toggle Olayı (En alttaki <<< / >>> butonundan)
  const collapseBtn = container.querySelector('#btnDockCollapse');
  if (collapseBtn) {
    collapseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isSidebarCollapsed = !isSidebarCollapsed;
      localStorage.setItem('etu_sidebar_collapsed', isSidebarCollapsed ? '1' : '0');
      if (isSidebarCollapsed) {
        document.body.classList.add('sidebar-collapsed');
      } else {
        document.body.classList.remove('sidebar-collapsed');
      }
      renderNavbar(container);
    });
  }

  // Akordeon Aç / Kapat Olayları (Gelen Kutusu ve Depo Yönetimi - Görev 1: Karşılıklı Otomatik Kapanma)
  const navSatinalma = container.querySelector('#navSatinalma');
  const wrapperSatinalma = container.querySelector('#wrapperSatinalma');
  const navYonetim = container.querySelector('#navYonetim');
  const wrapperYonetim = container.querySelector('#wrapperYonetim');

  if (navSatinalma && wrapperSatinalma) {
    navSatinalma.addEventListener('click', (e) => {
      if (!isSidebarCollapsed) {
        // Geniş moddayken akordeonu aç/kapat
        if (currentBaseHash === '#/satinalma') {
          e.preventDefault();
          isSatinalmaTreeOpen = !isSatinalmaTreeOpen;
          wrapperSatinalma.classList.toggle('is-open', isSatinalmaTreeOpen);
        } else {
          isSatinalmaTreeOpen = true;
          wrapperSatinalma.classList.add('is-open');
        }

        // Görev 1: Gelen Kutusu açıkken Depo Yönetimi otomatik kapansın
        if (isSatinalmaTreeOpen) {
          isYonetimTreeOpen = false;
          if (wrapperYonetim) wrapperYonetim.classList.remove('is-open');
        }
      }
    });
  }

  if (navYonetim && wrapperYonetim) {
    navYonetim.addEventListener('click', (e) => {
      if (!isSidebarCollapsed) {
        if (currentBaseHash === '#/yonetim') {
          e.preventDefault();
          isYonetimTreeOpen = !isYonetimTreeOpen;
          wrapperYonetim.classList.toggle('is-open', isYonetimTreeOpen);
        } else {
          isYonetimTreeOpen = true;
          wrapperYonetim.classList.add('is-open');
        }

        // Görev 1: Depo Yönetimi açıkken Gelen Kutusu otomatik kapansın
        if (isYonetimTreeOpen) {
          isSatinalmaTreeOpen = false;
          if (wrapperSatinalma) wrapperSatinalma.classList.remove('is-open');
        }
      }
    });
  }

  // Aktif Ana Menü İşaretleme
  container.querySelectorAll('.dock-nav-item').forEach(link => {
    const linkHref = link.getAttribute('href');
    if (linkHref && linkHref.split('?')[0] === currentBaseHash) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Aktif Alt Ağaç ve Flyout Öğesi İşaretleme
  const currentDurum = searchParams.get('durum') || (currentBaseHash === '#/satinalma' ? 'beklemede' : null);
  const currentTab = searchParams.get('tab') || (currentBaseHash === '#/yonetim' ? 'urunler' : null);

  container.querySelectorAll('.sidebar-tree-item, .flyout-item').forEach(item => {
    const itemHref = item.getAttribute('href');
    const itemDurum = item.dataset.durum;
    const itemTab = item.dataset.tab;

    if (currentBaseHash === '#/satinalma' && itemDurum && itemDurum === currentDurum) {
      item.classList.add('active');
    } else if (currentBaseHash === '#/yonetim' && itemTab && itemTab === currentTab) {
      item.classList.add('active');
    } else if (itemHref === fullHash) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Çıkış Butonları (Normal Mod ve Kompakt Mod - Görev 2)
  const bindLogout = (selector) => {
    const btn = container.querySelector(selector);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const onay = await confirmModal({
        title: 'Oturumu Kapat',
        message: 'Kırtasiye Talep Portalı oturumunuzu sonlandırmak istediğinize emin misiniz?',
        confirmText: 'Çıkış Yap',
        cancelText: 'Vazgeç',
        type: 'danger'
      });
      if (!onay) return;

      try {
        await api.logout();
        state.user = null;
        state.cartCount = 0;
        window.location.hash = '#/giris';
      } catch (err) {
        toast.error('Çıkış yapılırken bir hata oluştu: ' + err.message);
      }
    });
  };

  bindLogout('#btnLogout');
  bindLogout('#btnCollapsedLogout');

  // Şifre Değiştir Butonu
  const sifreBtn = container.querySelector('#btnSifreDegistir');
  if (sifreBtn) {
    sifreBtn.addEventListener('click', () => {
      showOnboardingModal(state.user, false);
    });
  }

  // Spotlight Hızlı Arama Butonu
  const spotlightBtn = container.querySelector('#btnDockSpotlight');
  if (spotlightBtn) {
    spotlightBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleCommandPalette();
    });
  }

  // Mobil Menü Toggle ve Karartma Arka Planı Dinleyicileri
  const closeMobileNav = () => {
    container.classList.remove('mobile-open');
    mobileBackdrop?.classList.remove('open');
  };

  mobileToggleBtn?.addEventListener('click', () => {
    const isOpen = container.classList.toggle('mobile-open');
    if (mobileBackdrop) {
      if (isOpen) mobileBackdrop.classList.add('open');
      else mobileBackdrop.classList.remove('open');
    }
  });

  mobileBackdrop?.addEventListener('click', closeMobileNav);

  container.querySelectorAll('.dock-nav-item, .sidebar-tree-item, .flyout-item').forEach(item => {
    item.addEventListener('click', closeMobileNav);
  });
}
