// yonetim.js - Depo, Ürün, Stok, Birim, Kategori ve Denetim Logları Yönetim Ekranı (Apple Liquid Glass UI, İkonsuz)
import api from '../api.js';
import toast from '../components/toast.js';
import createModal, { confirmModal, alertModal } from '../components/modal.js';
import { escapeHtml } from '../utils/text.js';
import { t, getLanguage, tCategory, tProduct, tDepartment, tUnit, tBuilding, tMonth, tActionType, tRole, tUser, formatLogDetail } from '../utils/i18n.js';

let aktifTab = 'urunler';
let seciliUrunler = new Set();
let tumPersoneller = [];
let seciliPersoneller = new Set();

export async function renderYonetim(appContainer) {
  const hashParts = window.location.hash.split('?');
  if (hashParts[1]) {
    const params = new URLSearchParams(hashParts[1]);
    const tabParam = params.get('tab');
    if (tabParam === 'hiyerarsi') {
      window.location.hash = '#/rehber';
      return;
    }
    if (tabParam === 'birimler') {
      window.location.hash = '#/yetkilendirme';
      return;
    }
    if (tabParam === 'loglar') {
      window.location.hash = '#/loglar';
      return;
    }
    if (tabParam && ['urunler', 'stok', 'kategoriler', 'yedekler'].includes(tabParam)) {
      aktifTab = tabParam;
    }
  }

  if (aktifTab === 'birimler') {
    window.location.hash = '#/yetkilendirme';
    return;
  }
  if (aktifTab === 'loglar') {
    window.location.hash = '#/loglar';
    return;
  }
  if (!['urunler', 'stok', 'kategoriler', 'yedekler'].includes(aktifTab)) {
    aktifTab = 'urunler';
  }

  appContainer.innerHTML = `
    <div class="yonetim-page-wrap">
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 26px; font-weight: 700; letter-spacing: -0.02em; color: #0F172A;">${t('yonetim.title', 'Depo & Malzeme Yönetimi')}</h2>
        <p style="color: var(--text-dim); font-size: 13.5px; margin-top: 4px;">${t('yonetim.subtitle', 'Ürün kataloğu, anlık depo stokları, giriş/çıkış hareketleri, kategori hiyerarşisi ve sistem yedeklerini yönetin.')}</p>
      </div>

      <!-- Sekmeler (İkonsuz, Apple Liquid Glass Pill Nav) -->
      <div class="tab-nav">
        <button class="tab-btn ${aktifTab === 'urunler' ? 'active' : ''}" data-tab="urunler">${t('yonetim.tabProducts', 'Ürünler & Stok')}</button>
        <button class="tab-btn ${aktifTab === 'stok' ? 'active' : ''}" data-tab="stok">${t('yonetim.tabMovements', 'Stok Hareketleri')}</button>
        <button class="tab-btn ${aktifTab === 'kategoriler' ? 'active' : ''}" data-tab="kategoriler">${t('yonetim.tabCategories', 'Kategori Ağacı')}</button>
        <button class="tab-btn ${aktifTab === 'yedekler' ? 'active' : ''}" data-tab="yedekler">${t('yonetim.tabBackups', 'Sistem ve Yedekleme')}</button>
      </div>

      <!-- Sekme İçerik Alanı -->
      <div id="tabContent"></div>
    </div>
  `;

  const tabs = appContainer.querySelectorAll('.tab-btn');
  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      aktifTab = btn.dataset.tab;
      loadTabContent(appContainer);
    });
  });

  await loadTabContent(appContainer);
}

export async function renderYetkilendirme(appContainer) {
  appContainer.innerHTML = `
    <div class="yonetim-page-wrap">
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 26px; font-weight: 700; letter-spacing: -0.02em; color: #0F172A;">${t('yonetim.authTitle', 'Yetkilendirme & Hesap Yönetimi')}</h2>
        <p style="color: var(--text-dim); font-size: 13.5px; margin-top: 4px;">${t('yonetim.authSubtitle', 'Kurumsal birimler, personel hesapları, rol atamaları, ilk giriş şifreleri ve teslimat adreslerini yönetin.')}</p>
      </div>

      <div id="tabContent"></div>
    </div>
  `;

  const container = appContainer.querySelector('#tabContent');
  await renderBirimlerTab(container);
}

export async function renderLoglar(appContainer) {
  appContainer.innerHTML = `
    <div class="yonetim-page-wrap">
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 26px; font-weight: 700; letter-spacing: -0.02em; color: #0F172A; margin: 0;">${t('loglar.title', 'Denetim Logları & Sistem İzleri')}</h2>
        <p style="color: var(--text-dim); font-size: 13.5px; margin-top: 6px;">${t('loglar.subtitle', 'Tüm talep onayları, teslimat teyitleri, stok hareketleri, kullanıcı oturumları ve şifre güncellemelerinin resmi denetim kayıtları.')}</p>
      </div>

      <div id="tabContent"></div>
    </div>
  `;

  const container = appContainer.querySelector('#tabContent');
  await renderDenetimLoglariTab(container);
}

async function loadTabContent(appContainer) {
  const container = appContainer.querySelector('#tabContent');
  if (aktifTab === 'urunler') await renderUrunlerTab(container);
  else if (aktifTab === 'stok') await renderStokTab(container);
  else if (aktifTab === 'birimler') await renderBirimlerTab(container);
  else if (aktifTab === 'kategoriler') await renderKategorilerTab(container);
  else if (aktifTab === 'yedekler') await renderYedeklerTab(container);
  else if (aktifTab === 'loglar') await renderDenetimLoglariTab(container);
}

// =========================================================================
// 1) ÜRÜNLER & STOK SEKMESİ (Kategori Ağacı, Arama ve Barkod Okuyucu Destekli)
// =========================================================================
let kategorilerCache = [];
let kategorilerMap = new Map();
let tumUrunlerCache = [];
let aktifKategoriFilter = { type: 'all', id: null };
let aktifAramaQuery = '';
let aktifStokFilter = 'all';
let isScannerListenerAttached = false;

// Barkod Okuyucu Bip Sesi (Web Audio API - Yüksek frekanslı depo/market okuma bipi)
function playBarcodeBeep(isSuccess = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = isSuccess ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(isSuccess ? 1800 : 380, ctx.currentTime);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (isSuccess ? 0.08 : 0.25));
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + (isSuccess ? 0.09 : 0.26));
  } catch {}
}

async function getOrFetchKategoriler() {
  if (kategorilerCache.length === 0) {
    try {
      const resKat = await api.getYonetimKategoriler();
      kategorilerCache = resKat.kategoriler || [];
      kategorilerMap.clear();
      kategorilerCache.forEach(k => kategorilerMap.set(k.id, k.ad));
    } catch {}
  }
  return kategorilerCache;
}

// Global Barkod Okuma Tabancası Dinleyicisi
function setupBarcodeGunListener(container) {
  if (isScannerListenerAttached) return;
  isScannerListenerAttached = true;

  let buffer = '';
  let lastKeyTime = 0;

  window.addEventListener('keydown', (e) => {
    if (aktifTab !== 'urunler' && aktifTab !== 'stok') return;

    // Aktif bir modal açıkken veya kullanıcı form doldururken araya girmemek için kontrol
    const activeEl = document.activeElement;
    const isModalInput = activeEl && activeEl.closest('.modal-container') && activeEl.id !== 'barkodModalInput';

    const now = Date.now();
    if (now - lastKeyTime > 80) {
      buffer = '';
    }
    lastKeyTime = now;

    if (e.key === 'Enter') {
      if (buffer.length >= 6) {
        e.preventDefault();
        const code = buffer.trim();
        buffer = '';
        if (activeEl && activeEl.tagName && ['INPUT', 'TEXTAREA'].includes(activeEl.tagName) && !isModalInput) {
          activeEl.blur();
        }
        if (aktifTab === 'urunler') {
          handleScannedBarcode(code, container);
        } else if (aktifTab === 'stok') {
          handleScannedBarcodeInStokTab(code, container);
        }
      }
    } else if (e.key && e.key.length === 1) {
      buffer += e.key;
    }
  });
}

// Stok Hareketleri Sekmesinde Barkod Okutulduğunda Tetiklenen İşlem
async function handleScannedBarcodeInStokTab(barcode, container) {
  if (!barcode) return;
  barcode = barcode.trim();

  let urun = tumUrunlerCache.find(u => u.barkod === barcode);
  if (!urun) {
    try {
      const res = await api.getUrunByBarkod(barcode);
      if (res && res.urun) urun = res.urun;
    } catch {}
  }

  if (urun) {
    playBarcodeBeep(true);
    toast.success(`Barkod Okundu: ${urun.ad} (Mevcut: ${urun.stok} ${urun.olcu_birimi})`);

    const selectEl = container.querySelector('#stokUrunSelect');
    const txtBarkod = container.querySelector('#txtStokBarkod');
    const miktarInput = container.querySelector('#stokMiktar');

    if (txtBarkod) txtBarkod.value = urun.barkod || barcode;
    if (selectEl) {
      selectEl.value = urun.id;
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (miktarInput) {
      setTimeout(() => {
        miktarInput.focus();
        miktarInput.select();
      }, 50);
    }
  } else {
    playBarcodeBeep(false);
    toast.error(`"${barcode}" barkod numarasına sahip ürün sistemde bulunamadı.`);
  }
}

// Barkod Okunduğunda veya Sorgulandığında Tetiklenen Akıllı İşlem
async function handleScannedBarcode(barcode, container) {
  if (!barcode) return;
  barcode = barcode.trim();

  // 1. Önce hafızadaki listede ara
  let urun = tumUrunlerCache.find(u => u.barkod === barcode);

  // 2. Hafızada yoksa API'den barkod ile çek
  if (!urun) {
    try {
      const res = await api.getUrunByBarkod(barcode);
      if (res && res.urun) {
        urun = res.urun;
      }
    } catch {}
  }

  if (urun) {
    playBarcodeBeep(true);
    toast.success(`Barkod Okundu: ${urun.ad} (Stok: ${urun.stok} ${urun.olcu_birimi})`);

    // Tabloda bu satırı bul ve odakla
    const tbody = container.querySelector('#yonetimUrunlerTbody');
    const existingRow = tbody ? tbody.querySelector(`tr[data-urun-id="${urun.id}"]`) : null;
    if (existingRow) {
      existingRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      existingRow.classList.remove('row-updated-highlight');
      void existingRow.offsetWidth;
      existingRow.classList.add('row-updated-highlight');
    }

    // Hızlı Stok ve İşlem Modalı Aç
    openBarkodHizliStokModal(urun, container);
  } else {
    playBarcodeBeep(false);
    const ekleOnay = await confirmModal({
      title: 'Tanımsız Barkod Okundu',
      message: `"${barcode}" barkod numarasına sahip bir ürün depoda bulunamadı.`,
      description: 'Bu barkod ile yeni bir kırtasiye ürünü tanımlamak ister misiniz?',
      confirmText: 'Yeni Ürün Olarak Tanımla',
      cancelText: 'Kapat',
      type: 'info',
      icon: ''
    });

    if (ekleOnay) {
      openUrunFormModal({ barkod: barcode }, (newUrun) => {
        renderUrunlerTab(container, newUrun?.id);
      });
    }
  }
}

// Barkod Hızlı Stok Giriş & Bilgi Modalı
function openBarkodHizliStokModal(urun, container) {
  const modal = createModal({
    title: t('yonetim.quickStockTitle', 'Barkod Okundu: Hızlı Depo İşlemi'),
    maxWidth: '520px',
    contentHtml: `
      <div style="display: flex; gap: 16px; align-items: center; padding-bottom: 16px; border-bottom: 1px solid var(--color-border); margin-bottom: 16px;">
        <img src="${urun.gorsel_yolu || '/assets/placeholder.svg'}" 
             onerror="this.onerror=null;this.src='/assets/placeholder.svg';" 
             alt="${escapeHtml(tProduct(urun.ad))}"
             style="width: 72px; height: 72px; object-fit: contain; border-radius: 10px; border: 1px solid var(--color-border); padding: 4px; background: #fff;">
        <div style="flex: 1;">
          <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #0F172A;">${escapeHtml(tProduct(urun.ad))}</h4>
          <div style="font-size: 12.5px; color: var(--color-muted-foreground); margin-bottom: 6px;">
            ${urun.marka ? `Marka: <strong>${escapeHtml(urun.marka)}</strong> | ` : ''}${t('yonetim.colCategory', 'Kategori')}: <strong>${escapeHtml(tCategory(urun.kategori_adi) || '-')}</strong>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge-barcode">${escapeHtml(urun.barkod || '-')}</span>
            <span class="badge badge-neutral">${tUnit(urun.olcu_birimi)}</span>
          </div>
        </div>
      </div>

      <div style="background: rgba(30, 58, 138, 0.05); border: 1px solid rgba(30, 58, 138, 0.15); border-radius: 12px; padding: 16px; margin-bottom: 18px; text-align: center;">
        <div style="font-size: 12px; font-weight: 600; color: #1E3A8A; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">${t('yonetim.currentStockLabel', 'Mevcut Depo Stoğu')}</div>
        <div style="font-size: 36px; font-weight: 800; color: ${urun.stok <= urun.kritik_stok ? 'var(--color-destructive)' : '#1D4ED8'}; line-height: 1.1;" id="lblModalMevcutStok">
          ${urun.stok} <span style="font-size: 16px; font-weight: 600; color: var(--color-muted-foreground);">${tUnit(urun.olcu_birimi)}</span>
        </div>
        ${urun.stok <= urun.kritik_stok ? `<div style="font-size: 11.5px; color: var(--color-destructive); font-weight: 600; margin-top: 4px;">${t('yonetim.criticalLevelWarning', 'Kritik Stok Seviyesinde! (Eşik: {threshold})').replace('{threshold}', urun.kritik_stok)}</div>` : ''}
      </div>

      <div style="margin-bottom: 16px;">
        <label style="font-size: 12.5px; font-weight: 700; display: block; margin-bottom: 8px; color: #334155;">${t('yonetim.quickAdjustLabel', 'Hızlı Stok Arttır / Azalt:')}</label>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
          <button type="button" class="btn btn-outline btn-hizli-stok" data-delta="1" style="font-weight: 700; color: #16A34A;">+1 ${tUnit(urun.olcu_birimi)}</button>
          <button type="button" class="btn btn-outline btn-hizli-stok" data-delta="5" style="font-weight: 700; color: #16A34A;">+5 ${tUnit(urun.olcu_birimi)}</button>
          <button type="button" class="btn btn-outline btn-hizli-stok" data-delta="10" style="font-weight: 700; color: #16A34A;">+10 ${tUnit(urun.olcu_birimi)}</button>
          <button type="button" class="btn btn-outline btn-hizli-stok" data-delta="-1" style="font-weight: 700; color: #DC2626;">-1 ${tUnit(urun.olcu_birimi)}</button>
        </div>
      </div>

      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 20px;">
        <label style="font-size: 12.5px; font-weight: 700; white-space: nowrap; color: #334155;">${t('yonetim.setManualStockLabel', 'Yeni Stok Belirle:')}</label>
        <input type="number" id="txtModalManuelStok" value="${urun.stok}" min="0" style="flex: 1; height: 38px; font-weight: 700; text-align: center; font-size: 16px; border-radius: 8px; border: 1px solid var(--color-border);">
        <button type="button" id="btnModalManuelStokKaydet" class="btn btn-primary" style="height: 38px;">${t('yonetim.saveStockBtn', 'Stoğu Kaydet')}</button>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--color-border);">
        <button type="button" id="btnModalTamDuzenle" class="btn btn-outline btn-sm">${t('yonetim.editAllBtn', 'Tüm Bilgileri Düzenle')}</button>
        <button type="button" id="btnModalKapat" class="btn btn-outline btn-sm">${t('common.close', 'Kapat (Esc)')}</button>
      </div>
    `
  });

  const lblStok = modal.element.querySelector('#lblModalMevcutStok');
  const txtStok = modal.element.querySelector('#txtModalManuelStok');

  // Hızlı Stok Butonları
  modal.element.querySelectorAll('.btn-hizli-stok').forEach(b => {
    b.addEventListener('click', async () => {
      const delta = parseInt(b.dataset.delta, 10);
      const yeni = Math.max(0, urun.stok + delta);
      await stokKaydet(yeni);
    });
  });

  // Manuel Stok Kaydet
  modal.element.querySelector('#btnModalManuelStokKaydet').addEventListener('click', async () => {
    const val = parseInt(txtStok.value, 10);
    if (isNaN(val) || val < 0) {
      toast.error('Geçerli bir stok miktarı giriniz.');
      return;
    }
    await stokKaydet(val);
  });

  // Tam Düzenle Modalı
  modal.element.querySelector('#btnModalTamDuzenle').addEventListener('click', () => {
    modal.close();
    openUrunFormModal(urun, (saved) => {
      renderUrunlerTab(container, saved?.id);
    });
  });

  modal.element.querySelector('#btnModalKapat').addEventListener('click', () => modal.close());

  async function stokKaydet(yeniStok) {
    try {
      await api.updateUrun(urun.id, {
        ad: urun.ad,
        marka: urun.marka,
        kategori_id: urun.kategori_id,
        olcu_birimi: urun.olcu_birimi,
        kritik_stok: urun.kritik_stok,
        stok: yeniStok,
        gorsel_yolu: urun.gorsel_yolu,
        barkod: urun.barkod
      });

      urun.stok = yeniStok;
      txtStok.value = yeniStok;
      lblStok.innerHTML = `${yeniStok} <span style="font-size: 16px; font-weight: 600; color: var(--color-muted-foreground);">${urun.olcu_birimi}</span>`;
      lblStok.style.color = yeniStok <= urun.kritik_stok ? 'var(--color-destructive)' : '#1D4ED8';

      // Tablodaki satırı güncelle
      const tbody = container.querySelector('#yonetimUrunlerTbody');
      const row = tbody ? tbody.querySelector(`tr[data-urun-id="${urun.id}"]`) : null;
      if (row) {
        const valEl = row.querySelector(`#stokVal_${urun.id}`);
        if (valEl) {
          valEl.textContent = yeniStok;
          valEl.style.color = yeniStok <= urun.kritik_stok ? 'var(--color-destructive)' : 'var(--color-accent)';
        }
        row.classList.remove('row-updated-highlight');
        void row.offsetWidth;
        row.classList.add('row-updated-highlight');
      }

      toast.success(`Stok güncellendi: ${yeniStok} ${urun.olcu_birimi}`);
      playBarcodeBeep(true);
    } catch (err) {
      toast.error('Stok güncellenemedi: ' + err.message);
    }
  }
}

// Barkod Tara / Okut Arama Modalı
function openBarkodTaraModal(container) {
  const modal = createModal({
    title: t('yonetim.scanModalTitle', 'Barkod Tara / Manuel Barkod Sorgula'),
    maxWidth: '480px',
    contentHtml: `
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%; background: rgba(37, 99, 235, 0.1); color: #1D4ED8; font-size: 13px; font-weight: 700; margin-bottom: 12px;">
          BARKOD
        </div>
        <h4 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700; color: #0F172A;">${t('yonetim.scanModalSub', 'Barkod Tabancası ile Okutun')}</h4>
        <p style="font-size: 13px; color: var(--color-muted-foreground); margin: 0;">
          ${t('yonetim.scanModalDesc', 'Barkod okuyucu tabancayı doğrudan bu pencere açıkken tetiğe basarak kullanabilirsiniz veya 13 haneli barkodu yazabilirsiniz.')}
        </p>
      </div>

      <form id="barkodSorguForm" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="font-size: 12.5px; font-weight: 700; display: block; margin-bottom: 6px; color: #334155;">${t('yonetim.barcodeLabel', 'Barkod Numarası (EAN-13):')}</label>
          <div style="position: relative;">
            <input type="text" id="barkodModalInput" autofocus placeholder="8692026..." style="width: 100%; height: 44px; font-size: 16px; font-family: monospace; font-weight: 700; letter-spacing: 0.05em; padding: 0 14px; border-radius: 10px; border: 2px solid #2563EB;">
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px;">
          <button type="button" class="btn btn-outline" id="btnBarkodIptal">${t('common.close', 'Kapat')}</button>
          <button type="submit" class="btn btn-primary" id="btnBarkodSorgula">${t('yonetim.queryBarcodeBtn', 'Barkodu Bul ve Getir')}</button>
        </div>
      </form>
    `
  });

  const form = modal.element.querySelector('#barkodSorguForm');
  const input = modal.element.querySelector('#barkodModalInput');
  setTimeout(() => input?.focus(), 80);

  modal.element.querySelector('#btnBarkodIptal').addEventListener('click', () => modal.close());

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input.value.trim();
    if (!val) {
      toast.error('Lütfen bir barkod giriniz veya okutunuz.');
      return;
    }
    modal.close();
    handleScannedBarcode(val, container);
  });
}

