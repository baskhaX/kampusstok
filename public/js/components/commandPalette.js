// commandPalette.js - Quick Command Palette (Ctrl+K / Cmd+K Spotlight Arama)
import api from '../api.js';
import state from '../state.js';
import toast from './toast.js';
import { openProductLightbox } from './productLightbox.js';
import { escapeHtml } from '../utils/text.js';
import { t, getLanguage, tCategory, tProduct, tDepartment, tTitle, tUnit } from '../utils/i18n.js';

let paletteBackdrop = null;
let selectedIndex = 0;
let currentResults = [];
let searchDebounceTimer = null;

function getStaticActions() {
  const isEn = getLanguage() === 'en';
  return [
    {
      type: 'action',
      category: isEn ? 'Navigation' : 'Gezinme',
      title: isEn ? 'Supplies Catalog' : 'Malzeme Kataloğu',
      subtitle: isEn ? 'Browse stationery and supplies catalog' : 'Kırtasiye ve sarf malzemelerini inceleyin',
      icon: '',
      handler: () => { window.location.hash = '#/katalog'; }
    },
    {
      type: 'action',
      category: isEn ? 'Navigation' : 'Gezinme',
      title: isEn ? 'Go to My Cart' : 'Sepetime Git',
      subtitle: isEn ? 'Review cart items and submit requisition' : 'Eklenen malzemeleri ve talep oluşturma adımını aç',
      icon: '',
      handler: () => { window.location.hash = '#/sepet'; }
    },
    {
      type: 'action',
      category: isEn ? 'Navigation' : 'Gezinme',
      title: isEn ? 'My Requisitions & Order Flow' : 'Taleplerim & Sipariş Durumu',
      subtitle: isEn ? 'Track approved, preparing and delivered orders' : 'Onaylanan, hazırlanan ve teslim edilen siparişleriniz',
      icon: '',
      handler: () => { window.location.hash = '#/taleplerim'; }
    },
    {
      type: 'action',
      category: isEn ? 'Management' : 'Yönetim',
      title: isEn ? 'Procurement & Approval Inbox' : 'Satın Alma & Gelen Kutusu',
      subtitle: isEn ? 'Review and approve department requisitions' : 'Birimlerden gelen talepleri inceleyin ve onaylayın (Satın Alma)',
      icon: '',
      role: 'satin_alma',
      handler: () => { window.location.hash = '#/satinalma'; }
    },
    {
      type: 'action',
      category: isEn ? 'Management' : 'Yönetim',
      title: isEn ? 'Warehouse & Inventory Management' : 'Depo & Stok Yönetimi',
      subtitle: isEn ? 'Stock intake, critical levels and item catalog' : 'Stok girişleri, kritik seviyeler ve ürün düzenleme',
      icon: '',
      role: 'satin_alma',
      handler: () => { window.location.hash = '#/yonetim'; }
    },
    {
      type: 'action',
      category: isEn ? 'Navigation' : 'Gezinme',
      title: isEn ? 'Corporate Directory & Contacts' : 'Kurumsal Rehber & İletişim',
      subtitle: isEn ? 'University academic and administrative directory' : 'Üniversite akademik ve idari personel rehberi',
      icon: '',
      handler: () => { window.location.hash = '#/rehber'; }
    },
    {
      type: 'action',
      category: isEn ? 'Management' : 'Yönetim',
      title: isEn ? 'Consumption & Analytics Reports' : 'Tüketim & Tasarruf Raporları',
      subtitle: isEn ? 'Department spending charts and official bulletins' : 'Birim bazlı harcama ve istatistik grafikleri',
      icon: '',
      role: 'satin_alma',
      handler: () => { window.location.hash = '#/raporlar'; }
    }
  ];
}

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

  const isEn = getLanguage() === 'en';
  const backdrop = document.createElement('div');
  backdrop.className = 'spotlight-backdrop';
  backdrop.id = 'spotlightBackdrop';

  const placeholderText = isEn
    ? 'Search items, orders, personnel, or commands... (e.g. paper, REQ, dean)'
    : 'Ürün, talep no, personel veya sistem komutu arayın... (örn: fotokopi, TLP, dekanlık)';

  backdrop.innerHTML = `
    <div class="spotlight-dialog" role="dialog" aria-modal="true">
      <div class="spotlight-header">
        <input type="text" class="spotlight-input" id="spotlightInput" placeholder="${escapeHtml(placeholderText)}" autocomplete="off" spellcheck="false">
        <span class="spotlight-shortcut-badge">ESC</span>
      </div>

      <div class="spotlight-results-container" id="spotlightResults">
        <!-- Dinamik Sonuçlar -->
      </div>

      <div class="spotlight-footer">
        <div class="spotlight-hint">
          <span><kbd>↑</kbd><kbd>↓</kbd> ${isEn ? 'Navigate' : 'Gezin'}</span>
          <span><kbd>↵</kbd> ${isEn ? 'Select' : 'Seç'}</span>
          <span><kbd>ESC</kbd> ${isEn ? 'Close' : 'Kapat'}</span>
        </div>
        <div class="spotlight-branding">
          CampusStock Spotlight
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
  const isEn = getLanguage() === 'en';
  const staticActions = getStaticActions();

  // 1. Static Actions
  const filteredActions = staticActions.filter(a => {
    if (a.role && a.role !== userRole) return false;
    if (!query) return true;
    return a.title.toLowerCase().includes(query.toLowerCase()) || 
           a.subtitle.toLowerCase().includes(query.toLowerCase());
  });

  if (!query) {
    currentResults = filteredActions;
    selectedIndex = 0;
    renderResults(container, [
      { group: isEn ? 'Quick Actions & Pages' : 'Hızlı Eylemler & Sayfalar', items: filteredActions }
    ]);
    return;
  }

  container.innerHTML = `
    <div class="spotlight-loading-row">
      <div class="spinner-sm"></div>
      <span>${isEn ? 'Searching...' : 'Aranıyor...'}</span>
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
        title: tProduct(u.ad),
        subtitle: `${u.marka || (isEn ? 'Standard' : 'Standart')} • ${tCategory(u.kategoriAdi) || ''} • ${isEn ? 'Stock' : 'Stok'}: ${u.stok} ${tUnit(u.olcuBirimi)}`,
        image: u.gorselYolu || '/assets/placeholder.svg',
        raw: u,
        handler: () => {
          closeCommandPalette();
          openProductLightbox(u, urunler);
        }
      }));
      groups.push({ group: isEn ? `Products (${urunler.length})` : `Ürünler (${urunler.length})`, items });
      currentResults.push(...items);
    }

    // Directory Group
    if (rehber.length > 0) {
      const items = rehber.map(p => ({
        type: 'personnel',
        title: `${p.unvan ? tTitle(p.unvan) + ' ' : ''}${p.adSoyad}`,
        subtitle: `${tTitle(p.gorev) || (isEn ? 'Staff' : 'Personel')} • ${tDepartment(p.birimAdi) || ''} • ${isEn ? 'Ext' : 'Dahili'}: ${p.dahiliTelefon || '-'} • ${isEn ? 'Room' : 'Oda'}: ${p.odaNo || '-'}`,
        icon: '',
        raw: p,
        handler: () => {
          closeCommandPalette();
          window.location.hash = '#/rehber';
        }
      }));
      groups.push({ group: isEn ? `Corporate Directory (${rehber.length})` : `Personel Rehberi (${rehber.length})`, items });
      currentResults.push(...items);
    }

    // Actions Group
    if (filteredActions.length > 0) {
      groups.push({ group: isEn ? 'System Shortcuts' : 'Sistem Kısayolları', items: filteredActions });
      currentResults.push(...filteredActions);
    }

    if (currentResults.length === 0) {
      container.innerHTML = `
        <div class="spotlight-empty">
          <p>${isEn ? `No items or actions found matching "<strong>${escapeHtml(query)}</strong>".` : `<strong>"${escapeHtml(query)}"</strong> ile eşleşen ürün veya işlem bulunamadı.`}</p>
          <span style="font-size: 12px; color: var(--text-dim); margin-top: 4px;">${isEn ? 'Try searching with a different keyword.' : 'Farklı bir kelimeyle aramayı deneyebilirsiniz.'}</span>
        </div>
      `;
      return;
    }

    selectedIndex = 0;
    renderResults(container, groups);

  } catch (err) {
    container.innerHTML = `<div class="spotlight-empty"><p>${isEn ? 'Search error: ' : 'Arama hatası: '}${escapeHtml(err.message)}</p></div>`;
  }
}

