// satinalma.js - Satın Alma Müdürlüğü Gelen Kutusu (İki Bölümlü Mimari, Apple Liquid Glass UI, İkonsuz)
import api from '../api.js';
import toast from '../components/toast.js';
import createModal from '../components/modal.js';
import { renderProgressRailStepperHtml } from '../components/stepper.js';
import { mountNotificationBell, closeSSEConnection, playChimeSound } from '../components/notificationBell.js';
import { openVekaletModal } from '../components/vekaletModal.js';
import { escapeHtml } from '../utils/text.js';

let sseEventSource = null;

function playAlertBeep() {
  if (localStorage.getItem('satinalma_ses_durumu') === '0') return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {}
}

function getInitials(name) {
  if (!name) return '??';
  const clean = name.replace(/^(prof\.|dr\.|doç\.|arş\.|öğr\.|gör\.|uzm\.)\s*/gi, '').trim().split(/\s+/);
  if (clean.length === 1) return clean[0].substring(0, 2).toLocaleUpperCase('tr-TR');
  return (clean[0][0] + clean[clean.length - 1][0]).toLocaleUpperCase('tr-TR');
}

/**
 * İlk teslimat Çarşambası tarihini formatlı Türkçe metin olarak döner
 */
function getGelecekCarsambaText() {
  const now = new Date();
  const day = now.getDay(); // 0: Pazar, 1: Pzt, 2: Salı, 3: Çarş, 4: Perş, 5: Cuma, 6: Cmt
  let diff = (3 - day + 7) % 7;
  if (diff === 0 && now.getHours() >= 12) {
    diff = 7; // Çarşamba 12:00'den sonraki onaylar sonraki Çarşambaya kalır
  }
  const nextWed = new Date(now);
  nextWed.setDate(now.getDate() + diff);

  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long'
  }).format(nextWed);
}