async function renderUrunlerTab(container, targetUrunId = null) {
  const mainPane = document.querySelector('.main-content-pane');
  const prevScrollTop = mainPane ? mainPane.scrollTop : window.scrollY;

  const isAlreadyRendered = Boolean(container.querySelector('#yonetimUrunlerTbody'));

  if (!isAlreadyRendered) {
    seciliUrunler.clear();

    container.innerHTML = `
      <div class="depo-stok-layout">
        <!-- SOL: Kategori Ağacı (Ağaçlanma Biçimi) -->
        <aside class="depo-kategori-sidebar" id="depoKategoriSidebar">
          <div class="depo-kategori-header">
            <span class="depo-kategori-title">${t('yonetim.categoryTree', 'Kategori Ağacı')}</span>
            <span class="depo-badge-count" id="depoToplamUrunBadge">${t('common.loading', 'Yükleniyor...')}</span>
          </div>
          <ul class="depo-kategori-tree" id="depoKategoriTreeUl">
            <li>
              <button class="depo-tree-root-btn active" data-cat-type="all">
                <span>${t('yonetim.allProducts', 'Tüm Ürünler')}</span>
                <span class="tree-badge" id="treeBadgeAll">...</span>
              </button>
            </li>
          </ul>
        </aside>

        <!-- SAĞ: Arama Toolbar, Filtreler ve Ürün Listesi -->
        <main class="depo-stok-main">
          <!-- Arama, Barkod ve İşlem Çubuğu (Toolbar) -->
          <div class="depo-toolbar-card">
            <div class="depo-toolbar-row">
              <!-- Canlı Arama Kutusu -->
              <div class="depo-search-box">
                <span class="depo-search-icon"></span>
                <input type="text" id="yonetimSearchInput" placeholder="${t('yonetim.searchPlaceholder', 'Ürün adı, barkod (869...), marka ara...')}" value="${aktifAramaQuery}">
                <button type="button" class="btn-clear-search" id="btnClearSearch" style="display: ${aktifAramaQuery ? 'flex' : 'none'};">✕</button>
              </div>

              <!-- Barkod Tara / Okut Butonu -->
              <button type="button" class="btn-barkod-trigger" id="btnBarkodModalOpen" title="Barkod okuma tabancası veya manuel barkod ile anında ürün bul">
                <span>${t('yonetim.scanBarcode', 'Barkod Okut')}</span>
              </button>

              <!-- Hızlı Kategori Seçim Filtresi -->
              <select id="yonetimKategoriSelectFilter" class="depo-filter-select">
                <option value="all">${t('yonetim.allCategories', 'Tüm Kategoriler')}</option>
              </select>

              <!-- Stok Durum Filtresi -->
              <select id="yonetimStokFiltre" class="depo-filter-select">
                <option value="all">${t('yonetim.allStockLevels', 'Tüm Stok Seviyeleri')}</option>
                <option value="kritik">${t('yonetim.criticalStock', 'Kritik Stoktakiler')}</option>
                <option value="tukendi">${t('yonetim.outOfStock', 'Tükenenler (0 Stok)')}</option>
                <option value="mevcut">${t('yonetim.adequateStock', 'Yeterli Stok')}</option>
              </select>

              <!-- Yeni Ürün Ekle -->
              <button id="btnYeniUrunModal" class="btn btn-primary btn-yeni-urun">+ ${t('yonetim.addNewProduct', 'Yeni Ürün Ekle')}</button>
            </div>

            <!-- Alt Bilgi ve Barkod Tabancası Durumu -->
            <div class="depo-toolbar-info-row">
              <div id="depoFilterSummary" style="font-weight: 500;">
                ${t('yonetim.loadingItems', 'Depo ürünleri yükleniyor...')}
              </div>
              <div class="depo-scanner-ready-badge" title="USB veya Bluetooth barkod okuma makinesini doğrudan ekranda okutabilirsiniz">
                <span class="scanner-dot"></span> ${t('yonetim.scannerReady', 'Barkod Okuyucu Tabanca Aktif (Hazır)')}
              </div>
            </div>
          </div>

          <!-- Toplu Stok Güncelleme Çubuğu (Apple Liquid Glass) -->
          <div id="topluStokBar" style="display: none; align-items: center; justify-content: space-between; background: rgba(30, 58, 138, 0.07); border: 1px solid rgba(30, 58, 138, 0.2); padding: 12px 18px; border-radius: 12px; margin-bottom: 16px; backdrop-filter: blur(10px);">
            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
              <span id="topluSeciliMetin" style="font-weight: 700; color: #1E3A8A; font-size: 13.5px;">0 ${t('yonetim.selectedItems', 'ürün seçildi')}</span>
              <span style="color: var(--color-muted-foreground); font-size: 13px;">${t('yonetim.selectedStockTo', '| Seçilenlerin Stoğunu:')}</span>
              <input type="number" id="topluStokDeger" value="100" min="0" style="width: 90px; height: 34px; padding: 4px 8px; font-weight: 700; text-align: center; border-radius: 8px; border: 1px solid var(--color-border);">
              <span>${t('yonetim.makeTo', 'Yap')}</span>
              <button id="btnTopluStokUygula" class="btn btn-primary btn-sm">${t('yonetim.applyBatchStock', 'Tek Tıkla Stoğu Güncelle')}</button>
            </div>
            <div>
              <button id="btnTopluSecimTemizle" class="btn btn-outline btn-sm">${t('yonetim.clearSelection', 'Seçimi Kaldır')}</button>
            </div>
          </div>

          <!-- Ürünler Tablosu -->
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">
                    <input type="checkbox" id="chkAllUrunler" title="Tümünü Seç / Kaldır" style="cursor: pointer; width: 16px; height: 16px;">
                  </th>
                  <th style="width: 54px;">${t('yonetim.colImage', 'Görsel')}</th>
                  <th>${t('yonetim.colProductName', 'Ürün Adı & Barkod')}</th>
                  <th>${t('yonetim.colCategory', 'Kategori')}</th>
                  <th>${t('yonetim.colUnit', 'Ölçü Birimi')}</th>
                  <th>${t('yonetim.colCurrentStock', 'Mevcut Stok')}</th>
                  <th>${t('yonetim.colCriticalThreshold', 'Kritik Eşik')}</th>
                  <th>${t('yonetim.colOpenForRequisition', 'Talebe Açık')}</th>
                  <th style="text-align: right;">${t('common.actions', 'İşlemler')}</th>
                </tr>
              </thead>
              <tbody id="yonetimUrunlerTbody">
                <tr><td colspan="9" style="text-align: center; padding: 30px;">${t('common.loading', 'Yükleniyor...')}</td></tr>
              </tbody>
            </table>
          </div>
        </main>
      </div>
    `;

    // Yeni Ürün Modal Butonu
    container.querySelector('#btnYeniUrunModal').addEventListener('click', () => {
      openUrunFormModal(null, (newUrun) => {
        renderUrunlerTab(container, newUrun?.id);
      });
    });

    // Barkod Modal Butonu
    container.querySelector('#btnBarkodModalOpen').addEventListener('click', () => {
      openBarkodTaraModal(container);
    });

    // Donanım Barkod Tabancası Dinleyicisini Başlat
    setupBarcodeGunListener(container);
  }

  try {
    await getOrFetchKategoriler();

    const res = await api.getYonetimUrunler();
    tumUrunlerCache = res.urunler || [];

    const tbody = container.querySelector('#yonetimUrunlerTbody');
    const topluBar = container.querySelector('#topluStokBar');
    const seciliMetin = container.querySelector('#topluSeciliMetin');
    const chkAll = container.querySelector('#chkAllUrunler');
    const searchInput = container.querySelector('#yonetimSearchInput');
    const clearSearchBtn = container.querySelector('#btnClearSearch');
    const kategoriSelect = container.querySelector('#yonetimKategoriSelectFilter');
    const stokFiltreSelect = container.querySelector('#yonetimStokFiltre');
    const filterSummary = container.querySelector('#depoFilterSummary');
    const toplamBadge = container.querySelector('#depoToplamUrunBadge');
    const treeBadgeAll = container.querySelector('#treeBadgeAll');
    const treeUl = container.querySelector('#depoKategoriTreeUl');

    if (toplamBadge) toplamBadge.textContent = `${tumUrunlerCache.length} ${getLanguage() === 'en' ? 'Items' : 'Ürün'}`;
    if (treeBadgeAll) treeBadgeAll.textContent = tumUrunlerCache.length;

    // Kategori Ağacı HTML Oluşturma
    function buildKategoriTree() {
      if (!treeUl) return;

      const mainCategories = kategorilerCache.filter(k => !k.ust_kategori_id);
      let treeHtml = `
        <li>
          <button class="depo-tree-root-btn ${aktifKategoriFilter.type === 'all' ? 'active' : ''}" data-cat-type="all">
            <span>${t('yonetim.allProducts', 'Tüm Ürünler')}</span>
            <span class="tree-badge">${tumUrunlerCache.length}</span>
          </button>
        </li>
      `;

      mainCategories.forEach(mainCat => {
        const subCategories = kategorilerCache.filter(k => k.ust_kategori_id === mainCat.id);
        const mainCount = tumUrunlerCache.filter(u => u.ust_kategori_id === mainCat.id).length;
        const isMainActive = aktifKategoriFilter.type === 'main' && aktifKategoriFilter.id === mainCat.id;

        treeHtml += `
          <li style="margin-top: 6px;">
            <button class="depo-tree-main-btn ${isMainActive ? 'active' : ''}" data-cat-type="main" data-cat-id="${mainCat.id}">
              <span style="display: flex; align-items: center; gap: 6px;">
                <span>${escapeHtml(tCategory(mainCat.ad))}</span>
              </span>
              <span class="tree-badge">${mainCount}</span>
            </button>
            ${subCategories.length > 0 ? `
              <ul class="depo-tree-sub-list">
                ${subCategories.map(sub => {
                  const subCount = tumUrunlerCache.filter(u => u.kategori_id === sub.id).length;
                  const isSubActive = aktifKategoriFilter.type === 'sub' && aktifKategoriFilter.id === sub.id;
                  return `
                    <li>
                      <button class="depo-tree-sub-btn ${isSubActive ? 'active' : ''}" data-cat-type="sub" data-cat-id="${sub.id}">
                        <span>• ${escapeHtml(tCategory(sub.ad))}</span>
                        <span class="tree-badge">${subCount}</span>
                      </button>
                    </li>
                  `;
                }).join('')}
              </ul>
            ` : ''}
          </li>
        `;
      });

      treeUl.innerHTML = treeHtml;

      // Ağaç buton tıklama dinleyicileri
      treeUl.querySelectorAll('button[data-cat-type]').forEach(btn => {
        btn.addEventListener('click', () => {
          const catType = btn.dataset.catType;
          const catId = btn.dataset.catId ? parseInt(btn.dataset.catId, 10) : null;
          aktifKategoriFilter = { type: catType, id: catId };

          // Kategori dropdown'ı da senkronize et
          if (kategoriSelect) {
            kategoriSelect.value = catType === 'all' ? 'all' : `${catType}_${catId}`;
          }

          updateTreeActiveState();
          applyFiltersAndRender();
        });
      });
    }

    // Ağaç aktif buton stilini güncelle
    function updateTreeActiveState() {
      if (!treeUl) return;
      treeUl.querySelectorAll('button[data-cat-type]').forEach(btn => {
        const type = btn.dataset.catType;
        const id = btn.dataset.catId ? parseInt(btn.dataset.catId, 10) : null;
        const isActive = (aktifKategoriFilter.type === type && aktifKategoriFilter.id === id);
        btn.classList.toggle('active', isActive);
      });
    }

    // Kategori Dropdown Seçeneklerini Doldurma
    function populateKategoriSelect() {
      if (!kategoriSelect || kategoriSelect.children.length > 1) return;

      const mainCategories = kategorilerCache.filter(k => !k.ust_kategori_id);
      mainCategories.forEach(main => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = tCategory(main.ad);

        const mainOpt = document.createElement('option');
        mainOpt.value = `main_${main.id}`;
        mainOpt.textContent = `${t('catalog.all', 'Tüm')} ${tCategory(main.ad)}`;
        optgroup.appendChild(mainOpt);

        const subs = kategorilerCache.filter(k => k.ust_kategori_id === main.id);
        subs.forEach(s => {
          const opt = document.createElement('option');
          opt.value = `sub_${s.id}`;
          opt.textContent = `  ↳ ${tCategory(s.ad)}`;
          optgroup.appendChild(opt);
        });

        kategoriSelect.appendChild(optgroup);
      });
    }

    buildKategoriTree();
    populateKategoriSelect();

    const updateTopluBar = () => {
      if (seciliUrunler.size > 0) {
        topluBar.style.display = 'flex';
        seciliMetin.textContent = `${seciliUrunler.size} ${t('yonetim.selectedItems', 'ürün seçildi')}`;
      } else {
        topluBar.style.display = 'none';
      }
      if (chkAll) {
        const renderedIds = Array.from(tbody.querySelectorAll('.chk-urun-item')).map(c => parseInt(c.dataset.id, 10));
        const allRenderedChecked = renderedIds.length > 0 && renderedIds.every(id => seciliUrunler.has(id));
        chkAll.checked = allRenderedChecked;
      }
    };

    // Satır İçi Anlık Güncelleme (Sayfayı asla yukarı zıplatmaz)
    function updateRowInPlace(urunId, payload) {
      const row = tbody.querySelector(`tr[data-urun-id="${urunId}"]`);
      if (!row) return false;

      // 1. Küçük resim (thumbnail)
      const img = row.querySelector('td:nth-child(2) img');
      if (img) {
        img.src = payload.gorsel_yolu || '/assets/placeholder.svg';
        img.alt = payload.ad || '';
      }

      // 2. Ürün Adı, Marka ve Barkod
      const tdAd = row.querySelector('td:nth-child(3)');
      if (tdAd) {
        const strong = tdAd.querySelector('strong');
        if (strong) strong.textContent = payload.ad;

        let markaEl = tdAd.querySelector('.urun-marka-label');
        if (payload.marka) {
          if (!markaEl) {
            markaEl = document.createElement('div');
            markaEl.className = 'urun-marka-label';
            markaEl.style.fontSize = '11px';
            markaEl.style.color = 'var(--color-muted-foreground)';
            tdAd.appendChild(markaEl);
          }
          markaEl.textContent = payload.marka;
        } else if (markaEl) {
          markaEl.remove();
        }

        let barkodEl = tdAd.querySelector('.badge-barcode');
        if (payload.barkod) {
          if (!barkodEl) {
            barkodEl = document.createElement('div');
            barkodEl.className = 'badge-barcode';
            tdAd.appendChild(barkodEl);
          }
          barkodEl.textContent = `${payload.barkod}`;
        } else if (barkodEl) {
          barkodEl.remove();
        }
      }

      // 3. Kategori
      const katName = kategorilerMap.get(payload.kategori_id) || '-';
      const tdKat = row.querySelector('td:nth-child(4)');
      if (tdKat) tdKat.textContent = katName;

      // 4. Ölçü Birimi
      const badgeBirim = row.querySelector('td:nth-child(5) .badge');
      if (badgeBirim) badgeBirim.textContent = payload.olcu_birimi;

      // 5. Mevcut Stok
      const stokVal = row.querySelector(`#stokVal_${urunId}`);
      if (stokVal) {
        stokVal.textContent = payload.stok;
        stokVal.style.color = payload.stok <= payload.kritik_stok ? 'var(--color-destructive)' : 'var(--color-accent)';
      }

      // 6. Kritik Eşik
      const tdKritik = row.querySelector('td:nth-child(7)');
      if (tdKritik) tdKritik.textContent = payload.kritik_stok;

      // 7. Hafızadaki urunler listesini güncelle
      const u = tumUrunlerCache.find(x => x.id === urunId);
      if (u) {
        Object.assign(u, payload, { kategori_adi: katName });
      }

      // 8. Görsel vurgu efekti
      row.classList.remove('row-updated-highlight');
      void row.offsetWidth; // reflow
      row.classList.add('row-updated-highlight');

      // 9. Satırın görüş açısında kalmasını garanti et
      row.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      return true;
    }

    // Filtreleme ve Tablo Çizme
    function applyFiltersAndRender() {
      const q = aktifAramaQuery.toLowerCase().trim();

      const filtered = tumUrunlerCache.filter(u => {
        // Metin / Barkod Arama Filtresi
        if (q) {
          const adMatch = (u.ad || '').toLowerCase().includes(q);
          const markaMatch = (u.marka || '').toLowerCase().includes(q);
          const barkodMatch = (u.barkod || '').toLowerCase().includes(q);
          const katMatch = (u.kategori_adi || '').toLowerCase().includes(q);
          if (!adMatch && !markaMatch && !barkodMatch && !katMatch) return false;
        }

        // Kategori Ağacı Filtresi
        if (aktifKategoriFilter.type === 'main') {
          if (u.ust_kategori_id !== aktifKategoriFilter.id) return false;
        } else if (aktifKategoriFilter.type === 'sub') {
          if (u.kategori_id !== aktifKategoriFilter.id) return false;
        }

        // Stok Seviyesi Filtresi
        if (aktifStokFilter === 'kritik') {
          if (u.stok > u.kritik_stok || u.stok <= 0) return false;
        } else if (aktifStokFilter === 'tukendi') {
          if (u.stok > 0) return false;
        } else if (aktifStokFilter === 'mevcut') {
          if (u.stok <= u.kritik_stok) return false;
        }

        return true;
      });

      // Alt Bilgi Güncelleme
      if (filterSummary) {
        if (filtered.length === tumUrunlerCache.length) {
          filterSummary.innerHTML = t('yonetim.totalItemsListed', 'Toplam {count} ürün listeleniyor').replace('{count}', `<strong>${tumUrunlerCache.length}</strong>`);
        } else {
          filterSummary.innerHTML = `${t('common.search', 'Filtrelenen')}: <strong>${filtered.length}</strong> / <strong>${tumUrunlerCache.length}</strong>`;
        }
      }

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align: center; padding: 48px 20px; color: var(--color-muted-foreground);">
              <div style="font-size: 14px; font-weight: 700; color: #64748B; margin-bottom: 8px;">${t('common.error', 'Sonuç Bulunamadı')}</div>
              <div style="font-weight: 600; font-size: 15px; color: #1E293B;">${t('yonetim.noProductsFound', 'Kriterlere Uygun Ürün Bulunamadı')}</div>
              <p style="font-size: 13px; margin: 4px 0 14px 0;">${t('yonetim.tryAdjustFilters', 'Arama terimini veya seçili kategori/stok filtresini değiştirmeyi deneyebilirsiniz.')}</p>
              <button class="btn btn-outline btn-sm" id="btnFiltreleriSifirla">${t('raporlar.reset', 'Filtreleri Temizle')}</button>
            </td>
          </tr>
        `;
        tbody.querySelector('#btnFiltreleriSifirla')?.addEventListener('click', () => {
          aktifAramaQuery = '';
          if (searchInput) searchInput.value = '';
          if (clearSearchBtn) clearSearchBtn.style.display = 'none';
          aktifKategoriFilter = { type: 'all', id: null };
          if (kategoriSelect) kategoriSelect.value = 'all';
          aktifStokFilter = 'all';
          if (stokFiltreSelect) stokFiltreSelect.value = 'all';
          updateTreeActiveState();
          applyFiltersAndRender();
        });
        updateTopluBar();
        return;
      }

      tbody.innerHTML = filtered.map(u => `
        <tr data-urun-id="${u.id}">
          <td style="text-align: center;">
            <input type="checkbox" class="chk-urun-item" data-id="${u.id}" ${seciliUrunler.has(u.id) ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
          </td>
          <td>
            <img src="${u.gorsel_yolu || '/assets/placeholder.svg'}" 
                 onerror="this.onerror=null;this.src='/assets/placeholder.svg';" 
                 alt="${u.ad}"
                 style="width: 44px; height: 44px; object-fit: contain; border-radius: 6px; border: 1px solid var(--color-border); padding: 2px; background: #FFFFFF;">
          </td>
          <td>
            <strong>${escapeHtml(tProduct(u.ad))}</strong>
            ${u.marka ? `<div class="urun-marka-label" style="font-size: 11px; color: var(--color-muted-foreground);">${escapeHtml(u.marka)}</div>` : ''}
            ${u.barkod ? `<div class="badge-barcode">${escapeHtml(u.barkod)}</div>` : ''}
          </td>
          <td>${escapeHtml(tCategory(u.kategori_adi) || '-')}</td>
          <td><span class="badge badge-neutral">${tUnit(u.olcu_birimi)}</span></td>
          <td>
            <strong id="stokVal_${u.id}" style="color: ${u.stok <= u.kritik_stok ? 'var(--color-destructive)' : 'var(--color-accent)'}; font-size: 14px;">
              ${u.stok}
            </strong>
          </td>
          <td>${u.kritik_stok}</td>
          <td>
            <div style="display: inline-flex; align-items: center; gap: 8px;">
              <div class="mini-settings-switch ${u.aktif ? 'is-on' : 'is-off'}" 
                   data-id="${u.id}" 
                   data-ad="${u.ad}"
                   data-aktif="${u.aktif ? '1' : '0'}"
                   role="switch" 
                   aria-checked="${u.aktif ? 'true' : 'false'}"
                   title="${u.aktif ? (t('yonetim.active', 'Talebe Açık')) : (t('yonetim.passive', 'Talebe Kapalı'))}">
                <span class="mini-switch-handle"></span>
              </div>
              <span class="badge badge-${u.aktif ? 'success' : 'neutral'} badge-urun-durum" id="badgeDurum_${u.id}" style="font-size: 11px;">
                ${u.aktif ? t('yonetim.active', 'Aktif') : t('yonetim.passive', 'Pasif')}
              </span>
            </div>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <button class="btn btn-outline btn-sm btn-urun-duzenle" data-id="${u.id}" style="margin-right: 4px;">${t('yonetim.edit', 'Düzenle')}</button>
            <button class="btn btn-outline btn-sm btn-urun-hizli-stok" data-id="${u.id}" title="${t('yonetim.updateStock', 'Stok Güncelle')}">${t('yonetim.updateStock', 'Stok')}</button>
          </td>
        </tr>
      `).join('');

      // Checkbox Olayları
      tbody.querySelectorAll('.chk-urun-item').forEach(chk => {
        chk.addEventListener('change', () => {
          const id = parseInt(chk.dataset.id, 10);
          if (chk.checked) seciliUrunler.add(id);
          else seciliUrunler.delete(id);
          updateTopluBar();
        });
      });

      // Durum Değiştirme (Switch Toggle)
      tbody.querySelectorAll('.mini-settings-switch').forEach(sw => {
        sw.addEventListener('click', async (e) => {
          e.stopPropagation();
          const urunId = parseInt(sw.dataset.id, 10);
          const urunAd = sw.dataset.ad;
          const currentAktif = sw.dataset.aktif === '1';
          const newAktif = !currentAktif;

          sw.className = `mini-settings-switch ${newAktif ? 'is-on' : 'is-off'}`;
          sw.dataset.aktif = newAktif ? '1' : '0';
          sw.setAttribute('aria-checked', newAktif ? 'true' : 'false');

          const badgeEl = tbody.querySelector(`#badgeDurum_${urunId}`);
          if (badgeEl) {
            badgeEl.className = `badge badge-${newAktif ? 'success' : 'neutral'} badge-urun-durum`;
            badgeEl.textContent = newAktif ? 'Aktif' : 'Pasif';
          }

          try {
            const res = await api.updateUrunDurum(urunId, newAktif);
            toast.success(res.mesaj || `"${urunAd}" durumu güncellendi.`);
          } catch (err) {
            sw.className = `mini-settings-switch ${currentAktif ? 'is-on' : 'is-off'}`;
            sw.dataset.aktif = currentAktif ? '1' : '0';
            if (badgeEl) {
              badgeEl.className = `badge badge-${currentAktif ? 'success' : 'neutral'} badge-urun-durum`;
              badgeEl.textContent = currentAktif ? 'Aktif' : 'Pasif';
            }
            toast.error('Durum değiştirilemedi: ' + err.message);
          }
        });
      });

      // Düzenle Butonları (Yerinde güncelleme - Sayfa zıplamasını %100 engeller)
      tbody.querySelectorAll('.btn-urun-duzenle').forEach(btn => {
        btn.addEventListener('click', () => {
          const urunId = parseInt(btn.dataset.id, 10);
          const urun = tumUrunlerCache.find(x => x.id === urunId);
          openUrunFormModal(urun, (savedUrun) => {
            const updated = updateRowInPlace(urunId, savedUrun);
            if (!updated) {
              renderUrunlerTab(container, urunId);
            }
          });
        });
      });

      // Hızlı Stok Butonları
      tbody.querySelectorAll('.btn-urun-hizli-stok').forEach(btn => {
        btn.addEventListener('click', () => {
          const urunId = parseInt(btn.dataset.id, 10);
          const urun = tumUrunlerCache.find(x => x.id === urunId);
          if (urun) openBarkodHizliStokModal(urun, container);
        });
      });

      updateTopluBar();
    }

    // Arama Kutusu Dinleyicisi (Canlı arama)
    let searchDebounce = null;
    searchInput?.addEventListener('input', () => {
      aktifAramaQuery = searchInput.value;
      if (clearSearchBtn) clearSearchBtn.style.display = aktifAramaQuery ? 'flex' : 'none';
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        applyFiltersAndRender();
      }, 150);
    });

    clearSearchBtn?.addEventListener('click', () => {
      aktifAramaQuery = '';
      if (searchInput) searchInput.value = '';
      clearSearchBtn.style.display = 'none';
      applyFiltersAndRender();
    });

    // Kategori Dropdown Seçim Dinleyicisi
    kategoriSelect?.addEventListener('change', () => {
      const val = kategoriSelect.value;
      if (val === 'all') {
        aktifKategoriFilter = { type: 'all', id: null };
      } else if (val.startsWith('main_')) {
        aktifKategoriFilter = { type: 'main', id: parseInt(val.replace('main_', ''), 10) };
      } else if (val.startsWith('sub_')) {
        aktifKategoriFilter = { type: 'sub', id: parseInt(val.replace('sub_', ''), 10) };
      }
      updateTreeActiveState();
      applyFiltersAndRender();
    });

    // Stok Filtresi Dinleyicisi
    stokFiltreSelect?.addEventListener('change', () => {
      aktifStokFilter = stokFiltreSelect.value;
      applyFiltersAndRender();
    });

    // İlk Çizimi Yap
    applyFiltersAndRender();

    // Kaydırma konumunu eski yerine al veya hedef satıra odaklan
    if (targetUrunId) {
      const targetRow = tbody.querySelector(`tr[data-urun-id="${targetUrunId}"]`);
      if (targetRow) {
        targetRow.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        targetRow.classList.remove('row-updated-highlight');
        void targetRow.offsetWidth;
        targetRow.classList.add('row-updated-highlight');
      } else if (mainPane) {
        mainPane.scrollTop = prevScrollTop;
      }
    } else if (mainPane && isAlreadyRendered) {
      mainPane.scrollTop = prevScrollTop;
    }

    // Toplu Seçim Checkbox'ları
    if (!isAlreadyRendered) {
      chkAll?.addEventListener('change', () => {
        const visibleCheckboxes = tbody.querySelectorAll('.chk-urun-item');
        if (chkAll.checked) {
          visibleCheckboxes.forEach(chk => {
            chk.checked = true;
            seciliUrunler.add(parseInt(chk.dataset.id, 10));
          });
        } else {
          seciliUrunler.clear();
          visibleCheckboxes.forEach(chk => { chk.checked = false; });
        }
        updateTopluBar();
      });

      container.querySelector('#btnTopluSecimTemizle')?.addEventListener('click', () => {
        seciliUrunler.clear();
        tbody.querySelectorAll('.chk-urun-item').forEach(chk => { chk.checked = false; });
        updateTopluBar();
      });

      // Toplu Stok Güncelleme Butonu
      container.querySelector('#btnTopluStokUygula')?.addEventListener('click', async () => {
        if (seciliUrunler.size === 0) return;
        const yeniStokVal = parseInt(container.querySelector('#topluStokDeger').value, 10);
        if (isNaN(yeniStokVal) || yeniStokVal < 0) {
          toast.error('Geçerli bir stok miktarı giriniz.');
          return;
        }

        const onay = await confirmModal({
          title: 'Toplu Stok Güncelleme',
          message: `Seçilen ${seciliUrunler.size} ürünün depo stoğu ${yeniStokVal} olarak güncellenecektir. Onaylıyor musunuz?`,
          description: 'Tüm seçili ürünlerin stok miktarları eşitlenecek ve hareketler denetim loguna kaydedilecektir.',
          confirmText: 'Stoğu Güncelle',
          cancelText: 'Vazgeç',
          type: 'warning',
          icon: ''
        });
        if (!onay) return;

        try {
          const urunIds = Array.from(seciliUrunler);
          const res = await api.topluStokGuncelle({
            urun_ids: urunIds,
            yeni_stok: yeniStokVal,
            islem_turu: 'duzeltme',
            aciklama: `Yönetim panelinden tek tıkla toplu stok eşitleme (${yeniStokVal} adet)`
          });

          toast.success(res.mesaj || `${urunIds.length} ürünün stoğu güncellendi.`);

          // Tabloyu iyimser güncelle
          urunIds.forEach(id => {
            const el = tbody.querySelector(`#stokVal_${id}`);
            if (el) el.textContent = yeniStokVal;
            const u = tumUrunlerCache.find(x => x.id === id);
            if (u) u.stok = yeniStokVal;
          });

          seciliUrunler.clear();
          tbody.querySelectorAll('.chk-urun-item').forEach(chk => { chk.checked = false; });
          updateTopluBar();
        } catch (err) {
          toast.error('Toplu stok güncellenemedi: ' + err.message);
        }
      });
    }

  } catch (err) {
    const tbody = container.querySelector('#yonetimUrunlerTbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="color: var(--color-destructive); padding: 24px; text-align: center;">${err.message}</td></tr>`;
  }
}