function renderResults(container, groups) {
  const isEn = getLanguage() === 'en';
  let globalItemIndex = 0;
  let html = '';

  for (const g of groups) {
    html += `<div class="spotlight-group-title">${escapeHtml(g.group)}</div>`;
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

      const actionHintText = item.type === 'product'
        ? (isEn ? '<span>View / Add ↵</span>' : '<span>İncele / Ekle ↵</span>')
        : (isEn ? '<span>Open ↵</span>' : '<span>Aç ↵</span>');

      html += `
        <div class="spotlight-item ${isSelected ? 'is-selected' : ''}" data-idx="${indexAttr}">
          ${thumbHtml}
          <div class="spotlight-item-info">
            <div class="spotlight-item-title">${escapeHtml(item.title)}</div>
            <div class="spotlight-item-sub">${escapeHtml(item.subtitle || '')}</div>
          </div>
          <div class="spotlight-item-action-hint">
            ${actionHintText}
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
      updateSelection(idx, false);
    });
  });

  ensureSelectionVisible();
}

function handleKeyNavigation(e) {
  if (currentResults.length === 0) return;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIndex = (selectedIndex + 1) % currentResults.length;
    updateSelection(selectedIndex, true);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIndex = (selectedIndex - 1 + currentResults.length) % currentResults.length;
    updateSelection(selectedIndex, true);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (currentResults[selectedIndex]) {
      currentResults[selectedIndex].handler();
    }
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeCommandPalette();
  }
}

function updateSelection(index, scrollIntoView = false) {
  selectedIndex = index;
  const items = document.querySelectorAll('.spotlight-item');
  items.forEach((item, idx) => {
    if (idx === index) {
      item.classList.add('is-selected');
      if (scrollIntoView) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    } else {
      item.classList.remove('is-selected');
    }
  });
}

function ensureSelectionVisible() {
  const selectedEl = document.querySelector('.spotlight-item.is-selected');
  selectedEl?.scrollIntoView({ block: 'nearest' });
}

export function closeCommandPalette() {
  if (!paletteBackdrop) return;
  paletteBackdrop.classList.remove('is-open');
  document.body.style.overflow = '';
  setTimeout(() => {
    paletteBackdrop?.remove();
    paletteBackdrop = null;
    selectedIndex = 0;
    currentResults = [];
  }, 180);
}

export default {
  initCommandPalette,
  toggleCommandPalette,
  openCommandPalette,
  closeCommandPalette
};
