// taleplerim.js - Birim Talep Geçmişi
import api from '../api.js';
import toast from '../components/toast.js';
import createModal from '../components/modal.js';
import { renderProgressRailStepperHtml } from '../components/stepper.js';

export async function renderTaleplerim(appContainer) {
  appContainer.innerHTML = `
    <div class="container main-content">
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 24px; font-weight: 700; color: #0F172A; margin: 0;">Taleplerim</h2>
        <p style="color: var(--color-muted-foreground); font-size: 13px; margin-top: 4px;">Adınıza oluşturduğunuz geçmiş talepleri ve teslimat tarihlerini takip edin.</p>
      </div>

      <!-- Filtreler -->
      <div class="card" style="padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; gap: 14px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 180px;">
            <select id="filtreDurum">
              <option value="">Tüm Durumlar</option>
              <option value="beklemede">Beklemede</option>
              <option value="onaylandi">Onaylandı</option>
              <option value="revize_onaylandi">Revize Edilerek Onaylandı</option>
              <option value="reddedildi">Reddedildi</option>
              <option value="teslim_edildi">Teslim Edildi</option>
            </select>
          </div>
          <button id="btnFiltrele" class="btn btn-outline btn-sm">
            Filtrele
          </button>
        </div>
      </div>

      <!-- Talepler Tablosu -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Talep No</th>
              <th>Tarih</th>
              <th>İstek Sahibi</th>
              <th>Kalem Sayısı</th>
              <th>Durum</th>
              <th>Teslim Tarihi</th>
              <th style="text-align: right;">İşlemler</th>
            </tr>
          </thead>
          <tbody id="taleplerTableBody">
            <tr><td colspan="7" style="text-align: center; padding: 40px;">Yükleniyor...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  const filterSelect = appContainer.querySelector('#filtreDurum');
  const btnFiltrele = appContainer.querySelector('#btnFiltrele');

  const loadData = () => loadTaleplerimList(appContainer, filterSelect.value);

  btnFiltrele.addEventListener('click', loadData);
  filterSelect.addEventListener('change', loadData);

  await loadData();
}

async function loadTaleplerimList(appContainer, durum = '') {
  const tbody = appContainer.querySelector('#taleplerTableBody');
  try {
    const res = await api.getTaleplerim({ durum });
    const talepler = res.talepler || [];

    if (talepler.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 50px;">
            <div style="color: var(--color-muted-foreground);">Kayıtlı talep bulunamadı.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = talepler.map(t => {
      const isTeslimEdildi = t.durum === 'teslim_edildi';
      const isOnayli = t.durum === 'onaylandi' || t.durum === 'revize_onaylandi';
      const isBeklemede = t.durum === 'beklemede';
      const isRed = t.durum === 'reddedildi';
      const kullaniciOnayladi = t.kullanici_teslim_aldi === 1;

      let badgeHtml = '';
      if (isBeklemede) {
        badgeHtml = '<span class="badge badge-warning">Beklemede</span>';
      } else if (isRed) {
        badgeHtml = '<span class="badge badge-danger">Reddedildi</span>';
      } else if (kullaniciOnayladi) {
        badgeHtml = '<span class="badge badge-success" style="background: rgba(16, 185, 129, 0.15); color: #047857; border: 1px solid rgba(16, 185, 129, 0.4); font-weight: 700;">✓ Teslim Alındı</span>';
      } else if (isTeslimEdildi) {
        badgeHtml = '<span class="badge badge-warning" style="background: rgba(245, 158, 11, 0.15); color: #b45309; border: 1px solid rgba(245, 158, 11, 0.4); font-weight: 700;">Teslim Edildi (Onayınız Bekleniyor)</span>';
      } else if (t.durum === 'revize_onaylandi') {
        badgeHtml = '<span class="badge badge-warning">Revize Onaylandı</span>';
      } else {
        badgeHtml = '<span class="badge badge-primary">Onaylandı</span>';
      }

      return `
        <tr>
          <td><strong>${t.talep_no}</strong></td>
          <td>${t.olusturmaTarihiText}</td>
          <td>
            <div>${t.personel_adi}</div>
            <div style="font-size: 11px; color: var(--color-muted-foreground);">${t.personel_eposta}</div>
          </td>
          <td>${t.kalem_sayisi || 0} kalem</td>
          <td>${badgeHtml}</td>
          <td>${t.teslimatTarihiText}</td>
          <td style="text-align: right;">
            <div style="display: inline-flex; align-items: center; gap: 6px;">
              ${(isTeslimEdildi || isOnayli) && !kullaniciOnayladi ? `
                <button class="btn btn-sm btn-talep-teslim-al" data-id="${t.id}" data-no="${t.talep_no}" style="background: #059669; color: #ffffff; border: none; font-weight: 700; padding: 5px 12px; border-radius: 6px; box-shadow: 0 2px 6px rgba(5, 150, 105, 0.25); display: inline-flex; align-items: center; gap: 4px; cursor: pointer; font-size: 11.5px;" title="Malzemeleri Teslim Aldım Olarak Onayla">
                  <span>✓</span> Teslim Aldım
                </button>
              ` : ''}
              <button class="btn btn-primary btn-sm btn-talep-detay" data-id="${t.id}" style="font-size: 12px; padding: 5px 12px;">
                Süreç Takip & Detay
              </button>
              <button class="btn btn-outline btn-sm btn-talep-kopyala" data-id="${t.id}">
                Tekrarla
              </button>
              ${isOnayli || isTeslimEdildi ? `
                <button class="btn btn-outline btn-sm btn-talep-yazdir" data-id="${t.id}">
                  Yazdır
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Teslim Aldım butonu dinleyicisi
    tbody.querySelectorAll('.btn-talep-teslim-al').forEach(btn => {
      btn.addEventListener('click', () => {
        promptTeslimAl(btn.dataset.id, btn.dataset.no, () => loadData());
      });
    });

    // Detay butonu dinleyicisi
    tbody.querySelectorAll('.btn-talep-detay').forEach(btn => {
      btn.addEventListener('click', () => openTalepDetayModal(btn.dataset.id, () => loadData()));
    });

    // Tekrarla butonu dinleyicisi
    tbody.querySelectorAll('.btn-talep-kopyala').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const res = await api.talebiKopyala(btn.dataset.id);
          toast.success(res.mesaj);
          location.hash = '#/sepet';
        } catch (err) {
          toast.error(err.message);
        }
      });
    });

    // Yazdır butonu dinleyicisi
    tbody.querySelectorAll('.btn-talep-yazdir').forEach(btn => {
      btn.addEventListener('click', () => {
        window.open(`/api/raporlar/teslim-fisi/${btn.dataset.id}?print=1`, '_blank');
      });
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color: var(--color-destructive); text-align: center;">${err.message}</td></tr>`;
  }
}

