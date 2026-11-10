// commandPalette.js - Quick Command Palette (Ctrl+K / Cmd+K Spotlight Arama)
import api from '../api.js';
import state from '../state.js';
import toast from './toast.js';
import { openProductLightbox } from './productLightbox.js';

let paletteBackdrop = null;
let selectedIndex = 0;
let currentResults = [];
let searchDebounceTimer = null;

const STATIC_ACTIONS = [
  {
    type: 'action',
    category: 'Gezinme',
    title: 'Malzeme Kataloğu',
    subtitle: 'Kırtasiye ve sarf malzemelerini inceleyin',
    icon: '',
    handler: () => { window.location.hash = '#/katalog'; }
  },
  {
    type: 'action',
    category: 'Gezinme',
    title: 'Sepetime Git',
    subtitle: 'Eklenen malzemeleri ve talep oluşturma adımını aç',
    icon: '',
    handler: () => { window.location.hash = '#/sepet'; }
  },
  {
    type: 'action',
    category: 'Gezinme',
    title: 'Taleplerim & Sipariş Durumu',
    subtitle: 'Onaylanan, hazırlanan ve teslim edilen siparişleriniz',
    icon: '',
    handler: () => { window.location.hash = '#/taleplerim'; }
  },
  {
    type: 'action',
    category: 'Yönetim',
    title: 'Satın Alma & Gelen Kutusu',
    subtitle: 'Birimlerden gelen talepleri inceleyin ve onaylayın (Satın Alma)',
    icon: '',
    role: 'satin_alma',
    handler: () => { window.location.hash = '#/satinalma'; }
  },
  {
    type: 'action',
    category: 'Yönetim',
    title: 'Depo & Stok Yönetimi',
    subtitle: 'Stok girişleri, kritik seviyeler ve ürün düzenleme',
    icon: '',
    role: 'satin_alma',
    handler: () => { window.location.hash = '#/yonetim'; }
  },
  {
    type: 'action',
    category: 'Gezinme',
    title: 'Kurumsal Rehber & İletişim',
    subtitle: 'Üniversite akademik ve idari personel rehberi',
    icon: '',
    handler: () => { window.location.hash = '#/rehber'; }
  },
  {
    type: 'action',
    category: 'Yönetim',
    title: 'Tüketim & Tasarruf Raporları',
    subtitle: 'Birim bazlı harcama ve istatistik grafikleri',
    icon: '',
    role: 'satin_alma',
    handler: () => { window.location.hash = '#/raporlar'; }
  }
];

export function initCommandPalette() {
  window.addEventListener('keydown', (e) => {
    // Ctrl + K veya Cmd + K
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggleCommandPalette();
    }
  });
}

export function toggleCommandPalette() {
  if (paletteBackdrop) {
    closeCommandPalette();
  } else {
    openCommandPalette();
  }
}