export async function renderSatinalma(appContainer) {
  const fullHash = window.location.hash || '';
  const queryStr = fullHash.split('?')[1] || '';
  const urlParams = new URLSearchParams(queryStr);
  const initialDurum = urlParams.get('durum') || 'beklemede';

  appContainer.innerHTML = `
    <div class="satinalma-page-wrap" style="width: 100%; max-width: 100%; box-sizing: border-box;">
      <!-- Üst Başlık -->
      <div style="margin-bottom: 22px;">
        <h2 style="font-size: 26px; font-weight: 700; letter-spacing: -0.02em; color: #0F172A;">Gelen Kutusu & Talep Yönetimi</h2>
        <p style="color: var(--text-dim); font-size: 13.5px; margin-top: 4px;">Birimlerden gelen kırtasiye taleplerini hiyerarşik ağaç akışında inceleyin ve sonuçlandırın.</p>
      </div>

      <!-- ===================================================================
           5 ADET APPLE LIQUID GLASS DURUM KARTI (Teslim Edilenler Dahil)
           =================================================================== -->
      <div class="satinalma-kpi-grid-5">
        <!-- Kart 1: Bekleyen Talep -->
        <div class="kpi-card-apple" id="cardKpiBekleyen" style="cursor: pointer;" title="Sadece bekleyen talepleri filtrele">
          <div class="kpi-val" id="kpiBekleyen" style="color: #0284C7;">-</div>
          <div class="kpi-label">Bekleyen Talep</div>
          <div class="kpi-sub">İnceleme ve Onay Bekliyor</div>
        </div>

        <!-- Kart 2: Çarşamba Teslimat (Sayı + Kırmızı/Yeşil Nokta + Toplu Teslim Et) -->
        <div class="kpi-card-apple" id="cardKpiTeslimat" style="cursor: pointer; position: relative;" title="Çarşamba teslimat bekleyenleri filtrele">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span id="deliveryPulseDot" class="pulse-dot-red"></span>
              <div class="kpi-val" id="deliveryCount" style="color: #0F172A;">0</div>
            </div>
            <span style="font-size: 11px; font-weight: 700; color: #B45309; background: rgba(245, 158, 11, 0.15); padding: 2px 8px; border-radius: 9999px;">
              Teslimat
            </span>
          </div>
          <div>
            <div class="kpi-label">Çarşamba Teslimat</div>
            <div class="kpi-sub" id="deliveryTargetDateText" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${getGelecekCarsambaText()}
            </div>
          </div>
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(226, 232, 240, 0.7); display: flex; justify-content: flex-end;">
            <button id="btnTopluTeslimEt" class="btn btn-primary btn-sm" style="font-size: 11px; padding: 4px 12px; border-radius: 9999px;">
              Toplu Teslim Et
            </button>
          </div>
        </div>

        <!-- Kart 3: Revize Onaylanan -->
        <div class="kpi-card-apple" id="cardKpiRevize" style="cursor: pointer;" title="Revize onaylanan talepleri filtrele">
          <div class="kpi-val" id="kpiRevize" style="color: #D97706;">-</div>
          <div class="kpi-label">Revize Onaylanan</div>
          <div class="kpi-sub">Miktar Düzeltmeli Onay</div>
        </div>

        <!-- Kart 4: Reddedilen -->
        <div class="kpi-card-apple" id="cardKpiReddedilen" style="cursor: pointer;" title="Reddedilen talepleri filtrele">
          <div class="kpi-val" id="kpiReddedilen" style="color: #DC2626;">-</div>
          <div class="kpi-label">Reddedilen</div>
          <div class="kpi-sub">İptal Edilen Talepler</div>
        </div>

        <!-- Kart 5: Teslim Edilenler (Yeşil - Kullanıcının Aradığı Arşiv) -->
        <div class="kpi-card-apple" id="cardKpiTeslimEdildi" style="cursor: pointer;" title="Teslim edilen tüm tamamlanmış talepleri filtrele">
          <div class="kpi-val" id="kpiTeslimEdildi" style="color: #059669;">-</div>
          <div class="kpi-label">Teslim Edilenler</div>
          <div class="kpi-sub">Tamamlanan Talepler</div>
        </div>
      </div>

      <!-- ===================================================================
           SEGMENTED TAB BAR (Hızlı Durum Sekmeleri & Canlı Rozetler - İkonsuz Temiz Metin)
           =================================================================== -->
      <div class="satinalma-tabs-bar" id="satinalmaTabsBar">
        <button type="button" class="satinalma-tab-btn ${initialDurum === 'beklemede' ? 'active' : ''}" data-durum="beklemede">
          <span>Bekleyen Talepler</span>
          <span class="tab-badge" id="badgeTabBekleyen">0</span>
        </button>
        <button type="button" class="satinalma-tab-btn ${initialDurum === 'teslimat' ? 'active' : ''}" data-durum="teslimat">
          <span>Teslim Bekleyenler</span>
          <span class="tab-badge" id="badgeTabTeslimat">0</span>
        </button>
        <button type="button" class="satinalma-tab-btn ${initialDurum === 'revize_onaylandi' ? 'active' : ''}" data-durum="revize_onaylandi">
          <span>Revize Edilenler</span>
          <span class="tab-badge" id="badgeTabRevize">0</span>
        </button>
        <button type="button" class="satinalma-tab-btn ${initialDurum === 'reddedildi' ? 'active' : ''}" data-durum="reddedildi">
          <span>Reddedilenler</span>
          <span class="tab-badge" id="badgeTabRed">0</span>
        </button>
        <button type="button" class="satinalma-tab-btn ${initialDurum === 'teslim_edildi' ? 'active' : ''}" data-durum="teslim_edildi">
          <span>Teslim Edilenler</span>
          <span class="tab-badge" id="badgeTabTeslimEdildi">0</span>
        </button>
        <button type="button" class="satinalma-tab-btn ${initialDurum === 'atil_malzeme' ? 'active' : ''}" data-durum="atil_malzeme">
          <span>İade Malzemeler</span>
          <span class="tab-badge" id="badgeTabAtil">0</span>
        </button>
        <button type="button" class="satinalma-tab-btn ${initialDurum === 'odunc_ekipman' ? 'active' : ''}" data-durum="odunc_ekipman">
          <span>Ödünç Ekipmanlar</span>
          <span class="tab-badge" id="badgeTabOdunc">0</span>
        </button>
        <button type="button" class="satinalma-tab-btn ${initialDurum === 'hepsi' ? 'active' : ''}" data-durum="hepsi">
          <span>Tüm Talepler</span>
          <span class="tab-badge" id="badgeTabHepsi">0</span>
        </button>
      </div>

      <!-- ===================================================================
           ARAMA VE DURUM SEÇİMİ (Arama solda, Durum Seçimi sağda)
           =================================================================== -->
      <div style="display: flex; gap: 12px; align-items: center; margin-bottom: 20px;">
        <div style="flex: 1; min-width: 220px; position: relative;">
          <input type="text" id="filtreKuyrukSearch" placeholder="Talep No, Birim veya İstek Sahibi ara (Örn: TLP-2026, Mühendislik, Ahmet)..." class="input-apple" style="width: 100%; padding: 10px 18px; border-radius: 9999px; font-size: 13.5px; background: rgba(255, 255, 255, 0.85); border: 1.2px solid rgba(255, 255, 255, 0.95); box-shadow: var(--glass-shadow); box-sizing: border-box; outline: none;">
        </div>

        <select id="filtreKuyrukDurum" class="select-apple" style="width: auto !important; min-width: 180px; max-width: 230px; padding: 10px 16px; border-radius: 9999px; font-size: 13px; font-weight: 600; color: #1e293b; background: rgba(255, 255, 255, 0.88); border: 1.2px solid rgba(255, 255, 255, 0.95); box-shadow: var(--glass-shadow); outline: none; cursor: pointer; flex-shrink: 0;">
          <option value="beklemede" ${initialDurum === 'beklemede' ? 'selected' : ''}>Sadece Bekleyenler</option>
          <option value="teslimat" ${initialDurum === 'teslimat' ? 'selected' : ''}>Çarşamba Teslimatı Bekleyenler</option>
          <option value="atil_malzeme" ${initialDurum === 'atil_malzeme' ? 'selected' : ''}>İade Malzemeler</option>
          <option value="odunc_ekipman" ${initialDurum === 'odunc_ekipman' ? 'selected' : ''}>Ödünç Ekipman Talepleri</option>
          <option value="hepsi" ${initialDurum === 'hepsi' ? 'selected' : ''}>Tüm Talepler</option>
          <option value="onaylandi" ${initialDurum === 'onaylandi' ? 'selected' : ''}>Onaylananlar</option>
          <option value="revize_onaylandi" ${initialDurum === 'revize_onaylandi' ? 'selected' : ''}>Revize Onaylananlar</option>
          <option value="teslim_edildi" ${initialDurum === 'teslim_edildi' ? 'selected' : ''}>Teslim Edilenler</option>
          <option value="reddedildi" ${initialDurum === 'reddedildi' ? 'selected' : ''}>Reddedilenler</option>
        </select>

        <button id="btnKuyrukYenile" class="btn btn-secondary btn-sm" style="padding: 10px 20px; border-radius: 9999px; flex-shrink: 0;">
          Yenile
        </button>
      </div>

      <!-- Tek Hiyerarşik Ağaç Alanı -->
      <div id="satinalmaContentArea" style="min-height: 240px;">
        <div style="text-align: center; padding: 48px 24px; color: var(--text-dim); font-size: 14px;">Talepler yükleniyor...</div>
      </div>
    </div>
  `;

  window.addEventListener('vekalet-changed', () => loadGelenTalepler(appContainer), { once: true });
  startSseListener(appContainer);

  const btnTopluTeslim = appContainer.querySelector('#btnTopluTeslimEt');
  const btnKuyrukYenile = appContainer.querySelector('#btnKuyrukYenile');
  const filtreDurum = appContainer.querySelector('#filtreKuyrukDurum');
  const searchInput = appContainer.querySelector('#filtreKuyrukSearch');

  const cardBekleyen = appContainer.querySelector('#cardKpiBekleyen');
  const cardTeslimat = appContainer.querySelector('#cardKpiTeslimat');
  const cardRevize = appContainer.querySelector('#cardKpiRevize');
  const cardReddedilen = appContainer.querySelector('#cardKpiReddedilen');
  const cardTeslimEdildi = appContainer.querySelector('#cardKpiTeslimEdildi');

  const loadData = () => loadGelenTalepler(appContainer);

  function syncTabButtons(durum) {
    appContainer.querySelectorAll('.satinalma-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.durum === durum);
    });

    // Sol menü ağaç dallarındaki aktifliği de güncelle
    const navContainer = document.getElementById('navbarContainer');
    if (navContainer) {
      navContainer.querySelectorAll('.sidebar-tree-item, .flyout-item').forEach(item => {
        if (item.dataset.durum) {
          item.classList.toggle('active', item.dataset.durum === durum);
        }
      });
    }
  }

  // Segmented Sekmeler Tıklama
  appContainer.querySelectorAll('.satinalma-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const durum = btn.dataset.durum;
      filtreDurum.value = durum;
      syncTabButtons(durum);
      loadData();
    });
  });

  // KPI kartlarına tıklandığında ilgili filtreyi seç ve listeyi güncelle
  cardBekleyen.addEventListener('click', () => {
    filtreDurum.value = 'beklemede';
    syncTabButtons('beklemede');
    loadData();
  });
  cardTeslimat.addEventListener('click', (e) => {
    if (e.target.closest('#btnTopluTeslimEt')) return;
    filtreDurum.value = 'teslimat';
    syncTabButtons('teslimat');
    loadData();
  });
  cardRevize.addEventListener('click', () => {
    filtreDurum.value = 'revize_onaylandi';
    syncTabButtons('revize_onaylandi');
    loadData();
  });
  cardReddedilen.addEventListener('click', () => {
    filtreDurum.value = 'reddedildi';
    syncTabButtons('reddedildi');
    loadData();
  });
  cardTeslimEdildi.addEventListener('click', () => {
    filtreDurum.value = 'teslim_edildi';
    syncTabButtons('teslim_edildi');
    loadData();
  });

  filtreDurum.addEventListener('change', () => {
    syncTabButtons(filtreDurum.value);
    loadData();
  });

  // Toplu Teslim Et (Görev 3)
  btnTopluTeslim.addEventListener('click', (e) => {
    e.stopPropagation();
    handleTopluTeslim(appContainer);
  });

  btnKuyrukYenile.addEventListener('click', loadData);
  filtreDurum.addEventListener('change', loadData);

  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadData, 300);
  });

  await loadData();
}

/**
 * SSE Canlı Dinleyici
 */
function startSseListener(appContainer) {
  if (sseEventSource) sseEventSource.close();

  try {
    sseEventSource = new EventSource('/api/bildirimler/stream');
    sseEventSource.addEventListener('bildirim', (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.tur === 'yeni_talep') {
          playAlertBeep();
          toast.info(`Yeni Talep Geldi: ${data.talepNo} (${data.birimAdi})`);
          loadGelenTalepler(appContainer);
        }
      } catch (err) {}
    });
  } catch (err) {}
}

