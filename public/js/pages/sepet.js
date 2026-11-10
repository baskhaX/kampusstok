// sepet.js - Tam Sayfa Sepet Görünümü
import api from '../api.js';
import state from '../state.js';
import toast from '../components/toast.js';
import { createModal, confirmModal } from '../components/modal.js';
import { escapeHtml } from '../utils/text.js';
import { t, tProduct, tUnit, tDepartment } from '../utils/i18n.js';

export async function renderSepet(appContainer) {
  appContainer.innerHTML = `
    <div class="container main-content">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: 24px; font-weight: 700; color: #0F172A; margin: 0;">${t('cart.title', 'Malzeme Talep Sepeti')}</h2>
          <p style="color: var(--color-muted-foreground); font-size: 13px; margin-top: 4px;">
            ${t('cart.subtitle', 'Talep listenizi gözden geçirin, adetleri düzenleyin ve onaylayarak Satın Alma Müdürlüğü\'ne iletin.')}
          </p>
        </div>
        <div>
          <button id="btnSepetTemizle" class="btn btn-outline btn-sm" style="color: var(--color-destructive); height: 38px; border-radius: 9999px;">
            ${t('cart.clearCart', 'Sepeti Temizle')}
          </button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 340px; gap: 24px;" id="sepetContainer">
        <!-- Sol: Kalemler Listesi -->
        <div class="card" style="padding: 24px;">
          <div id="sepetKalemlerList">
            <p style="text-align: center; color: var(--color-muted-foreground); padding: 40px;">${t('common.loading', 'Sepet yükleniyor...')}</p>
          </div>
        </div>

        <!-- Sağ: Talep Özeti ve Not -->
        <aside>
          <div class="card" style="padding: 24px; position: sticky; top: 80px;">
            <h3 style="font-size: 17px; margin-bottom: 16px; border-bottom: 1px solid var(--color-border); padding-bottom: 10px;">
              ${t('cart.summary', 'Talep Özeti')}
            </h3>

            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
              <span>${t('cart.requester', 'İstek Sahibi:')}</span>
              <strong>${state.user?.seciliPersonel?.adSoyad || 'Bilinmiyor'}</strong>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
              <span>${t('cart.department', 'Birim:')}</span>
              <strong>${state.user?.birimAdi || 'Birim'}</strong>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px;">
              <span>${t('cart.totalVariety', 'Toplam Çeşit:')}</span>
              <strong id="ozetToplamKalem">0</strong>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 14px;">
              <span>${t('cart.totalQty', 'Toplam Adet:')}</span>
              <strong id="ozetToplamAdet">0</strong>
            </div>

            <div style="margin-bottom: 16px;">
              <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 6px; color: var(--color-muted-foreground);">
                ${t('cart.memoLabel', 'Talep Notu / Açıklama (İsteğe Bağlı):')}
              </label>
              <textarea id="sepetNotu" rows="3" placeholder="${t('cart.memoPlaceholder', 'Gereksinim detayları veya aciliyet bilgisi...')}"></textarea>
            </div>

            <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: var(--radius-md); padding: 12px; margin-bottom: 20px; font-size: 12px; color: #065F46;">
              <strong>${t('cart.deliveryRule', 'Teslimat Kuralı: Talebiniz onaylandıktan sonra depodan dağıtımlar Çarşamba günleri yapılır.')}</strong>
            </div>

            <button id="btnTalebiGonder" class="btn btn-accent" style="width: 100%; padding: 14px; font-size: 15px;">
              ${t('cart.submit', 'Talebi Onayla ve Gönder')}
            </button>
          </div>
        </aside>
      </div>
    </div>
  `;

  await loadFullSepet(appContainer);
}

