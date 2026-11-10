// productLightbox.js - 600x600 HD Ürün İnceleme & Galeri Lightbox Modalı
import api from '../api.js';
import state from '../state.js';
import toast from './toast.js';

let activeLightboxModal = null;
let currentUrunList = [];
let currentIndex = -1;

function generateBarcodeSVG(code) {
  if (!code) code = '8692026000000';
  const clean = String(code).replace(/[^0-9]/g, '');
  // Generate a neat pseudo-EAN13 bar pattern based on digits
  let barsHtml = '';
  let x = 10;
  for (let i = 0; i < clean.length; i++) {
    const d = parseInt(clean[i], 10);
    const w1 = (d % 3) + 1.2;
    const w2 = ((d + 1) % 2) + 1.2;
    barsHtml += `<rect x="${x}" y="4" width="${w1}" height="38" fill="currentColor" />`;
    x += w1 + 1.5;
    barsHtml += `<rect x="${x}" y="4" width="${w2}" height="38" fill="currentColor" />`;
    x += w2 + 2;
  }
  return `
    <svg class="barcode-svg" viewBox="0 0 ${Math.max(x + 10, 160)} 58" width="100%" height="48" preserveAspectRatio="xMidYMid meet">
      ${barsHtml}
      <text x="${x / 2}" y="53" text-anchor="middle" font-family="monospace" font-size="11" font-weight="700" fill="currentColor" letter-spacing="2">${clean}</text>
    </svg>
  `;
}

export function openProductLightbox(urunOrId, urunList = []) {
  if (activeLightboxModal) {
    closeProductLightbox();
  }

  currentUrunList = Array.isArray(urunList) ? urunList : [];
  
  let urun = null;
  if (typeof urunOrId === 'object' && urunOrId !== null) {
    urun = urunOrId;
    currentIndex = currentUrunList.findIndex(u => Number(u.id) === Number(urun.id));
  } else {
    const id = Number(urunOrId);
    currentIndex = currentUrunList.findIndex(u => Number(u.id) === id);
    if (currentIndex >= 0) {
      urun = currentUrunList[currentIndex];
    }
  }

  renderLightboxModal(urun, urunOrId);
}

