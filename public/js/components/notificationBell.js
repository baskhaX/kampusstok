// notificationBell.js - Header Apple Liquid Glass Bildirim Çanı & Kritik Stok Modalı
import api from '../api.js';
import state from '../state.js';
import toast from './toast.js';
import createModal from './modal.js';
import { t, getLanguage, tDepartment, tProduct, tUnit, tBuilding, DEPARTMENT_MAP, PRODUCT_MAP, BUILDING_MAP } from '../utils/i18n.js';
import { escapeHtml } from '../utils/text.js';

let sseSource = null;
let activeBellContainer = null;
let currentNotifications = [];

/**
 * Web Audio API ile harici mp3 dosyası gerektirmeden zarif Apple tarzı kristal bildirim sesi üretir
 */
export function playChimeSound() {
  try {
    const isMuted = localStorage.getItem('satinalma_ses_durumu') === '0';
    if (isMuted) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Çift frekanslı yumuşak kristal akor (E6 & B6: 1318.5Hz ve 1975.5Hz)
    const now = ctx.currentTime;
    [1318.51, 1975.53].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0, now + idx * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.6);
    });
  } catch (e) {
    // Ses desteği yoksa veya engellendiyse sessizce geç
  }
}

/**
 * Bildirim başlık ve gövdesini aktif dile göre çevirir
 */
