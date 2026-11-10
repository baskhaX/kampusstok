// yesilKampus.js - Özel Kampüs Yeşil Kampüs & Sürdürülebilirlik Portalı Sayfası
import api from '../api.js';
import state from '../state.js';
import toast from '../components/toast.js';
import { openAtilMalzemeModal } from '../components/atilMalzemeModal.js';
import { openOduncEkipmanModal } from '../components/oduncEkipmanModal.js';
import { openYesilLigModal } from '../components/yesilLigModal.js';
import { escapeHtml } from '../utils/text.js';
import { t, getLanguage, tDepartment, tMonth } from '../utils/i18n.js';

let aktifLigSekme = 'idari'; // 'idari' veya 'akademik'

function getInitials(name) {
  if (!name) return '??';
  const clean = name.replace(/^(prof\.|dr\.|doç\.|arş\.|öğr\.|gör\.|uzm\.)\s*/gi, '').trim().split(/\s+/);
  if (clean.length === 1) return clean[0].substring(0, 2).toLocaleUpperCase('tr-TR');
  return (clean[0][0] + clean[clean.length - 1][0]).toLocaleUpperCase('tr-TR');
}

export async function renderYesilKampus(appContainer) {
  let ligData = null;
  try {
    ligData = await api.getYesilKampus();
  } catch (e) {
    console.warn('Yeşil kampüs verisi yüklenemedi:', e);
  }

  const akaList = ligData?.akademikLig || [];
  const idariList = ligData?.idariLig || [];
  const akaIlk3 = akaList.slice(0, 3);
  const idariIlk3 = idariList.slice(0, 3);
  const myBirim = ligData?.kullaniciBirimi;
  const isKutlama = Boolean(ligData?.ilkYediGun);

  // Eğer kullanıcının birimi akademikse başlangıçta akademik sekmeyi göster, idariyse idariyi göster
  if (myBirim && myBirim.lig === 'akademik') {
    aktifLigSekme = 'akademik';
  } else {
    aktifLigSekme = 'idari';
  }

  appContainer.innerHTML = `
    <div class="satinalma-page-wrap" style="width: 100%; max-width: 100%; box-sizing: border-box; padding-bottom: 60px;">
      <!-- Üst Başlık & Hızlı İşlem Butonları -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; flex-wrap: wrap; gap: 16px;">
        <div>
          <h2 style="font-size: 26px; font-weight: 700; letter-spacing: -0.02em; color: #0F172A; margin: 0;">${t('yesilKampus.title', 'Kurumsal Yeşil Ofis & Sürdürülebilirlik Portalı')}</h2>
          <p style="color: var(--text-dim); font-size: 13.5px; margin-top: 4px; margin-bottom: 0;">${t('yesilKampus.subtitle', 'Nobel Ödüllü Davranışsal İktisat (Nudge) ve Sıfır Atık ilkeleriyle kurum kaynaklarını birlikte koruyoruz.')}</p>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <button id="btnSayfaAtilMalzeme" class="btn btn-sm" style="background: #10b981; color: #fff; font-size: 13px; font-weight: 700; border-radius: 9999px; padding: 9px 18px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.28); border: none; cursor: pointer;">
            ${t('yesilKampus.btnSurplus', 'İhtiyaç Fazlası Bildir (+20 P)')}
          </button>
          <button id="btnSayfaOduncEkipman" class="btn btn-sm" style="background: #2563eb; color: #fff; font-size: 13px; font-weight: 700; border-radius: 9999px; padding: 9px 18px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.28); border: none; cursor: pointer;">
            ${t('yesilKampus.btnLoan', 'Ortak Ekipman Ödünç Al (+10 P)')}
          </button>
          <button id="btnSayfaLigTablosu" class="btn btn-outline btn-sm" style="font-size: 13px; font-weight: 700; border-radius: 9999px; padding: 9px 16px; color: #065f46; border: 1.5px solid #10b981; background: #fff; cursor: pointer;">
            ${t('yesilKampus.btnLeaderboard', 'Tam Sıralama')}
          </button>
        </div>
      </div>

      ${isKutlama ? `
        <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1.5px solid #10b981; border-radius: 16px; padding: 16px 20px; margin-bottom: 24px; font-size: 13.5px; color: #065f46; box-shadow: 0 4px 16px rgba(16, 185, 129, 0.12);">
          <div>
            <div style="font-weight: 800; font-size: 15px; margin-bottom: 2px;">Aylık Şampiyonluk Kutlaması</div>
            <div>${escapeHtml(ligData?.kutlamaMesaji || 'Geçen ayın sürdürülebilirlik şampiyonları tebrik edilir!')}</div>
          </div>
        </div>
      ` : ''}

      <!-- 4 Temel Sürdürülebilirlik İlkesi Kartları (Nudge & Yeşil Puanlama) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; margin-bottom: 28px;">
        <div style="background: rgba(255, 255, 255, 0.88); border: 1.2px solid rgba(16, 185, 129, 0.25); border-radius: 16px; padding: 18px; box-shadow: 0 4px 14px rgba(0,0,0,0.03); backdrop-filter: blur(8px);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-weight: 800; font-size: 14.5px; color: #0f172a;">${t('yesilKampus.cardSurplusTitle', 'Atıl Malzeme İadesi')}</span>
            <span style="background: #ecfdf5; color: #059669; font-weight: 800; font-size: 12px; padding: 3px 9px; border-radius: 9999px;">${t('yesilKampus.cardSurplusBadge', '+20 Puan')}</span>
          </div>
          <div style="font-size: 12.5px; color: #64748b; line-height: 1.45;">
            ${t('yesilKampus.cardSurplusDesc', 'Dolapta veya çekmecede atıl bekleyen klasör, zımba vb. kırtasiyeleri depoya bildirin, Çarşamba günü odanızdan teslim alalım.')}
          </div>
        </div>

        <div style="background: rgba(255, 255, 255, 0.88); border: 1.2px solid rgba(37, 99, 235, 0.25); border-radius: 16px; padding: 18px; box-shadow: 0 4px 14px rgba(0,0,0,0.03); backdrop-filter: blur(8px);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-weight: 800; font-size: 14.5px; color: #0f172a;">${t('yesilKampus.cardLoanTitle', 'Ortak Havuz Ekipmanı')}</span>
            <span style="background: #eff6ff; color: #2563eb; font-weight: 800; font-size: 12px; padding: 3px 9px; border-radius: 9999px;">${t('yesilKampus.cardLoanBadge', '+10 Puan')}</span>
          </div>
          <div style="font-size: 12.5px; color: #64748b; line-height: 1.45;">
            ${t('yesilKampus.cardLoanDesc', 'Nadir kullanılan araçları satın almak yerine ortak havuzdan geçici ödünç alın.')}
          </div>
        </div>

        <div style="background: rgba(255, 255, 255, 0.88); border: 1.2px solid rgba(245, 158, 11, 0.25); border-radius: 16px; padding: 18px; box-shadow: 0 4px 14px rgba(0,0,0,0.03); backdrop-filter: blur(8px);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-weight: 800; font-size: 14.5px; color: #0f172a;">${t('yesilKampus.cardNudgeTitle', 'Nudge Akıllı Sepet')}</span>
            <span style="background: #fef3c7; color: #b45309; font-weight: 800; font-size: 12px; padding: 3px 9px; border-radius: 9999px;">${t('yesilKampus.cardNudgeBadge', '+10 Puan')}</span>
          </div>
          <div style="font-size: 12.5px; color: #64748b; line-height: 1.45;">
            ${t('yesilKampus.cardNudgeDesc', 'Sepetinizdeki yeşil tasarruf önerilerini (daha ekonomik paket, geri dönüştürülmüş ürün) kabul ettiğinizde puan kazanın.')}
          </div>
        </div>

        <div style="background: rgba(255, 255, 255, 0.88); border: 1.2px solid rgba(139, 92, 246, 0.25); border-radius: 16px; padding: 18px; box-shadow: 0 4px 14px rgba(0,0,0,0.03); backdrop-filter: blur(8px);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <span style="font-weight: 800; font-size: 14.5px; color: #0f172a;">${t('yesilKampus.cardDeliveryTitle', 'Zamanında Teslim Onayı')}</span>
            <span style="background: #f5f3ff; color: #7c3aed; font-weight: 800; font-size: 12px; padding: 3px 9px; border-radius: 9999px;">${t('yesilKampus.cardDeliveryBadge', '+5 Puan')}</span>
          </div>
          <div style="font-size: 12.5px; color: #64748b; line-height: 1.45;">
            ${t('yesilKampus.cardDeliveryDesc', 'Çarşamba teslimatında malzemelerinizi teslim alıp sisteme anında onay vererek kampüs lojistik rotasını hızlandırın.')}
          </div>
        </div>
      </div>

      <!-- Ayın Liderlik Ligleri (İki Kolon: Akademik ve İdari Podyumlar) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-bottom: 28px;">
        <!-- Akademik Bölümler Podyumu -->
        <div style="background: rgba(255, 255, 255, 0.95); border: 1.5px solid #e2e8f0; border-radius: 18px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">
            <div style="font-weight: 800; font-size: 15px; color: #0f172a;">
              ${t('yesilKampus.topAcademicDepts', 'En Yeşil Akademik Bölümler')}
            </div>
            <span style="font-size: 11.5px; font-weight: 700; color: #059669; background: #ecfdf5; padding: 3px 10px; border-radius: 9999px;">
              ${t('yesilKampus.totalDepts', 'Toplam {count} Bölüm').replace('{count}', akaList.length)}
            </span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${akaIlk3.length > 0 ? akaIlk3.map((b, idx) => {
              const sira = idx + 1;
              const isMine = myBirim && myBirim.birim_id === b.birim_id;
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13.5px; padding: 8px 12px; border-radius: 10px; ${isMine ? 'background: #dcfce7; font-weight: 800; border: 1px solid #86efac;' : 'background: #f8fafc;'}">
                  <span style="color: #1e293b; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 12px; font-weight: 700; color: #64748b; background: #e2e8f0; padding: 1px 6px; border-radius: 4px;">#${sira}</span>
                    <span>${escapeHtml(tDepartment(b.birim_adi))}</span>
                  </span>
                  <span style="font-weight: 800; color: #065f46; font-size: 14px;">${b.toplam_puan} P</span>
                </div>
              `;
            }).join('') : `<div style="font-size: 13px; color: #94a3b8; text-align: center; padding: 16px;">${t('yesilKampus.dataPreparing', 'Veri hazırlanıyor...')}</div>`}
          </div>

          ${myBirim && myBirim.lig === 'akademik' ? `
            <div style="margin-top: 14px; padding: 10px 14px; background: #ecfdf5; border-radius: 10px; font-size: 12.5px; color: #065f46; display: flex; justify-content: space-between; align-items: center; font-weight: 700;">
              <span>${t('yesilKampus.myDeptRank', 'Bölümünüzün Sırası:')} <strong>#${myBirim.sira}</strong></span>
              <span>${t('yesilKampus.myDeptScore', 'Toplam Puanınız:')} <strong>${myBirim.toplam_puan} P</strong></span>
            </div>
          ` : ''}
        </div>

        <!-- İdari Birimler Podyumu -->
        <div style="background: rgba(255, 255, 255, 0.95); border: 1.5px solid #e2e8f0; border-radius: 18px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px;">
            <div style="font-weight: 800; font-size: 15px; color: #0f172a;">
              ${t('yesilKampus.topAdminDepts', 'En Yeşil İdari Müdürlükler')}
            </div>
            <span style="font-size: 11.5px; font-weight: 700; color: #059669; background: #ecfdf5; padding: 3px 10px; border-radius: 9999px;">
              ${t('yesilKampus.totalDirectorates', 'Toplam {count} Müdürlük').replace('{count}', idariList.length)}
            </span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${idariIlk3.length > 0 ? idariIlk3.map((b, idx) => {
              const sira = idx + 1;
              const isMine = myBirim && myBirim.birim_id === b.birim_id;
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13.5px; padding: 8px 12px; border-radius: 10px; ${isMine ? 'background: #dcfce7; font-weight: 800; border: 1px solid #86efac;' : 'background: #f8fafc;'}">
                  <span style="color: #1e293b; display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 12px; font-weight: 700; color: #64748b; background: #e2e8f0; padding: 1px 6px; border-radius: 4px;">#${sira}</span>
                    <span>${escapeHtml(tDepartment(b.birim_adi))}</span>
                  </span>
                  <span style="font-weight: 800; color: #065f46; font-size: 14px;">${b.toplam_puan} P</span>
                </div>
              `;
            }).join('') : `<div style="font-size: 13px; color: #94a3b8; text-align: center; padding: 16px;">${t('yesilKampus.dataPreparing', 'Veri hazırlanıyor...')}</div>`}
          </div>

          ${myBirim && myBirim.lig === 'idari' ? `
            <div style="margin-top: 14px; padding: 10px 14px; background: #ecfdf5; border-radius: 10px; font-size: 12.5px; color: #065f46; display: flex; justify-content: space-between; align-items: center; font-weight: 700;">
              <span>${t('yesilKampus.myDeptRank', 'Müdürlüğünüzün Sırası:')} <strong>#${myBirim.sira}</strong></span>
              <span>${t('yesilKampus.myDeptScore', 'Toplam Puanınız:')} <strong>${myBirim.toplam_puan} P</strong></span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Canlı Liderlik Tablosu Kartı (Geniş Liste) -->
      <div style="background: rgba(255, 255, 255, 0.95); border: 1.5px solid #e2e8f0; border-radius: 18px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin: 0;">
              ${t('yesilKampus.liveLeaderboard', 'Canlı Liderlik Tablosu')} (${tMonth(11)} 2026)
            </h3>
            <p style="color: #64748b; font-size: 12.5px; margin: 4px 0 0 0;">
              ${t('yesilKampus.leaderboardSub', 'Her ay 100 taban puanla başlar; çevre dostu eylemlerle puan kazanılır.')}
            </p>
          </div>

          <!-- Sekme Butonları -->
          <div style="display: inline-flex; background: #f1f5f9; padding: 4px; border-radius: 9999px;">
            <button type="button" id="tabBtnIdari" class="btn btn-sm" style="border-radius: 9999px; padding: 6px 16px; font-size: 12.5px; font-weight: 700; border: none; cursor: pointer; ${aktifLigSekme === 'idari' ? 'background: #fff; color: #0f172a; box-shadow: 0 2px 6px rgba(0,0,0,0.08);' : 'background: transparent; color: #64748b;'}">
              ${t('yesilKampus.tabAdminDirectorates', 'İdari Müdürlükler')} (${idariList.length})
            </button>
            <button type="button" id="tabBtnAkademik" class="btn btn-sm" style="border-radius: 9999px; padding: 6px 16px; font-size: 12.5px; font-weight: 700; border: none; cursor: pointer; ${aktifLigSekme === 'akademik' ? 'background: #fff; color: #0f172a; box-shadow: 0 2px 6px rgba(0,0,0,0.08);' : 'background: transparent; color: #64748b;'}">
              ${t('yesilKampus.tabAcademicDepts', 'Akademik Bölümler')} (${akaList.length})
            </button>
          </div>
        </div>

        <div id="yesilLigTabloAlani" style="overflow-x: auto;">
          <!-- Tablo dinamik olarak çizilir -->
        </div>
      </div>
    </div>
  `;

  // Eylem Butonları
  appContainer.querySelector('#btnSayfaAtilMalzeme')?.addEventListener('click', () => openAtilMalzemeModal());
  appContainer.querySelector('#btnSayfaOduncEkipman')?.addEventListener('click', () => openOduncEkipmanModal());
  appContainer.querySelector('#btnSayfaLigTablosu')?.addEventListener('click', () => openYesilLigModal());

  const tabIdari = appContainer.querySelector('#tabBtnIdari');
  const tabAkademik = appContainer.querySelector('#tabBtnAkademik');
  const tabloAlani = appContainer.querySelector('#yesilLigTabloAlani');

  function renderTable(tur) {
    aktifLigSekme = tur;
    if (tabIdari) {
      tabIdari.style.background = tur === 'idari' ? '#fff' : 'transparent';
      tabIdari.style.color = tur === 'idari' ? '#0f172a' : '#64748b';
      tabIdari.style.boxShadow = tur === 'idari' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none';
    }
    if (tabAkademik) {
      tabAkademik.style.background = tur === 'akademik' ? '#fff' : 'transparent';
      tabAkademik.style.color = tur === 'akademik' ? '#0f172a' : '#64748b';
      tabAkademik.style.boxShadow = tur === 'akademik' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none';
    }

    const list = tur === 'idari' ? idariList : akaList;

    if (!list || list.length === 0) {
      tabloAlani.innerHTML = `<div style="text-align: center; padding: 30px; color: #94a3b8; font-size: 13px;">${t('yesilKampus.noDeptsInLeague', 'Bu ligde henüz kayıtlı birim bulunmuyor.')}</div>`;
      return;
    }

    tabloAlani.innerHTML = `
      <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
        <thead>
          <tr style="border-bottom: 2px solid #e2e8f0; color: #64748b; font-size: 12px; text-align: left; text-transform: uppercase; letter-spacing: 0.05em;">
            <th style="padding: 10px 14px; width: 60px;">${t('yesilKampus.colRank', 'SIRA')}</th>
            <th style="padding: 10px 14px;">${t('yesilKampus.colDeptName', 'BİRİM ADI')}</th>
            <th style="padding: 10px 14px; text-align: right;">${t('yesilKampus.colReturn', 'İADE')}</th>
            <th style="padding: 10px 14px; text-align: right;">${t('yesilKampus.colNudge', 'NUDGE')}</th>
            <th style="padding: 10px 14px; text-align: right;">${t('yesilKampus.colDelivery', 'TESLİM')}</th>
            <th style="padding: 10px 14px; text-align: right; width: 110px;">${t('yesilKampus.colTotalPoints', 'TOPLAM PUAN')}</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((b, idx) => {
            const sira = idx + 1;
            const isMine = myBirim && myBirim.birim_id === b.birim_id;

            return `
              <tr style="border-bottom: 1px solid #f1f5f9; ${isMine ? 'background: #dcfce7; font-weight: 700;' : ''}">
                <td style="padding: 12px 14px; font-weight: 700; color: #0f172a;">#${sira}</td>
                <td style="padding: 12px 14px; color: #1e293b;">
                  <div>${escapeHtml(tDepartment(b.birim_adi))}</div>
                  <div style="font-size: 11.5px; color: #64748b; font-weight: normal;">${t('yesilKampus.staffCount', '{count} Personel').replace('{count}', b.personel_sayisi || 0)}</div>
                </td>
                <td style="padding: 12px 14px; text-align: right; color: #059669; font-weight: 600;">+${b.iade_puani || 0}</td>
                <td style="padding: 12px 14px; text-align: right; color: #2563eb; font-weight: 600;">+${b.nudge_puani || 0}</td>
                <td style="padding: 12px 14px; text-align: right; color: #7c3aed; font-weight: 600;">+${b.hizli_teslim_puani || 0}</td>
                <td style="padding: 12px 14px; text-align: right; font-weight: 800; font-size: 14.5px; color: #065f46;">
                  ${b.toplam_puan} P
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  tabIdari?.addEventListener('click', () => renderTable('idari'));
  tabAkademik?.addEventListener('click', () => renderTable('akademik'));

  renderTable(aktifLigSekme);
}

export default renderYesilKampus;