function promptTeslimAl(talepId, talepNo, onSuccess) {
  const confirmModal = createModal({
    title: `Teslim Alma Teyidi • ${talepNo}`,
    maxWidth: '520px',
    contentHtml: `
      <div style="padding: 10px 0;">
        <div style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 16px;">
          <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(16, 185, 129, 0.15); color: #059669; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0;">
            TESLİM
          </div>
          <div>
            <h4 style="font-size: 15px; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
              Malzemeleri Teslim Aldınız mı?
            </h4>
            <p style="font-size: 13px; color: #475569; line-height: 1.5; margin: 0;">
              <strong>${talepNo}</strong> numaralı talebinizdeki kırtasiye ve sarf malzemelerini eksiksiz ve sağlam olarak teslim aldığınızı onaylıyor musunuz?
            </p>
          </div>
        </div>

        <div style="margin-bottom: 18px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px;">
          <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 6px;">
            Varsa Teslim Alma Notunuz (Opsiyonel):
          </label>
          <input type="text" id="inputTeslimNot" class="form-input" placeholder="Örn: 2 koli eksiksiz teslim alındı." style="width: 100%; font-size: 13px; padding: 8px 12px; background: #fff; border: 1px solid #CBD5E1; border-radius: 6px;">
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button class="btn btn-secondary btn-sm" id="btnIptalTeslim">Vazgeç</button>
          <button class="btn btn-sm" id="btnOnaylaTeslim" style="background: #059669; color: #fff; border: none; font-weight: 700; padding: 7px 16px; border-radius: 6px; box-shadow: 0 2px 6px rgba(5, 150, 105, 0.25);">
            ✓ Evet, Teslim Aldım
          </button>
        </div>
      </div>
    `
  });

  const el = confirmModal.element;
  el.querySelector('#btnIptalTeslim').addEventListener('click', () => confirmModal.close());
  el.querySelector('#btnOnaylaTeslim').addEventListener('click', async () => {
    try {
      const not = el.querySelector('#inputTeslimNot').value.trim();
      const res = await api.talepTeslimAl(talepId, { not });
      toast.success(res.mesaj || 'Malzemeler teslim alındı olarak onaylandı.');
      confirmModal.close();
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error('Onaylama hatası: ' + err.message);
    }
  });
}