async function renderLightboxModal(initialUrun, urunOrId) {
  let urun = initialUrun;
  const targetId = urun?.id || urunOrId;

  // Modal Container
  const backdrop = document.createElement('div');
  backdrop.className = 'lightbox-backdrop';
  backdrop.id = 'productLightboxBackdrop';

  backdrop.innerHTML = `
    <div class="lightbox-dialog" role="dialog" aria-modal="true">
      <button class="lightbox-close-btn" id="btnLightboxClose" title="Kapat (Esc)">✕</button>
      
      ${currentUrunList.length > 1 ? `
        <button class="lightbox-nav-btn lightbox-prev-btn" id="btnLightboxPrev" title="Önceki Ürün (← Sol Ok)">‹</button>
        <button class="lightbox-nav-btn lightbox-next-btn" id="btnLightboxNext" title="Sonraki Ürün (→ Sağ Ok)">›</button>
      ` : ''}

      <div class="lightbox-body" id="lightboxBody">
        <div class="lightbox-loading">
          <div class="spinner"></div>
          <p>Yüksek çözünürlüklü ürün görseli yükleniyor...</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  activeLightboxModal = backdrop;
  document.body.style.overflow = 'hidden';

  // Animate in
  requestAnimationFrame(() => {
    backdrop.classList.add('is-open');
  });

  // Listeners
  backdrop.querySelector('#btnLightboxClose')?.addEventListener('click', closeProductLightbox);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeProductLightbox();
  });

  const prevBtn = backdrop.querySelector('#btnLightboxPrev');
  const nextBtn = backdrop.querySelector('#btnLightboxNext');

  prevBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    navigateLightbox(-1);
  });
  nextBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    navigateLightbox(1);
  });

  // Global Keydown Handler
  window.addEventListener('keydown', handleLightboxKeyDown);

  // Load Full Product Data
  try {
    if (!urun || !urun.ad || !urun.olcuBirimi) {
      const res = await api.getUrun(targetId);
      urun = res.urun || res;
    }
    updateLightboxContent(urun);
  } catch (err) {
    const body = backdrop.querySelector('#lightboxBody');
    if (body) {
      body.innerHTML = `<p style="color: var(--color-destructive); text-align: center; padding: 40px;">Ürün detayları yüklenemedi: ${err.message}</p>`;
    }
  }
}

function updateLightboxContent(urun) {
  const body = document.getElementById('lightboxBody');
  if (!body) return;

  const isOutOfStock = urun.stok <= 0;
  const isLimited = urun.stok > 0 && urun.stok <= (urun.kritikStok || 5);
  let stokBadge = '';
  if (isOutOfStock) {
    stokBadge = `<span class="badge badge-danger">Tükendi (${urun.stok || 0} ${urun.olcuBirimi || 'adet'})</span>`;
  } else if (isLimited) {
    stokBadge = `<span class="badge badge-warning">Sınırlı Stok (${urun.stok} ${urun.olcuBirimi || 'adet'})</span>`;
  } else {
    stokBadge = `<span class="badge badge-success">Stokta (${urun.stok} ${urun.olcuBirimi || 'adet'})</span>`;
  }

  const imageSrc = urun.gorselYolu || urun.gorsel_yolu || '/assets/placeholder.svg';
  const barcode = urun.barkod || ('8692026' + String(urun.id).padStart(5, '0'));

  body.innerHTML = `
    <div class="lightbox-layout">
      <!-- Sol Sütun: HD Görsel & Zoom -->
      <div class="lightbox-media-col">
        <div class="lightbox-zoom-container" id="lightboxZoomWrap">
          <img src="${imageSrc}" class="lightbox-img" id="lightboxImg" alt="${urun.ad}">
          <div class="lightbox-lens-hint">Detaylı İncelemek İçin Üzerine Gelin</div>
        </div>
      </div>

      <!-- Sağ Sütun: Kurumsal Bilgiler & Aksiyon -->
      <div class="lightbox-info-col">
        <div class="lightbox-header-block">
          <div class="lightbox-cat-tag">${urun.kategoriAdi || urun.kategori_adi || 'Kırtasiye'}</div>
          <h2 class="lightbox-title">${urun.ad}</h2>
          <div class="lightbox-meta-row">
            <span class="lightbox-brand-pill">Marka: <strong>${urun.marka || 'Standart'}</strong></span>
            ${urun.demirbas ? `<span class="badge badge-purple" style="font-weight: 700;">Demirbaş / Dayanıklı</span>` : ''}
            ${stokBadge}
          </div>
        </div>

        <div class="lightbox-barcode-card">
          <div class="barcode-label">EAN-13 Kurumsal Ürün Barkodu</div>
          ${generateBarcodeSVG(barcode)}
        </div>

        <div class="lightbox-spec-list">
          <div class="spec-item">
            <span class="spec-label">Ölçü / Dağıtım Birimi:</span>
            <span class="spec-val"><strong>${urun.olcuBirimi || urun.olcu_birimi || 'Adet'}</strong></span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Depo Raf Kodu:</span>
            <span class="spec-val">STK-D${urun.kategoriId || urun.kategori_id || '0'}-R${urun.id}</span>
          </div>
          <div class="spec-item">
            <span class="spec-label">Teslimat Döngüsü:</span>
            <span class="spec-val">Her Çarşamba (Rutin Kampüs İçi)</span>
          </div>
        </div>

        <div class="lightbox-action-dock">
          <div class="lightbox-qty-control">
            <span class="qty-label">Talep Miktarı:</span>
            <div class="qty-picker">
              <button class="qty-btn" id="btnLbDec" ${isOutOfStock ? 'disabled' : ''}>-</button>
              <input type="text" class="qty-input" id="inputLbQty" value="1" readonly>
              <button class="qty-btn" id="btnLbInc" ${isOutOfStock ? 'disabled' : ''}>+</button>
            </div>
          </div>

          <button class="btn btn-accent btn-lg lightbox-add-cart-btn" id="btnLbAddCart" ${isOutOfStock ? 'disabled' : ''}>
            <span>Sepete Ekle</span>
          </button>
        </div>
      </div>
    </div>
  `;

  // Setup Image Zoom Lens
  setupImageZoom(body);

  // Setup Quantity & Cart
  const qtyInput = body.querySelector('#inputLbQty');
  const btnDec = body.querySelector('#btnLbDec');
  const btnInc = body.querySelector('#btnLbInc');
  const btnAdd = body.querySelector('#btnLbAddCart');

  btnDec?.addEventListener('click', () => {
    let val = parseInt(qtyInput.value, 10) || 1;
    if (val > 1) qtyInput.value = val - 1;
  });

  btnInc?.addEventListener('click', () => {
    let val = parseInt(qtyInput.value, 10) || 1;
    const max = urun.stok || 999;
    if (val < max) qtyInput.value = val + 1;
  });

  btnAdd?.addEventListener('click', async () => {
    const miktar = parseInt(qtyInput.value, 10) || 1;
    try {
      btnAdd.disabled = true;
      btnAdd.innerHTML = `<span>⏳ Ekleniyor...</span>`;
      await api.sepeteEkle({ urun_id: urun.id, miktar });
      
      // Update global state and cart badge
      state.cartCount = (state.cartCount || 0) + miktar;
      const badges = document.querySelectorAll('.dock-cart-badge, .nav-cart-badge');
      badges.forEach(b => {
        b.textContent = state.cartCount;
        b.classList.add('is-active', 'badge-bounce');
        setTimeout(() => b.classList.remove('badge-bounce'), 400);
      });

      toast.success(`${urun.ad} (${miktar} ${urun.olcuBirimi || 'adet'}) sepete eklendi.`);
      btnAdd.innerHTML = `<span>Eklendi</span>`;
      setTimeout(() => {
        btnAdd.innerHTML = `<span>Sepete Ekle</span>`;
        btnAdd.disabled = false;
      }, 1200);
    } catch (err) {
      toast.error(err.message || 'Sepete eklenemedi');
      btnAdd.disabled = false;
      btnAdd.innerHTML = `<span>Sepete Ekle</span>`;
    }
  });
}

function setupImageZoom(container) {
  const wrap = container.querySelector('#lightboxZoomWrap');
  const img = container.querySelector('#lightboxImg');
  if (!wrap || !img) return;

  wrap.addEventListener('mousemove', (e) => {
    const rect = wrap.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    img.style.transformOrigin = `${x}% ${y}%`;
    img.classList.add('is-zoomed');
  });

  wrap.addEventListener('mouseleave', () => {
    img.classList.remove('is-zoomed');
    img.style.transformOrigin = 'center center';
  });
}

function navigateLightbox(direction) {
  if (!currentUrunList.length) return;
  currentIndex += direction;
  if (currentIndex < 0) currentIndex = currentUrunList.length - 1;
  if (currentIndex >= currentUrunList.length) currentIndex = 0;

  const nextUrun = currentUrunList[currentIndex];
  if (nextUrun) {
    updateLightboxContent(nextUrun);
  }
}

function handleLightboxKeyDown(e) {
  if (!activeLightboxModal) return;
  if (e.key === 'Escape') {
    closeProductLightbox();
  } else if (e.key === 'ArrowLeft') {
    navigateLightbox(-1);
  } else if (e.key === 'ArrowRight') {
    navigateLightbox(1);
  }
}

export function closeProductLightbox() {
  if (!activeLightboxModal) return;
  window.removeEventListener('keydown', handleLightboxKeyDown);
  activeLightboxModal.classList.remove('is-open');
  document.body.style.overflow = '';
  setTimeout(() => {
    if (activeLightboxModal && activeLightboxModal.parentNode) {
      activeLightboxModal.parentNode.removeChild(activeLightboxModal);
    }
    activeLightboxModal = null;
  }, 220);
}

export default openProductLightbox;