export function formatNotificationContent(n) {
  const isEn = getLanguage() === 'en';
  if (!isEn) {
    return {
      title: n.baslik || 'Sistem Bildirimi',
      msg: n.mesaj || ''
    };
  }

  let title = (n.baslik || 'System Notification').trim();
  let msg = (n.mesaj || '').trim();

  // Dekoratif emojileri temizle
  title = title.replace(/^[♻️🧰📦⚠️✓]+\s*/u, '');

  if (title.startsWith('Atıl Malzeme İadesi:')) {
    const rawDept = title.replace('Atıl Malzeme İadesi:', '').trim();
    title = `Surplus Material Return: ${tDepartment(rawDept)}`;
  } else if (title.includes('Malzeme Depoya Kazandırıldı')) {
    title = 'Material Recovered to Warehouse (+20 Green Points!)';
  } else if (title.startsWith('Ortak Ekipman Rezervasyonu:')) {
    const rawEq = title.replace('Ortak Ekipman Rezervasyonu:', '').trim();
    title = `Shared Equipment Reservation: ${tProduct(rawEq)}`;
  } else if (title.includes('Ödünç Ekipman Teslim Alındı')) {
    title = 'Equipment Returned to Warehouse (+5 Points)';
  } else if (title.startsWith('Yeni Malzeme Talebi:')) {
    title = title.replace('Yeni Malzeme Talebi:', 'New Material Requisition:');
  } else if (title.startsWith('Talep Onaylandı:')) {
    title = title.replace('Talep Onaylandı:', 'Requisition Approved:');
  } else if (title.startsWith('Talep Revize Edilerek Onaylandı:')) {
    title = title.replace('Talep Revize Edilerek Onaylandı:', 'Requisition Approved with Revision:');
  } else if (title.startsWith('Talep Reddedildi:')) {
    title = title.replace('Talep Reddedildi:', 'Requisition Rejected:');
  } else if (title.startsWith('Malzemeler Teslim Edildi:')) {
    title = title.replace('Malzemeler Teslim Edildi:', 'Materials Delivered:');
  } else if (title.startsWith('Kritik Stok Uyarısı:')) {
    const rawProd = title.replace('Kritik Stok Uyarısı:', '').trim();
    title = `Critical Stock Alert: ${tProduct(rawProd)}`;
  }

  // Mesaj gövdesi çevirileri
  if (msg.includes('konumundan atıl malzeme bildirildi:')) {
    let cleanMsg = msg;
    for (const [binaTr, binaObj] of Object.entries(BUILDING_MAP)) {
      if (cleanMsg.includes(binaTr)) {
        cleanMsg = cleanMsg.split(binaTr).join(binaObj.en);
      }
    }
    msg = cleanMsg
      .replace('konumundan atıl malzeme bildirildi:', 'surplus materials reported:')
      .replace(/Oda\s+/g, 'Room ');
  } else if (msg.includes('Bildirdiğiniz ihtiyaç fazlası malzemeler teslim alındı')) {
    msg = 'Reported surplus supplies received and recovered to institution inventory. +20 Green Points added to your department!';
  } else if (msg.includes('rezerve etti')) {
    let cleanMsg = msg;
    for (const [deptTr, deptObj] of Object.entries(DEPARTMENT_MAP)) {
      if (cleanMsg.includes(deptTr)) {
        cleanMsg = cleanMsg.split(deptTr).join(deptObj.en);
      }
    }
    for (const [prodTr, prodObj] of Object.entries(PRODUCT_MAP)) {
      if (cleanMsg.includes(prodTr)) {
        cleanMsg = cleanMsg.split(prodTr).join(prodObj.en);
      }
    }
    msg = cleanMsg
      .replace(/\s*\(\s*(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})\s*\)\s*tarihleri\s*için\s*/i, ' ($1 - $2) for dates ')
      .replace('tarihleri için', 'for dates')
      .replace('rezerve etti.', 'reserved.')
      .replace('rezerve etti', 'reserved')
      .replace('Tercih: Depodan Elden Teslim.', 'Method: Direct Warehouse Pickup.')
      .replace('Tercih: Depodan Elden Teslim', 'Method: Direct Warehouse Pickup')
      .replace('Tercih: Rutin Dağıtımla Odaya Teslim.', 'Method: Routine Wednesday Delivery to Room.')
      .replace('Tercih: Rutin Dağıtımla Odaya Teslim', 'Method: Routine Wednesday Delivery to Room');
  } else if (msg.includes('tarafından') && msg.includes('numaralı malzeme talebi oluşturuldu.')) {
    msg = msg
      .replace('tarafından', 'submitted requisition')
      .replace('numaralı malzeme talebi oluşturuldu.', '.');
  } else if (msg.includes('Talebiniz satın alma tarafından onaylandı.')) {
    msg = 'Your requisition has been approved by Procurement. Delivery scheduled for Wednesday.';
  } else if (msg.includes('Talebinizdeki ürün miktarları düzenlenerek onaylandı.')) {
    msg = 'Your requisition quantities have been adjusted and approved.';
  } else if (msg.includes('Talebiniz satın alma tarafından uygun görülmeyerek reddedildi.')) {
    msg = 'Your requisition was reviewed and not approved by Procurement.';
  } else if (msg.includes('Malzemeler biriminize teslim edilmiştir.')) {
    msg = 'Supplies have been delivered to your department. Please confirm receipt.';
  }

  return { title, msg };
}

/**
 * Bildirim çanını hedef DOM elemanına monte eder
 */
