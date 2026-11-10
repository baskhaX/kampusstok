// katalog.js - Kırtasiye Ürün Kataloğu (Yıldızlı / Favori Ürün Destekli)
import api from '../api.js';
import state from '../state.js';
import toast from '../components/toast.js';
import { openSepetDrawer } from '../components/sepetDrawer.js';
import { openProductLightbox } from '../components/productLightbox.js';
import { escapeHtml } from '../utils/text.js';
import { t } from '../utils/i18n.js';

let aktifKategoriId = null;
let aramaMetni = '';
let acikKategoriler = new Set();
let sadeceFavoriler = false;
let katalogAllCache = null;
let lastCacheTime = 0;
const CACHE_TTL = 60000; // 60 saniye istemci önbelleği

function getFavoriIds() {
  const user = state.user;
  const key = `kirtasiye_favoriler_${user?.id || 'genel'}`;
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    // Genel anahtardaki veya kullanıcı anahtarındaki kayıtları birleştirerek veri kaybını önle
    const genelRaw = user?.id ? JSON.parse(localStorage.getItem('kirtasiye_favoriler_genel') || '[]') : [];
    const combined = [...raw, ...genelRaw];
    return new Set(combined.map(id => Number(id)).filter(id => !isNaN(id) && id > 0));
  } catch {
    return new Set();
  }
}

function toggleFavori(urunId) {
  const user = state.user;
  const key = `kirtasiye_favoriler_${user?.id || 'genel'}`;
  const set = getFavoriIds();
  const numId = Number(urunId);
  const isFav = set.has(numId);
  if (isFav) {
    set.delete(numId);
  } else {
    set.add(numId);
  }
  localStorage.setItem(key, JSON.stringify([...set]));
  return !isFav;
}

function syncKategoriSelectionUI(appContainer) {
  const treeContainer = appContainer.querySelector('#kategoriTree');
  if (!treeContainer) return;
  treeContainer.querySelectorAll('.kategori-row').forEach(row => {
    const btn = row.querySelector('.btn-kategori-sec');
    const id = btn?.dataset.id ? parseInt(btn.dataset.id, 10) : null;
    if ((!id && !aktifKategoriId) || (id && id === aktifKategoriId)) {
      row.classList.add('active');
    } else {
      row.classList.remove('active');
    }
  });

  treeContainer.querySelectorAll('.alt-kategori-btn').forEach(altBtn => {
    const altId = altBtn.dataset.id ? parseInt(altBtn.dataset.id, 10) : null;
    if (altId && altId === aktifKategoriId) {
      altBtn.classList.add('active');
    } else {
      altBtn.classList.remove('active');
    }
  });
}