// Ürün Ekle / Düzenle Modalı
function detectPaketKatsayisi(text) {
  if (!text) return null;
  const mLi = text.match(/(\d+)\s*['’]?(?:li|lı|lu|lü|lük|luk)/i);
  if (mLi) return parseInt(mLi[1], 10);
  const mYaprak = text.match(/(\d+)\s*(?:yaprak|sayfa)/i);
  if (mYaprak) return parseInt(mYaprak[1], 10);
  return null;
}

// Standart 13 Haneli EAN-13 Barkod Numarası Üretici (Türkiye 869 Kodu ile)
function generateEAN13() {
  const prefix = '8692026';
  const rand5 = Math.floor(Math.random() * 90000 + 10000).toString();
  const base12 = prefix + rand5;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(base12[i], 10) * (i % 2 === 0 ? 1 : 3);
  }
  const checksum = (10 - (sum % 10)) % 10;
  return base12 + checksum;
}

async function openUrunFormModal(urun = null, onSaved) {
  const isEdit = Boolean(urun && urun.id);
  let kategoriler = [];
  try {
    const resKat = await api.getYonetimKategoriler();
    kategoriler = resKat.kategoriler || [];
  } catch {}

  const initialUnit = urun?.olcu_birimi || 'adet';
  const initialStock = urun?.stok ?? 50;

  const modal = createModal({
    title: isEdit ? 'Ürün Bilgilerini Düzenle' : 'Yeni Kırtasiye Ürünü Ekle',
    maxWidth: '680px',
    contentHtml: `
      <form id="urunForm" style="display: flex; flex-direction: column; gap: 14px;">
        <div style="display: grid; grid-template-columns: 2fr 1fr 1.3fr; gap: 14px;">
          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">Ürün Adı <span style="color: red;">*</span></label>
            <input type="text" id="urunAd" value="${urun?.ad || ''}" required placeholder="Örn: A4 Fotokopi Kağıdı 80 gr">
          </div>
          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">Marka</label>
            <input type="text" id="urunMarka" value="${urun?.marka || ''}" placeholder="Örn: Navigator">
          </div>
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <label style="font-size: 13px; font-weight: 600; margin: 0;">Barkod (EAN-13)</label>
              <button type="button" id="btnOtoBarkodUret" style="background: none; border: none; color: #2563EB; font-size: 11px; font-weight: 600; cursor: pointer; padding: 0;" title="Yeni EAN-13 Barkodu Oluştur">Yenile / Üret</button>
            </div>
            <input type="text" id="urunBarkod" value="${urun?.barkod || (!isEdit ? generateEAN13() : '')}" placeholder="8692026..." maxlength="20" style="font-family: monospace; font-weight: 600; font-size: 12.5px;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">Kategori <span style="color: red;">*</span></label>
            <select id="urunKategori" required>
              ${kategoriler.map(k => `
                <option value="${k.id}" ${urun?.kategori_id === k.id ? 'selected' : ''}>${k.ad}</option>
              `).join('')}
            </select>
          </div>
          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">Ölçü Birimi <span style="color: red;">*</span></label>
            <select id="urunBirim" required>
              <option value="adet" ${urun?.olcu_birimi === 'adet' ? 'selected' : ''}>adet</option>
              <option value="paket" ${urun?.olcu_birimi === 'paket' ? 'selected' : ''}>paket</option>
              <option value="kutu" ${urun?.olcu_birimi === 'kutu' ? 'selected' : ''}>kutu</option>
              <option value="koli" ${urun?.olcu_birimi === 'koli' ? 'selected' : ''}>koli</option>
              <option value="takim" ${urun?.olcu_birimi === 'takim' ? 'selected' : ''}>takım</option>
              <option value="rulo" ${urun?.olcu_birimi === 'rulo' ? 'selected' : ''}>rulo</option>
            </select>
          </div>
          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">Kritik Stok Eşiği</label>
            <input type="number" id="urunKritik" value="${urun?.kritik_stok ?? 5}" min="0" required>
          </div>
        </div>

        <div style="background: var(--color-card, #ffffff); border: 1px solid var(--color-border); border-radius: 8px; padding: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label style="font-size: 13px; font-weight: 600; margin: 0;">
              ${isEdit ? 'Mevcut Depo Stoğu' : 'Başlangıç Depo Stoğu'} <span style="color: red;">*</span>
            </label>
            <span style="font-size: 12px; color: var(--color-muted-foreground); font-weight: 500;">
              Seçili Birim: <strong id="lblBirimGosterge" style="color: var(--color-primary);">${urun?.olcu_birimi || 'adet'}</strong>
            </span>
          </div>
          <div style="display: flex; gap: 10px; align-items: center;">
            <input type="number" id="urunStok" value="${urun?.stok ?? 50}" min="0" required style="font-size: 16px; font-weight: 700; flex: 1;">
            <span id="stokBirimSuffix" style="font-size: 13px; font-weight: 600; color: var(--color-muted-foreground); min-width: 45px;">
              ${urun?.olcu_birimi || 'adet'}
            </span>
          </div>
          <div id="birimDonusumKutusu" style="display: none; margin-top: 10px; padding: 12px 14px; border-radius: 8px; background: rgba(37, 99, 235, 0.08); border: 1px solid rgba(37, 99, 235, 0.25); font-size: 13px;">
          </div>
        </div>

        <div style="background: var(--color-card, #ffffff); border: 1px solid var(--color-border); border-radius: 12px; padding: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label style="font-size: 13px; font-weight: 700; margin: 0;">Ürün Görseli</label>
            <span style="font-size: 11.5px; color: var(--color-muted-foreground);">Maks. 2 MB (PNG, JPG, WebP)</span>
          </div>

          <div style="display: flex; gap: 14px; align-items: center;">
            <!-- Önizleme Kutusu -->
            <div id="gorselOnizlemeWrap" style="width: 74px; height: 74px; border-radius: 12px; border: 1.5px dashed var(--color-border); display: flex; align-items: center; justify-content: center; overflow: hidden; background: #f8fafc; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
              <img id="gorselOnizlemeImg" src="${urun?.gorsel_yolu || '/assets/placeholder.svg'}" onerror="this.onerror=null;this.src='/assets/placeholder.svg';" style="width: 100%; height: 100%; object-fit: contain; padding: 4px;" alt="Önizleme">
            </div>

            <!-- Yükleme Butonları ve URL -->
            <div style="flex: 1; display: flex; flex-direction: column; gap: 8px;">
              <input type="file" id="dosyaSecici" accept="image/png, image/jpeg, image/webp, image/gif" style="display: none;">
              
              <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <button type="button" class="btn btn-outline" id="btnBilgisayardanSec" style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; padding: 7px 14px; border-radius: 8px; font-weight: 600;">
                  Bilgisayardan Görsel Yükle
                </button>
                <button type="button" class="btn btn-outline" id="btnGorselKaldir" style="display: ${urun?.gorsel_yolu ? 'inline-flex' : 'none'}; font-size: 12px; padding: 7px 12px; color: var(--color-destructive); border-color: rgba(239, 68, 68, 0.3);">
                  Görseli Kaldır
                </button>
                <span id="yuklemeDurum" style="font-size: 12px; font-weight: 600; color: #2563eb; display: none;"></span>
              </div>

              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="text" id="urunGorsel" value="${urun?.gorsel_yolu || ''}" placeholder="veya görsel bağlantısı (/uploads/... ya da http...)" style="font-size: 12px; padding: 6px 10px; border-radius: 6px; flex: 1; border: 1px solid var(--color-border); color: #334155;">
              </div>
            </div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
          <button type="button" class="btn btn-outline" id="btnUrunIptal">İptal</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Değişiklikleri Kaydet' : 'Ürünü Ekle'}</button>
        </div>
      </form>
    `
  });

  const form = modal.element.querySelector('#urunForm');
  const urunBirimSelect = form.querySelector('#urunBirim');
  const urunStokInput = form.querySelector('#urunStok');
  const lblBirimGosterge = form.querySelector('#lblBirimGosterge');
  const stokBirimSuffix = form.querySelector('#stokBirimSuffix');
  const donusumBox = form.querySelector('#birimDonusumKutusu');
  const urunAdInput = form.querySelector('#urunAd');
  const urunBarkodInput = form.querySelector('#urunBarkod');
  const btnOtoBarkodUret = form.querySelector('#btnOtoBarkodUret');

  // Otomatik Barkod Üretme Butonu
  btnOtoBarkodUret?.addEventListener('click', () => {
    const newBarcode = generateEAN13();
    urunBarkodInput.value = newBarcode;
    toast.info(`Yeni EAN-13 Barkod Üretildi: ${newBarcode}`);
  });

  // Bilgisayardan Görsel Yükleme Dinleyicileri
  const btnBilgisayardanSec = form.querySelector('#btnBilgisayardanSec');
  const dosyaSecici = form.querySelector('#dosyaSecici');
  const btnGorselKaldir = form.querySelector('#btnGorselKaldir');
  const gorselOnizlemeImg = form.querySelector('#gorselOnizlemeImg');
  const urunGorselInput = form.querySelector('#urunGorsel');
  const yuklemeDurum = form.querySelector('#yuklemeDurum');

  btnBilgisayardanSec.addEventListener('click', () => {
    dosyaSecici.click();
  });

  dosyaSecici.addEventListener('change', async () => {
    const file = dosyaSecici.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Görsel boyutu en fazla 2 MB olabilir.');
      dosyaSecici.value = '';
      return;
    }

    // Hemen tarayıcıda önizleme göster
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      gorselOnizlemeImg.src = dataUrl;

      // Sunucuya base64 olarak yükle
      yuklemeDurum.style.display = 'inline-block';
      yuklemeDurum.style.color = '#2563eb';
      yuklemeDurum.textContent = '⏳ Yükleniyor...';
      btnBilgisayardanSec.disabled = true;

      try {
        const base64Data = dataUrl.split(',')[1];
        const res = await api.yukleGorselBase64({
          base64_data: base64Data,
          mime_type: file.type || 'image/jpeg'
        });

        if (res.gorselYolu) {
          urunGorselInput.value = res.gorselYolu;
          gorselOnizlemeImg.src = res.gorselYolu;
          btnGorselKaldir.style.display = 'inline-flex';
          yuklemeDurum.style.color = '#16a34a';
          yuklemeDurum.textContent = '✓ Yüklendi';
          toast.success('Görsel başarıyla yüklendi.');
        }
      } catch (err) {
        yuklemeDurum.style.color = '#dc2626';
        yuklemeDurum.textContent = 'Yükleme hatası';
        toast.error('Görsel sunucuya yüklenemedi: ' + err.message);
      } finally {
        btnBilgisayardanSec.disabled = false;
        setTimeout(() => {
          if (yuklemeDurum.textContent.includes('✓')) {
            yuklemeDurum.style.display = 'none';
          }
        }, 3000);
      }
    };
    reader.readAsDataURL(file);
  });

  btnGorselKaldir.addEventListener('click', () => {
    urunGorselInput.value = '';
    gorselOnizlemeImg.src = '/assets/placeholder.svg';
    btnGorselKaldir.style.display = 'none';
    dosyaSecici.value = '';
    yuklemeDurum.style.display = 'none';
    toast.info('Görsel kaldırıldı.');
  });

  urunGorselInput.addEventListener('input', () => {
    const val = urunGorselInput.value.trim();
    gorselOnizlemeImg.src = val || '/assets/placeholder.svg';
    btnGorselKaldir.style.display = val ? 'inline-flex' : 'none';
  });

  // Canlı Ölçü Birimi Değişimi & Akıllı Dönüşüm Hesaplayıcı
  urunBirimSelect.addEventListener('change', () => {
    const newUnit = urunBirimSelect.value;
    lblBirimGosterge.textContent = newUnit;
    stokBirimSuffix.textContent = newUnit;

    if (!isEdit) return;

    const katsayi = detectPaketKatsayisi(urunAdInput.value) || 1;
    const isInitialPack = ['paket', 'kutu', 'koli', 'rulo', 'takim'].includes(initialUnit);
    const isNewPack = ['paket', 'kutu', 'koli', 'rulo', 'takim'].includes(newUnit);

    if (newUnit === initialUnit) {
      donusumBox.style.display = 'none';
      urunStokInput.value = initialStock;
      return;
    }

    if (isInitialPack && newUnit === 'adet') {
      const hesaplanan = Math.round(initialStock * katsayi);
      urunStokInput.value = hesaplanan;
      donusumBox.style.display = 'block';
      donusumBox.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          
          <div style="flex: 1;">
            <div style="font-weight: 700; color: #1d4ed8; margin-bottom: 2px;">
              Otomatik Birim Dönüşümü (${initialUnit} ➔ ${newUnit})
            </div>
            <div style="font-size: 12px; color: var(--color-muted-foreground); margin-bottom: 8px;">
              ${katsayi > 1 ? `Ürün adından paket içeriği algılandı: <strong>1 ${initialUnit} = ${katsayi} adet</strong>` : `Paket içeriği adedi ürün adında bulunamadı (1:1 dönüşüm yapıldı).`}
            </div>
            <div style="background: rgba(37, 99, 235, 0.1); padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; color: #1e3a8a; display: flex; justify-content: space-between; align-items: center;">
              <span>${initialStock.toLocaleString('tr-TR')} ${initialUnit} × ${katsayi} = <span style="color: #16a34a; font-weight: 800;">${hesaplanan.toLocaleString('tr-TR')} ${newUnit}</span></span>
              <button type="button" class="btn-donusum-sifirla" style="background: none; border: none; color: #2563eb; text-decoration: underline; font-size: 12px; cursor: pointer; padding: 0;">Geri Al</button>
            </div>
          </div>
        </div>
      `;
      donusumBox.querySelector('.btn-donusum-sifirla')?.addEventListener('click', () => {
        urunStokInput.value = initialStock;
        donusumBox.style.display = 'none';
      });
    } else if (initialUnit === 'adet' && isNewPack) {
      const hesaplanan = Math.max(1, Math.round(initialStock / katsayi));
      urunStokInput.value = hesaplanan;
      donusumBox.style.display = 'block';
      donusumBox.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 10px;">
          
          <div style="flex: 1;">
            <div style="font-weight: 700; color: #1d4ed8; margin-bottom: 2px;">
              Otomatik Birim Dönüşümü (${initialUnit} ➔ ${newUnit})
            </div>
            <div style="font-size: 12px; color: var(--color-muted-foreground); margin-bottom: 8px;">
              ${katsayi > 1 ? `Ürün adından paket içeriği algılandı: <strong>1 ${newUnit} = ${katsayi} adet</strong>` : `Paket içeriği adedi ürün adında bulunamadı.`}
            </div>
            <div style="background: rgba(37, 99, 235, 0.1); padding: 8px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; color: #1e3a8a; display: flex; justify-content: space-between; align-items: center;">
              <span>${initialStock.toLocaleString('tr-TR')} ${initialUnit} ÷ ${katsayi} ≈ <span style="color: #16a34a; font-weight: 800;">${hesaplanan.toLocaleString('tr-TR')} ${newUnit}</span></span>
              <button type="button" class="btn-donusum-sifirla" style="background: none; border: none; color: #2563eb; text-decoration: underline; font-size: 12px; cursor: pointer; padding: 0;">Geri Al</button>
            </div>
          </div>
        </div>
      `;
      donusumBox.querySelector('.btn-donusum-sifirla')?.addEventListener('click', () => {
        urunStokInput.value = initialStock;
        donusumBox.style.display = 'none';
      });
    } else {
      donusumBox.style.display = 'none';
    }
  });

  modal.element.querySelector('#btnUrunIptal').addEventListener('click', () => modal.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      ad: form.querySelector('#urunAd').value.trim(),
      marka: form.querySelector('#urunMarka').value.trim() || null,
      barkod: form.querySelector('#urunBarkod').value.trim() || null,
      kategori_id: parseInt(form.querySelector('#urunKategori').value, 10),
      olcu_birimi: form.querySelector('#urunBirim').value,
      kritik_stok: parseInt(form.querySelector('#urunKritik').value, 10),
      stok: parseInt(form.querySelector('#urunStok').value, 10) || 0,
      gorsel_yolu: form.querySelector('#urunGorsel').value.trim() || null
    };

    try {
      if (isEdit) {
        const res = await api.updateUrun(urun.id, payload);
        toast.success('Ürün bilgileri ve stoğu güncellendi.');
        modal.close();
        if (typeof onSaved === 'function') {
          onSaved(res?.urun || { ...urun, ...payload, id: urun.id });
        }
      } else {
        const res = await api.addUrun(payload);
        toast.success('Yeni ürün başarıyla eklendi.');
        modal.close();
        if (typeof onSaved === 'function') {
          onSaved(res?.urun || payload);
        }
      }
    } catch (err) {
      toast.error(err.message);
    }
  });
}