export async function mountNotificationBell(targetEl) {
  if (!targetEl) return;
  activeBellContainer = targetEl;

  const isEn = getLanguage() === 'en';

  targetEl.innerHTML = `
    <div class="bell-wrapper" id="bellWrapper" style="position: relative; display: inline-flex; align-items: center;">
      <button type="button" class="bell-header-btn" id="btnNotificationBell" title="${t('header.notifications', 'Bildirimler')}" aria-label="${t('header.notifications', 'Bildirimler')}">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <span class="bell-badge-count" id="bellBadgeCount" style="display: none;">0</span>
      </button>

      <!-- Cam Efektli Bildirim Açılır Çekmecesi -->
      <div class="bell-dropdown-flyout" id="bellDropdownFlyout" style="display: none;">
        <div class="bell-flyout-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 14.5px; color: #0F172A;">${t('header.notifications', 'Bildirimler')}</span>
            <span class="badge badge-primary" id="bellFlyoutUnreadBadge" style="font-size: 11px; padding: 2px 7px;">0 ${isEn ? 'new' : 'yeni'}</span>
          </div>
          <button type="button" class="btn-text-action" id="btnMarkAllRead" style="font-size: 12px; color: #2563EB; font-weight: 600; cursor: pointer; background: none; border: none; padding: 4px;">
            ${t('header.markAllRead', 'Tümünü Okundu Say')}
          </button>
        </div>

        <div class="bell-flyout-body" id="bellFlyoutBody">
          <div class="bell-loading-placeholder">${t('common.loading', 'Yükleniyor...')}</div>
        </div>

        ${state.user?.rol === 'satin_alma' ? `
          <div class="bell-flyout-footer">
            <button type="button" class="btn-kritik-stok-link" id="btnOpenKritikStokModal">
              ${isEn ? 'Critical Stock List & Procurement Needs ›' : 'Kritik Stok Listesi ve Tedarik İhtiyaçları ›'}
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  const btnBell = targetEl.querySelector('#btnNotificationBell');
  const flyout = targetEl.querySelector('#bellDropdownFlyout');
  const btnMarkAll = targetEl.querySelector('#btnMarkAllRead');
  const btnKritikStok = targetEl.querySelector('#btnOpenKritikStokModal');

  btnBell.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = flyout.style.display !== 'none';
    if (isOpen) {
      flyout.style.display = 'none';
    } else {
      flyout.style.display = 'flex';
      renderBellList();
    }
  });

  document.addEventListener('click', (e) => {
    if (!targetEl.contains(e.target)) {
      flyout.style.display = 'none';
    }
  });

  if (btnMarkAll) {
    btnMarkAll.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await api.bildirimTumunuOku();
        currentNotifications.forEach(n => n.okundu = 1);
        updateBellBadge();
        renderBellList();
        toast.success(getLanguage() === 'en' ? 'All notifications marked as read.' : 'Tüm bildirimler okundu olarak işaretlendi.');
      } catch (err) {
        toast.error((getLanguage() === 'en' ? 'Operation failed: ' : 'İşlem başarısız: ') + err.message);
      }
    });
  }

  if (btnKritikStok) {
    btnKritikStok.addEventListener('click', (e) => {
      e.stopPropagation();
      flyout.style.display = 'none';
      openKritikStokModal();
    });
  }

  // İlk veriyi yükle ve SSE'yi başlat
  await loadNotifications();
  initSSE();
}

/**
 * Bildirimleri API'den yükler
 */
export async function loadNotifications() {
  try {
    const res = await api.getBildirimler();
    currentNotifications = res.bildirimler || [];
    updateBellBadge();
  } catch (err) {
    console.warn('Bildirimler yüklenirken hata:', err.message);
  }
}

/**
 * Rozet sayacını günceller
 */
function updateBellBadge() {
  const badgeEl = activeBellContainer?.querySelector('#bellBadgeCount');
  const flyoutBadge = activeBellContainer?.querySelector('#bellFlyoutUnreadBadge');
  if (!badgeEl) return;

  const isEn = getLanguage() === 'en';
  const unreadCount = currentNotifications.filter(n => !n.okundu).length;
  if (unreadCount > 0) {
    badgeEl.textContent = unreadCount > 99 ? '99+' : unreadCount;
    badgeEl.style.display = 'flex';
    if (flyoutBadge) flyoutBadge.textContent = `${unreadCount} ${isEn ? 'new' : 'yeni'}`;
  } else {
    badgeEl.style.display = 'none';
    if (flyoutBadge) flyoutBadge.textContent = `0 ${isEn ? 'new' : 'yeni'}`;
  }
}

/**
 * Açılır panelin bildirim listesini çizer
 */