export function openCommandPalette() {
  if (paletteBackdrop) return;

  const backdrop = document.createElement('div');
  backdrop.className = 'spotlight-backdrop';
  backdrop.id = 'spotlightBackdrop';

  backdrop.innerHTML = `
    <div class="spotlight-dialog" role="dialog" aria-modal="true">
      <div class="spotlight-header">
        <input type="text" class="spotlight-input" id="spotlightInput" placeholder="Ürün, talep no, personel veya sistem komutu arayın... (örn: fotokopi, TLP, dekanlık)" autocomplete="off" spellcheck="false">
        <span class="spotlight-shortcut-badge">ESC</span>
      </div>

      <div class="spotlight-results-container" id="spotlightResults">
        <!-- Dinamik Sonuçlar -->
      </div>

      <div class="spotlight-footer">
        <div class="spotlight-hint">
          <span><kbd>↑</kbd><kbd>↓</kbd> Gezin</span>
          <span><kbd>↵</kbd> Seç</span>
          <span><kbd>ESC</kbd> Kapat</span>
        </div>
        <div class="spotlight-branding">
          KampüsStok Spotlight
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  paletteBackdrop = backdrop;
  document.body.style.overflow = 'hidden';

  const input = backdrop.querySelector('#spotlightInput');
  requestAnimationFrame(() => {
    backdrop.classList.add('is-open');
    input?.focus();
  });

  // Listeners
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeCommandPalette();
  });

  input?.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    const query = e.target.value.trim();
    searchDebounceTimer = setTimeout(() => {
      executeOmniSearch(query);
    }, 140);
  });

  input?.addEventListener('keydown', handleKeyNavigation);

  // Initial Default List (Actions)
  executeOmniSearch('');
}

async function executeOmniSearch(query) {
  const container = document.getElementById('spotlightResults');
  if (!container) return;

  const user = state.user;
  const userRole = user?.rol || 'birim';

  // 1. Static Actions
  const filteredActions = STATIC_ACTIONS.filter(a => {
    if (a.role && a.role !== userRole) return false;
    if (!query) return true;
    return a.title.toLowerCase().includes(query.toLowerCase()) || 
           a.subtitle.toLowerCase().includes(query.toLowerCase());
  });

  if (!query) {
    currentResults = filteredActions;
    selectedIndex = 0;
    renderResults(container, [
      { group: 'Hızlı Eylemler & Sayfalar', items: filteredActions }
    ]);
    return;
  }

  container.innerHTML = `
    <div class="spotlight-loading-row">
      <div class="spinner-sm"></div>
      <span>Aranıyor...</span>
    </div>
  `;

  try {
    // 2. Parallel API Search: Products & Directory
    const [urunRes, rehberRes] = await Promise.allSettled([
      api.getUrunler({ arama: query }),
      userRole === 'satin_alma' ? api.getRehber({ arama: query }) : Promise.resolve({ personel: [] })
    ]);

    const urunler = (urunRes.status === 'fulfilled' && urunRes.value?.urunler) ? urunRes.value.urunler.slice(0, 6) : [];
    const rehber = (rehberRes.status === 'fulfilled' && rehberRes.value?.personel) ? rehberRes.value.personel.slice(0, 4) : [];

    const groups = [];
    currentResults = [];

    // Products Group
    if (urunler.length > 0) {
      const items = urunler.map(u => ({
        type: 'product',
        title: u.ad,
        subtitle: `${u.marka || 'Standart'} • ${u.kategoriAdi || ''} • Stok: ${u.stok} ${u.olcuBirimi}`,
        image: u.gorselYolu || '/assets/placeholder.svg',
        raw: u,
        handler: () => {
          closeCommandPalette();
          openProductLightbox(u, urunler);
        }
      }));
      groups.push({ group: `Ürünler (${urunler.length})`, items });
      currentResults.push(...items);
    }

    // Directory Group
    if (rehber.length > 0) {
      const items = rehber.map(p => ({
        type: 'personnel',
        title: `${p.unvan ? p.unvan + ' ' : ''}${p.adSoyad}`,
        subtitle: `${p.gorev || 'Personel'} • ${p.birimAdi || ''} • Dahili: ${p.dahiliTelefon || '-'} • Oda: ${p.odaNo || '-'}`,
        icon: '',
        raw: p,
        handler: () => {
          closeCommandPalette();
          window.location.hash = '#/rehber';
        }
      }));
      groups.push({ group: `Personel Rehberi (${rehber.length})`, items });
      currentResults.push(...items);
    }

    // Actions Group
    if (filteredActions.length > 0) {
      groups.push({ group: 'Sistem Kısayolları', items: filteredActions });
      currentResults.push(...filteredActions);
    }

    if (currentResults.length === 0) {
      container.innerHTML = `
        <div class="spotlight-empty">
          <p><strong>"${query}"</strong> ile eşleşen ürün veya işlem bulunamadı.</p>
          <span style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">Farklı bir kelimeyle aramayı deneyebilirsiniz.</span>
        </div>
      `;
      return;
    }

    selectedIndex = 0;
    renderResults(container, groups);

  } catch (err) {
    container.innerHTML = `<div class="spotlight-empty"><p>Arama hatası: ${err.message}</p></div>`;
  }
}

function renderResults(container, groups) {
  let globalItemIndex = 0;
  let html = '';

  for (const g of groups) {
    html += `<div class="spotlight-group-title">${g.group}</div>`;
    for (const item of g.items) {
      const isSelected = globalItemIndex === selectedIndex;
      const indexAttr = globalItemIndex;

      let thumbHtml = '';
      if (item.image) {
        thumbHtml = `<img src="${item.image}" class="spotlight-item-thumb" alt="">`;
      } else if (item.icon) {
        thumbHtml = `<div class="spotlight-item-icon">${item.icon}</div>`;
      } else {
        thumbHtml = `<div class="spotlight-item-icon" style="font-size: 11px; font-weight: 700; color: #64748B;">•</div>`;
      }

      html += `
        <div class="spotlight-item ${isSelected ? 'is-selected' : ''}" data-idx="${indexAttr}">
          ${thumbHtml}
          <div class="spotlight-item-info">
            <div class="spotlight-item-title">${item.title}</div>
            <div class="spotlight-item-sub">${item.subtitle || ''}</div>
          </div>
          <div class="spotlight-item-action-hint">
            ${item.type === 'product' ? '<span>İncele / Ekle ↵</span>' : '<span>Aç ↵</span>'}
          </div>
        </div>
      `;
      globalItemIndex++;
    }
  }

  container.innerHTML = html;

  // Add click events
  container.querySelectorAll('.spotlight-item').forEach(el => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.idx, 10);
      if (currentResults[idx]) {
        currentResults[idx].handler();
      }
    });

    el.addEventListener('mouseenter', () => {
      const idx = parseInt(el.dataset.idx, 10);
      selectedIndex = idx;
      updateSelectedHighlight();
    });
  });
}

function updateSelectedHighlight() {
  const container = document.getElementById('spotlightResults');
  if (!container) return;
  const items = container.querySelectorAll('.spotlight-item');
  items.forEach((el, idx) => {
    if (idx === selectedIndex) {
      el.classList.add('is-selected');
      el.scrollIntoView({ block: 'nearest' });
    } else {
      el.classList.remove('is-selected');
    }
  });
}

function handleKeyNavigation(e) {
  if (e.key === 'Escape') {
    closeCommandPalette();
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (currentResults.length > 0) {
      selectedIndex = (selectedIndex + 1) % currentResults.length;
      updateSelectedHighlight();
    }
    return;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (currentResults.length > 0) {
      selectedIndex = (selectedIndex - 1 + currentResults.length) % currentResults.length;
      updateSelectedHighlight();
    }
    return;
  }

  if (e.key === 'Enter') {
    e.preventDefault();
    if (currentResults[selectedIndex]) {
      currentResults[selectedIndex].handler();
    }
    return;
  }
}

export function closeCommandPalette() {
  if (!paletteBackdrop) return;
  paletteBackdrop.classList.remove('is-open');
  document.body.style.overflow = '';
  setTimeout(() => {
    if (paletteBackdrop && paletteBackdrop.parentNode) {
      paletteBackdrop.parentNode.removeChild(paletteBackdrop);
    }
    paletteBackdrop = null;
  }, 200);
}

export default initCommandPalette;