function openOptOzetModal(degisiklikler) {
  if (!degisiklikler || degisiklikler.length === 0) return;
  const modal = createModal({
    title: 'Miktar Optimizasyon Özeti',
    maxWidth: '580px',
    content: `
      <div style="font-size: 13.5px; color: #475569; margin-bottom: 14px; line-height: 1.5;">
        Haftalık rutin sarf ihtiyacı ve kurum kaynaklarını verimli kullanma prensipleri doğrultusunda sepetinizdeki <strong>${degisiklikler.length} kalemin</strong> miktarı optimize edildi:
      </div>

      <div style="max-height: 280px; overflow-y: auto; border: 1.2px solid #E2E8F0; border-radius: 10px; margin-bottom: 14px;">
        <table class="table-clean" style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; text-align: left;">
              <th style="padding: 8px 12px;">${getLanguage() === 'en' ? 'Item' : 'Ürün'}</th>
              <th style="padding: 8px 12px; text-align: center; width: 85px;">${getLanguage() === 'en' ? 'Previous' : 'Önceki'}</th>
              <th style="padding: 8px 12px; text-align: center; width: 85px;">${getLanguage() === 'en' ? 'New' : 'Yeni'}</th>
              <th style="padding: 8px 12px; text-align: right; width: 80px;">${getLanguage() === 'en' ? 'Savings' : 'Tasarruf'}</th>
            </tr>
          </thead>
          <tbody>
            ${degisiklikler.map(d => `
              <tr style="border-bottom: 1px solid #F1F5F9;">
                <td style="padding: 8px 12px; font-weight: 600; color: #0F172A;">${escapeHtml(tProduct(d.urunAdi))}</td>
                <td style="padding: 8px 12px; text-align: center; color: #64748B; text-decoration: line-through;">${d.eskiAdet} ${escapeHtml(tUnit(d.olcuBirimi))}</td>
                <td style="padding: 8px 12px; text-align: center; font-weight: 700; color: #059669;">${d.yeniAdet} ${escapeHtml(tUnit(d.olcuBirimi))}</td>
                <td style="padding: 8px 12px; text-align: right; font-weight: 700; color: #2563EB;">-${d.fark}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 10px; padding: 10px 14px; font-size: 12.5px; color: #065F46; line-height: 1.4;">
        ${getLanguage() === 'en' 
          ? 'Your department will be awarded <strong>+10 Green Campus Points</strong> when your request is submitted. You can adjust item quantities using the plus/minus buttons in the cart anytime.' 
          : 'Talebinizi ilettiğinizde biriminize <strong>+10 Yeşil Kampüs Puanı</strong> tanımlanacaktır. İhtiyaç halinde ürün adetlerini sepet tablosundaki artı/eksi butonlarından dilediğiniz zaman tekrar düzenleyebilirsiniz.'}
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 16px;">
        <button type="button" class="btn btn-primary btn-sm" id="btnOptOzetKapat" style="border-radius: 8px; padding: 6px 18px;">
          ${getLanguage() === 'en' ? 'Got it' : 'Anladım'}
        </button>
      </div>
    `
  });

  const btnKapat = modal.element.querySelector('#btnOptOzetKapat');
  if (btnKapat) btnKapat.addEventListener('click', () => modal.close());
}

async function loadFullSepet(appContainer) {
  const listContainer = appContainer.querySelector('#sepetKalemlerList');
  const ozetKalem = appContainer.querySelector('#ozetToplamKalem');
  const ozetAdet = appContainer.querySelector('#ozetToplamAdet');
  const btnGonder = appContainer.querySelector('#btnTalebiGonder');
  const btnTemizle = appContainer.querySelector('#btnSepetTemizle');

  try {
    const res = await api.getSepet();
    const { kalemler, toplamKalem, toplamAdet } = res.sepet;

    state.setCartCount(toplamKalem);
    ozetKalem.textContent = `${toplamKalem} kalem`;
    ozetAdet.textContent = `${toplamAdet} birim`;

    if (kalemler.length === 0) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <h3 class="empty-state-title">${t('cart.emptyTitle', 'Sepetiniz Boş')}</h3>
          <p class="empty-state-desc">${t('cart.emptyDesc', 'Katalogdan ihtiyacınız olan kırtasiye ürünlerini seçebilirsiniz.')}</p>
          <a href="#/katalog" class="btn btn-accent">${t('cart.browseCatalog', 'Kataloğa Git')}</a>
        </div>
      `;
      btnGonder.disabled = true;
      btnTemizle.disabled = true;
      return;
    }

    btnGonder.disabled = false;
    btnTemizle.disabled = false;

    const yuksekMiktarVar = kalemler.some(k => k.adet >= 5) || toplamAdet >= 10 || Boolean(window._nudgeApplied);
    const optimizeEdilebilirKalemler = kalemler.filter(k => k.adet > 1);
    const isNudgeApplied = Boolean(window._nudgeApplied);
    const degisenKalemler = window._nudgeDegisiklikler || [];

    let nudgeCardHtml = '';
    if (yuksekMiktarVar) {
      let actionSectionHtml = '';

      if (isNudgeApplied) {
        actionSectionHtml = `
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <span style="font-size: 12.5px; color: #059669; font-weight: 700; background: #ecfdf5; padding: 6px 12px; border-radius: 8px; border: 1px solid #a7f3d0; display: inline-flex; align-items: center; gap: 6px;">
              Tasarruf Önerisi Uygulandı (+10 Puan Eklenecek)
            </span>
            ${degisenKalemler.length > 0 ? `
              <button type="button" id="btnNudgeOzetGor" class="btn btn-outline btn-sm" style="font-size: 12px; padding: 5px 12px; border-radius: 8px;">
                Optimizasyon Detayı (${degisenKalemler.length} Kalem)
              </button>
              <button type="button" id="btnNudgeGeriAl" class="btn btn-outline btn-sm" style="font-size: 12px; padding: 5px 12px; border-radius: 8px; color: #dc2626; border-color: #fecaca;">
                Değişiklikleri Geri Al
              </button>
            ` : ''}
          </div>
        `;
      } else if (optimizeEdilebilirKalemler.length > 0) {
        actionSectionHtml = `
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button type="button" id="btnNudgeOptimize" class="btn btn-sm" style="background: #10b981; color: #fff; font-size: 12.5px; font-weight: 600; border-radius: 8px; border: none; padding: 7px 16px; cursor: pointer; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);">
              Miktarları Optimize Et (-%30) & +10 Puan Kazan
            </button>
            <span style="font-size: 12px; color: #047857;">
              Sepetinizdeki <strong>${optimizeEdilebilirKalemler.length} kalemin</strong> miktarı haftalık ihtiyaca göre dengelenecektir.
            </span>
          </div>
        `;
      } else {
        actionSectionHtml = `
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button type="button" id="btnNudgeTaahhut" class="btn btn-sm" style="background: #10b981; color: #fff; font-size: 12.5px; font-weight: 600; border-radius: 8px; border: none; padding: 7px 16px; cursor: pointer;">
              Tasarruf Taahhüdünü Onayla (+10 Puan Kazan)
            </button>
            <span style="font-size: 12px; color: #047857;">
              Tüm malzemeleriniz zaten minimum miktardadır (1 adet).
            </span>
          </div>
        `;
      }

      nudgeCardHtml = `
        <div id="sepetNudgeCard" style="margin-top: 20px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.04)); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: 12px; padding: 16px; display: flex; gap: 14px; align-items: flex-start;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(16, 185, 129, 0.15); color: #059669; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
              <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
            </svg>
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 700; color: #065f46; font-size: 14px; margin-bottom: 4px;">
              Yeşil Kampüs Tasarruf Önerisi (Davranışsal İktisat & Nudge)
            </div>
            <div style="font-size: 13px; color: #047857; line-height: 1.5; margin-bottom: 12px;">
              Biriminizin bu ayki kişi başı sarf malzeme talebi, benzer büyüklükteki birimlerin ortalamasının %30 üzerinde seyrediyor. Miktarları haftalık rutin ihtiyaca göre optimize ederek biriminizi <strong>"Ayın En Yeşil Birimi"</strong> sıralamasında zirveye taşıyabilir ve <strong>+10 Yeşil Puan</strong> kazanabilirsiniz.
            </div>
            ${actionSectionHtml}
          </div>
        </div>
      `;
    }

    listContainer.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 80px;">Görsel</th>
            <th>Ürün ve Marka</th>
            <th style="width: 110px;">Durum</th>
            <th style="width: 140px; text-align: center;">Miktar</th>
            <th style="width: 60px;"></th>
          </tr>
        </thead>
        <tbody>
          ${kalemler.map(k => {
            const optInfo = degisenKalemler.find(d => d.urunId === k.urunId);
            return `
              <tr>
                <td>
                  <img src="${k.gorselYolu || '/assets/placeholder.svg'}" onerror="this.onerror=null;this.src='/assets/placeholder.svg';" style="width: 50px; height: 50px; object-fit: contain; border-radius: var(--radius-md); border: 1px solid var(--color-border); padding: 4px;">
                </td>
                <td>
                  <div style="font-weight: 600; font-size: 14px;">${escapeHtml(tProduct(k.urunAdi))}</div>
                  <div style="color: var(--color-muted-foreground); font-size: 12px;">${escapeHtml(k.urunMarka || '')} &bull; ${escapeHtml(tUnit(k.olcuBirimi))}</div>
                  ${optInfo ? `
                    <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; background: rgba(16, 185, 129, 0.12); color: #047857; padding: 2px 7px; border-radius: 4px; font-weight: 600; margin-top: 4px;">
                      ${t('cart.optimized', 'Optimize Edildi')}: ${optInfo.eskiAdet} ➔ ${optInfo.yeniAdet} ${escapeHtml(tUnit(optInfo.olcuBirimi))}
                    </div>
                  ` : ''}
                </td>
                <td>
                  <span class="badge badge-${k.stokDurumu === 'stokta' ? 'success' : (k.stokDurumu === 'sinirli' ? 'warning' : 'danger')}">
                    ${k.stokDurumu === 'stokta' ? t('catalog.inStock', 'Stokta') : (k.stokDurumu === 'sinirli' ? t('catalog.limited', 'Sınırlı') : t('catalog.outOfStock', 'Tükendi'))}
                  </span>
                </td>
                <td style="text-align: center;">
                  <div class="qty-picker">
                    <button class="qty-btn btn-table-dec" data-id="${k.urunId}" data-qty="${k.adet}">-</button>
                    <input type="text" class="qty-input" value="${k.adet}" readonly>
                    <button class="qty-btn btn-table-inc" data-id="${k.urunId}" data-qty="${k.adet}">+</button>
                  </div>
                </td>
                <td style="text-align: right;">
                  <button class="btn btn-outline btn-sm btn-table-del" data-id="${k.urunId}" style="color: var(--color-destructive); font-size: 11px; padding: 4px 8px;">
                    Sil
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      ${nudgeCardHtml}
    `;

    // Nudge Buton Dinleyicileri
    const btnNudge = listContainer.querySelector('#btnNudgeOptimize');
    if (btnNudge) {
      btnNudge.addEventListener('click', async () => {
        btnNudge.disabled = true;
        btnNudge.textContent = 'Optimize Ediliyor...';

        const degisenler = [];
        for (const k of kalemler) {
          if (k.adet > 1) {
            const yeniAdet = Math.max(1, Math.round(k.adet * 0.7));
            if (yeniAdet < k.adet) {
              degisenler.push({
                urunId: k.urunId,
                urunAdi: k.urunAdi,
                eskiAdet: k.adet,
                yeniAdet: yeniAdet,
                fark: k.adet - yeniAdet,
                olcuBirimi: k.olcuBirimi
              });
            }
          }
        }

        if (degisenler.length === 0) {
          window._nudgeApplied = true;
          window._nudgeDegisiklikler = [];
          toast.info('Tüm ürünleriniz zaten 1 adettir; tasarruf taahhüdünüz kaydedildi (+10 Yeşil Puan).');
          await loadFullSepet(appContainer);
          return;
        }

        try {
          for (const d of degisenler) {
            await api.sepetGuncelle(d.urunId, d.yeniAdet);
          }
          window._nudgeApplied = true;
          window._nudgeDegisiklikler = degisenler;
          toast.success(`${degisenler.length} kalemin miktarı optimize edildi (+10 Yeşil Puan eklenecektir).`);
          await loadFullSepet(appContainer);
          openOptOzetModal(degisenler);
        } catch (err) {
          toast.error('Optimizasyon sırasında hata: ' + err.message);
          btnNudge.disabled = false;
          btnNudge.textContent = 'Miktarları Optimize Et (-%30) & +10 Puan Kazan';
        }
      });
    }

    const btnTaahhut = listContainer.querySelector('#btnNudgeTaahhut');
    if (btnTaahhut) {
      btnTaahhut.addEventListener('click', async () => {
        btnTaahhut.disabled = true;
        btnTaahhut.textContent = 'Kaydediliyor...';
        window._nudgeApplied = true;
        window._nudgeDegisiklikler = [];
        toast.success('Tasarruf taahhüdünüz onaylandı! Talebiniz iletildiğinde biriminize +10 Yeşil Puan eklenecektir.');
        await loadFullSepet(appContainer);
      });
    }

    const btnGeriAl = listContainer.querySelector('#btnNudgeGeriAl');
    if (btnGeriAl) {
      btnGeriAl.addEventListener('click', async () => {
        btnGeriAl.disabled = true;
        btnGeriAl.textContent = 'Geri Alınıyor...';
        try {
          if (window._nudgeDegisiklikler && window._nudgeDegisiklikler.length > 0) {
            for (const d of window._nudgeDegisiklikler) {
              await api.sepetGuncelle(d.urunId, d.eskiAdet);
            }
          }
          window._nudgeApplied = false;
          window._nudgeDegisiklikler = null;
          toast.info('Optimizasyon geri alındı, eski miktarlar yüklendi.');
          await loadFullSepet(appContainer);
        } catch (err) {
          toast.error('Geri alma hatası: ' + err.message);
        }
      });
    }

    const btnOzetGor = listContainer.querySelector('#btnNudgeOzetGor');
    if (btnOzetGor) {
      btnOzetGor.addEventListener('click', () => {
        openOptOzetModal(window._nudgeDegisiklikler || []);
      });
    }

    // Dinleyiciler
    listContainer.querySelectorAll('.btn-table-inc').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id, 10);
        const qty = parseInt(btn.dataset.qty, 10) + 1;
        await api.sepetGuncelle(id, qty);
        await loadFullSepet(appContainer);
      });
    });

    listContainer.querySelectorAll('.btn-table-dec').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id, 10);
        const qty = parseInt(btn.dataset.qty, 10) - 1;
        await api.sepetGuncelle(id, qty);
        await loadFullSepet(appContainer);
      });
    });

    listContainer.querySelectorAll('.btn-table-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id, 10);
        await api.sepettenSil(id);
        toast.info('Ürün kaldırıldı.');
        await loadFullSepet(appContainer);
      });
    });

    btnTemizle.addEventListener('click', async () => {
      const onay = await confirmModal({
        title: 'Sepeti Temizle',
        message: 'Sepetteki tüm ürünleri sepetten çıkarmak istediğinize emin misiniz?',
        confirmText: 'Sepeti Boşalt',
        cancelText: 'Vazgeç',
        type: 'danger'
      });
      if (!onay) return;

      await api.sepetiTemizle();
      window._nudgeApplied = false;
      window._nudgeDegisiklikler = null;
      toast.info('Sepet temizlendi.');
      await loadFullSepet(appContainer);
    });

    btnGonder.addEventListener('click', async () => {
      const notlar = appContainer.querySelector('#sepetNotu').value;
      try {
        btnGonder.disabled = true;
        btnGonder.textContent = 'İletiliyor...';
        const resTalep = await api.talepOlustur({
          notlar,
          nudgeUygulandi: Boolean(window._nudgeApplied)
        });
        window._nudgeApplied = false;
        window._nudgeDegisiklikler = null;
        toast.success(`Talebiniz iletildi: ${resTalep.talep.talep_no}`);
        location.hash = '#/taleplerim';
      } catch (err) {
        toast.error(err.message);
      } finally {
        btnGonder.disabled = false;
        btnGonder.textContent = 'Talebi Onayla ve Gönder';
      }
    });

  } catch (err) {
    listContainer.innerHTML = `<p style="color: var(--color-destructive); text-align: center;">${err.message}</p>`;
  }
}

export default renderSepet;