function renderBellList() {
  const bodyEl = activeBellContainer?.querySelector('#bellFlyoutBody');
  if (!bodyEl) return;

  if (currentNotifications.length === 0) {
    bodyEl.innerHTML = `
      <div class="bell-empty-state">
        <div style="font-weight: 600; color: #475569; font-size: 13.5px;">${t('header.noNotifications', 'Henüz yeni bildirim yok')}</div>
        <div style="font-size: 12px; color: #94A3B8; margin-top: 2px;">${t('header.allUpToDate', 'Tüm süreçler güncel görünüyor.')}</div>
      </div>
    `;
    return;
  }

  bodyEl.innerHTML = currentNotifications.map(n => {
    let iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';
    let iconBg = 'rgba(37, 99, 235, 0.1)';
    let iconColor = '#2563EB';

    if (n.tur === 'yeni_talep') {
      iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
      iconBg = 'rgba(37, 99, 235, 0.12)';
      iconColor = '#1D4ED8';
    } else if (n.tur === 'talep_sonuc' || (n.baslik && n.baslik.includes('Onaylandı'))) {
      iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      iconBg = 'rgba(16, 185, 129, 0.12)';
      iconColor = '#059669';
    } else if (n.tur === 'talep_ret' || (n.baslik && n.baslik.includes('Onaylanmadı'))) {
      iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      iconBg = 'rgba(239, 68, 68, 0.12)';
      iconColor = '#DC2626';
    } else if (n.tur === 'kritik_stok') {
      iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      iconBg = 'rgba(245, 158, 11, 0.15)';
      iconColor = '#B45309';
    } else if (n.tur === 'malzeme_teslim_edildi' || n.tur === 'talep_teslim_teyit') {
      iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
      iconBg = 'rgba(139, 92, 246, 0.15)';
      iconColor = '#7C3AED';
    } else if (n.tur === 'atil_malzeme') {
      iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>';
      iconBg = 'rgba(16, 185, 129, 0.18)';
      iconColor = '#047857';
    } else if (n.tur === 'ekipman_odunc') {
      iconSvg = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>';
      iconBg = 'rgba(6, 182, 212, 0.15)';
      iconColor = '#0891B2';
    }

    const { title: displayTitle, msg: displayMsg } = formatNotificationContent(n);
    const zamanText = formatTimeAgo(n.olusturma_tarihi || n.tarih);

    return `
      <div class="bell-item-row ${!n.okundu ? 'is-unread' : ''}" data-id="${n.id}" data-type="${n.tur}" data-talep-id="${n.talep_id || ''}">
        <div class="bell-item-icon" style="background: ${iconBg}; color: ${iconColor}; display: inline-flex; align-items: center; justify-content: center;">
          ${iconSvg}
        </div>
        <div class="bell-item-content">
          <div class="bell-item-title">${escapeHtml(displayTitle)}</div>
          <div class="bell-item-msg">${escapeHtml(displayMsg)}</div>
          <div class="bell-item-time">${zamanText}</div>
        </div>
        ${!n.okundu ? '<span class="bell-unread-dot"></span>' : ''}
      </div>
    `;
  }).join('');

  // Tıklama olayları
  bodyEl.querySelectorAll('.bell-item-row').forEach(row => {
    row.addEventListener('click', async () => {
      const id = parseInt(row.dataset.id, 10);
      const tur = row.dataset.type;
      const talepId = row.dataset.talepId;

      try {
        await api.bildirimOkundu(id);
        const item = currentNotifications.find(n => n.id === id);
        if (item) item.okundu = 1;
        updateBellBadge();
        row.classList.remove('is-unread');
        row.querySelector('.bell-unread-dot')?.remove();
      } catch (e) {}

      const item = currentNotifications.find(n => n.id === id);

      // Yönlendirme ve Modal Açma Aksiyonları
      if (tur === 'kritik_stok') {
        openKritikStokModal();
      } else if (tur === 'atil_malzeme') {
        if (state.user?.rol === 'satin_alma') {
          window.location.hash = '#/satinalma?durum=atil_malzeme';
          openAtilMalzemeDetayModal(item);
        } else {
          window.location.hash = '#/yesil-kampus';
        }
      } else if (tur === 'ekipman_odunc') {
        if (state.user?.rol === 'satin_alma') {
          window.location.hash = '#/satinalma?durum=odunc_ekipman';
          openEkipmanRezervasyonDetayModal(item);
        } else {
          window.location.hash = '#/yesil-kampus';
        }
      } else if (talepId) {
        if (state.user?.rol === 'satin_alma') {
          window.location.hash = `#/satinalma?talep=${talepId}`;
        } else {
          window.location.hash = `#/taleplerim`;
        }
      }
    });
  });
}