// =========================================================================
// 2) STOK HAREKETLERİ SEKMESİ (Barkod Okuyucu ve Hızlı Arama Entegrasyonlu)
// =========================================================================
async function renderStokTab(container) {
  let urunler = [];
  try {
    const res = await api.getYonetimUrunler();
    urunler = res.urunler || [];
    tumUrunlerCache = urunler;
  } catch {}

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 360px 1fr; gap: 24px; align-items: start;">
      <!-- SOL: Yeni Stok Hareketi Formu (Barkod Entegrasyonlu) -->
      <div class="card" style="padding: 20px; align-self: start;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid var(--color-border); padding-bottom: 8px;">
          <h3 style="font-size: 16px; font-weight: 700; margin: 0;">${t('yonetim.newStockMovement', 'Yeni Stok Hareketi')}</h3>
          <span class="depo-scanner-ready-badge" style="font-size: 11px; padding: 2px 8px;">
            <span class="scanner-dot"></span> ${t('yonetim.scannerReadyShort', 'Tabanca Hazır')}
          </span>
        </div>

        <!-- 1. Barkod Okutma Kutusu -->
        <div style="background: rgba(37, 99, 235, 0.05); border: 1.5px dashed rgba(37, 99, 235, 0.35); border-radius: 12px; padding: 12px; margin-bottom: 14px;">
          <label style="font-size: 12px; font-weight: 700; color: #1D4ED8; margin-bottom: 6px; display: block;">
            ${t('yonetim.scanOrSearchBarcode', 'Barkod Okut / Ara:')}
          </label>
          <div style="display: flex; gap: 6px;">
            <input type="text" id="txtStokBarkod" placeholder="${t('yonetim.scanBarcodePlaceholder', 'Barkodu okutun (869...)')}" style="height: 38px; font-family: monospace; font-size: 13px; font-weight: 600; border-radius: 8px; border: 1px solid var(--color-border); background: #ffffff; padding: 0 10px; flex: 1;">
            <button type="button" class="btn btn-primary btn-sm" id="btnStokBarkodAra" style="padding: 0 14px; font-size: 12px; border-radius: 8px;">${t('yonetim.find', 'Bul')}</button>
          </div>
          <div style="font-size: 11px; color: var(--color-muted-foreground); margin-top: 4px;">
            ${t('yonetim.scannerHint', 'Barkod tabancasını okutabilir veya 13 haneli barkodu yazabilirsiniz.')}
          </div>
        </div>

        <!-- 2. Seçili Ürün Kartı (Önizleme) -->
        <div id="stokSeciliUrunKutusu" style="display: none; background: #ffffff; border: 1.2px solid rgba(37, 99, 235, 0.3); border-radius: 10px; padding: 10px 12px; margin-bottom: 14px; align-items: center; gap: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
          <img id="stokSeciliImg" src="/assets/placeholder.svg" onerror="this.onerror=null;this.src='/assets/placeholder.svg';" style="width: 44px; height: 44px; object-fit: contain; border-radius: 6px; border: 1px solid var(--color-border); background: #fff; padding: 2px; flex-shrink: 0;">
          <div style="flex: 1; min-width: 0;">
            <div id="stokSeciliAd" style="font-size: 13px; font-weight: 700; color: #0F172A; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"></div>
            <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px;">
              <span class="badge-barcode" id="stokSeciliBarkod" style="font-size: 11px; padding: 1px 5px;"></span>
              <span style="font-size: 11.5px; color: var(--color-muted-foreground);">${t('yonetim.colCurrentStock', 'Stok')}: <strong id="stokSeciliMiktar" style="color: #1D4ED8; font-weight: 700;"></strong></span>
            </div>
          </div>
        </div>

        <!-- 3. Stok Hareketi Formu -->
        <form id="stokHareketiForm" style="display: flex; flex-direction: column; gap: 14px;">
          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">${t('yonetim.selectProduct', 'Ürün Seçiniz')} <span style="color: red;">*</span></label>
            <select id="stokUrunSelect" required style="width: 100%;">
              <option value="">${t('yonetim.selectFromList', 'Listeden Seçiniz...')}</option>
              ${urunler.map(u => `
                <option value="${u.id}">${escapeHtml(tProduct(u.ad))} ${u.barkod ? `[${escapeHtml(u.barkod)}]` : ''} - (${t('yonetim.colCurrentStock', 'Mevcut')}: ${u.stok} ${tUnit(u.olcu_birimi)})</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">${t('yonetim.actionType', 'İşlem Türü')} <span style="color: red;">*</span></label>
            <select id="stokIslemTuru" required>
              <option value="giris">${t('yonetim.stockIn', 'Stok Ekle (Depo Girişi)')}</option>
              <option value="duzeltme">${t('yonetim.stockAdjust', 'Stok Düzelt / Eşitle (Sayım)')}</option>
            </select>
          </div>

          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">${t('yonetim.quantity', 'Miktar')} <span style="color: red;">*</span></label>
            <input type="number" id="stokMiktar" min="0" required placeholder="${t('yonetim.qtyPlaceholder', 'Giriş / Sayım Miktarı')}">
          </div>

          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">${t('yonetim.descriptionOptional', 'Açıklama (Opsiyonel)')}</label>
            <input type="text" id="stokAciklama" placeholder="${t('yonetim.descPlaceholder', 'Örn: Fatura No: 2026/41')}">
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top: 6px;">${t('yonetim.saveStockMovement', 'Stok Hareketini Kaydet')}</button>
        </form>
      </div>

      <!-- SAĞ: Son Stok Hareketleri Tablosu (Barkodlu ve Canlı Aramalı) -->
      <div class="card" style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid var(--color-border); padding-bottom: 10px; gap: 14px; flex-wrap: wrap;">
          <div>
            <h3 style="font-size: 16px; margin: 0 0 2px 0; font-weight: 700;">${t('yonetim.recentMovements', 'Son Stok Hareketleri')}</h3>
            <p style="margin: 0; font-size: 12px; color: var(--color-muted-foreground);">${t('yonetim.recentMovementsSub', 'Giriş, çıkış ve sayım düzeltmelerini inceleyin.')}</p>
          </div>

          <!-- Canlı Arama Kutusu -->
          <div class="depo-search-box" style="max-width: 360px; min-width: 220px; flex: 1;">
            <span class="depo-search-icon"></span>
            <input type="text" id="txtHareketAra" placeholder="${t('yonetim.searchMovementsPlaceholder', 'Ürün adı, barkod (869...), açıklama ara...')}" style="height: 38px; font-size: 13px;">
          </div>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 130px;">${t('yonetim.colDate', 'Tarih')}</th>
                <th>${t('yonetim.colProductBarcode', 'Ürün & Barkod')}</th>
                <th style="width: 80px;">${t('yonetim.colType', 'Tür')}</th>
                <th style="width: 100px;">${t('yonetim.colQty', 'Miktar')}</th>
                <th>${t('yonetim.colDescription', 'Açıklama')}</th>
                <th style="width: 110px;">${t('yonetim.colOperator', 'İşlemi Yapan')}</th>
              </tr>
            </thead>
            <tbody id="stokHareketlerTbody">
              <tr><td colspan="6" style="text-align: center; padding: 20px;">${t('common.loading', 'Yükleniyor...')}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#stokHareketiForm');
  const tbody = container.querySelector('#stokHareketlerTbody');
  const selectUrun = container.querySelector('#stokUrunSelect');
  const txtBarkod = container.querySelector('#txtStokBarkod');
  const btnBarkodAra = container.querySelector('#btnStokBarkodAra');
  const txtHareketAra = container.querySelector('#txtHareketAra');
  const seciliKutu = container.querySelector('#stokSeciliUrunKutusu');
  const seciliImg = container.querySelector('#stokSeciliImg');
  const seciliAd = container.querySelector('#stokSeciliAd');
  const seciliBarkod = container.querySelector('#stokSeciliBarkod');
  const seciliMiktar = container.querySelector('#stokSeciliMiktar');

  // Seçili Ürün Kartını Güncelleme Fonksiyonu
  function updateSeciliUrunPreview(urun) {
    if (!urun) {
      seciliKutu.style.display = 'none';
      return;
    }
    seciliImg.src = urun.gorsel_yolu || '/assets/placeholder.svg';
    seciliAd.textContent = tProduct(urun.ad);
    seciliBarkod.textContent = urun.barkod ? `${urun.barkod}` : 'Barkodsuz';
    seciliMiktar.textContent = `${urun.stok} ${tUnit(urun.olcu_birimi)}`;
    seciliKutu.style.display = 'flex';
  }

  // Dropdown değiştiğinde kartı ve barkod kutusunu güncelle
  selectUrun.addEventListener('change', () => {
    const val = parseInt(selectUrun.value, 10);
    const u = urunler.find(x => x.id === val);
    if (u) {
      txtBarkod.value = u.barkod || '';
      updateSeciliUrunPreview(u);
    } else {
      txtBarkod.value = '';
      updateSeciliUrunPreview(null);
    }
  });

  // Barkod Ara Butonu ve Enter ile Arama
  const doBarkodSearch = () => {
    const code = txtBarkod.value.trim();
    if (!code) {
      toast.error('Lütfen bir barkod giriniz veya okutunuz.');
      return;
    }
    handleScannedBarcodeInStokTab(code, container);
  };

  btnBarkodAra.addEventListener('click', doBarkodSearch);
  txtBarkod.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doBarkodSearch();
    }
  });

  let tumHareketlerCache = [];

  // Tabloyu Filtreleyip Çizme
  function renderHareketlerRows() {
    const q = (txtHareketAra?.value || '').toLowerCase().trim();

    const filtered = tumHareketlerCache.filter(h => {
      if (!q) return true;
      const adMatch = (h.urun_adi || '').toLowerCase().includes(q);
      const barkodMatch = (h.urun_barkod || '').toLowerCase().includes(q);
      const markaMatch = (h.urun_marka || '').toLowerCase().includes(q);
      const aciklamaMatch = (h.aciklama || '').toLowerCase().includes(q);
      const yapanMatch = (h.yapan_kullanici || '').toLowerCase().includes(q);
      return adMatch || barkodMatch || markaMatch || aciklamaMatch || yapanMatch;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--color-muted-foreground);">${t('yonetim.noMovementsFound', 'Kriterlere uygun stok hareketi bulunamadı.')}</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(h => {
      let turBadge = `<span class="badge badge-success">${t('yonetim.stockInBadge', 'Giriş')}</span>`;
      if (h.tur === 'cikis') turBadge = `<span class="badge badge-danger">${t('yonetim.stockOutBadge', 'Çıkış')}</span>`;
      else if (h.tur === 'duzeltme') turBadge = `<span class="badge badge-warning">${t('yonetim.stockAdjustBadge', 'Düzeltme')}</span>`;

      return `
        <tr>
          <td style="font-size: 12px; color: var(--color-muted-foreground); white-space: nowrap;">${escapeHtml(h.olusturma_tarihi)}</td>
          <td>
            <strong>${escapeHtml(tProduct(h.urun_adi))}</strong>
            ${h.urun_marka ? `<div style="font-size: 11px; color: var(--color-muted-foreground);">${escapeHtml(h.urun_marka)}</div>` : ''}
            ${h.urun_barkod ? `<div class="badge-barcode">${escapeHtml(h.urun_barkod)}</div>` : ''}
          </td>
          <td>${turBadge}</td>
          <td><strong style="color: ${h.tur === 'cikis' ? 'var(--color-destructive)' : '#16A34A'};">${h.tur === 'cikis' ? '-' : '+'}${h.miktar} ${tUnit(h.olcu_birimi)}</strong></td>
          <td style="font-size: 12.5px;">${escapeHtml(h.aciklama || '-')}</td>
          <td style="font-size: 12px;">${escapeHtml(h.yapan_kullanici || 'Sistem')}</td>
        </tr>
      `;
    }).join('');
  }

  // Canlı Hareket Arama
  txtHareketAra?.addEventListener('input', () => {
    renderHareketlerRows();
  });

  const loadHareketler = async () => {
    try {
      const res = await api.getStokHareketleri(100);
      tumHareketlerCache = res.hareketler || [];
      renderHareketlerRows();
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" style="color: var(--color-destructive);">${e.message}</td></tr>`;
    }
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const urun_id = parseInt(form.querySelector('#stokUrunSelect').value, 10);
    const tur = form.querySelector('#stokIslemTuru').value;
    const miktar = parseInt(form.querySelector('#stokMiktar').value, 10);
    const aciklama = form.querySelector('#stokAciklama').value.trim();

    if (!urun_id) {
      toast.error('Lütfen bir ürün seçiniz veya barkodunu okutunuz.');
      return;
    }

    try {
      await api.stokHareketi({ urun_id, tur, miktar, aciklama });
      toast.success('Stok hareketi başarıyla işlendi.');
      form.reset();
      updateSeciliUrunPreview(null);
      await loadHareketler();
      // Ürünler listesini arka planda güncelle
      const resU = await api.getYonetimUrunler();
      urunler = resU.urunler || [];
      tumUrunlerCache = urunler;
    } catch (err) {
      toast.error(err.message);
    }
  });

  // Donanım Barkod Okuyucu Tabancasını Başlat
  setupBarcodeGunListener(container);

  await loadHareketler();
}