/**
 * Gelen Talepleri Yükle ve Tek Ağaç Akışında Render Et
 */
async function loadGelenTalepler(appContainer) {
  const contentArea = appContainer.querySelector('#satinalmaContentArea');
  if (!contentArea) return;

  const filtreDurum = appContainer.querySelector('#filtreKuyrukDurum')?.value || 'beklemede';
  const search = (appContainer.querySelector('#filtreKuyrukSearch')?.value || '').trim().toLowerCase();

  try {
    const allRes = await api.getGelenTalepler({ limit: 500 });
    const hepsi = allRes.talepler || [];

    // KPI Sayaçları (5 Kart: Bekleyen, Çarşamba Teslimat, Revize, Reddedilen, Teslim Edilenler)
    let bekleyenSayisi = 0;
    let revizeSayisi = 0;
    let reddedilenSayisi = 0;
    let teslimatSayisi = 0;
    let teslimEdilenSayisi = 0;

    hepsi.forEach(t => {
      if (t.durum === 'beklemede') bekleyenSayisi++;
      else if (t.durum === 'revize_onaylandi') {
        revizeSayisi++;
        teslimatSayisi++;
      } else if (t.durum === 'onaylandi') {
        teslimatSayisi++;
      } else if (t.durum === 'reddedildi') {
        reddedilenSayisi++;
      } else if (t.durum === 'teslim_edildi') {
        teslimEdilenSayisi++;
      }
    });

    const kpiBekleyenEl = appContainer.querySelector('#kpiBekleyen');
    const kpiRevizeEl = appContainer.querySelector('#kpiRevize');
    const kpiReddedilenEl = appContainer.querySelector('#kpiReddedilen');
    const deliveryCountEl = appContainer.querySelector('#deliveryCount');
    const kpiTeslimEdildiEl = appContainer.querySelector('#kpiTeslimEdildi');
    const pulseDot = appContainer.querySelector('#deliveryPulseDot');
    const btnTopluTeslim = appContainer.querySelector('#btnTopluTeslimEt');

    if (kpiBekleyenEl) kpiBekleyenEl.textContent = bekleyenSayisi;
    if (kpiRevizeEl) kpiRevizeEl.textContent = revizeSayisi;
    if (kpiReddedilenEl) kpiReddedilenEl.textContent = reddedilenSayisi;
    if (deliveryCountEl) deliveryCountEl.textContent = teslimatSayisi;
    if (kpiTeslimEdildiEl) kpiTeslimEdildiEl.textContent = teslimEdilenSayisi;

    // Segmented Tab Rozetlerini Güncelle
    const bBekleyen = appContainer.querySelector('#badgeTabBekleyen');
    const bTeslimat = appContainer.querySelector('#badgeTabTeslimat');
    const bRevize = appContainer.querySelector('#badgeTabRevize');
    const bRed = appContainer.querySelector('#badgeTabRed');
    const bTeslimEdildi = appContainer.querySelector('#badgeTabTeslimEdildi');
    const bHepsi = appContainer.querySelector('#badgeTabHepsi');

    if (bBekleyen) bBekleyen.textContent = bekleyenSayisi;
    if (bTeslimat) bTeslimat.textContent = teslimatSayisi;
    if (bRevize) bRevize.textContent = revizeSayisi;
    if (bRed) bRed.textContent = reddedilenSayisi;
    if (bTeslimEdildi) bTeslimEdildi.textContent = teslimEdilenSayisi;
    if (bHepsi) bHepsi.textContent = hepsi.length;

    // Atıl Malzeme ve Ödünç Ekipman verilerini ve rozetlerini çek
    let atilList = [];
    let oduncList = [];
    try {
      const atilRes = await api.getTumAtilMalzemeler();
      atilList = atilRes.bildirimler || [];
    } catch (e) {
      try {
        const atilBekleyen = await api.getBekleyenAtilMalzemeler();
        atilList = atilBekleyen.bildirimler || [];
      } catch (err) {}
    }

    try {
      const oduncRes = await api.getTumEkipmanRezervasyonlari();
      oduncList = oduncRes.rezervasyonlar || [];
    } catch (e) {}

    const atilBekleyenSayisi = atilList.filter(x => x.durum === 'beklemede').length;
    const oduncAktifSayisi = oduncList.filter(x => x.durum === 'onaylandi' || x.durum === 'rezerve' || x.durum === 'teslim_edildi').length;

    const bAtil = appContainer.querySelector('#badgeTabAtil');
    const bOdunc = appContainer.querySelector('#badgeTabOdunc');
    if (bAtil) bAtil.textContent = atilBekleyenSayisi;
    if (bOdunc) bOdunc.textContent = oduncAktifSayisi;

    // Eğer Atıl Malzeme veya Ödünç Ekipman seçiliyse doğrudan ilgili listeyi render et
    if (filtreDurum === 'atil_malzeme') {
      renderAtilMalzemeKuyruk(contentArea, atilList, search, appContainer);
      return;
    }

    if (filtreDurum === 'odunc_ekipman') {
      renderOduncEkipmanKuyruk(contentArea, oduncList, search, appContainer);
      return;
    }

    if (teslimatSayisi > 0) {
      if (pulseDot) {
        pulseDot.className = 'pulse-dot-red';
        pulseDot.title = `${teslimatSayisi} adet onaylı talep Çarşamba teslimatı için hazır bekliyor.`;
      }
      if (btnTopluTeslim) {
        btnTopluTeslim.disabled = false;
        btnTopluTeslim.style.opacity = '1';
        btnTopluTeslim.style.pointerEvents = 'auto';
      }
    } else {
      if (pulseDot) {
        pulseDot.className = 'pulse-dot-green';
        pulseDot.title = 'Tüm teslimatlar tamamlandı.';
      }
      if (btnTopluTeslim) {
        btnTopluTeslim.disabled = true;
        btnTopluTeslim.style.opacity = '0.45';
        btnTopluTeslim.style.pointerEvents = 'none';
      }
    }

    // Durum ve Arama Filtresi
    const filtrelenmis = hepsi.filter(t => {
      // Durum Filtresi
      if (filtreDurum === 'beklemede' && t.durum !== 'beklemede') return false;
      if (filtreDurum === 'teslimat' && !(t.durum === 'onaylandi' || t.durum === 'revize_onaylandi')) return false;
      if (filtreDurum === 'onaylandi' && t.durum !== 'onaylandi') return false;
      if (filtreDurum === 'revize_onaylandi' && t.durum !== 'revize_onaylandi') return false;
      if (filtreDurum === 'teslim_edildi' && t.durum !== 'teslim_edildi') return false;
      if (filtreDurum === 'reddedildi' && t.durum !== 'reddedildi') return false;

      // Arama Metni Filtresi
      if (search) {
        const text = `${t.talep_no || ''} ${t.birim_adi || ''} ${t.personel_adi || ''}`.toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    });

    if (filtrelenmis.length === 0) {
      contentArea.innerHTML = `
        <div style="text-align: center; padding: 48px 24px; background: rgba(255, 255, 255, 0.7); border-radius: 24px; border: 1.5px dashed rgba(148, 163, 184, 0.35);">
          <h4 style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 4px;">Kayıtlı Talep Bulunamadı</h4>
          <p style="font-size: 13px; color: var(--text-dim); margin: 0;">Seçili filtrelere uygun gelen talep bulunmuyor.</p>
        </div>
      `;
    } else {
      renderTreeList(contentArea, filtrelenmis, appContainer);
    }

  } catch (err) {
    contentArea.innerHTML = `<div style="padding: 20px; color: #DC2626;">Veriler yüklenirken hata oluştu: ${err.message}</div>`;
  }
}

/**
 * Atıl Malzeme İadeleri Kuyruğu
 */
function renderAtilMalzemeKuyruk(contentArea, list, search, appContainer) {
  let filtered = list;
  if (search) {
    filtered = list.filter(item => {
      const text = `${item.birim_adi || ''} ${item.bina_adi || ''} ${item.oda_no || ''} ${item.detay_notu || ''} ${item.personel_adi || ''}`.toLowerCase();
      return text.includes(search);
    });
  }

  if (filtered.length === 0) {
    contentArea.innerHTML = `
      <div style="text-align: center; padding: 48px 24px; background: rgba(255, 255, 255, 0.7); border-radius: 24px; border: 1.5px dashed rgba(148, 163, 184, 0.35);">
        <h4 style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 4px;">Atıl Malzeme Bildirimi Bulunamadı</h4>
        <p style="font-size: 13px; color: var(--text-dim); margin: 0;">Henüz bekleyen veya teslim alınmış bir atıl malzeme bildirimi bulunmuyor.</p>
      </div>
    `;
    return;
  }

  contentArea.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      ${filtered.map(item => {
        const isBeklemede = item.durum === 'beklemede';
        const tarih = item.bildirim_tarihi || item.olusturma_tarihi || '';
        const initials = getInitials(item.birim_adi);
        return `
          <div class="apple-glass-card" style="padding: 18px 22px; border-radius: 16px; background: rgba(255, 255, 255, 0.95); border: 1.5px solid ${isBeklemede ? 'rgba(245, 158, 11, 0.35)' : 'rgba(16, 185, 129, 0.35)'}; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: flex-start; gap: 14px; flex: 1; min-width: 280px;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: #F1F5F9; color: #0369A1; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;">
                ${initials}
              </div>
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span style="font-weight: 800; font-size: 15.5px; color: #0F172A;">${escapeHtml(item.birim_adi || 'Birim')}</span>
                  <span style="font-size: 12px; color: #0369A1; background: #E0F2FE; padding: 2px 10px; border-radius: 9999px; font-weight: 700;">
                    ${escapeHtml(item.bina_adi || '')} • Oda ${escapeHtml(item.oda_no || '')}
                  </span>
                  <span style="font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 9999px; ${isBeklemede ? 'background: #FEF3C7; color: #B45309;' : 'background: #DCFCE7; color: #047857;'}">
                    ${isBeklemede ? 'İnceleme & Teslim Bekliyor' : 'Depoya Alındı (+20 Puan Verildi)'}
                  </span>
                </div>
                <div style="font-size: 13.5px; color: #1E293B; margin: 8px 0; background: #F8FAFC; padding: 10px 14px; border-radius: 10px; border-left: 3.5px solid #10B981; line-height: 1.5;">
                  <strong>Bildirilen Malzemeler:</strong> ${escapeHtml(item.detay_notu || '')}
                </div>
                <div style="font-size: 12px; color: #64748B;">
                  Bildiren: <strong>${escapeHtml(item.personel_adi || 'Birim Yetkilisi')}</strong> ${item.personel_telefon ? `(Dahili: ${escapeHtml(item.personel_telefon)})` : ''} • ${tarih ? new Date(tarih).toLocaleString('tr-TR') : ''}
                </div>
              </div>
            </div>

            <div>
              ${isBeklemede ? `
                <button type="button" class="btn btn-primary btn-sm btn-atil-teslim-al" data-id="${item.id}" style="background: #10B981; border: none; font-weight: 700; border-radius: 9999px; padding: 9px 18px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.28); cursor: pointer;">
                  Depoya Teslim Al (+20 P)
                </button>
              ` : `
                <span style="font-size: 13px; color: #059669; font-weight: 700;">
                  Kuruma Kazandırıldı
                </span>
              `}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  contentArea.querySelectorAll('.btn-atil-teslim-al').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id, 10);
      btn.disabled = true;
      btn.textContent = 'İşleniyor...';
      try {
        await api.teslimAlAtilMalzeme(id);
        toast.success('Malzeme depoya başarıyla alındı ve birime +20 Yeşil Puan kazandırıldı!');
        loadGelenTalepler(appContainer);
      } catch (err) {
        toast.error(err.message || 'İşlem başarısız');
        btn.disabled = false;
        btn.textContent = 'Depoya Teslim Al (+20 P)';
      }
    });
  });
}

/**
 * Ödünç Ekipman Talepleri Kuyruğu
 */
function renderOduncEkipmanKuyruk(contentArea, list, search, appContainer) {
  let filtered = list;
  if (search) {
    filtered = list.filter(item => {
      const text = `${item.ekipman_adi || ''} ${item.birim_adi || ''} ${item.personel_adi || ''} ${item.kullanim_amaci || ''}`.toLowerCase();
      return text.includes(search);
    });
  }

  if (filtered.length === 0) {
    contentArea.innerHTML = `
      <div style="text-align: center; padding: 48px 24px; background: rgba(255, 255, 255, 0.7); border-radius: 24px; border: 1.5px dashed rgba(148, 163, 184, 0.35);">
        <h4 style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 4px;">Ödünç Ekipman Talebi Bulunamadı</h4>
        <p style="font-size: 13px; color: var(--text-dim); margin: 0;">Henüz kayıtlı bir ekipman rezervasyon talebi bulunmuyor.</p>
      </div>
    `;
    return;
  }

  contentArea.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px;">
      ${filtered.map(item => {
        const isRezerve = item.durum === 'onaylandi' || item.durum === 'rezerve';
        const isKullanimda = item.durum === 'teslim_edildi';
        const isIadeEdildi = item.durum === 'iade_edildi';
        const initials = getInitials(item.birim_adi);

        let durumBg = '#EFF6FF';
        let durumColor = '#1D4ED8';
        let durumText = 'Rezervasyon Onaylı';

        if (isKullanimda) {
          durumBg = '#F3E8FF';
          durumColor = '#7E22CE';
          durumText = 'Birimde Kullanımda';
        } else if (isIadeEdildi) {
          durumBg = '#DCFCE7';
          durumColor = '#047857';
          durumText = 'Depoya İade Alındı (+5 P)';
        }

        return `
          <div class="apple-glass-card" style="padding: 18px 22px; border-radius: 16px; background: rgba(255, 255, 255, 0.95); border: 1.5px solid rgba(37, 99, 235, 0.3); display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; box-shadow: 0 4px 16px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: flex-start; gap: 14px; flex: 1; min-width: 280px;">
              <div style="width: 44px; height: 44px; border-radius: 12px; background: #F1F5F9; color: #4338CA; font-weight: 800; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;">
                ${initials}
              </div>
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                  <span style="font-weight: 800; font-size: 15.5px; color: #0F172A;">${escapeHtml(item.ekipman_adi || 'Ekipman')}</span>
                  <span style="font-size: 12px; color: #4338CA; background: #EEF2FF; padding: 2px 10px; border-radius: 9999px; font-weight: 700;">
                    ${escapeHtml(item.birim_adi || 'Birim')}
                  </span>
                  <span style="font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 9999px; background: ${durumBg}; color: ${durumColor};">
                    ${durumText}
                  </span>
                </div>
                <div style="font-size: 13.5px; color: #1E293B; margin: 8px 0; background: #F8FAFC; padding: 10px 14px; border-radius: 10px; border-left: 3.5px solid #2563EB; line-height: 1.5;">
                  <strong>Kullanım Amacı:</strong> ${escapeHtml(item.kullanim_amaci || '-')}
                </div>
                <div style="font-size: 12px; color: #64748B; display: flex; gap: 16px; flex-wrap: wrap;">
                  <span><strong>Tarihler:</strong> ${escapeHtml(item.baslangic_tarihi || '')} — ${escapeHtml(item.bitis_tarihi || '')}</span>
                  <span><strong>Tercih:</strong> ${item.teslim_alma_turu === 'teslimat' ? 'Birime Teslimat' : 'Depodan Elden Teslim'}</span>
                  ${item.personel_adi ? `<span><strong>İstek Sahibi:</strong> ${escapeHtml(item.personel_adi)}</span>` : ''}
                </div>
              </div>
            </div>

            <div style="display: flex; gap: 8px; align-items: center;">
              ${isRezerve ? `
                <button type="button" class="btn btn-primary btn-sm btn-ekipman-teslim-et" data-id="${item.id}" style="background: #2563EB; border: none; font-weight: 700; border-radius: 9999px; padding: 9px 18px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28); cursor: pointer;">
                  Birime Teslim Edildi
                </button>
              ` : ''}

              ${isKullanimda ? `
                <button type="button" class="btn btn-primary btn-sm btn-ekipman-iade-al" data-id="${item.id}" style="background: #10B981; border: none; font-weight: 700; border-radius: 9999px; padding: 9px 18px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.28); cursor: pointer;">
                  Depoya İade Alındı (+5 P)
                </button>
              ` : ''}

              ${isIadeEdildi ? `
                <span style="font-size: 13px; color: #059669; font-weight: 700;">
                  Tamamlandı
                </span>
              ` : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  contentArea.querySelectorAll('.btn-ekipman-teslim-et').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id, 10);
      btn.disabled = true;
      btn.textContent = 'İşleniyor...';
      try {
        await api.teslimEtEkipman(id);
        toast.success('Ekipman birime teslim edildi olarak güncellendi.');
        loadGelenTalepler(appContainer);
      } catch (err) {
        toast.error(err.message || 'İşlem başarısız');
        btn.disabled = false;
        btn.textContent = 'Birime Teslim Edildi';
      }
    });
  });

  contentArea.querySelectorAll('.btn-ekipman-iade-al').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.id, 10);
      btn.disabled = true;
      btn.textContent = 'İşleniyor...';
      try {
        await api.iadeAlEkipman(id);
        toast.success('Ekipman depoya teslim alındı ve birime +5 Yeşil Puan kazandırıldı!');
        loadGelenTalepler(appContainer);
      } catch (err) {
        toast.error(err.message || 'İşlem başarısız');
        btn.disabled = false;
        btn.textContent = 'Depoya İade Alındı (+5 P)';
      }
    });
  });
}