export async function renderKatalog(appContainer) {
  const favCount = getFavoriIds().size;

  appContainer.innerHTML = `
    <div class="container main-content">
      <div class="katalog-layout">
        <!-- Sol: Kategori Ağacı -->
        <aside class="kategori-sidebar">
          <div class="kategori-title">${t('catalog.allCategories', 'Kategoriler')}</div>
          <ul class="kategori-list" id="kategoriTree">
            <li class="kategori-item">
              <button class="kategori-btn active" data-id="">
                <span>${t('catalog.allCategories', 'Tüm Kategoriler')}</span>
              </button>
            </li>
          </ul>
        </aside>

        <!-- Sağ: Arama ve Ürün Grid -->
        <main>
          <div class="katalog-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
            <div>
              <h2 style="font-size: 24px; font-weight: 700; color: #0F172A; margin: 0;">${t('catalog.title', 'Malzeme Kataloğu')}</h2>
              <p style="color: var(--color-muted-foreground); font-size: 13px; margin-top: 4px;">${t('catalog.subtitle', 'Biriminiz için gereken kırtasiye ve sarf malzemelerini seçip sepete ekleyin.')}</p>
            </div>

            <!-- Filtre ve Arama Çubuğu -->
            <div style="display: flex; gap: 12px; align-items: center;">
              <button id="btnToggleFavoriler" class="btn ${sadeceFavoriler ? 'btn-primary' : 'btn-outline'} btn-sm" style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; height: 38px; border-radius: 9999px; white-space: nowrap;">
                ${t('catalog.favorites', 'Favorilerim')}${favCount > 0 ? ` (${favCount})` : ''}
              </button>
              <div class="search-bar-wrapper" style="min-width: 280px;">
                <input type="text" id="katalogSearchInput" placeholder="${t('catalog.searchPlaceholder', 'Ürün adı, marka veya kategori ara...')}" value="${aramaMetni}">
              </div>
            </div>
          </div>

          <!-- Ürün Listesi Grid -->
          <div class="urun-grid" id="urunGrid">
            <p style="padding: 40px; text-align: center; color: var(--color-muted-foreground); grid-column: 1 / -1;">
              ${t('common.loading', 'Ürünler yükleniyor...')}
            </p>
          </div>
        </main>
      </div>
    </div>
  `;

  const btnFavToggle = appContainer.querySelector('#btnToggleFavoriler');
  const updateFavBtnUI = () => {
    if (!btnFavToggle) return;
    const count = getFavoriIds().size;
    btnFavToggle.innerHTML = count > 0 ? `Favorilerim (${count})` : `Favorilerim`;
    btnFavToggle.classList.toggle('btn-primary', sadeceFavoriler);
    btnFavToggle.classList.toggle('btn-outline', !sadeceFavoriler);
  };

  await loadKategoriler(appContainer, updateFavBtnUI);
  await loadUrunler(appContainer);

  // Favoriler Filtre Butonu (Tıklanınca sol kategori sınırını kaldırır ve TÜM favorileri getirir)
  btnFavToggle?.addEventListener('click', () => {
    sadeceFavoriler = !sadeceFavoriler;
    if (sadeceFavoriler) {
      aktifKategoriId = null;
      syncKategoriSelectionUI(appContainer);
    }
    updateFavBtnUI();
    loadUrunler(appContainer);
  });

  // Arama dinleyicisi (Türkçe duyarsız anlık arama)
  const searchInput = appContainer.querySelector('#katalogSearchInput');
  let searchTimeout = null;
  searchInput.addEventListener('input', (e) => {
    aramaMetni = e.target.value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const mainPane = document.querySelector('.main-content-pane');
      if (mainPane) mainPane.scrollTo({ top: 0, behavior: 'instant' });
      window.scrollTo({ top: 0, behavior: 'instant' });
      loadUrunler(appContainer);
    }, 250);
  });

  // Ürün Grid Olay Yöneticisi (Event Delegation - 900+ listener yerine tek ve ışık hızında dinleyici)
  const grid = appContainer.querySelector('#urunGrid');
  grid?.addEventListener('click', async (e) => {
    // 1. Favori Yıldız Butonu
    const starBtn = e.target.closest('.btn-toggle-fav-card');
    if (starBtn) {
      e.stopPropagation();
      const urunId = parseInt(starBtn.dataset.id, 10);
      const yeniDurum = toggleFavori(urunId);
      toast.info(yeniDurum ? 'Ürün favorilerinize eklendi ve en üste taşındı.' : 'Ürün favorilerinizden çıkarıldı.');
      updateFavBtnUI();
      loadUrunler(appContainer);
      return;
    }

    // 2. Adet Artır (+)
    const incBtn = e.target.closest('.btn-card-inc');
    if (incBtn) {
      e.stopPropagation();
      const input = grid.querySelector(`#qty_${incBtn.dataset.id}`);
      if (input) input.value = parseInt(input.value, 10) + 1;
      return;
    }

    // 3. Adet Azalt (-)
    const decBtn = e.target.closest('.btn-card-dec');
    if (decBtn) {
      e.stopPropagation();
      const input = grid.querySelector(`#qty_${decBtn.dataset.id}`);
      if (input) {
        const val = parseInt(input.value, 10);
        if (val > 1) input.value = val - 1;
      }
      return;
    }

    // 4. Sepete Ekle Butonu
    const ekleBtn = e.target.closest('.btn-sepete-ekle');
    if (ekleBtn) {
      e.stopPropagation();
      const urunId = parseInt(ekleBtn.dataset.id, 10);
      const input = grid.querySelector(`#qty_${urunId}`);
      const adet = input ? parseInt(input.value, 10) : 1;

      try {
        ekleBtn.disabled = true;
        const res = await api.sepeteEkle(urunId, adet);
        state.setCartCount(res.toplamKalem);
        toast.success(res.mesaj);
      } catch (err) {
        toast.error(err.message);
      } finally {
        ekleBtn.disabled = false;
      }
      return;
    }

    // 5. Görsele Tıklama -> 600×600 HD Ürün Lightbox Modalı
    const imgWrap = e.target.closest('.urun-img-wrap');
    if (imgWrap) {
      e.stopPropagation();
      const urunId = parseInt(imgWrap.dataset.lightboxId, 10);
      if (urunId) {
        const urun = (window.__katalogUrunleri || []).find(u => Number(u.id) === urunId);
        openProductLightbox(urun || urunId, window.__katalogUrunleri || []);
      }
      return;
    }
  });
}

