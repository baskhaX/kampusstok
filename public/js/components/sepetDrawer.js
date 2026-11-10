// sepetDrawer.js - Sağdan Açılan Hızlı Sepet Paneli
import api from '../api.js';
import state from '../state.js';
import toast from './toast.js';
import { escapeHtml } from '../utils/text.js';
import { t, tProduct, tUnit } from '../utils/i18n.js';

let drawerBackdrop = null;

export function renderSepetDrawer() {
  if (drawerBackdrop) drawerBackdrop.remove();

  drawerBackdrop = document.createElement('div');
  drawerBackdrop.className = 'drawer-backdrop';

  drawerBackdrop.innerHTML = `
    <div class="drawer-panel">
      <div class="drawer-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <h3 style="font-size: 16px; font-weight: 700;">Talep Sepeti</h3>
        </div>
        <button id="closeDrawerBtn" style="font-size: 20px; color: var(--color-muted-foreground);">&times;</button>
      </div>

      <div class="drawer-body" id="drawerBody">
        <p style="text-align: center; color: var(--color-muted-foreground); padding: 40px 0;">Yükleniyor...</p>
      </div>

      <div class="drawer-footer" id="drawerFooter">
        <!-- Sepet dolunca butonlar burada görünür -->
      </div>
    </div>
  `;

  document.body.appendChild(drawerBackdrop);

  drawerBackdrop.querySelector('#closeDrawerBtn').addEventListener('click', closeSepetDrawer);
  drawerBackdrop.addEventListener('click', (e) => {
    if (e.target === drawerBackdrop) closeSepetDrawer();
  });
}

export async function openSepetDrawer() {
  if (!drawerBackdrop) renderSepetDrawer();
  drawerBackdrop.classList.add('open');
  await refreshDrawerContent();
}

export function closeSepetDrawer() {
  if (drawerBackdrop) {
    drawerBackdrop.classList.remove('open');
  }
}

export async function refreshDrawerContent() {
  if (!drawerBackdrop) return;
  const body = drawerBackdrop.querySelector('#drawerBody');
  const footer = drawerBackdrop.querySelector('#drawerFooter');

  try {
    const res = await api.getSepet();
    const { kalemler, toplamKalem, toplamAdet } = res.sepet;

    state.setCartCount(toplamKalem);

    if (kalemler.length === 0) {
      body.innerHTML = `
        <div class="empty-state">
          <h4 class="empty-state-title">Sepetiniz Boş</h4>
          <p class="empty-state-desc">Katalogdan malzeme seçerek sepete ekleyebilirsiniz.</p>
        </div>
      `;
      footer.innerHTML = `
        <a href="#/katalog" class="btn btn-outline" style="width: 100%; text-align: center; text-decoration: none; display: block;">Kataloğa Göz At</a>
      `;
      return;
    }

    body.innerHTML = kalemler.map(item => `
      <div class="sepet-item" data-urun-id="${item.urunId}">
        <img src="${item.gorselYolu || '/assets/placeholder.svg'}" onerror="this.onerror=null;this.src='/assets/placeholder.svg';" class="sepet-item-img" alt="${escapeHtml(tProduct(item.urunAdi))}">
        <div class="sepet-item-info">
          <div class="sepet-item-title">${escapeHtml(tProduct(item.urunAdi))}</div>
          <div class="sepet-item-meta">${escapeHtml(item.urunMarka || '')} &bull; ${tUnit(item.olcuBirimi)}</div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 8px;">
            <div class="qty-picker">
              <button class="qty-btn btn-qty-dec" data-id="${item.urunId}" data-qty="${item.adet}">-</button>
              <input type="text" class="qty-input" value="${item.adet}" readonly>
              <button class="qty-btn btn-qty-inc" data-id="${item.urunId}" data-qty="${item.adet}">+</button>
            </div>
            <button class="btn btn-outline btn-sm btn-item-del" data-id="${item.urunId}" style="color: var(--color-destructive); font-size: 11px; padding: 2px 6px;" title="${t('common.delete', 'Sil')}">
              ${t('common.delete', 'Sil')}
            </button>
          </div>
        </div>
      </div>
    `).join('');

    footer.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: 600;">
        <span>Toplam Kalem:</span>
        <span>${toplamKalem} çeşit (${toplamAdet} birim)</span>
      </div>
      <div style="margin-bottom: 14px;">
        <label style="font-size: 12px; font-weight: 600; color: var(--color-muted-foreground); display: block; margin-bottom: 4px;">Talep Notu (Opsiyonel):</label>
        <textarea id="drawerTalepNotu" placeholder="Satın Alma için teslimat veya özel gerekçe notu ekleyin..." rows="2" style="resize: none;"></textarea>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button id="btnDrawerGonder" class="btn btn-primary" style="width: 100%;">
          Talebi Onayla ve Gönder
        </button>
        <a href="#/sepet" class="btn btn-outline" style="width: 100%;">Sepet Detayına Git</a>
      </div>
    `;

    // Olay dinleyicileri
    body.querySelectorAll('.btn-qty-inc').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id, 10);
        const qty = parseInt(btn.dataset.qty, 10) + 1;
        await api.sepetGuncelle(id, qty);
        await refreshDrawerContent();
      });
    });

    body.querySelectorAll('.btn-qty-dec').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id, 10);
        const qty = parseInt(btn.dataset.qty, 10) - 1;
        await api.sepetGuncelle(id, qty);
        await refreshDrawerContent();
      });
    });

    body.querySelectorAll('.btn-item-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id, 10);
        await api.sepettenSil(id);
        toast.info('Ürün sepetten kaldırıldı.');
        await refreshDrawerContent();
      });
    });

    const btnGonder = footer.querySelector('#btnDrawerGonder');
    if (btnGonder) {
      btnGonder.addEventListener('click', async () => {
        const notlar = footer.querySelector('#drawerTalepNotu')?.value || '';
        try {
          btnGonder.disabled = true;
          btnGonder.textContent = 'İletiliyor...';
          const resTalep = await api.talepOlustur(notlar);
          toast.success(`Talep oluşturuldu: ${resTalep.talep.talep_no}`);
          closeSepetDrawer();
          location.hash = '#/taleplerim';
        } catch (err) {
          toast.error(err.message);
        } finally {
          btnGonder.disabled = false;
        }
      });
    }
  } catch (err) {
    body.innerHTML = `<p style="color: var(--color-destructive); text-align: center;">${err.message}</p>`;
  }
}