/**
 * Tek Dikey Hat ve Mavi Parlamalı Ağaç Hiyerarşi Listesi (Görsel-3 Bütünleşik)
 */
function renderTreeList(container, talepler, appContainer) {
  const birimGroups = new Map();
  talepler.forEach(t => {
    const birimAd = t.birim_adi || 'Bilinmeyen Birim';
    if (!birimGroups.has(birimAd)) {
      birimGroups.set(birimAd, []);
    }
    birimGroups.get(birimAd).push(t);
  });

  let html = `<div class="gorsel3-tree-view">`;
  let totalIndex = 0;

  for (const [birimAd, items] of birimGroups.entries()) {
    const birimInitials = getInitials(birimAd);
    const isFirstGroup = totalIndex === 0;

    // Kök Seviye: Birim Başlık Düğümü
    html += `
      <div class="tree-row root-node" style="background-color: #F8FAFC; border-top: ${isFirstGroup ? 'none' : '1px solid #E2E8F0'};">
        <div class="tree-row-left">
          <div class="tree-node-col">
            <div class="tree-avatar" style="background: #E0F2FE; color: #0369A1; font-weight: 700;">
              ${birimInitials}
            </div>
          </div>
          <div class="tree-content">
            <div class="tree-title" style="font-weight: 700; font-size: 14px; color: #0F172A;">
              ${birimAd}
            </div>
            <div class="tree-desc" style="font-size: 12px; color: var(--text-dim);">
              ${items.length} Talep Bildirimi
            </div>
          </div>
        </div>
        <div class="tree-meta">
          <span class="badge badge-neutral" style="font-size: 11px;">${items.length} İstek</span>
        </div>
      </div>
    `;
    totalIndex++;

    // Dal Seviyesi: İstek Sahibi ve Talepler (Level-1 Branch)
    items.forEach((t, itemIdx) => {
      const isLastInGroup = itemIdx === items.length - 1;
      const initials = getInitials(t.personel_adi);
      const isUnread = t.durum === 'beklemede';

      let durumBadge = '<span class="badge badge-neutral" style="font-size: 11px;">Beklemede</span>';
      if (t.durum === 'onaylandi') durumBadge = '<span class="badge badge-success" style="font-size: 11px;">Onaylandı</span>';
      else if (t.durum === 'revize_onaylandi') durumBadge = '<span class="badge badge-warning" style="font-size: 11px;">Revize Onay</span>';
      else if (t.durum === 'teslim_edildi') {
        if (t.kullanici_teslim_aldi === 1) {
          durumBadge = '<span class="badge badge-success" style="font-size: 11px; background: rgba(16, 185, 129, 0.15); color: #047857; border: 1px solid rgba(16, 185, 129, 0.4);">✓ Teslim Alındı (Kullanıcı Teyitli)</span>';
        } else {
          durumBadge = '<span class="badge badge-warning" style="font-size: 11px; background: rgba(245, 158, 11, 0.15); color: #b45309; border: 1px solid rgba(245, 158, 11, 0.4);">Teslim Edildi (Kullanıcı Teyidi Bekleniyor)</span>';
        }
      }
      else if (t.durum === 'reddedildi') durumBadge = '<span class="badge badge-danger" style="font-size: 11px;">Reddedildi</span>';

      html += `
        <div class="tree-row level-1 ${isUnread ? 'unread' : ''} ${isLastInGroup ? 'last-node' : ''}" data-talep-id="${t.id}">
          <div class="tree-row-left">
            <div class="tree-node-col">
              <div class="tree-avatar">
                ${initials}
              </div>
            </div>
            <div class="tree-content">
              <div class="tree-title" style="font-weight: 600; font-size: 13.5px; color: #1E293B;">
                ${t.personel_adi}
              </div>
              <div class="tree-desc" style="font-size: 12px; color: var(--text-dim);">
                <strong>${t.talep_no}</strong> • ${t.kalem_sayisi || 0} Kalem Malzeme ${t.notlar ? `(${t.notlar})` : ''}
                ${t.durum === 'teslim_edildi' ? `
                  <div style="font-size: 11.5px; color: #047857; margin-top: 3px; font-weight: 600;">
                    ✓ ${t.personel_adi} tarafından teslim alındı ${t.kullanici_teslim_tarihi ? `(${t.kullanici_teslim_tarihi.substring(0, 16)})` : ''}
                    ${t.kullanici_teslim_notu ? `<span style="font-style: italic; color: #475569; font-weight: 400; margin-left: 6px;">— "${t.kullanici_teslim_notu}"</span>` : ''}
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <div class="tree-meta">
            ${durumBadge}
            <span class="tree-time" style="font-size: 12px; color: var(--text-dim);">${(t.olusturma_tarihi || '').substring(0, 16)}</span>
            <div class="tree-actions" style="display: flex; gap: 8px;">
              ${t.durum === 'beklemede' ? `
                <button class="btn btn-primary btn-sm btn-talep-incele" data-id="${t.id}" style="font-size: 12px; padding: 5px 12px;">
                  İncele & Onayla
                </button>
              ` : `
                <button class="btn btn-secondary btn-sm btn-talep-incele" data-id="${t.id}" style="font-size: 12px; padding: 5px 10px;">
                  İncele
                </button>
              `}

              ${(t.durum === 'onaylandi' || t.durum === 'revize_onaylandi') ? `
                <button class="btn btn-secondary btn-sm btn-talep-teslim-et" data-id="${t.id}" style="font-size: 12px; padding: 5px 10px;" title="Malzemeleri Teslim Edildi Olarak İşaretle">
                  Teslim Edildi Yap
                </button>
              ` : ''}

              <button class="btn btn-secondary btn-sm btn-talep-yazdir" data-id="${t.id}" style="font-size: 12px; padding: 5px 10px;" title="Malzeme Teslim Fişi Yazdır">
                ${t.durum === 'teslim_edildi' ? 'Teslim Fişi' : 'Yazdır'}
              </button>
            </div>
          </div>
        </div>
      `;
      totalIndex++;
    });
  }

  html += `</div>`;
  container.innerHTML = html;

  // Satıra Tıklayınca Seçim & Mavi Parlama (Görev 1)
  container.querySelectorAll('.tree-row.level-1').forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.closest('button')) return; // Butona basılmışsa seçim yapma
      container.querySelectorAll('.tree-row.level-1').forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');
    });
  });

  // Buton Olayları
  container.querySelectorAll('.btn-talep-incele').forEach(btn => {
    btn.addEventListener('click', () => {
      openTalepIncelemeModal(parseInt(btn.dataset.id, 10), () => loadGelenTalepler(appContainer));
    });
  });

  container.querySelectorAll('.btn-talep-teslim-et').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api.post(`/api/satinalma/talepler/${btn.dataset.id}/teslim-et`);
        toast.success('Talep teslim edildi olarak güncellendi.');
        loadGelenTalepler(appContainer);
      } catch (err) {
        toast.error('Teslimat hatası: ' + err.message);
      }
    });
  });

  container.querySelectorAll('.btn-talep-yazdir').forEach(btn => {
    btn.addEventListener('click', () => {
      window.open(`/api/raporlar/teslim-fisi/${btn.dataset.id}?print=1`, '_blank');
    });
  });
}

/**
 * Toplu Teslim Etme İşlemi (Görev 3)
 */
async function handleTopluTeslim(appContainer) {
  try {
    const allRes = await api.getGelenTalepler({ limit: 500 });
    const hepsi = allRes.talepler || [];
    const teslimatBekleyenler = hepsi.filter(t => t.durum === 'onaylandi' || t.durum === 'revize_onaylandi');

    if (teslimatBekleyenler.length === 0) {
      toast.info('Teslim edilecek onaylı talep bulunmamaktadır.');
      return;
    }

    const modal = createModal({
      title: 'Toplu Teslimat Onayı',
      contentHtml: `
        <div style="padding: 6px 0;">
          <p style="font-size: 14.5px; color: #0F172A; line-height: 1.5; margin-bottom: 16px;">
            İlk Çarşamba günü dağıtımı planlanmış olan toplam <strong>${teslimatBekleyenler.length} adet onaylı talebi</strong> toplu olarak <strong>"Teslim Edildi"</strong> durumuna getirmek üzeresiniz.
          </p>

          <div style="background: rgba(248, 250, 252, 0.85); border: 1.2px solid rgba(226, 232, 240, 0.95); border-radius: 16px; padding: 12px 18px; margin-bottom: 16px; font-size: 12.5px; max-height: 170px; overflow-y: auto;">
            ${teslimatBekleyenler.map(t => `
              <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid rgba(226, 232, 240, 0.7);">
                <span style="font-weight: 600; color: #0F172A;">${t.talep_no} • ${t.birim_adi}</span>
                <span style="color: var(--text-dim);">${t.personel_adi} (${t.kalem_sayisi || 0} Kalem)</span>
              </div>
            `).join('')}
          </div>

          <p style="font-size: 12.5px; color: var(--text-dim); margin-bottom: 20px;">
            Bu işlem onaylandığında, malzemelerin birim sorumlularına eksiksiz teslim edildiği sisteme işlenecektir.
          </p>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="btnIptalToplu" class="btn btn-secondary">Vazgeç</button>
            <button id="btnOnaylaToplu" class="btn btn-primary">Evet, Tümünü Teslim Edildi Yap</button>
          </div>
        </div>
      `
    });

    modal.open();
    modal.element.querySelector('#btnIptalToplu').onclick = () => modal.close();
    modal.element.querySelector('#btnOnaylaToplu').onclick = async () => {
      try {
        const res = await api.post('/api/satinalma/talepler/toplu-teslim-et', {
          talep_idleri: teslimatBekleyenler.map(t => t.id)
        });
        toast.success(res.mesaj || 'Tüm onaylı talepler teslim edildi olarak güncellendi.');
        modal.close();
        loadGelenTalepler(appContainer);
      } catch (err) {
        toast.error('Toplu teslimat hatası: ' + err.message);
      }
    };
  } catch (err) {
    toast.error('Talep listesi alınamadı: ' + err.message);
  }
}

/**
 * Talep İnceleme ve Onay Modalı
 */
async function openTalepIncelemeModal(talepId, onClosed) {
  let data;
  try {
    data = await api.getTalepDetay(talepId);
  } catch (err) {
    toast.error('Talep detayları alınamadı: ' + err.message);
    return;
  }

  const talep = data.talep || data;
  const kalemler = data.kalemler || data.talep?.kalemler || [];
  const isPending = talep.durum === 'beklemede';

  let vekilInfo = null;
  try {
    const raw = localStorage.getItem('satinalma_vekil_info');
    if (raw) vekilInfo = JSON.parse(raw);
  } catch (e) {}

  const modal = createModal({
    title: isPending ? `Talep Değerlendirme • ${talep.talep_no}` : `Talep Süreç Takibi & İnceleme • ${talep.talep_no}`,
    maxWidth: isPending ? '840px' : '880px',
    contentHtml: !isPending ? `
      <div>
        ${renderProgressRailStepperHtml(talep)}
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(226, 232, 240, 0.8); padding-top: 16px; margin-top: 18px;">
          <div>
            ${talep.durum === 'onaylandi' || talep.durum === 'revize_onaylandi' || talep.durum === 'teslim_edildi' ? `
              <button class="btn btn-secondary btn-sm" id="btnModalYazdir" data-id="${talep.id}">
                Malzeme Teslim Fişi Yazdır
              </button>
            ` : ''}
          </div>
          <button class="btn btn-secondary" id="btnModalKapat">Kapat</button>
        </div>
      </div>
    ` : `
      <div>
        <!-- Süreç İlerleme Rayı Mini Önizleme (Görev 3) -->
        <div style="background: rgba(248, 250, 252, 0.8); border: 1.2px solid rgba(226, 232, 240, 0.9); border-radius: 16px; padding: 12px 18px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 22px; height: 22px; border-radius: 50%; background: #2563EB; color: #fff; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">✓</span>
            <span style="font-size: 12px; font-weight: 600; color: #0F172A;">1. Talep Ulaştı</span>
          </div>
          <span style="color: #94A3B8;">&rarr;</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 22px; height: 22px; border-radius: 50%; border: 2px solid #2563EB; background: #fff; box-shadow: 0 0 0 3px rgba(37,99,235,0.25); display: inline-flex; align-items: center; justify-content: center;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #2563EB;"></span>
            </span>
            <span style="font-size: 12px; font-weight: 700; color: #2563EB;">2. Onay / Revize (Şu anki Adım)</span>
          </div>
          <span style="color: #CBD5E1;">&rarr;</span>
          <div style="display: flex; align-items: center; gap: 8px; opacity: 0.55;">
            <span style="width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid #CBD5E1; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; color: #64748B;">3</span>
            <span style="font-size: 11.5px; color: #64748B;">3. Çarşamba Teslimat</span>
          </div>
          <span style="color: #CBD5E1;">&rarr;</span>
          <div style="display: flex; align-items: center; gap: 8px; opacity: 0.55;">
            <span style="width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid #CBD5E1; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; color: #64748B;">4</span>
            <span style="font-size: 11.5px; color: #64748B;">4. Teslimat</span>
          </div>
        </div>

        <div style="background-color: #F8FAFC; border: 1.2px solid rgba(226, 232, 240, 0.9); border-radius: 18px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div><strong>Talep Eden Birim:</strong> ${talep.birim_adi}</div>
            <div><strong>İstek Sahibi:</strong> ${talep.personel_adi} (${talep.personel_eposta})</div>
            <div><strong>Teslimat Adresi:</strong> <span style="color: #1E40AF; font-weight: 600;">${[talep.bina_adi, talep.oda_no ? 'Oda: ' + talep.oda_no : ''].filter(Boolean).join(' • ') || 'Belirtilmedi'}${talep.personel_telefon ? ` (Dahili: ${talep.personel_telefon})` : ''}</span></div>
            <div><strong>Kullanıcı Teyidi:</strong> ${talep.kullanici_teslim_aldi === 1 ? `<span style="color: #059669; font-weight: 700;">✓ Teslim Alındı (${(talep.kullanici_teslim_tarihi || '').substring(0, 16)})</span>` : (talep.durum === 'teslim_edildi' ? '<span style="color: #D97706; font-weight: 600;">Kullanıcı teyidi bekleniyor</span>' : '<span style="color: #64748B;">Henüz teslim edilmedi</span>')}</div>
            <div><strong>Oluşturma Tarihi:</strong> ${talep.olusturma_tarihi} • <span class="badge badge-neutral">${talep.durum}</span></div>
          </div>
          ${talep.notlar ? `<div style="margin-top: 10px; border-top: 1px solid rgba(226, 232, 240, 0.8); padding-top: 8px;"><strong>Birim Notu:</strong> ${talep.notlar}</div>` : ''}
          ${vekilInfo ? `<div style="margin-top: 8px; font-size: 12px; color: #B45309;"><strong>Onaycı:</strong> Satın Alma adına Vekil ${vekilInfo.adSoyad}</div>` : ''}
        </div>

        ${talep.demirbasUyarilari && talep.demirbasUyarilari.length > 0 ? `
          <div style="background: #fffbeb; border: 1.5px solid #f59e0b; border-radius: 14px; padding: 14px 18px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.1);">
            <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; color: #b45309; font-size: 13.5px; margin-bottom: 6px;">
              <span>Dayanıklı Malzeme (Demirbaş) ve İsraf Önleme Uyarısı</span>
              <span class="badge" style="background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; font-size: 11px;">Son 6 Ayda Teslim Edilmiş</span>
            </div>
            <div style="font-size: 12.5px; color: #78350f; line-height: 1.5;">
              Bu birime son 6 ay içerisinde aşağıdaki dayanıklı ofis gereçleri teslim edilmiştir. Mükerrer tüketimi ve israfı önlemek adına adetleri revize edebilir veya gerekçe isteyebilirsiniz:
            </div>
            <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px;">
              ${talep.demirbasUyarilari.map(u => `
                <div style="background: #ffffff; border: 1px solid #fde68a; border-radius: 8px; padding: 6px 12px; font-size: 12px; color: #92400e; display: flex; justify-content: space-between; align-items: center;">
                  <span><strong>${u.urunAdi}</strong> (${u.adet} adet - İstek Sahibi: ${u.istekSahibi || 'Birim'})</span>
                  <span style="font-weight: 600; color: #b45309;">${u.oncekiTalepNo} (${u.teslimTarihiText})</span>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${talep.tuketimAnomalileri && talep.tuketimAnomalileri.length > 0 ? `
          <div style="background: linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%); border: 1.5px solid #F59E0B; border-radius: 14px; padding: 14px 18px; margin-bottom: 20px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.12);">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; color: #B45309; font-size: 13.5px;">
                <span>Tüketim Anomalisi ve Sızıntı / Arıza Erken Uyarı Radarı</span>
                <span class="badge" style="background: #FDE68A; color: #92400E; font-size: 11px; font-weight: 700;">Son 6 Ay Sapması</span>
              </div>
            </div>
            <div style="font-size: 12.5px; color: #78350F; line-height: 1.5; margin-bottom: 10px;">
              Aşağıdaki ürünlerin talep miktarı, bu birimin son 6 aylık ortalama tüketim hızının belirgin şekilde üzerindedir. Bir arıza şüphesi veya proje durumu için doğrudan gerekçe isteyebilir veya akıllı dönüşüm uygulayabilirsiniz:
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${talep.tuketimAnomalileri.map(anomali => `
                <div style="background: #ffffff; border: 1.2px solid #FCD34D; border-radius: 10px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                  <div>
                    <div style="font-weight: 700; color: #92400E; font-size: 13px;">
                      ${anomali.urunAdi}: <strong>${anomali.istenenAdet} adet</strong> istendi (Geçmiş Ortalama: ${anomali.ortalamaAylik} adet • <span style="color: #DC2626; font-weight: 800;">${anomali.katSapma}x Sapma</span>)
                    </div>
                    <div style="font-size: 12px; color: #B45309; margin-top: 2px;">
                      <em>Öneri: ${anomali.oneriMetni}</em>
                    </div>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <button type="button" class="btn btn-sm btn-secondary btn-anomali-gerekce" data-text="${anomali.oneriAksiyonu}" style="font-size: 11.5px; padding: 4px 10px; border-color: #FCD34D; color: #92400E; cursor: pointer;">
                      Gerekçe Sor
                    </button>
                    <button type="button" class="btn btn-sm btn-primary btn-anomali-oneri" data-text="${anomali.oneriAksiyonu}" style="font-size: 11.5px; padding: 4px 10px; background: #D97706; border-color: #B45309; cursor: pointer;">
                      Öneriyi Ekle
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <h4 style="font-size: 15px; margin-bottom: 12px; font-weight: 700; color: #0F172A;">Talep Edilen Malzemeler & Depo Stok Durumu</h4>
        
        <div style="margin-bottom: 24px;">
          <div class="talep-detay-kalem-row talep-detay-kalem-header">
            <div>Ürün Adı</div>
            <div>İstenen</div>
            <div>Depo Stoğu</div>
            <div>Karşılanma</div>
            <div style="text-align: center;">Onaylanan Adet</div>
          </div>

          <div id="modalKalemlerBody">
            ${kalemler.map(k => {
              const karsilanabilir = k.mevcut_stok >= k.istenen_adet;
              const kismiKarsilanabilir = k.mevcut_stok > 0 && k.mevcut_stok < k.istenen_adet;
              
              let durumHtml = '<span style="color: #059669; font-weight: 600;">Stok Yeterli</span>';
              if (k.mevcut_stok === 0) {
                durumHtml = '<span style="color: #DC2626; font-weight: 600;">Stok Yok</span>';
              } else if (kismiKarsilanabilir) {
                durumHtml = '<span style="color: #D97706; font-weight: 600;">Kısmi Stok</span>';
              }

              const onayDegeri = k.onaylanan_adet !== null ? k.onaylanan_adet : Math.min(k.istenen_adet, k.mevcut_stok);

              return `
                <div class="talep-detay-kalem-row" data-kalem-id="${k.id}">
                  <div>
                    <strong>${k.urun_adi}</strong>
                    ${k.demirbas ? `<span class="badge" style="background: #ede9fe; color: #6d28d9; border: 1px solid #ddd6fe; font-size: 10px; padding: 1px 6px; margin-left: 4px;">Dayanıklı</span>` : ''}
                    <div style="font-size: 11px; color: var(--text-dim);">${k.olcu_birimi}</div>
                  </div>
                  <div><strong>${k.istenen_adet}</strong></div>
                  <div>
                    <span style="font-weight: 600; color: ${k.mevcut_stok === 0 ? '#DC2626' : '#0F172A'};">
                      ${k.mevcut_stok}
                    </span>
                  </div>
                  <div>${durumHtml}</div>
                  <div style="text-align: center;">
                    <input type="number" 
                           class="revize-input" 
                           id="onayAdet_${k.id}" 
                           data-istenen="${k.istenen_adet}" 
                           data-stok="${k.mevcut_stok}" 
                           min="0" 
                           max="${k.istenen_adet}" 
                           value="${onayDegeri}">
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px; color: #0F172A;">
            Karar Açıklaması / Gerekçe (İsteğe bağlı, red durumunda zorunlu):
          </label>
          <textarea id="kararGerekcesi" rows="2" style="width: 100%; border-radius: 12px; padding: 10px 14px;" placeholder="Talep sahibine iletilecek notu yazabilirsiniz..."></textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid rgba(226, 232, 240, 0.8); padding-top: 16px;">
          <button id="btnKararReddet" class="btn btn-secondary" style="background: linear-gradient(180deg, #F87171 0%, #EF4444 100%); color: #fff;">Talebi Reddet</button>
          <button id="btnKararRevize" class="btn btn-secondary" style="background: linear-gradient(180deg, #F59E0B 0%, #D97706 100%); color: #fff;">Revize Onayla</button>
          <button id="btnKararOnayla" class="btn btn-primary">Birebir Onayla</button>
        </div>
      </div>
    `
  });

  modal.open();

  if (!isPending) {
    const btnKapat = modal.element.querySelector('#btnModalKapat');
    if (btnKapat) btnKapat.addEventListener('click', () => modal.close());

    const btnYazdir = modal.element.querySelector('#btnModalYazdir');
    if (btnYazdir) {
      btnYazdir.addEventListener('click', () => {
        window.open(`/api/raporlar/teslim-fisi/${talep.id}?print=1`, '_blank');
      });
    }
    return;
  }

  const collectKalemler = () => {
    const kalemListesi = [];
    modal.element.querySelectorAll('.talep-detay-kalem-row[data-kalem-id]').forEach(row => {
      const kalemId = parseInt(row.dataset.kalemId, 10);
      const input = row.querySelector(`#onayAdet_${kalemId}`);
      if (input) {
        kalemListesi.push({
          kalem_id: kalemId,
          onaylanan_adet: parseInt(input.value, 10) || 0
        });
      }
    });
    return kalemListesi;
  };

  // Anomali Hızlı Aksiyon Butonları
  modal.element.querySelectorAll('.btn-anomali-gerekce, .btn-anomali-oneri').forEach(btn => {
    btn.addEventListener('click', () => {
      const txt = btn.dataset.text;
      const gerekceEl = modal.element.querySelector('#kararGerekcesi');
      if (gerekceEl && txt) {
        gerekceEl.value = txt;
        gerekceEl.focus();
        toast.info('Öneri metni karar gerekçesine aktarıldı.');
      }
    });
  });

  // 1) Birebir Onay
  modal.element.querySelector('#btnKararOnayla').addEventListener('click', async () => {
    let gerekce = modal.element.querySelector('#kararGerekcesi').value.trim();
    if (vekilInfo && vekilInfo.adSoyad) {
      gerekce = (gerekce ? gerekce + ' ' : '') + `(Vekil Onayı: ${vekilInfo.adSoyad})`;
    }
    const kalemKararlari = kalemler.map(k => ({ kalem_id: k.id, onaylanan_adet: k.istenen_adet }));

    try {
      await api.talepSonuclandir(talep.id, {
        karar: 'onayla',
        gerekce: gerekce || null,
        kalem_kararlari: kalemKararlari,
        vekil_personel_id: vekilInfo?.id || null,
        vekil_adi: vekilInfo?.adSoyad || null
      });
      toast.success('Talep onaylandı ve stoktan düşüldü.');
      modal.close();
      onClosed();
    } catch (err) {
      toast.error('İşlem başarısız: ' + err.message);
    }
  });

  // 2) Revize Onay
  modal.element.querySelector('#btnKararRevize').addEventListener('click', async () => {
    let gerekce = modal.element.querySelector('#kararGerekcesi').value.trim();
    if (!gerekce) {
      toast.error('Revize onayı için açıklama/gerekçe belirtilmesi zorunludur.');
      return;
    }
    if (vekilInfo && vekilInfo.adSoyad) {
      gerekce = gerekce + ` (Vekil Onayı: ${vekilInfo.adSoyad})`;
    }
    const kalemlerListesi = collectKalemler();

    try {
      await api.talepSonuclandir(talep.id, {
        karar: 'revize_onayla',
        gerekce: gerekce || null,
        kalem_kararlari: kalemlerListesi,
        vekil_personel_id: vekilInfo?.id || null,
        vekil_adi: vekilInfo?.adSoyad || null
      });
      toast.success('Talep revize edilerek onaylandı.');
      modal.close();
      onClosed();
    } catch (err) {
      toast.error('İşlem başarısız: ' + err.message);
    }
  });

  // 3) Reddet
  modal.element.querySelector('#btnKararReddet').addEventListener('click', async () => {
    let gerekce = modal.element.querySelector('#kararGerekcesi').value.trim();
    if (!gerekce) {
      toast.error('Talebi reddetmek için lütfen karar gerekçesi alanını doldurunuz.');
      return;
    }
    if (vekilInfo && vekilInfo.adSoyad) {
      gerekce = gerekce + ` (Vekil Kararı: ${vekilInfo.adSoyad})`;
    }

    try {
      await api.talepSonuclandir(talep.id, {
        karar: 'reddet',
        gerekce: gerekce,
        kalem_kararlari: [],
        vekil_personel_id: vekilInfo?.id || null,
        vekil_adi: vekilInfo?.adSoyad || null
      });
      toast.success('Talep reddedildi.');
      modal.close();
      onClosed();
    } catch (err) {
      toast.error('İşlem başarısız: ' + err.message);
    }
  });
}

export default renderSatinalma;