async function loadKategoriler(appContainer, updateFavBtnUI) {
  const treeContainer = appContainer.querySelector('#kategoriTree');
  try {
    const res = await api.getKategoriler();
    const kategoriler = res.kategoriler || [];

    // 1. Görev: Tüm kategoriler varsayılan olarak açık kalsın (Görsel 1)
    for (const ana of kategoriler) {
      acikKategoriler.add(ana.id);
    }

    let html = `
      <li class="kategori-item" style="margin-bottom: 8px;">
        <div class="kategori-row ${!aktifKategoriId ? 'active' : ''}">
          <button class="kategori-btn btn-kategori-sec" data-id="">
            <span style="font-weight: 700;">Tüm Kategoriler</span>
          </button>
        </div>
      </li>
    `;

    for (const ana of kategoriler) {
      const isAnaActive = aktifKategoriId === ana.id;
      const hasAlt = Boolean(ana.altKategoriler?.length);
      const isOpen = acikKategoriler.has(ana.id);

      html += `
        <li class="kategori-item ${isOpen ? 'is-open' : ''}">
          <div class="kategori-row ${isAnaActive ? 'active' : ''}">
            <button class="kategori-btn btn-kategori-sec" data-id="${ana.id}">
              <span>${ana.ad}</span>
            </button>
            ${hasAlt ? `
              <button class="kategori-toggle-btn btn-kategori-toggle" data-toggle="${ana.id}" title="Alt Kategorileri Aç/Kapat">
                <span class="kategori-chevron ${isOpen ? 'open' : ''}">›</span>
              </button>
            ` : ''}
          </div>
          ${hasAlt ? `
            <ul class="alt-kategori-list ${isOpen ? 'open' : ''}">
              ${ana.altKategoriler.map(alt => `
                <li>
                  <button class="alt-kategori-btn btn-kategori-sec ${aktifKategoriId === alt.id ? 'active' : ''}" data-id="${alt.id}">
                    <span class="alt-kategori-dot"></span>
                    <span>${alt.ad}</span>
                  </button>
                </li>
              `).join('')}
            </ul>
          ` : ''}
        </li>
      `;
    }

    treeContainer.innerHTML = html;

    // Kategori Seçim Olayları (Sabit, titreşimsiz)
    treeContainer.querySelectorAll('.btn-kategori-sec').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id ? parseInt(btn.dataset.id, 10) : null;
        aktifKategoriId = id;

        // Sol menüden bir kategori seçildiğinde "Sadece Favoriler" filtresini kapatıp o kategorinin tüm ürünlerini aç
        if (sadeceFavoriler) {
          sadeceFavoriler = false;
          if (typeof updateFavBtnUI === 'function') updateFavBtnUI();
        }

        syncKategoriSelectionUI(appContainer);

        // Kategori değişiminde kaydırmayı tepeye sabitle (zıplama ve yukarı kaymayı önler)
        const mainPane = document.querySelector('.main-content-pane');
        if (mainPane) mainPane.scrollTo({ top: 0, behavior: 'instant' });
        window.scrollTo({ top: 0, behavior: 'instant' });

        loadUrunler(appContainer);
      });
    });

    // Aç/Kapat (Accordion Toggle) Olayları (DOM yeniden çizilmez, sadece sınıflar değişir)
    treeContainer.querySelectorAll('.btn-kategori-toggle').forEach(tBtn => {
      tBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt(tBtn.dataset.toggle, 10);
        const item = tBtn.closest('.kategori-item');
        const list = item.querySelector('.alt-kategori-list');
        const chevron = tBtn.querySelector('.kategori-chevron');

        if (acikKategoriler.has(id)) {
          acikKategoriler.delete(id);
          list?.classList.remove('open');
          chevron?.classList.remove('open');
          item?.classList.remove('is-open');
        } else {
          acikKategoriler.add(id);
          list?.classList.add('open');
          chevron?.classList.add('open');
          item?.classList.add('is-open');
        }
      });
    });

  } catch (err) {
    console.error('Kategoriler yüklenemedi:', err);
  }
}