// =========================================================================
// 3) BİRİMLER, HESAPLAR VE PERSONEL ONBOARDING SEKMESİ
// =========================================================================
async function renderBirimlerTab(container) {
  const mainPane = document.querySelector('.main-content-pane');
  const prevScrollTop = mainPane ? mainPane.scrollTop : window.scrollY;

  let birimler = [];
  try {
    const res = await api.getYonetimBirimler();
    birimler = res.birimler || [];
  } catch {}

  const fakulteIdSet = new Set(birimler.filter(b => b.ust_birim_id === 109).map(b => b.id));

  // Birim Kategorisi Belirleme (İdari / Akademik / Merkezler - Rehberdeki Gibi)
  function getBirimKategori(b) {
    if (b.id === 109 || b.ust_birim_id === 109 || fakulteIdSet.has(b.ust_birim_id)) {
      return 'akademik';
    }
    if (b.id === 110 || b.ust_birim_id === 110) {
      return 'merkezler';
    }
    return 'idari';
  }

  const idariBirimler = birimler.filter(b => getBirimKategori(b) === 'idari');
  const akademikBirimler = birimler.filter(b => getBirimKategori(b) === 'akademik');
  const merkezBirimler = birimler.filter(b => getBirimKategori(b) === 'merkezler');

  // Akademik birimleri fakülte ve altındaki bölümler şeklinde hiyerarşik sırala
  const siraliAkademik = [];
  const fakulteler = akademikBirimler.filter(b => b.ust_birim_id === 109);
  // Önce kök akademik birim
  const kokAkademik = akademikBirimler.find(b => b.id === 109);
  if (kokAkademik) siraliAkademik.push(kokAkademik);

  for (const fak of fakulteler) {
    siraliAkademik.push(fak);
    const bolumler = akademikBirimler.filter(b => b.ust_birim_id === fak.id);
    bolumler.sort((a, b) => a.ad.localeCompare(b.ad, 'tr-TR'));
    for (const bol of bolumler) {
      siraliAkademik.push({ ...bol, isBolum: true, fakulteAd: fak.ad });
    }
  }
  // Kalan diğer akademik birimler varsa ekle
  for (const b of akademikBirimler) {
    if (!siraliAkademik.some(x => x.id === b.id)) {
      siraliAkademik.push(b);
    }
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <div>
        <h3 style="font-size: 17px; font-weight: 700;">Birimler & Kurumsal Hesaplar</h3>
        <p style="font-size: 13px; color: var(--color-muted-foreground); margin-top: 2px;">
          Rehberdeki gibi gruplanmış idari birimler, fakülteler/bölümler ve araştırma merkezlerinin hesaplarını yönetin.
        </p>
      </div>
      <button id="btnYeniBirimModal" class="btn btn-primary btn-sm">Yeni Birim Ekle</button>
    </div>

    <!-- Birimler Kategori Filtre Butonları (Rehberdeki Gibi) -->
    <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 14px; flex-wrap: wrap;">
      <button class="btn btn-sm btn-birim-kat active" data-kat="tumu" style="border-radius: 9999px; padding: 6px 16px; font-weight: 600;">
        ${t('yonetim.allUnits', 'Tüm Birimler')} (${birimler.length})
      </button>
      <button class="btn btn-sm btn-outline btn-birim-kat" data-kat="idari" style="border-radius: 9999px; padding: 6px 16px; font-weight: 600;">
        ${t('yonetim.adminUnits', 'İdari Birimler')} (${idariBirimler.length})
      </button>
      <button class="btn btn-sm btn-outline btn-birim-kat" data-kat="akademik" style="border-radius: 9999px; padding: 6px 16px; font-weight: 600;">
        ${t('yonetim.academicUnits', 'Akademik Birimler')} (${akademikBirimler.length})
      </button>
      <button class="btn btn-sm btn-outline btn-birim-kat" data-kat="merkezler" style="border-radius: 9999px; padding: 6px 16px; font-weight: 600;">
        ${t('yonetim.researchCenters', 'Araştırma Merkezleri')} (${merkezBirimler.length})
      </button>

      <div style="margin-left: auto;">
        <input type="text" id="birimTabloArama" placeholder="${t('yonetim.searchUnitPlaceholder', 'Birim adı veya türü ara...')}" style="width: 240px; padding: 6px 12px; font-size: 13px; border-radius: 8px; border: 1px solid var(--color-border);">
      </div>
    </div>

    <!-- Birimler Tablosu -->
    <div class="table-container" style="margin-bottom: 32px; max-height: 520px; overflow-y: auto;">
      <table class="data-table">
        <thead style="position: sticky; top: 0; background: var(--color-background); z-index: 5;">
          <tr>
            <th>${t('yonetim.colUnitName', 'Birim Adı')}</th>
            <th>${t('yonetim.colCategoryType', 'Kategori & Tür')}</th>
            <th>${t('yonetim.colParentUnit', 'Bağlı Olduğu Üst Birim')}</th>
            <th style="width: 140px;">${t('yonetim.colOpenForRequisition', 'Talebe Açık')}</th>
            <th style="text-align: right; width: 220px;">${t('common.actions', 'İşlemler')}</th>
          </tr>
        </thead>
        <tbody id="birimlerTbody">
          <tr><td colspan="5" style="text-align: center; padding: 30px;">${t('common.loading', 'Yükleniyor...')}</td></tr>
        </tbody>
      </table>
    </div>

    <!-- Personel Bireysel Hesapları ve E-posta ile Geçici Şifre Gönderme Paneli -->
    <div class="card" style="padding: 24px; border: 1px solid var(--color-border); background: var(--color-card);">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <h3 style="font-size: 17px; font-weight: 700; color: #0F172A;">${t('yonetim.directoryAccountsTitle', 'Rehber Personeline Bireysel Hesap Tanımlama & E-posta Bildirimi')}</h3>
          <p style="font-size: 13px; color: var(--color-muted-foreground); margin-top: 4px;">
            ${t('yonetim.directoryAccountsSub', 'Kurumsal rehberdeki personele otomatik kullanıcı hesabı açın ve ilk giriş davet e-postasını gönderin.')}
          </p>
        </div>
      </div>

      <!-- Filtreler ve Seçimler (İdari / Akademik Gruplu) -->
      <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px; background: rgba(30, 58, 138, 0.04); padding: 14px 18px; border-radius: 12px; border: 1px solid rgba(30, 58, 138, 0.1);">
        <!-- Hızlı Personel Kategorisi Seçimi -->
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <span style="font-size: 12px; font-weight: 700; color: #1E3A8A; margin-right: 4px;">${t('yonetim.staffGroup', 'Personel Grubu:')}</span>
          <button type="button" class="btn btn-sm btn-pers-kat active" data-pers-kat="tumu" style="border-radius: 9999px; padding: 4px 12px; font-size: 12px;">${t('yonetim.allStaff', 'Tümü')} (788)</button>
          <button type="button" class="btn btn-sm btn-outline btn-pers-kat" data-pers-kat="idari" style="border-radius: 9999px; padding: 4px 12px; font-size: 12px;">${t('yonetim.adminStaff', 'İdari Personel')}</button>
          <button type="button" class="btn btn-sm btn-outline btn-pers-kat" data-pers-kat="akademik" style="border-radius: 9999px; padding: 4px 12px; font-size: 12px;">${t('yonetim.academicStaff', 'Akademik Personel')}</button>
          <button type="button" class="btn btn-sm btn-outline btn-pers-kat" data-pers-kat="merkezler" style="border-radius: 9999px; padding: 4px 12px; font-size: 12px;">${t('yonetim.researchCenters', 'Araştırma Merkezleri')}</button>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 14px; align-items: center;">
          <div>
            <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">${t('yonetim.deptFilter', 'Birim Filtresi:')}</label>
            <select id="personelBirimSelect" style="min-width: 260px;">
              <option value="">${t('yonetim.allOrgWide', 'Tüm Kurum Geneli')} (788)</option>
              <optgroup label="${t('yonetim.adminUnits', 'İdari Birimler')}">
                ${idariBirimler.map(b => `<option value="${b.id}">${escapeHtml(tDepartment(b.ad))}</option>`).join('')}
              </optgroup>
              <optgroup label="${t('yonetim.academicUnits', 'Akademik Birimler')}">
                ${akademikBirimler.map(b => `<option value="${b.id}">${escapeHtml(tDepartment(b.ad))}</option>`).join('')}
              </optgroup>
              <optgroup label="${t('yonetim.researchCenters', 'Araştırma Merkezleri')}">
                ${merkezBirimler.map(b => `<option value="${b.id}">${escapeHtml(tDepartment(b.ad))}</option>`).join('')}
              </optgroup>
            </select>
          </div>

          <div>
            <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">${t('common.search', 'Personel Arama:')}</label>
            <input type="text" id="personelArama" placeholder="${t('yonetim.searchStaffPlaceholder', 'İsim, unvan veya e-posta...')}" style="width: 200px;">
          </div>

          <div style="display: flex; align-items: center; gap: 8px; margin-top: 18px;">
            <input type="checkbox" id="chkUstYonetimHaric" checked style="width: 16px; height: 16px; cursor: pointer;">
            <label for="chkUstYonetimHaric" style="font-size: 12.5px; font-weight: 600; color: #1E3A8A; cursor: pointer;">
              ${t('yonetim.excludeExecManagement', 'Üst Yönetimi Hariç Tut (Rektör, Dekan vb.)')}
            </label>
          </div>

          <div style="margin-left: auto; margin-top: 18px;">
            <button id="btnTopluHesapAc" class="btn btn-primary btn-sm" style="font-weight: 700;">
              ${t('yonetim.provisionSelectedAccounts', 'Seçilenlere Hesap Aç & Şifre E-postası Gönder')}
            </button>
          </div>
        </div>
      </div>

      <!-- Personel Tablosu -->
      <div class="table-container" style="max-height: 400px; overflow-y: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">
                <input type="checkbox" id="chkAllPersonel" style="cursor: pointer; width: 16px; height: 16px;">
              </th>
              <th>${t('yonetim.colFullName', 'Ad Soyad')}</th>
              <th>${t('yonetim.colTitleRole', 'Unvan / Görev')}</th>
              <th>${t('yonetim.colUnit', 'Birim')}</th>
              <th>${t('yonetim.colCorporateEmail', 'Kurumsal E-posta')}</th>
              <th>${t('yonetim.colBuildingRoom', 'Bina & Oda')}</th>
              <th>${t('yonetim.colAccountStatus', 'Hesap Durumu')}</th>
            </tr>
          </thead>
          <tbody id="personelTbody">
            <tr><td colspan="7" style="text-align: center; padding: 20px;">${t('common.loading', 'Personel listesi yükleniyor...')}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.querySelector('#btnYeniBirimModal').addEventListener('click', () => openBirimFormModal(null, () => renderBirimlerTab(container)));

  // Birimler Tablosunu Kategori ve Aramaya Göre Render Etme
  let aktifBirimKat = 'tumu';
  const tbodyBirim = container.querySelector('#birimlerTbody');
  const aramaBirimInput = container.querySelector('#birimTabloArama');

  const renderBirimTableRows = () => {
    const q = aramaBirimInput.value.toLowerCase().trim();

    // Filtreleme fonksiyonu
    const filterUnit = (b) => {
      if (aktifBirimKat === 'idari' && getBirimKategori(b) !== 'idari') return false;
      if (aktifBirimKat === 'akademik' && getBirimKategori(b) !== 'akademik') return false;
      if (aktifBirimKat === 'merkezler' && getBirimKategori(b) !== 'merkezler') return false;
      if (q) {
        const matchAd = (b.ad || '').toLowerCase().includes(q);
        const matchTur = (b.tur || '').toLowerCase().includes(q);
        const matchUst = (b.ust_birim_ad || '').toLowerCase().includes(q);
        if (!matchAd && !matchTur && !matchUst) return false;
      }
      return true;
    };

    const renderUnitRow = (b) => {
      const kat = getBirimKategori(b);
      const isBolum = b.isBolum || (kat === 'akademik' && b.tur === 'bolum');
      return `
        <tr style="${isBolum ? 'background: rgba(248, 250, 252, 0.6);' : ''}">
          <td style="${isBolum ? 'padding-left: 28px;' : ''}">
            ${isBolum ? '<span style="color: #94A3B8; margin-right: 6px;">↳</span>' : ''}
            <strong>${escapeHtml(tDepartment(b.ad))}</strong>
          </td>
          <td>
            <span class="badge ${kat === 'akademik' ? 'badge-primary' : (kat === 'merkezler' ? 'badge-warning' : 'badge-neutral')}" style="font-size: 11px;">
              ${kat === 'akademik' ? (b.tur === 'dekanlik' ? t('yonetim.facultyDeansOffice', 'Fakülte Dekanlığı') : t('yonetim.academicDept', 'Bölüm')) : (kat === 'merkezler' ? t('yonetim.researchCenter', 'Araştırma Merkezi') : t('yonetim.adminDept', 'İdari Birim'))}
            </span>
          </td>
          <td>${escapeHtml(tDepartment(b.ust_birim_ad) || '-')}</td>
          <td>
            <div style="display: inline-flex; align-items: center; gap: 8px;">
              <div class="mini-settings-switch ${b.aktif ? 'is-on' : 'is-off'}" 
                   data-id="${b.id}" 
                   data-ad="${b.ad}"
                   data-aktif="${b.aktif ? '1' : '0'}"
                   role="switch" 
                   aria-checked="${b.aktif ? 'true' : 'false'}"
                   title="${b.aktif ? (t('yonetim.open', 'Açık')) : (t('yonetim.closed', 'Kapalı'))}">
                <span class="mini-switch-handle"></span>
              </div>
              <span class="badge badge-${b.aktif ? 'success' : 'neutral'}" id="badgeBirimDurum_${b.id}" style="font-size: 11px;">
                ${b.aktif ? t('yonetim.open', 'Açık') : t('yonetim.closed', 'Kapalı')}
              </span>
            </div>
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px;">
              <button class="btn btn-outline btn-sm btn-birim-duzenle" data-id="${b.id}">${t('common.edit', 'Düzenle')}</button>
              <button class="btn btn-outline btn-sm btn-sifre-sifirla" data-id="${b.id}" data-ad="${b.ad}">${t('yonetim.resetPassword', 'Şifre Sıfırla')}</button>
              <button class="btn btn-outline btn-sm btn-birim-sil" data-id="${b.id}" data-ad="${b.ad}" style="color: var(--color-destructive); border-color: rgba(239, 68, 68, 0.3);">${t('common.delete', 'Sil')}</button>
            </div>
          </td>
        </tr>
      `;
    };

    let rowsHtml = '';

    if (aktifBirimKat === 'tumu' && !q) {
      // 1. İdari Birimler Bölümü
      rowsHtml += `
        <tr style="background: rgba(30, 58, 138, 0.08); font-weight: 700;">
          <td colspan="5" style="padding: 10px 14px; color: #1E3A8A; font-size: 13.5px;">
            İDARİ BİRİMLER (${idariBirimler.length} Birim - Rektörlük, Genel Sekreterlik, Daire Başkanlıkları & Müdürlükler)
          </td>
        </tr>
      `;
      rowsHtml += idariBirimler.map(renderUnitRow).join('');

      // 2. Akademik Birimler Bölümü
      rowsHtml += `
        <tr style="background: rgba(2, 132, 199, 0.08); font-weight: 700;">
          <td colspan="5" style="padding: 10px 14px; color: #0369A1; font-size: 13.5px;">
            AKADEMİK BİRİMLER (${akademikBirimler.length} Birim - 11 Fakülte & Enstitü, 48 Bölüm)
          </td>
        </tr>
      `;
      rowsHtml += siraliAkademik.map(renderUnitRow).join('');

      // 3. Merkezler Bölümü
      rowsHtml += `
        <tr style="background: rgba(217, 119, 6, 0.08); font-weight: 700;">
          <td colspan="5" style="padding: 10px 14px; color: #B45309; font-size: 13.5px;">
            UYGULAMA VE ARAŞTIRMA MERKEZLERİ (${merkezBirimler.length} Merkez)
          </td>
        </tr>
      `;
      rowsHtml += merkezBirimler.map(renderUnitRow).join('');
    } else {
      const unitsToShow = (aktifBirimKat === 'idari' ? idariBirimler : (aktifBirimKat === 'akademik' ? siraliAkademik : (aktifBirimKat === 'merkezler' ? merkezBirimler : birimler))).filter(filterUnit);
      if (unitsToShow.length === 0) {
        rowsHtml = `<tr><td colspan="5" style="text-align: center; padding: 25px; color: var(--color-muted-foreground);">Kriterlere uygun birim bulunamadı.</td></tr>`;
      } else {
        rowsHtml = unitsToShow.map(renderUnitRow).join('');
      }
    }

    tbodyBirim.innerHTML = rowsHtml;
    attachBirimRowEvents();
  };

  const attachBirimRowEvents = () => {
    // Birim Aç / Kapat Switch Olayı
    tbodyBirim.querySelectorAll('.mini-settings-switch').forEach(sw => {
      sw.addEventListener('click', async (e) => {
        e.stopPropagation();
        const birimId = parseInt(sw.dataset.id, 10);
        const birimAd = sw.dataset.ad;
        const currentAktif = sw.dataset.aktif === '1';
        const newAktif = !currentAktif;

        sw.className = `mini-settings-switch ${newAktif ? 'is-on' : 'is-off'}`;
        sw.dataset.aktif = newAktif ? '1' : '0';
        const badge = tbodyBirim.querySelector(`#badgeBirimDurum_${birimId}`);
        if (badge) {
          badge.className = `badge badge-${newAktif ? 'success' : 'neutral'}`;
          badge.textContent = newAktif ? 'Açık' : 'Kapalı';
        }

        try {
          const res = await api.updateBirimDurum(birimId, newAktif);
          toast.success(res.mesaj || `"${birimAd}" durumu güncellendi.`);
        } catch (err) {
          sw.className = `mini-settings-switch ${currentAktif ? 'is-on' : 'is-off'}`;
          sw.dataset.aktif = currentAktif ? '1' : '0';
          if (badge) {
            badge.className = `badge badge-${currentAktif ? 'success' : 'neutral'}`;
            badge.textContent = currentAktif ? 'Açık' : 'Kapalı';
          }
          toast.error('Birim durumu değiştirilemedi: ' + err.message);
        }
      });
    });

    // Birim Düzenle
    tbodyBirim.querySelectorAll('.btn-birim-duzenle').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = birimler.find(x => x.id === parseInt(btn.dataset.id, 10));
        openBirimFormModal(b, () => renderBirimlerTab(container));
      });
    });

    // Birim Sil
    tbodyBirim.querySelectorAll('.btn-birim-sil').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id, 10);
        const ad = btn.dataset.ad;
        const onay = await confirmModal({
          title: 'Birimi Sil',
          message: `"${ad}" birimini ve bağlı hesaplarını silmek istediğinize emin misiniz?`,
          description: 'Geçmiş siparişler varsa veri bütünlüğü korunarak güvenle arşivlenecek ve ilişkili hesap pasife alınacaktır.',
          confirmText: 'Evet, Birimi Sil',
          cancelText: 'Vazgeç',
          type: 'danger',
          icon: ''
        });
        if (!onay) return;
        try {
          const res = await api.deleteBirim(id);
          toast.success(res.mesaj || 'Birim başarıyla silindi.');
          await renderBirimlerTab(container);
        } catch (err) {
          toast.error('Birim silinemedi: ' + err.message);
        }
      });
    });

    // Birim Şifre Sıfırla
    tbodyBirim.querySelectorAll('.btn-sifre-sifirla').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        const ad = btn.dataset.ad;
        openSifreSifirlaModal(id, ad);
      });
    });
  };

  // Kategori Butonları Tıklama
  container.querySelectorAll('.btn-birim-kat').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.btn-birim-kat').forEach(b => {
        b.className = 'btn btn-sm btn-outline btn-birim-kat';
      });
      btn.className = 'btn btn-sm btn-birim-kat active';
      aktifBirimKat = btn.dataset.kat;
      renderBirimTableRows();
    });
  });

  aramaBirimInput.addEventListener('input', renderBirimTableRows);
  renderBirimTableRows();

  // Personel Listesi Yükleme & Hesap Açma
  await loadPersoneller(container, birimler, getBirimKategori);
}