/**
 * SSE Canlı Akış Dinleyicisi
 */
function initSSE() {
  if (sseSource) {
    sseSource.close();
  }

  try {
    sseSource = new EventSource('/api/bildirimler/stream');

    sseSource.addEventListener('bildirim', (e) => {
      try {
        const data = JSON.parse(e.data);
        currentNotifications.unshift({
          ...data,
          okundu: 0
        });
        updateBellBadge();
        playChimeSound();

        const { title, msg } = formatNotificationContent(data);
        toast.info(`${title}: ${msg.substring(0, 50)}...`);

        // Eğer flyout açıksa listeyi yeniden çiz
        const flyout = activeBellContainer?.querySelector('#bellDropdownFlyout');
        if (flyout && flyout.style.display !== 'none') {
          renderBellList();
        }
      } catch (err) {}
    });

    sseSource.onerror = () => {
      // Bağlantı koparsa EventSource otomatik tekrar bağlanmayı dener
    };
  } catch (err) {
    console.warn('SSE başlatılamadı:', err);
  }
}

/**
 * Sayfadan ayrılırken SSE bağlantısını kapatır (Memory leak ve fazladan kaynak kullanımını önler)
 */
export function closeSSEConnection() {
  if (sseSource) {
    sseSource.close();
    sseSource = null;
  }
}

/**
 * SADE KRİTİK STOK LİSTESİ MODALI (Resmi Antetsiz, Pratik)
 * Tek tıkla tedarikçiye gönderilecek temiz Excel çıktısı üretir.
 */