async function loadUrunler(appContainer) {
  const grid = appContainer.querySelector('#urunGrid');
  try {
    const now = Date.now();
    // 0ms Gecikmeli İstemci Önbelleği (Kategori ve filtre geçişlerini anında yapar)
    if (!katalogAllCache || (now - lastCacheTime > CACHE_TTL)) {
      const res = await api.getUrunler({});
      katalogAllCache = res.urunler || [];
      lastCacheTime = now;
    }

    let urunler = [...katalogAllCache];

    // 1. Kategori Filtresi
    if (aktifKategoriId && !sadeceFavoriler) {
      urunler = urunler.filter(u => u.kategoriId === aktifKategoriId || u.ustKategoriId === aktifKategoriId);
    }

    // 2. Arama Metni Filtresi (Türkçe Karakter Duyarsız Hızlı Filtre)
    if (aramaMetni && aramaMetni.trim()) {
      const query = aramaMetni.trim().toLocaleLowerCase('tr-TR');
      urunler = urunler.filter(u => {
        const ad = (u.ad || '').toLocaleLowerCase('tr-TR');
        const marka = (u.marka || '').toLocaleLowerCase('tr-TR');
        const kat = (u.kategoriAdi || '').toLocaleLowerCase('tr-TR');
        return ad.includes(query) || marka.includes(query) || kat.includes(query);
      });
    }

    const favoriler = getFavoriIds();

    if (sadeceFavoriler) {
      urunler = urunler.filter(u => favoriler.has(Number(u.id)));
    }

    if (urunler.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <h4 class="empty-state-title">${sadeceFavoriler ? 'Henüz Favori Malzemeniz Yok' : 'Eşleşen Ürün Bulunamadı'}</h4>
          <p class="empty-state-desc">${sadeceFavoriler ? 'Ürünlerin üzerindeki Favori butonuna tıklayarak favorilerinize ekleyebilirsiniz.' : 'Arama terimini değiştirebilir veya sol taraftan farklı bir kategori seçebilirsiniz.'}</p>
        </div>
      `;
      return;
    }

    // Yıldızlı / Favori Ürünleri En Başa Sırala
    urunler.sort((a, b) => {
      const aFav = favoriler.has(Number(a.id)) ? 1 : 0;
      const bFav = favoriler.has(Number(b.id)) ? 1 : 0;
      if (aFav !== bFav) return bFav - aFav;
      return a.ad.localeCompare(b.ad, 'tr-TR');
    });

    window.__katalogUrunleri = urunler;

    grid.innerHTML = urunler.map(u => {
      const isFav = favoriler.has(Number(u.id));
      let badgeHtml = '';
      if (u.stokDurumu === 'stokta') {
        badgeHtml = `<span class="badge badge-success">${t('catalog.inStock', 'Stokta')}</span>`;
      } else if (u.stokDurumu === 'sinirli') {
        badgeHtml = `<span class="badge badge-warning">${t('catalog.inStock', 'Sınırlı Stok')}</span>`;
      } else {
        badgeHtml = `<span class="badge badge-danger">${t('catalog.outOfStock', 'Tükendi')}</span>`;
      }

      return `
        <div class="card urun-card" style="position: relative; ${isFav ? 'border: 1.5px solid #fcd34d;' : ''}">
          <button class="btn-toggle-fav-card" data-id="${u.id}" title="${isFav ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}" style="position: absolute; top: 10px; right: 10px; z-index: 4; background: rgba(255, 255, 255, 0.95); border: 1px solid rgba(0,0,0,0.08); border-radius: 9999px; padding: 4px 10px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.06); font-size: 11px; font-weight: 700; color: ${isFav ? '#b45309' : '#64748b'}; transition: transform 0.15s ease;">
            ${isFav ? t('catalog.favorited', 'Favori') : t('catalog.addFavorite', '+Fav')}
          </button>
          <div class="urun-img-wrap" data-lightbox-id="${u.id}" style="cursor: pointer;" title="Detaylı HD İncelemek ve Büyütmek İçin Tıklayın">
            <img src="${u.gorselYolu || '/assets/placeholder.svg'}" onerror="this.onerror=null;this.src='/assets/placeholder.svg';" class="urun-img" alt="${u.ad}" loading="lazy" decoding="async">
            <div class="urun-badge-pos" style="display: flex; gap: 4px; flex-wrap: wrap;">
              ${isFav ? `<span class="badge" style="background: #fef3c7; color: #b45309; border: 1px solid #fde68a; font-weight: 700; font-size: 10.5px;">${t('catalog.favorited', 'Favori')}</span>` : ''}
              ${u.demirbas ? `<span class="badge" style="background: #ede9fe; color: #6d28d9; border: 1px solid #ddd6fe; font-weight: 700; font-size: 10.5px;">${t('catalog.durable', 'Demirbaş')}</span>` : ''}
              ${badgeHtml}
            </div>
            <span class="urun-zoom-chip">${t('catalog.inspect', 'İncele')}</span>
          </div>
          <div class="urun-content">
            <span class="urun-marka">${u.marka || u.kategoriAdi}</span>
            <h4 class="urun-ad" title="${u.ad}">${u.ad}</h4>

            <div class="urun-action-group">
              <div class="urun-qty-row">
                <span class="urun-birim-etiket">Birim: <strong>${u.olcuBirimi}</strong></span>
                <div class="qty-picker">
                  <button class="qty-btn btn-card-dec" data-id="${u.id}" title="Azalt">-</button>
                  <input type="text" class="qty-input" id="qty_${u.id}" value="1" readonly>
                  <button class="qty-btn btn-card-inc" data-id="${u.id}" title="Artır">+</button>
                </div>
              </div>
              <button class="btn btn-accent btn-sepete-ekle" data-id="${u.id}">
                ${t('catalog.addToCart', 'Sepete Ekle')}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    grid.innerHTML = `<p style="color: var(--color-destructive); text-align: center;">${err.message}</p>`;
  }
}

export default renderKatalog;