// Personelleri Yükleme ve Filtreleme
async function loadPersoneller(container, birimler, getBirimKategori) {
  const tbody = container.querySelector('#personelTbody');
  const birimSelect = container.querySelector('#personelBirimSelect');
  const aramaInput = container.querySelector('#personelArama');
  const chkAll = container.querySelector('#chkAllPersonel');
  const chkUstYonetim = container.querySelector('#chkUstYonetimHaric');
  const btnHesapAc = container.querySelector('#btnTopluHesapAc');

  const birimIdToKat = new Map((birimler || []).map(b => [b.id, getBirimKategori ? getBirimKategori(b) : 'idari']));
  let aktifPersKat = 'tumu';

  seciliPersoneller.clear();

  try {
    const res = await api.getYonetimPersoneller();
    tumPersoneller = res.personeller || [];
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color: var(--color-destructive);">${err.message}</td></tr>`;
    return;
  }

  const renderFiltered = () => {
    const selectedBirimId = birimSelect.value ? parseInt(birimSelect.value, 10) : null;
    const query = aramaInput.value.toLowerCase().trim();
    const ustYonetimHaric = chkUstYonetim.checked;

    const filtered = tumPersoneller.filter(p => {
      if (aktifPersKat !== 'tumu') {
        const kat = birimIdToKat.get(p.birim_id) || 'idari';
        if (kat !== aktifPersKat) return false;
      }
      if (selectedBirimId && p.birim_id !== selectedBirimId) return false;
      if (query) {
        const matchName = (p.ad_soyad || '').toLowerCase().includes(query);
        const matchTitle = (p.unvan || '').toLowerCase().includes(query);
        const matchEmail = (p.eposta || '').toLowerCase().includes(query);
        const matchBirim = (p.birim_ad || '').toLowerCase().includes(query);
        if (!matchName && !matchTitle && !matchEmail && !matchBirim) return false;
      }
      if (ustYonetimHaric) {
        const titleLower = (p.unvan || '').toLowerCase();
        if (titleLower.includes('rektör') || titleLower.includes('dekan') || titleLower.includes('bölüm başkanı')) {
          return false;
        }
      }
      return true;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 25px; color: var(--color-muted-foreground);">Kriterlere uygun personel bulunamadı.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => `
      <tr>
        <td style="text-align: center;">
          <input type="checkbox" class="chk-pers-item" data-id="${p.id}" ${seciliPersoneller.has(p.id) ? 'checked' : ''} style="cursor: pointer; width: 16px; height: 16px;">
        </td>
        <td><strong>${p.ad_soyad}</strong></td>
        <td>${p.unvan || '-'}</td>
        <td>${p.birim_ad || '-'}</td>
        <td>${p.eposta ? `<span style="color: #1E3A8A; font-weight: 500;">${p.eposta}</span>` : '<span style="color: red;">E-posta yok</span>'}</td>
        <td>
          ${p.bina_adi || p.oda_no ? `<span style="font-size: 11.5px; color: #0F172A;">${p.bina_adi || ''} ${p.oda_no ? `(Oda: ${p.oda_no})` : ''}</span>` : '<span style="color: var(--color-muted-foreground); font-size: 11px;">Girilmemiş</span>'}
        </td>
        <td>
          ${p.hesap_var ? '<span class="badge badge-success">Hesap Aktif</span>' : '<span class="badge badge-neutral">Hesap Yok</span>'}
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.chk-pers-item').forEach(chk => {
      chk.addEventListener('change', () => {
        const id = parseInt(chk.dataset.id, 10);
        if (chk.checked) seciliPersoneller.add(id);
        else seciliPersoneller.delete(id);
        chkAll.checked = filtered.length > 0 && filtered.every(p => seciliPersoneller.has(p.id));
      });
    });

    chkAll.checked = filtered.length > 0 && filtered.every(p => seciliPersoneller.has(p.id));
  };

  // Personel Grubu Butonları
  container.querySelectorAll('.btn-pers-kat').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.btn-pers-kat').forEach(b => {
        b.className = 'btn btn-sm btn-outline btn-pers-kat';
      });
      btn.className = 'btn btn-sm btn-pers-kat active';
      aktifPersKat = btn.dataset.persKat;
      renderFiltered();
    });
  });

  birimSelect.addEventListener('change', renderFiltered);
  aramaInput.addEventListener('input', renderFiltered);
  chkUstYonetim.addEventListener('change', renderFiltered);

  chkAll.addEventListener('change', () => {
    const selectedBirimId = birimSelect.value ? parseInt(birimSelect.value, 10) : null;
    const query = aramaInput.value.toLowerCase().trim();
    const ustYonetimHaric = chkUstYonetim.checked;

    const filtered = tumPersoneller.filter(p => {
      if (aktifPersKat !== 'tumu') {
        const kat = birimIdToKat.get(p.birim_id) || 'idari';
        if (kat !== aktifPersKat) return false;
      }
      if (selectedBirimId && p.birim_id !== selectedBirimId) return false;
      if (query && !(p.ad_soyad || '').toLowerCase().includes(query)) return false;
      if (ustYonetimHaric) {
        const titleLower = (p.unvan || '').toLowerCase();
        if (titleLower.includes('rektör') || titleLower.includes('dekan')) return false;
      }
      return true;
    });

    if (chkAll.checked) {
      filtered.forEach(p => seciliPersoneller.add(p.id));
    } else {
      filtered.forEach(p => seciliPersoneller.delete(p.id));
    }
    renderFiltered();
  });

  // Toplu Hesap Açma ve E-posta Gönderme
  btnHesapAc.addEventListener('click', async () => {
    if (seciliPersoneller.size === 0) {
      toast.error('Lütfen hesap açılacak en az bir personel seçiniz.');
      return;
    }

    const onay = await confirmModal({
      title: 'Toplu Hesap Açılışı ve E-Posta Gönderimi',
      message: `Seçilen ${seciliPersoneller.size} personel için kurumsal giriş hesabı oluşturulacak ve tek kullanımlık geçici şifreleri kurumsal e-postalarına gönderilecektir.`,
      description: 'Hesabı açılan personel ilk oturum açtığında yeni şifre belirleyecek, teslimat yapılacak bina ve oda numarasını sisteme kaydedecektir.',
      confirmText: 'Hesapları Aç & Şifreleri Gönder',
      cancelText: 'Vazgeç',
      type: 'primary',
      icon: ''
    });
    if (!onay) return;

    btnHesapAc.disabled = true;
    btnHesapAc.textContent = 'Hesaplar Açılıyor...';

    try {
      const res = await api.olusturPersonelHesaplari({
        personel_ids: Array.from(seciliPersoneller),
        personel_idler: Array.from(seciliPersoneller),
        ust_yonetim_haric: chkUstYonetim.checked
      });

      toast.success(res.mesaj || `${res.olusturulanlar?.length || seciliPersoneller.size} personele hesap açıldı ve e-postaları kuyruğa alındı.`);
      seciliPersoneller.clear();
      await renderBirimlerTab(container);
    } catch (err) {
      toast.error('Hesap açma işlemi başarısız: ' + err.message);
      btnHesapAc.disabled = false;
      btnHesapAc.textContent = 'Seçilenlere Hesap Aç & Şifre E-postası Gönder';
    }
  });

  renderFiltered();
  if (mainPane && prevScrollTop > 0) {
    mainPane.scrollTop = prevScrollTop;
  }
}