async function openTalepDetayModal(talepId, onUpdated = null) {
  try {
    const res = await api.getTalepDetay(talepId);
    const { talep } = res;
    const isTeslimEdildi = talep.durum === 'teslim_edildi';
    const isOnayli = talep.durum === 'onaylandi' || talep.durum === 'revize_onaylandi';
    const kullaniciOnayladi = talep.kullanici_teslim_aldi === 1;

    let bannerHtml = '';
    if ((isTeslimEdildi || isOnayli) && !kullaniciOnayladi) {
      bannerHtml = `
        <div style="background: linear-gradient(135deg, rgba(236, 253, 245, 0.95), rgba(209, 250, 229, 0.85)); border: 1.5px solid #10b981; border-radius: 14px; padding: 14px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.12);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 38px; height: 38px; border-radius: 10px; background: #059669; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0;">
              TESLİM
            </div>
            <div>
              <div style="font-weight: 700; color: #065f46; font-size: 14px;">
                Malzemeleri Teslim Aldınız mı?
              </div>
              <div style="font-size: 12px; color: #047857; margin-top: 2px;">
                Satın Alma Müdürlüğü teslimatı gerçekleştirdiyse, lütfen malzemeleri eksiksiz aldığınızı buradan onaylayınız.
              </div>
            </div>
          </div>
          <button class="btn btn-sm" id="btnModalTeslimAl" data-id="${talep.id}" data-no="${talep.talep_no}" style="background: #059669; color: #fff; border: none; font-weight: 700; padding: 9px 18px; border-radius: 9px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3); white-space: nowrap; cursor: pointer; font-size: 13px;">
            ✓ Malzemeleri Teslim Aldım
          </button>
        </div>
      `;
    } else if (kullaniciOnayladi) {
      bannerHtml = `
        <div style="background: rgba(240, 253, 244, 0.95); border: 1.2px solid rgba(16, 185, 129, 0.35); border-radius: 12px; padding: 12px 18px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px;">
          <div style="width: 28px; height: 28px; border-radius: 50%; background: #10b981; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 15px;">✓</div>
          <div>
            <div style="font-weight: 700; color: #065f46; font-size: 13px;">
              Teslimat Tarafınızca Başarıyla Teyit Edildi
            </div>
            <div style="font-size: 11.5px; color: #047857;">
              Teyit Zamanı: ${talep.kullanici_teslim_tarihi || '-'} ${talep.kullanici_teslim_notu ? `• Not: ${talep.kullanici_teslim_notu}` : ''}
            </div>
          </div>
        </div>
      `;
    }

    const modal = createModal({
      title: `Talep Süreç Takibi & Detay • ${talep.talep_no}`,
      maxWidth: '880px',
      contentHtml: `
        <div>
          ${bannerHtml}
          ${renderProgressRailStepperHtml(talep)}

          <div style="display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-top: 20px; border-top: 1px solid rgba(226, 232, 240, 0.8); padding-top: 16px;">
            ${(isTeslimEdildi || isOnayli) && !kullaniciOnayladi ? `
              <button class="btn btn-sm" id="btnModalFooterTeslimAl" data-id="${talep.id}" data-no="${talep.talep_no}" style="background: #059669; color: #fff; border: none; font-weight: 700;">
                ✓ Teslim Aldım
              </button>
            ` : ''}
            ${(talep.durum === 'onaylandi' || talep.durum === 'revize_onaylandi' || talep.durum === 'teslim_edildi') ? `
              <button class="btn btn-secondary btn-sm" id="btnModalYazdir" data-id="${talep.id}">
                Malzeme Teslim Fişi Yazdır
              </button>
            ` : ''}
            <button class="btn btn-outline btn-sm" id="btnModalTekrarla" data-id="${talep.id}">
              Talebi Sepete Kopyala
            </button>
            <button class="btn btn-secondary btn-sm" id="btnModalKapat">
              Kapat
            </button>
          </div>
        </div>
      `
    });

    const el = modal.element;
    el.querySelector('#btnModalKapat')?.addEventListener('click', () => modal.close());

    const handleTeslimConfirm = () => {
      promptTeslimAl(talep.id, talep.talep_no, () => {
        modal.close();
        if (onUpdated) onUpdated();
        openTalepDetayModal(talep.id, onUpdated);
      });
    };

    el.querySelector('#btnModalTeslimAl')?.addEventListener('click', handleTeslimConfirm);
    el.querySelector('#btnModalFooterTeslimAl')?.addEventListener('click', handleTeslimConfirm);

    el.querySelector('#btnModalYazdir')?.addEventListener('click', () => {
      window.open(`/api/raporlar/teslim-fisi/${talep.id}?print=1`, '_blank');
    });

    el.querySelector('#btnModalTekrarla')?.addEventListener('click', async () => {
      try {
        const kopyaRes = await api.talebiKopyala(talep.id);
        toast.success(kopyaRes.mesaj);
        modal.close();
        location.hash = '#/sepet';
      } catch (err) {
        toast.error(err.message);
      }
    });

  } catch (err) {
    toast.error('Talep detayları alınamadı: ' + err.message);
  }
}

export default renderTaleplerim;