export async function openKritikStokModal() {
  let urunler = [];
  const isEn = getLanguage() === 'en';
  try {
    const res = await api.getKritikStok();
    urunler = res.urunler || [];
  } catch (err) {
    toast.error((isEn ? 'Failed to fetch critical stock list: ' : 'Kritik stok listesi alınamadı: ') + err.message);
    return;
  }

  const modal = createModal({
    title: isEn ? 'Warehouse Critical Stock & Procurement Needs List' : 'Depo Kritik Stok ve Tedarik İhtiyaç Listesi',
    maxWidth: '860px',
    content: `
      <div style="font-size: 13.5px; color: #475569; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <span>${isEn ? 'Stationery items below critical thresholds or exhausted by pending requisitions are listed below.' : 'Stok seviyesi kritik eşiğin altına inen veya bekleyen taleplerle stoğu tükenen ürünler aşağıda listelenmiştir.'}</span>
        <button type="button" class="btn btn-primary btn-sm" id="btnExcelKritikStok" style="gap: 6px;">
          ${isEn ? 'Download Clean Excel Order List' : 'Temiz Excel Sipariş Listesi İndir'}
        </button>
      </div>

      <div style="max-height: 440px; overflow-y: auto; border: 1.2px solid #E2E8F0; border-radius: 14px;">
        <table class="table-clean" style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #F8FAFC; border-bottom: 1.5px solid #E2E8F0; text-align: left;">
              <th style="padding: 10px 14px;">${isEn ? 'Item Name' : 'Ürün Adı'}</th>
              <th style="padding: 10px 14px;">${isEn ? 'Brand / Category' : 'Marka / Kategori'}</th>
              <th style="padding: 10px 14px; text-align: center;">${isEn ? 'Current Stock' : 'Mevcut Stok'}</th>
              <th style="padding: 10px 14px; text-align: center;">${isEn ? 'Critical Threshold' : 'Kritik Eşik'}</th>
              <th style="padding: 10px 14px; text-align: center;">${isEn ? 'Pending Requisitions' : 'Bekleyen Talep'}</th>
              <th style="padding: 10px 14px; text-align: center; color: #0284C7;">${isEn ? 'Suggested Order' : 'Önerilen Sipariş'}</th>
            </tr>
          </thead>
          <tbody>
            ${urunler.length === 0 ? `
              <tr>
                <td colspan="6" style="text-align: center; padding: 30px; color: #059669; font-weight: 600;">
                  ${isEn ? 'There are currently no items below the critical threshold in the warehouse.' : 'Depoda kritik eşiğin altına düşen hiçbir ürün bulunmamaktadır.'}
                </td>
              </tr>
            ` : urunler.map(u => `
              <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 10px 14px; font-weight: 600; color: #0F172A;">${escapeHtml(tProduct(u.ad))}</td>
                <td style="padding: 10px 14px; color: #64748B;">${escapeHtml(u.marka || '-')} • ${escapeHtml(u.kategori_adi || '')}</td>
                <td style="padding: 10px 14px; text-align: center; font-weight: 700; color: ${u.stok <= 0 ? '#DC2626' : '#D97706'};">
                  ${u.stok} ${escapeHtml(tUnit(u.olcu_birimi || 'adet'))}
                </td>
                <td style="padding: 10px 14px; text-align: center; color: #64748B;">${u.kritik_stok}</td>
                <td style="padding: 10px 14px; text-align: center; font-weight: 600; color: #B45309;">
                  ${u.bekleyen_talep_adedi || 0}
                </td>
                <td style="padding: 10px 14px; text-align: center; font-weight: 800; color: #2563EB;">
                  ${u.oneriSiparisMiktari} ${escapeHtml(tUnit(u.olcu_birimi || 'adet'))}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 18px;">
        <button type="button" class="btn btn-secondary" id="btnModalKritikKapat">${t('common.close', 'Kapat')}</button>
      </div>
    `
  });

  modal.element.querySelector('#btnModalKritikKapat').addEventListener('click', () => modal.close());

  const btnExcel = modal.element.querySelector('#btnExcelKritikStok');
  if (btnExcel && urunler.length > 0) {
    btnExcel.addEventListener('click', () => {
      exportKritikStokToExcel(urunler);
    });
  }
}

/**
 * Excel / CSV dışa aktarımı (Resmi antetsiz, tedarikçiye atılabilecek sade ve temiz format)
 */
function exportKritikStokToExcel(urunler) {
  const isEn = getLanguage() === 'en';
  const headers = isEn 
    ? ['Item Name', 'Brand', 'Category', 'Current Stock', 'Unit', 'Critical Threshold', 'Pending Orders', 'Suggested Order Quantity']
    : ['Ürün Adı', 'Marka', 'Kategori', 'Mevcut Stok', 'Ölçü Birimi', 'Kritik Eşik', 'Bekleyen Talep', 'Önerilen Sipariş Miktarı'];
  
  const rows = urunler.map(u => [
    `"${(isEn ? tProduct(u.ad) : (u.ad || '')).replace(/"/g, '""')}"`,
    `"${(u.marka || '-').replace(/"/g, '""')}"`,
    `"${(u.kategori_adi || '-').replace(/"/g, '""')}"`,
    u.stok,
    `"${(isEn ? tUnit(u.olcu_birimi) : (u.olcu_birimi || 'adet')).replace(/"/g, '""')}"`,
    u.kritik_stok,
    u.bekleyen_talep_adedi || 0,
    u.oneriSiparisMiktari
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const tarihStr = new Date().toISOString().slice(0, 10);
  a.download = `KampusStok_Kritik_Tedarik_Listesi_${tarihStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  toast.success(isEn ? 'Critical stock order list exported successfully.' : 'Kritik stok sipariş listesi başarıyla indirildi.');
}

export function formatTimeAgo(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  const isEn = getLanguage() === 'en';

  if (diffSec < 60) return isEn ? 'Just now' : 'Az önce';
  if (diffSec < 3600) return isEn ? `${Math.floor(diffSec / 60)}m ago` : `${Math.floor(diffSec / 60)} dk önce`;
  if (diffSec < 86400) return isEn ? `${Math.floor(diffSec / 3600)}h ago` : `${Math.floor(diffSec / 3600)} saat önce`;
  return date.toLocaleDateString(isEn ? 'en-US' : 'tr-TR', { day: 'numeric', month: 'short' });
}

/**
 * Atıl Malzeme Bildirim Detayı ve Eylem Modalı
 */
export function openAtilMalzemeDetayModal(item) {
  if (!item) return;
  const atilId = item.atil_id || item.extraData?.atil_id;
  const isEn = getLanguage() === 'en';
  const { title: formattedTitle, msg: formattedMsg } = formatNotificationContent(item);

  const modal = createModal({
    title: isEn ? 'Surplus Material Return Report' : 'İhtiyaç Fazlası Atıl Malzeme Bildirimi',
    maxWidth: '540px',
    content: `
      <div style="font-size: 14px; line-height: 1.5; color: #1E293B;">
        <div style="background: #F0FDF4; border: 1.2px solid #86EFAC; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;">
          <div style="font-weight: 700; color: #065F46; font-size: 15px; margin-bottom: 4px;">
            ${escapeHtml(formattedTitle)}
          </div>
          <div style="color: #047857; font-size: 13.5px;">
            ${escapeHtml(formattedMsg)}
          </div>
        </div>

        <div style="font-size: 13px; color: #64748B; margin-bottom: 20px;">
          <p style="margin: 0 0 6px;">
            ${isEn ? 'This material will be collected from the department during Wednesday distribution and recovered to warehouse inventory.' : 'Bu malzeme Çarşamba dağıtımında birimden teslim alınarak depoya kazandırılacaktır.'}
          </p>
          <p style="margin: 0;">
            ${isEn ? 'When received into the warehouse, <strong>+20 Green Campus Points</strong> are automatically credited to the department.' : 'Depoya teslim alındığında birime otomatik <strong>+20 Yeşil Kampüs Puanı</strong> tanımlanır.'}
          </p>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button type="button" class="btn btn-secondary" id="btnKapatAtilDetay">${t('common.close', 'Kapat')}</button>
          ${(state.user?.rol === 'satin_alma' && atilId) ? `
            <button type="button" class="btn btn-primary" id="btnModalTeslimAlAtil" style="background: #10B981; border: none; font-weight: 700; border-radius: 9999px;">
              ${isEn ? 'Accept to Warehouse (+20 P)' : 'Depoya Teslim Al (+20 P)'}
            </button>
          ` : ''}
        </div>
      </div>
    `
  });

  const btnKapat = modal.element.querySelector('#btnKapatAtilDetay');
  const btnTeslim = modal.element.querySelector('#btnModalTeslimAlAtil');

  btnKapat?.addEventListener('click', () => modal.close());

  btnTeslim?.addEventListener('click', async () => {
    btnTeslim.disabled = true;
    btnTeslim.textContent = isEn ? 'Processing...' : 'İşleniyor...';
    try {
      await api.teslimAlAtilMalzeme(atilId);
      toast.success(isEn ? 'Material received into warehouse and +20 Green Points awarded!' : 'Malzeme teslim alındı ve birime +20 Yeşil Puan kazandırıldı!');
      modal.close();
      if (window.location.hash.includes('#/satinalma')) {
        window.location.reload();
      }
    } catch (err) {
      toast.error(err.message || (isEn ? 'Receiving failed' : 'Teslim alma işlemi başarısız'));
      btnTeslim.disabled = false;
      btnTeslim.textContent = isEn ? 'Accept to Warehouse (+20 P)' : 'Depoya Teslim Al (+20 P)';
    }
  });
}

/**
 * Ortak Ekipman Ödünç Rezervasyon Detayı ve Eylem Modalı
 */
export function openEkipmanRezervasyonDetayModal(item) {
  if (!item) return;
  const rezId = item.rezervasyon_id || item.extraData?.rezervasyon_id;
  const isEn = getLanguage() === 'en';
  const { title: formattedTitle, msg: formattedMsg } = formatNotificationContent(item);

  const modal = createModal({
    title: isEn ? 'Shared Equipment Loan Reservation' : 'Ortak Ekipman Ödünç Rezervasyonu',
    maxWidth: '540px',
    content: `
      <div style="font-size: 14px; line-height: 1.5; color: #1E293B;">
        <div style="background: #EFF6FF; border: 1.2px solid #93C5FD; border-radius: 12px; padding: 14px 16px; margin-bottom: 16px;">
          <div style="font-weight: 700; color: #1E40AF; font-size: 15px; margin-bottom: 4px;">
            ${escapeHtml(formattedTitle)}
          </div>
          <div style="color: #1D4ED8; font-size: 13.5px;">
            ${escapeHtml(formattedMsg)}
          </div>
        </div>

        <div style="font-size: 13px; color: #64748B; margin-bottom: 20px;">
          <p style="margin: 0 0 6px;">
            ${isEn ? 'When equipment is dispatched, its status changes to <em>In Use at Department</em>.' : 'Ekipman teslim edildiğinde <em>Birimde Kullanımda</em> durumuna geçer.'}
          </p>
          <p style="margin: 0;">
            ${isEn ? 'Upon completion and return to warehouse, <strong>+5 Green Campus Points</strong> are credited to the department.' : 'Süre bitiminde depoya iade alındığında birime <strong>+5 Yeşil Kampüs Puanı</strong> eklenir.'}
          </p>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap;">
          <button type="button" class="btn btn-secondary" id="btnKapatEkipmanDetay">${t('common.close', 'Kapat')}</button>
          ${(state.user?.rol === 'satin_alma' && rezId) ? `
            <button type="button" class="btn btn-primary" id="btnModalEkipmanTeslim" style="background: #2563EB; border: none; font-weight: 700; border-radius: 9999px;">
              ${isEn ? 'Dispatched to Department' : 'Birime Teslim Edildi'}
            </button>
            <button type="button" class="btn btn-primary" id="btnModalEkipmanIade" style="background: #10B981; border: none; font-weight: 700; border-radius: 9999px;">
              ${isEn ? 'Returned to Warehouse (+5 P)' : 'Depoya İade Alındı (+5 P)'}
            </button>
          ` : ''}
        </div>
      </div>
    `
  });

  const btnKapat = modal.element.querySelector('#btnKapatEkipmanDetay');
  const btnTeslim = modal.element.querySelector('#btnModalEkipmanTeslim');
  const btnIade = modal.element.querySelector('#btnModalEkipmanIade');

  btnKapat?.addEventListener('click', () => modal.close());

  btnTeslim?.addEventListener('click', async () => {
    btnTeslim.disabled = true;
    try {
      await api.teslimEtEkipman(rezId);
      toast.success(isEn ? 'Equipment marked as delivered to department.' : 'Ekipman birime teslim edildi olarak işaretlendi.');
      modal.close();
      if (window.location.hash.includes('#/satinalma')) {
        window.location.reload();
      }
    } catch (err) {
      toast.error(err.message || (isEn ? 'Operation failed' : 'İşlem başarısız'));
      btnTeslim.disabled = false;
    }
  });

  btnIade?.addEventListener('click', async () => {
    btnIade.disabled = true;
    try {
      await api.iadeAlEkipman(rezId);
      toast.success(isEn ? 'Equipment returned to warehouse and +5 Green Points awarded!' : 'Ekipman depoya iade alındı ve birime +5 Yeşil Puan kazandırıldı!');
      modal.close();
      if (window.location.hash.includes('#/satinalma')) {
        window.location.reload();
      }
    } catch (err) {
      toast.error(err.message || (isEn ? 'Operation failed' : 'İşlem başarısız'));
      btnIade.disabled = false;
    }
  });
}