// Birim Ekle / Düzenle Modalı
async function openBirimFormModal(birim = null, onSaved) {
  const isEdit = Boolean(birim);
  let ustBirimler = [];
  try {
    const res = await api.getYonetimBirimler();
    ustBirimler = (res.birimler || []).filter(b => !birim || b.id !== birim.id);
  } catch {}

  const fakSet = new Set(ustBirimler.filter(b => b.ust_birim_id === 109).map(b => b.id));
  const idariUst = ustBirimler.filter(b => b.id !== 109 && b.id !== 110 && b.ust_birim_id !== 109 && b.ust_birim_id !== 110 && !fakSet.has(b.ust_birim_id));
  const akadUst = ustBirimler.filter(b => b.id === 109 || b.ust_birim_id === 109 || fakSet.has(b.ust_birim_id));
  const merkezUst = ustBirimler.filter(b => b.id === 110 || b.ust_birim_id === 110);

  const modal = createModal({
    title: isEdit ? 'Birim Bilgilerini Düzenle' : 'Yeni Birim Tanımla',
    maxWidth: '520px',
    contentHtml: `
      <form id="birimForm" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">Birim Adı <span style="color: red;">*</span></label>
          <input type="text" id="birimAd" required value="${birim?.ad || ''}" placeholder="Örn: Hukuk Fakültesi Dekanlığı">
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">Birim Türü <span style="color: red;">*</span></label>
            <select id="birimTur" required>
              <option value="idari_birim" ${birim?.tur === 'idari_birim' ? 'selected' : ''}>İdari Birim / Müdürlük</option>
              <option value="dekanlik" ${birim?.tur === 'dekanlik' ? 'selected' : ''}>Fakülte Dekanlığı</option>
              <option value="bolum" ${birim?.tur === 'bolum' ? 'selected' : ''}>Bölüm</option>
            </select>
          </div>
          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">Üst Birim</label>
            <select id="birimUstId">
              <option value="">Yok (Bağımsız / En Üst)</option>
              <optgroup label="İdari Birimler">
                ${idariUst.map(ub => `<option value="${ub.id}" ${birim?.ust_birim_id === ub.id ? 'selected' : ''}>${ub.ad}</option>`).join('')}
              </optgroup>
              <optgroup label="Akademik Birimler (Fakülteler ve Enstitüler)">
                ${akadUst.map(ub => `<option value="${ub.id}" ${birim?.ust_birim_id === ub.id ? 'selected' : ''}>${ub.ad}</option>`).join('')}
              </optgroup>
              <optgroup label="Uygulama ve Araştırma Merkezleri">
                ${merkezUst.map(ub => `<option value="${ub.id}" ${birim?.ust_birim_id === ub.id ? 'selected' : ''}>${ub.ad}</option>`).join('')}
              </optgroup>
            </select>
          </div>
        </div>

        ${!isEdit ? `
          <div style="border-top: 1px solid var(--color-border); padding-top: 12px;">
            <h4 style="font-size: 13px; font-weight: 700; margin-bottom: 8px;">Birim Ortak Giriş Hesabı (Opsiyonel)</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div>
                <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Kullanıcı Adı</label>
                <input type="text" id="birimKullanici" placeholder="Örn: hukuk">
              </div>
              <div>
                <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">İlk Şifre</label>
                <input type="password" id="birimSifre" placeholder="••••••••">
              </div>
            </div>
          </div>
        ` : ''}

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px;">
          <button type="button" class="btn btn-outline" id="btnBirimIptal">İptal</button>
          <button type="submit" class="btn btn-primary">${isEdit ? 'Değişiklikleri Kaydet' : 'Birimi Oluştur'}</button>
        </div>
      </form>
    `
  });

  const form = modal.element.querySelector('#birimForm');
  modal.element.querySelector('#btnBirimIptal').addEventListener('click', () => modal.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      ad: form.querySelector('#birimAd').value.trim(),
      tur: form.querySelector('#birimTur').value,
      ust_birim_id: form.querySelector('#birimUstId').value ? parseInt(form.querySelector('#birimUstId').value, 10) : null
    };

    if (!isEdit) {
      payload.kullanici_adi = form.querySelector('#birimKullanici').value.trim() || null;
      payload.sifre = form.querySelector('#birimSifre').value || null;
    }

    try {
      if (isEdit) {
        await api.updateBirim(birim.id, payload);
        toast.success('Birim bilgileri güncellendi.');
      } else {
        await api.addBirim(payload);
        toast.success('Yeni birim başarıyla oluşturuldu.');
      }
      modal.close();
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(err.message);
    }
  });
}

// Şifre Sıfırlama Modalı (Prompt yerine sleek modal)
function openSifreSifirlaModal(birimId, birimAd) {
  const modal = createModal({
    title: `Şifre Sıfırla: ${birimAd}`,
    maxWidth: '440px',
    contentHtml: `
      <form id="sifirlaForm" style="display: flex; flex-direction: column; gap: 14px;">
        <p style="font-size: 13px; color: var(--color-muted-foreground);">
          <strong>${birimAd}</strong> biriminin giriş şifresini sıfırlamak için yeni şifreyi giriniz.
        </p>
        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">Yeni Şifre</label>
          <input type="password" id="yeniSifre1" required minlength="6" placeholder="En az 6 karakter">
        </div>
        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">Yeni Şifre (Tekrar)</label>
          <input type="password" id="yeniSifre2" required minlength="6" placeholder="Yeni şifreyi tekrar yazın">
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
          <button type="button" class="btn btn-outline" id="btnSifirlaIptal">İptal</button>
          <button type="submit" class="btn btn-primary">Şifreyi Sıfırla</button>
        </div>
      </form>
    `
  });

  const form = modal.element.querySelector('#sifirlaForm');
  modal.element.querySelector('#btnSifirlaIptal').addEventListener('click', () => modal.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const s1 = form.querySelector('#yeniSifre1').value;
    const s2 = form.querySelector('#yeniSifre2').value;

    if (s1 !== s2) {
      toast.error('Şifreler eşleşmiyor!');
      return;
    }

    try {
      const res = await api.sifirlaBirimSifre(birimId, s1);
      toast.success(res.mesaj || 'Şifre başarıyla sıfırlandı.');
      modal.close();
    } catch (err) {
      toast.error(err.message);
    }
  });
}

// =========================================================================
// 4) KATEGORİ AĞACI SEKMESİ (Prompt ve Alert Kaldırıldı - Sleek Modal & Düzenle/Sil Eklendi)
// =========================================================================
async function renderKategorilerTab(container) {
  const mainPane = document.querySelector('.main-content-pane');
  const prevScrollTop = mainPane ? mainPane.scrollTop : window.scrollY;

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <div>
        <h3 style="font-size: 17px; font-weight: 700;">${t('yonetim.tabCategories', 'Kategori Ağacı')}</h3>
        <p style="font-size: 13px; color: var(--color-muted-foreground); margin-top: 2px;">${t('yonetim.categoryTreeSub', 'Katalog hiyerarşisini, ana kategorileri ve alt kategorileri düzenleyin.')}</p>
      </div>
      <button id="btnYeniKategoriModal" class="btn btn-primary btn-sm">${t('yonetim.addCategory', 'Yeni Kategori Ekle')}</button>
    </div>
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>${t('yonetim.colCategory', 'Kategori Adı')}</th>
            <th>${t('yonetim.colCategoryType', 'Kategori Türü')}</th>
            <th>${t('yonetim.colParentCategory', 'Üst Kategori')}</th>
            <th>${t('yonetim.colProductCount', 'Ürün Sayısı')}</th>
            <th>${t('yonetim.colOrder', 'Sıra')}</th>
            <th style="text-align: right; width: 160px;">${t('common.actions', 'İşlemler')}</th>
          </tr>
        </thead>
        <tbody id="kategorilerTbody">
          <tr><td colspan="6" style="text-align: center; padding: 30px;">${t('common.loading', 'Yükleniyor...')}</td></tr>
        </tbody>
      </table>
    </div>
  `;

  let kategoriler = [];
  try {
    const res = await api.getYonetimKategoriler();
    kategoriler = res.kategoriler || [];
    const tbody = container.querySelector('#kategorilerTbody');

    tbody.innerHTML = kategoriler.map(k => `
      <tr>
        <td><strong>${escapeHtml(tCategory(k.ad))}</strong></td>
        <td>
          ${!k.ust_kategori_id 
            ? `<span class="badge badge-accent">${t('yonetim.mainCategoryBadge', 'Ana Kategori')}</span>` 
            : `<span class="badge badge-neutral">${t('yonetim.subCategoryBadge', 'Alt Kategori')}</span>`}
        </td>
        <td>${escapeHtml(tCategory(k.ust_kategori_ad) || '- (Yok)')}</td>
        <td><strong>${k.urun_sayisi || 0}</strong></td>
        <td>${k.sira}</td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px;">
            <button class="btn btn-outline btn-sm btn-kat-duzenle" data-id="${k.id}">${t('common.edit', 'Düzenle')}</button>
            <button class="btn btn-outline btn-sm btn-kat-sil" data-id="${k.id}" data-ad="${k.ad}" style="color: var(--color-destructive); border-color: rgba(239, 68, 68, 0.3);">${t('common.delete', 'Sil')}</button>
          </div>
        </td>
      </tr>
    `).join('');

    container.querySelector('#btnYeniKategoriModal').addEventListener('click', () => {
      openKategoriFormModal(null, kategoriler, () => renderKategorilerTab(container));
    });

    tbody.querySelectorAll('.btn-kat-duzenle').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = kategoriler.find(x => x.id === parseInt(btn.dataset.id, 10));
        openKategoriFormModal(k, kategoriler, () => renderKategorilerTab(container));
      });
    });

    tbody.querySelectorAll('.btn-kat-sil').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id, 10);
        const ad = btn.dataset.ad;
        const onay = await confirmModal({
          title: 'Kategoriyi Sil',
          message: `"${ad}" kategorisini silmek istediğinize emin misiniz?`,
          description: 'Altında ürün veya alt kategori bulunan kategoriler veri bütünlüğü gereği silinemez.',
          confirmText: 'Evet, Kategoriyi Sil',
          cancelText: 'Vazgeç',
          type: 'danger',
          icon: ''
        });
        if (!onay) return;

        try {
          const res = await api.deleteKategori(id);
          toast.success(res.mesaj || 'Kategori silindi.');
          await renderKategorilerTab(container);
        } catch (err) {
          toast.error('Kategori silinemedi: ' + err.message);
        }
      });
    });

    if (mainPane && prevScrollTop > 0) {
      mainPane.scrollTop = prevScrollTop;
    }

  } catch (err) {
    const tbody = container.querySelector('#kategorilerTbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 32px 16px;">
            <div style="color: var(--color-destructive); font-weight: 700; font-size: 14px; margin-bottom: 6px;">
              Kategoriler yüklenirken bir sorun oluştu (${err.message})
            </div>
            <p style="font-size: 12.5px; color: var(--text-dim); margin-bottom: 12px;">Sunucu bağlantınızı kontrol edip tekrar deneyebilirsiniz.</p>
            <button class="btn btn-outline btn-sm" id="btnRetryKategoriler" style="padding: 6px 16px;">Yeniden Dene</button>
          </td>
        </tr>
      `;
      tbody.querySelector('#btnRetryKategoriler')?.addEventListener('click', () => {
        renderKategorilerTab(container);
      });
    }
  }
}

// Kategori Ekle / Düzenle Modalı
function openKategoriFormModal(kategori = null, tumKategoriler = [], onSaved) {
  const isEdit = Boolean(kategori);
  const anaKategoriler = tumKategoriler.filter(k => !k.ust_kategori_id && (!kategori || k.id !== kategori.id));

  const modal = createModal({
    title: isEdit ? (getLanguage() === 'en' ? 'Edit Category' : 'Kategori Düzenle') : (getLanguage() === 'en' ? 'Add New Category' : 'Yeni Kategori Ekle'),
    maxWidth: '480px',
    contentHtml: `
      <form id="kategoriForm" style="display: flex; flex-direction: column; gap: 14px;">
        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">${t('yonetim.colCategory', 'Kategori Adı')} <span style="color: red;">*</span></label>
          <input type="text" id="katAd" required value="${kategori?.ad || ''}" placeholder="${getLanguage() === 'en' ? 'e.g. Paper & Notebook Group' : 'Örn: Kağıt ve Defter Grubu'}">
        </div>

        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">${getLanguage() === 'en' ? 'Category Level' : 'Kategori Seviyesi'}</label>
          <select id="katTur">
            <option value="ana" ${!kategori?.ust_kategori_id ? 'selected' : ''}>${t('yonetim.mainCategoryBadge', 'Ana Kategori')} (${getLanguage() === 'en' ? 'Root' : 'Üst Başlık'})</option>
            <option value="alt" ${kategori?.ust_kategori_id ? 'selected' : ''}>${t('yonetim.subCategoryBadge', 'Alt Kategori')} (${getLanguage() === 'en' ? 'Child' : 'Bir ana kategoriye bağlı'})</option>
          </select>
        </div>

        <div id="ustKatWrapper" style="${!kategori?.ust_kategori_id ? 'display: none;' : ''}">
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">${t('yonetim.colParentCategory', 'Bağlı Olduğu Ana Kategori')} <span style="color: red;">*</span></label>
          <select id="katUstId">
            <option value="">${getLanguage() === 'en' ? 'Please select parent category...' : 'Lütfen Ana Kategori Seçiniz...'}</option>
            ${anaKategoriler.map(ak => `
              <option value="${ak.id}" ${kategori?.ust_kategori_id === ak.id ? 'selected' : ''}>${escapeHtml(tCategory(ak.ad))}</option>
            `).join('')}
          </select>
        </div>

        <div>
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 4px;">${t('yonetim.colOrder', 'Sıralama Numarası')}</label>
          <input type="number" id="katSira" value="${kategori?.sira ?? 1}" min="0">
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 10px;">
          <button type="button" class="btn btn-outline" id="btnKatIptal">${t('common.cancel', 'İptal')}</button>
          <button type="submit" class="btn btn-primary">${isEdit ? (getLanguage() === 'en' ? 'Save Changes' : 'Değişiklikleri Kaydet') : (getLanguage() === 'en' ? 'Add Category' : 'Kategoriyi Ekle')}</button>
        </div>
      </form>
    `
  });

  const form = modal.element.querySelector('#kategoriForm');
  const katTur = form.querySelector('#katTur');
  const ustKatWrapper = form.querySelector('#ustKatWrapper');
  const katUstId = form.querySelector('#katUstId');

  katTur.addEventListener('change', () => {
    if (katTur.value === 'alt') {
      ustKatWrapper.style.display = 'block';
      katUstId.required = true;
    } else {
      ustKatWrapper.style.display = 'none';
      katUstId.required = false;
      katUstId.value = '';
    }
  });

  modal.element.querySelector('#btnKatIptal').addEventListener('click', () => modal.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ad = form.querySelector('#katAd').value.trim();
    const sira = parseInt(form.querySelector('#katSira').value, 10) || 0;
    const isAlt = katTur.value === 'alt';
    const ust_kategori_id = isAlt && katUstId.value ? parseInt(katUstId.value, 10) : null;

    if (isAlt && !ust_kategori_id) {
      toast.error('Lütfen bağlı olacağı ana kategoriyi seçiniz.');
      return;
    }

    try {
      if (isEdit) {
        await api.updateKategori(kategori.id, { ad, ust_kategori_id, sira });
        toast.success('Kategori güncellendi.');
      } else {
        await api.addKategori({ ad, ust_kategori_id, sira });
        toast.success('Yeni kategori oluşturuldu.');
      }
      modal.close();
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(err.message);
    }
  });
}

// =========================================================================
// 5) DENETİM İZLERİ (SİSTEM LOGLARI) SEKMESİ
// =========================================================================
async function renderDenetimLoglariTab(container) {
  container.innerHTML = `
    <!-- CANLI SUNUM & TEST İNCELEME RADARI -->
    <div id="radarDashboardCard" style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); border: 1.5px solid #334155; border-radius: 14px; padding: 18px 22px; margin-bottom: 20px; color: #fff; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: #10B981; box-shadow: 0 0 10px #10B981; animation: pulse 2s infinite;"></span>
          <strong style="font-size: 14px; letter-spacing: 0.02em;">${t('loglar.radarTitle', 'CANLI İZLEME VE TEST RADARI (Yönetim & Komisyon Takibi)')}</strong>
        </div>
        <span style="font-size: 11.5px; background: rgba(255,255,255,0.1); padding: 3px 10px; border-radius: 9999px; color: #94A3B8;">
          ${t('loglar.listeningMode', 'Aktif Dinleme Modu')}
        </span>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; font-size: 12.5px;">
        <!-- 1. Sunum Ziyareti -->
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px 14px;">
          <div style="color: #94A3B8; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; font-weight: 700;">${t('loglar.presentationStatus', 'Sunum İnceleme Durumu')}</div>
          <div id="radarSonSunum" style="font-weight: 700; color: #38BDF8; font-size: 13.5px;">
            ${t('common.loading', 'Yükleniyor...')}
          </div>
          <div id="radarSonSunumDetay" style="color: #CBD5E1; font-size: 11.5px; margin-top: 4px;">
            ...
          </div>
        </div>

        <!-- 2. Canlı Test Girişleri -->
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px 14px;">
          <div style="color: #94A3B8; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; font-weight: 700;">${t('loglar.liveTestLogins', 'CANLI SİSTEM TEST GİRİŞLERİ')}</div>
          <div id="radarSonTest" style="font-weight: 700; color: #FBBF24; font-size: 13.5px;">
            ${t('common.loading', 'Yükleniyor...')}
          </div>
          <div id="radarSonTestDetay" style="color: #CBD5E1; font-size: 11.5px; margin-top: 4px;">
            ...
          </div>
        </div>

        <!-- 3. Günlük İstatistik -->
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 12px 14px;">
          <div style="color: #94A3B8; font-size: 11px; margin-bottom: 4px; text-transform: uppercase; font-weight: 700;">${t('loglar.todayViewsCount', 'BUGÜN SUNUM AÇILIŞ SAYISI')}</div>
          <div id="radarBugunSayi" style="font-weight: 800; color: #34D399; font-size: 18px;">
            0
          </div>
          <div style="color: #94A3B8; font-size: 11.5px; margin-top: 2px;">
            ...
          </div>
        </div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
      <div>
        <h3 style="font-size: 17px; font-weight: 700;">${t('loglar.auditLogsTitle', 'Sistem Denetim İzleri (Audit Logs)')}</h3>
        <p style="font-size: 13px; color: var(--color-muted-foreground); margin-top: 2px;">
          ${t('loglar.auditLogsSub', 'Kullanıcı girişleri, şifre/adres güncellemeleri, toplu stok değişiklikleri ve yönetimsel işlemlerin kayıtları.')}
        </p>
      </div>
      <div style="display: flex; gap: 10px;">
        <select id="logKullaniciGrupFiltre" style="height: 36px; padding: 4px 10px; border-radius: 8px; font-weight: 600;">
          <option value="haric_admin">${t('loglar.optDeptActions', 'Birim Hareketleri')}</option>
          <option value="hepsi">${t('common.all', 'Tüm Loglar')}</option>
        </select>
        <select id="logIslemFiltre" style="height: 36px; padding: 4px 10px; border-radius: 8px;">
          <option value="">${t('loglar.optAllActions', 'Tüm İşlem Türleri')}</option>
          <option value="GIRIS">GIRIS</option>
          <option value="SIFREMI_UNUTTUM">SIFREMI_UNUTTUM</option>
          <option value="SIFRE_VE_ADRES_GUNCELLEME">SIFRE_VE_ADRES_GUNCELLEME</option>
          <option value="TOPLU_STOK_GUNCELLEME">TOPLU_STOK_GUNCELLEME</option>
          <option value="TOPLU_HESAP_ACMA">TOPLU_HESAP_ACMA</option>
          <option value="BIRIM_DURUM_DEGISTIRILDI">BIRIM_DURUM_DEGISTIRILDI</option>
          <option value="BIRIM_SILINDI">BIRIM_SILINDI</option>
        </select>
        <button id="btnYenileLoglar" class="btn btn-outline btn-sm">${t('loglar.refresh', 'Yenile')}</button>
      </div>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 160px;">${t('loglar.colDate', 'TARİH / SAAT')}</th>
            <th style="width: 170px;">${t('loglar.colActionType', 'İŞLEM TÜRÜ')}</th>
            <th>${t('loglar.colUser', 'KULLANICI / HESAP')}</th>
            <th>${t('loglar.colRole', 'ROL')}</th>
            <th>${t('loglar.colIp', 'IP ADRESİ')}</th>
            <th>${t('loglar.colDetail', 'DETAY')}</th>
          </tr>
        </thead>
        <tbody id="denetimLoglariTbody">
          <tr><td colspan="6" style="text-align: center; padding: 30px;">${t('common.loading', 'Loglar yükleniyor...')}</td></tr>
        </tbody>
      </table>
    </div>
  `;

  const tbody = container.querySelector('#denetimLoglariTbody');
  const filtreSelect = container.querySelector('#logIslemFiltre');
  const grupSelect = container.querySelector('#logKullaniciGrupFiltre');
  const yenileBtn = container.querySelector('#btnYenileLoglar');

  const loadLogs = async () => {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 25px;">Yükleniyor...</td></tr>`;
    try {
      const islem = filtreSelect.value || undefined;
      const grup = grupSelect.value;
      const params = { islem_turu: islem, limit: 100 };

      if (grup === 'haric_admin') {
        params.haric_kullanici = 'admin';
      } else if (grup === 'sadece_admin') {
        params.kullanici = 'admin';
      }

      const res = await api.getDenetimLoglari(params);
      const loglar = res.loglar || [];

      if (loglar.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--color-muted-foreground);">Kayıtlı denetim logu bulunamadı.</td></tr>`;
        return;
      }

      tbody.innerHTML = loglar.map(l => {
        let badgeClass = 'badge-neutral';
        if (l.islem_turu === 'GIRIS') badgeClass = 'badge-success';
        else if (l.islem_turu === 'SIFREMI_UNUTTUM') badgeClass = 'badge-warning';
        else if (l.islem_turu === 'TOPLU_STOK_GUNCELLEME') badgeClass = 'badge-accent';
        else if (l.islem_turu === 'TOPLU_HESAP_ACMA') badgeClass = 'badge-primary';
        else if (l.islem_turu.includes('SILINDI')) badgeClass = 'badge-danger';

        const roleText = tRole(l.rol);
        const actionLabel = tActionType(l.islem_turu);
        const userDisplay = tUser(l.kullanici_adi);
        const detailDisplay = formatLogDetail(l.aciklama);

        return `
          <tr>
            <td style="font-size: 12px; color: var(--color-muted-foreground); white-space: nowrap;">${escapeHtml(l.tarih)}</td>
            <td><span class="badge ${badgeClass}" style="font-size: 10.5px;">${escapeHtml(actionLabel)}</span></td>
            <td><strong>${escapeHtml(userDisplay)}</strong></td>
            <td>${escapeHtml(roleText)}</td>
            <td style="font-family: monospace; font-size: 11.5px;">${escapeHtml(l.ip_adresi || '-')}</td>
            <td style="font-size: 13px;">${escapeHtml(detailDisplay)}</td>
          </tr>
        `;
      }).join('');

      // Radar Kartı Verilerini Güncelle
      try {
        const radarRes = await api.getRadarOzeti();
        const r = radarRes.radar;
        if (r) {
          const elSonSunum = container.querySelector('#radarSonSunum');
          const elSonSunumDetay = container.querySelector('#radarSonSunumDetay');
          const elSonTest = container.querySelector('#radarSonTest');
          const elSonTestDetay = container.querySelector('#radarSonTestDetay');
          const elBugunSayi = container.querySelector('#radarBugunSayi');

          if (elBugunSayi) elBugunSayi.textContent = r.bugunSunumSayisi || 0;

          const isEn = getLanguage() === 'en';

          if (r.sonSunum) {
            const devStr = r.sonSunum.cihaz || (isEn ? 'Device' : 'Cihaz');
            let brStr = r.sonSunum.tarayici || (isEn ? 'Browser' : 'Tarayıcı');
            if (brStr === 'Bilinmeyen Tarayıcı' && isEn) brStr = 'Unknown Browser';
            const statusStr = isEn ? 'Opened' : 'Açıldı';
            const slideLabel = isEn ? 'Last Slide' : 'Son Slayt';
            const timeLabel = isEn ? 'Time' : 'Saat';

            if (elSonSunum) elSonSunum.textContent = `${statusStr} • ${devStr} (${brStr})`;
            if (elSonSunumDetay) elSonSunumDetay.textContent = `${slideLabel}: ${r.sonSunum.mevcut_slayt}/${r.sonSunum.toplam_slayt} • ${timeLabel}: ${r.sonSunum.tarih} (IP: ${r.sonSunum.ip_adresi})`;
          } else {
            if (elSonSunum) elSonSunum.textContent = t('loglar.noSunumYet', 'Henüz Sunum Açılmadı');
            if (elSonSunumDetay) elSonSunumDetay.textContent = t('loglar.noSunumYetSub', 'Canlı link tıklandığında anlık buraya düşecektir.');
          }

          if (r.sonTestGirisleri && r.sonTestGirisleri.length > 0) {
            const tTest = r.sonTestGirisleri[0];
            const activeTestLabel = isEn ? 'Active Test' : 'Aktif Test';
            const lastOpLabel = isEn ? 'Last Action' : 'Son İşlem';
            const actionText = tActionType(tTest.islem_turu);

            if (elSonTest) elSonTest.textContent = `${activeTestLabel}: ${tUser(tTest.kullanici_adi)} (${actionText})`;
            if (elSonTestDetay) elSonTestDetay.textContent = `${lastOpLabel}: ${tTest.tarih} • ${formatLogDetail(tTest.aciklama || tTest.detay || '-')}`;
          } else {
            if (elSonTest) elSonTest.textContent = t('loglar.noTestYet', 'Henüz Test Girişi Yok');
            if (elSonTestDetay) elSonTestDetay.textContent = t('loglar.noTestYetSub', 'Ktest veya Atest ile giriş yapıldığında listelenir.');
          }
        }
      } catch (e) {}
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" style="color: var(--color-destructive);">${err.message}</td></tr>`;
    }
  };

  filtreSelect.addEventListener('change', loadLogs);
  grupSelect.addEventListener('change', loadLogs);
  yenileBtn.addEventListener('click', loadLogs);
  await loadLogs();
}

// =========================================================================
// 5) SİSTEM & VERİTABANI YEDEKLERİ SEKMESİ (Faz 7.6)
// =========================================================================
async function renderYedeklerTab(container) {
  container.innerHTML = `
    <div class="card" style="padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h3 style="font-size: 18px; font-weight: 700; color: #0F172A; display: flex; align-items: center; gap: 8px;">
            ${t('yonetim.backupTabTitle', 'Sistem ve Veritabanı Yedekleri')}
          </h3>
          <p style="font-size: 13px; color: var(--color-muted-foreground); margin-top: 4px; max-width: 680px; line-height: 1.5;">
            ${t('yonetim.backupTabSub', 'Sistem kesintisiz SQLite online backup yöntemiyle sıcak yedek alır ve son 14 yedeği saklar.')}
          </p>
        </div>
        <button id="btnManuelYedekAl" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700; padding: 10px 18px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);">
          ${t('yonetim.takeBackupNow', 'Şimdi Sıcak Yedek Al')}
        </button>
      </div>

      <div style="display: flex; gap: 12px; margin-bottom: 16px; background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px 16px; border-radius: 12px; font-size: 12.5px; color: #475569; align-items: center;">
        <div>
          <strong>${t('yonetim.zeroDataLossGuarantee', 'Sıfır Veri Kaybı Güvencesi:')}</strong> ${t('yonetim.zeroDataLossSub', 'Bir yedeği geri yüklediğiniz anda sistem anlık bir acil durum güvenlik yedeği alır.')}
        </div>
      </div>

      <div class="table-responsive">
        <table class="data-table" id="yedeklerTable">
          <thead>
            <tr>
              <th>${t('yonetim.colBackupFile', 'Yedek Dosyası')}</th>
              <th style="width: 140px;">${t('yonetim.colBackupType', 'Yedek Türü')}</th>
              <th style="width: 110px;">${t('yonetim.colBackupSize', 'Boyut')}</th>
              <th style="width: 170px;">${t('yonetim.colBackupDate', 'Yedekleme Tarihi')}</th>
              <th style="width: 220px; text-align: right;">${t('common.actions', 'İşlemler')}</th>
            </tr>
          </thead>
          <tbody id="yedeklerTbody">
            <tr><td colspan="5" style="text-align: center; padding: 30px; color: #94A3B8;">${t('common.loading', 'Yedek listesi yükleniyor...')}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  const tbody = container.querySelector('#yedeklerTbody');
  const btnAl = container.querySelector('#btnManuelYedekAl');

  async function loadYedekler() {
    try {
      const res = await api.getYedekler();
      const yedekler = res.yedekler || [];

      if (yedekler.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: #94A3B8;">${t('common.noData', 'Henüz kayıtlı bir veritabanı yedeği bulunamadı.')}</td></tr>`;
        return;
      }

      tbody.innerHTML = yedekler.map(y => {
        const isEn = getLanguage() === 'en';
        let turBadge = `<span class="badge badge-success">${isEn ? 'Automatic (03:00)' : 'Otomatik (03:00)'}</span>`;
        if (y.tur === 'Manuel') {
          turBadge = `<span class="badge badge-primary">${isEn ? 'Manual' : 'Manuel'}</span>`;
        } else if (y.tur === 'GuvenlikOnYedegi') {
          turBadge = `<span class="badge badge-warning">${isEn ? 'Safety Pre-Restore' : 'Güvenlik Ön Yedeği'}</span>`;
        }

        const boyutText = y.boyut > 1024 * 1024
          ? (y.boyut / (1024 * 1024)).toFixed(2) + ' MB'
          : (y.boyut / 1024).toFixed(1) + ' KB';

        const tarihText = new Date(y.tarih).toLocaleString(isEn ? 'en-US' : 'tr-TR');

        return `
          <tr>
            <td>
              <code style="font-size: 12.5px; font-weight: 600; color: #0F172A; background: #F1F5F9; padding: 2px 6px; border-radius: 6px;">${y.dosya}</code>
            </td>
            <td>${turBadge}</td>
            <td style="font-weight: 600; color: #334155; font-size: 12px;">${boyutText}</td>
            <td style="font-size: 12px; color: #64748B;">${tarihText}</td>
            <td style="text-align: right;">
              <div style="display: inline-flex; gap: 6px;">
                <a href="/api/yonetim/yedekler/indir/${encodeURIComponent(y.dosya)}" class="btn btn-outline btn-sm" style="font-size: 11px; padding: 4px 8px; text-decoration: none;" title="${t('yonetim.download', 'İndir')}">
                  ${t('yonetim.download', 'İndir')}
                </a>
                <button class="btn btn-outline btn-sm btn-geri-yukle" data-dosya="${y.dosya}" style="color: #D97706; font-size: 11px; padding: 4px 8px;" title="${t('yonetim.restore', 'Geri Yükle')}">
                  ${t('yonetim.restore', 'Geri Yükle')}
                </button>
                <button class="btn btn-outline btn-sm btn-yedek-sil" data-dosya="${y.dosya}" style="color: var(--color-destructive); font-size: 11px; padding: 4px 8px;" title="${t('common.delete', 'Sil')}">
                  ${t('common.delete', 'Sil')}
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');

    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" style="color: var(--color-destructive); text-align: center; padding: 20px;">Hata: ${err.message}</td></tr>`;
    }
  }

  // Tbody Event Delegation (Geri Yükle ve Sil)
  tbody.addEventListener('click', async (e) => {
    const btnRestore = e.target.closest('.btn-geri-yukle');
    if (btnRestore) {
      const dosya = btnRestore.dataset.dosya;
      const onay = await confirmModal({
        title: 'Veritabanını Geri Yükle',
        message: `DİKKAT: Canlı veritabanı "${dosya}" yedeğindeki durumuna geri döndürülecektir.\n\nİşlem öncesinde o anki aktif veritabanınızın acil durum ön-yedeği (safety_pre_restore_...) otomatik olarak alınacaktır.\n\nGeri yüklemeyi onaylıyor musunuz?`,
        confirmText: 'Evet, Geri Yükle',
        cancelText: 'Vazgeç',
        type: 'danger'
      });
      if (!onay) return;

      btnRestore.disabled = true;
      btnRestore.textContent = 'Geri Yükleniyor...';
      try {
        const res = await api.geriYukleYedek(dosya);
        toast.success(res.mesaj);
        await loadYedekler();
      } catch (err) {
        toast.error(err.message);
      } finally {
        btnRestore.disabled = false;
        btnRestore.textContent = 'Geri Yükle';
      }
      return;
    }

    const btnDelete = e.target.closest('.btn-yedek-sil');
    if (btnDelete) {
      const dosya = btnDelete.dataset.dosya;
      const onay = await confirmModal({
        title: 'Yedek Dosyasını Sil',
        message: `"${dosya}" isimli yedek dosyasını kalıcı olarak silmek istediğinize emin misiniz?`,
        confirmText: 'Yedeği Sil',
        cancelText: 'Vazgeç',
        type: 'danger'
      });
      if (!onay) return;

      btnDelete.disabled = true;
      try {
        await api.silYedek(dosya);
        toast.info('Yedek dosyası silindi.');
        await loadYedekler();
      } catch (err) {
        toast.error(err.message);
      }
    }
  });

  // Manuel Sıcak Yedek Al Butonu
  btnAl?.addEventListener('click', async () => {
    btnAl.disabled = true;
    btnAl.innerHTML = '<span>⏳</span> Yedek Alınıyor...';
    try {
      const res = await api.alYedek();
      toast.success(`Yedek başarıyla alındı: ${res.dosya}`);
      await loadYedekler();
    } catch (err) {
      toast.error('Yedek alınamadı: ' + err.message);
    } finally {
      btnAl.disabled = false;
      btnAl.innerHTML = 'Şimdi Sıcak Yedek Al';
    }
  });

  await loadYedekler();
}

export default renderYonetim;
