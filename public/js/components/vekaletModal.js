// vekaletModal.js - Satın Alma Müdürü 360° Görev Devri ve Saatli/Tarihli İzin Yetkilendirme Masası
import api from '../api.js';
import toast from './toast.js';
import createModal, { confirmModal } from './modal.js';
import { t, getLanguage, tDepartment, tTitle } from '../utils/i18n.js';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function openVekaletModal(onUpdated) {
  // 1. Sunucudan Aktif Yetkiyi Çek
  let aktifVekalet = null;
  try {
    const res = await api.getAktifGorevDevri();
    aktifVekalet = res.aktifVekalet || null;
  } catch (e) {
    try {
      const raw = localStorage.getItem('satinalma_vekil_info');
      if (raw) aktifVekalet = JSON.parse(raw);
    } catch {}
  }

  // 2. Personel Listesini Çek
  let personelList = [];
  try {
    const res = await api.getYonetimPersoneller();
    personelList = res.personeller || res.personel || [];
  } catch (e) {}

  // Sadece Satın Alma Müdürlüğü personelleri (Yetki sadece Satın Alma içinde döner)
  const satinalmaPersonelleri = personelList.filter(p => {
    const birimMatch = p.birim_id === 41 || (p.birim_adi || '').toLowerCase().includes('satın alma');
    const mudurMatch = (p.gorev || '').toLowerCase().includes('müdür') && !p.gorev.toLowerCase().includes('yardımc');
    return birimMatch && !mudurMatch;
  });

  const isAssigned = Boolean(aktifVekalet && (aktifVekalet.alan_ad_soyad || aktifVekalet.adSoyad));
  const defaultManagerName = isEn ? 'Procurement Director' : 'Satın Alma Müdürü';
  const aktifAdSoyad = isAssigned ? (aktifVekalet?.alan_ad_soyad || aktifVekalet?.adSoyad) : defaultManagerName;
  const aktifTur = aktifVekalet?.tur || 'devir';
  const aktifEtiket = aktifVekalet?.rol_model_etiket || (aktifTur === 'izin' ? (isEn ? 'Annual Leave Delegate' : 'Yıllık İzin Vekili') : (isEn ? 'Stationery & Warehouse Lead' : 'Kırtasiye ve Depo Sorumlusu'));
  const aktifPersonelId = Number(aktifVekalet?.alan_personel_id || aktifVekalet?.personelId || 0);

  // Tarih ve Saat Formatlama (datetime-local için)
  const now = new Date();
  const formatDatetime = (d) => {
    if (!d) return '';
    try {
      const date = new Date(d);
      return date.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  };

  const defaultBaslangic = aktifVekalet?.baslangic_tarihi ? formatDatetime(aktifVekalet.baslangic_tarihi) : now.toISOString().slice(0, 16);
  const defaultBitis = aktifVekalet?.bitis_tarihi ? formatDatetime(aktifVekalet.bitis_tarihi) : '';

  const isEn = getLanguage() === 'en';

  const modal = createModal({
    title: isEn ? 'Procurement Desk - Delegation of Authority & Leave Handover' : 'Satın Alma - Görev Devri ve İzin Yetkilendirme Masası',
    maxWidth: '880px',
    contentHtml: `
      <div style="padding: 4px 0;">
        <!-- 1. Üst Durum Bandı (Apple Liquid Glass) -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; background: ${isAssigned ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)'}; border: 1.2px solid ${isAssigned ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}; border-radius: 12px; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 50%; background: ${isAssigned ? '#10B981' : '#F59E0B'}; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
              ${isAssigned ? (aktifAdSoyad ? aktifAdSoyad.slice(0, 2).toLocaleUpperCase('tr-TR') : 'SA') : 'SA'}
            </div>
            <div>
              <div style="font-weight: 700; font-size: 14px; color: #0F172A;">
                ${isAssigned ? (isEn ? `Active Manager: ${escapeHtml(aktifAdSoyad)}` : `Aktif Yönetici: ${escapeHtml(aktifAdSoyad)}`) : (isEn ? 'Authority: Procurement Director (Primary Seat)' : 'Makam: Satın Alma Müdürü (Asıl Otorite)')}
              </div>
              <div style="font-size: 12px; color: var(--text-dim); margin-top: 1px;">
                ${isAssigned ? (isEn ? `Authority Status: ${escapeHtml(aktifEtiket)} (${aktifTur === 'izin' ? 'Scheduled Annual Leave Delegation' : 'Primary Full Authority'})` : `Yetki Durumu: ${escapeHtml(aktifEtiket)} (${aktifTur === 'izin' ? 'Saatli Yıllık İzin Vekaleti' : 'Tam Yetkili Asıl Sorumlu'})`) : (isEn ? 'Stationery approval and warehouse inventory control are held directly by Director.' : 'Kırtasiye onay ve depo yönetim yetkisi doğrudan müdürlük makamındadır.')}
              </div>
            </div>
          </div>
          <span style="font-size: 12px; font-weight: 700; color: ${isAssigned ? '#047857' : '#B45309'}; background: ${isAssigned ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'}; padding: 4px 12px; border-radius: 9999px;">
            ${isAssigned ? (isEn ? 'Active Delegation' : 'Yürürlükte') : (isEn ? 'Primary Seat' : 'Asıl Makamda')}
          </span>
        </div>

        <!-- 2. Çift Kolonlu 360° Yetki Masası -->
        <div style="display: grid; grid-template-columns: 280px 1fr; gap: 20px; align-items: start;">
          
          <!-- SOL KOLON: Personel Kimlik & Profil Kartı -->
          <div style="background: rgba(248, 250, 252, 0.95); border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 18px; text-align: center;">
            <div id="cardAvatarCircle" style="width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, #3B82F6, #1D4ED8); color: #fff; font-size: 26px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(37,99,235,0.25); margin-bottom: 12px;">
              ${aktifAdSoyad ? aktifAdSoyad.slice(0, 2).toLocaleUpperCase('tr-TR') : 'SA'}
            </div>
            <div id="cardPersonName" style="font-size: 15px; font-weight: 800; color: #0F172A; margin-bottom: 2px;">
              ${escapeHtml(isEn && (!isAssigned || (aktifAdSoyad && aktifAdSoyad.toLowerCase().includes('satın alma müdür'))) ? 'Procurement Director' : aktifAdSoyad)}
            </div>
            <div id="cardPersonBirim" style="font-size: 12px; color: #64748B; margin-bottom: 12px;">
              ${isEn ? 'Procurement Directorate' : 'Satın Alma Müdürlüğü'}
            </div>

            <div style="border-top: 1px solid #E2E8F0; padding-top: 12px; text-align: left; font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748B;">${isEn ? 'Title / Role:' : 'Unvan / Görev:'}</span>
                <strong id="cardPersonGorev" style="color: #0F172A;">${escapeHtml(isEn && (!isAssigned || !aktifVekalet?.personel_gorev || aktifVekalet.personel_gorev.toLowerCase().includes('müdür')) ? 'Director' : (tTitle(aktifVekalet?.personel_gorev) || (isEn ? 'Director' : 'Müdür')))}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748B;">${isEn ? 'Extension Phone:' : 'Dahili Telefon:'}</span>
                <strong id="cardPersonTel" style="color: #0F172A;">${escapeHtml(aktifVekalet?.personel_telefon || '4050')}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748B;">${isEn ? 'Account Status:' : 'Hesap Durumu:'}</span>
                <span style="font-weight: 700; color: #059669;">${isEn ? 'Active Account' : 'Aktif Hesap'}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748B;">${isEn ? 'Access Scope:' : 'Erişim Kapsamı:'}</span>
                <span style="font-weight: 700; color: #2563EB;">${isEn ? 'Full Access Manager' : 'Tam Yetkili Yönetici'}</span>
              </div>
            </div>
          </div>

          <!-- SAĞ KOLON: Görev Devri & Saatli İzin Masası -->
          <div style="display: flex; flex-direction: column; gap: 14px;">
            <!-- A. Hazır Yetki Şablonu -->
            <div style="padding: 10px 14px; background: rgba(239, 246, 255, 0.7); border: 1.2px solid #BFDBFE; border-radius: 10px;">
              <label style="font-size: 12px; font-weight: 700; color: #1E3A8A; display: block; margin-bottom: 6px;">
                ${isEn ? 'Apply Preset Delegation Template' : 'Hazır Yetki Şablonu Uygula'}
              </label>
              <select id="modalSablonSelect" style="width: 100%; padding: 8px 12px; font-size: 13px; border-radius: 8px; border: 1px solid #93C5FD; background: #fff;">
                <option value="">${isEn ? '-- Select Template --' : '-- Şablon Seçiniz --'}</option>
                <option value="asilsorumlu">${isEn ? 'Primary Stationery & Warehouse Manager Appointment (Ozan Can Şimşek)' : 'Asıl Kırtasiye ve Depo Yöneticisi Ataması (Ozan Can Şimşek)'}</option>
                <option value="yillikizin">${isEn ? 'Annual Leave Delegation (Scheduled & Dated)' : 'Yıllık İzin Geçici Vekaleti (Saatli ve Tarihli)'}</option>
                <option value="depolojistik">${isEn ? 'Wednesday Logistics & Warehouse Lead' : 'Çarşamba Dağıtım ve Depo Sorumlusu'}</option>
              </select>
            </div>

            <!-- B. Yetki Devredilecek Personel -->
            <div class="form-group">
              <label style="font-size: 12.5px; font-weight: 700; color: #0F172A; display: block; margin-bottom: 5px;">
                ${isEn ? 'Procurement Staff to Authorize *' : 'Yetkilendirilecek Satın Alma Personeli *'}
              </label>
              <select id="modalVekilSelect" style="width: 100%; padding: 9px 12px; font-size: 13px; border-radius: 10px; border: 1.5px solid #CBD5E1; background: #fff;">
                <option value="">${isEn ? '-- Revoke Delegation (Return to Director) --' : '-- Yetkiyi Geri Al (Müdürlük Makamına İade Et) --'}</option>
                ${satinalmaPersonelleri.map(p => `
                  <option value="${p.id}" data-name="${p.ad_soyad}" data-email="${p.eposta || ''}" data-birim="${p.birim_adi || 'Satın Alma Müdürlüğü'}" data-tel="${p.telefon || ''}" data-gorev="${p.gorev || 'Personel'}" ${(aktifPersonelId === p.id || (!aktifPersonelId && p.ad_soyad.includes('Ozan'))) ? 'selected' : ''}>
                    ${p.ad_soyad} • ${tTitle(p.gorev) || p.gorev || 'Staff'} (${isEn ? 'Ext' : 'Dahili'}: ${p.telefon || '-'})
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- C. Yetki Türü Seçimi (Devir vs İzin) -->
            <div class="form-group">
              <label style="font-size: 12.5px; font-weight: 700; color: #0F172A; display: block; margin-bottom: 6px;">
                ${isEn ? 'Delegation Model' : 'Yetkilendirme Modeli'}
              </label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <label style="display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border: 1.5px solid #CBD5E1; border-radius: 10px; cursor: pointer; background: #fff;" id="lblModelDevir">
                  <input type="radio" name="yetkiModeli" value="devir" ${aktifTur === 'devir' ? 'checked' : ''} style="margin-top: 2px;">
                  <div>
                    <strong style="font-size: 12.5px; color: #0F172A;">${isEn ? 'Primary Handover' : 'Asıl Görev Devri'}</strong>
                    <div style="font-size: 11px; color: #64748B;">${isEn ? 'Complete transfer to designated staff.' : 'Makamdan sorumlu personele tam devir.'}</div>
                  </div>
                </label>
                <label style="display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border: 1.5px solid #CBD5E1; border-radius: 10px; cursor: pointer; background: #fff;" id="lblModelIzin">
                  <input type="radio" name="yetkiModeli" value="izin" ${aktifTur === 'izin' ? 'checked' : ''} style="margin-top: 2px;">
                  <div>
                    <strong style="font-size: 12.5px; color: #0F172A;">${isEn ? 'Scheduled Leave Handover' : 'Saatli / Tarihli İzin Vekaleti'}</strong>
                    <div style="font-size: 11px; color: #64748B;">${isEn ? 'Temporary delegation during annual leave.' : 'Yıllık izin süresince geçici vekalet.'}</div>
                  </div>
                </label>
              </div>
            </div>

            <!-- D. Saatli ve Tarihli İzin Takvimi (Zaman Ayarlı Motor) -->
            <div id="wrapZamanAyari" style="display: ${aktifTur === 'izin' ? 'grid' : 'none'}; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px 14px; background: rgba(254, 243, 199, 0.5); border: 1.2px solid #FDE68A; border-radius: 10px;">
              <div class="form-group">
                <label style="font-size: 12px; font-weight: 700; color: #92400E; display: block; margin-bottom: 4px;">
                  ${isEn ? 'Leave Start (Date & Time) *' : 'İzin Başlangıç (Tarih ve Saat) *'}
                </label>
                <input type="datetime-local" id="vekaletBaslangic" value="${defaultBaslangic}" style="width: 100%; padding: 7px 10px; font-size: 12.5px; border-radius: 8px; border: 1px solid #CBD5E1; background: #fff; box-sizing: border-box;">
              </div>
              <div class="form-group">
                <label style="font-size: 12px; font-weight: 700; color: #92400E; display: block; margin-bottom: 4px;">
                  ${isEn ? 'Leave End (Date & Time - Auto Revert) *' : 'İzin Bitiş (Tarih ve Saat - Otomatik İade) *'}
                </label>
                <input type="datetime-local" id="vekaletBitis" value="${defaultBitis}" style="width: 100%; padding: 7px 10px; font-size: 12.5px; border-radius: 8px; border: 1px solid #CBD5E1; background: #fff; box-sizing: border-box;">
              </div>
              <div style="grid-column: 1 / -1; font-size: 11px; color: #B45309; line-height: 1.3;">
                <em>${isEn ? 'When the end date and time arrive, authority will <strong>automatically revert</strong> back to the primary Director.' : 'Bitiş tarihi ve saati geldiğinde sistem yetkiyi vekilden <strong>otomatik olarak geri alır</strong> ve asıl personele iade eder.'}</em>
              </div>
            </div>

            <!-- E. Yetki Kapsamı (5 Granüler Checkbox) -->
            <div style="padding: 10px 12px; background: rgba(241, 245, 249, 0.7); border-radius: 10px; border: 1px solid #E2E8F0;">
              <div style="font-size: 11.5px; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase;">${isEn ? 'Delegated Permissions (Granular):' : 'Devredilen Yetkiler (Granüler):'}</div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 12px; color: #1E293B;">
                <label style="display: flex; align-items: center; gap: 6px;"><input type="checkbox" checked disabled> ${isEn ? 'Requisition Review & Approval' : 'Talep İnceleme ve Onay'}</label>
                <label style="display: flex; align-items: center; gap: 6px;"><input type="checkbox" checked disabled> ${isEn ? 'Warehouse Stock & Inventory Adjustment' : 'Depo Stok ve Sayım Düzeltme'}</label>
                <label style="display: flex; align-items: center; gap: 6px;"><input type="checkbox" checked disabled> ${isEn ? 'Wednesday Logistics Picking List' : 'Çarşamba Lojistik Listesi'}</label>
                <label style="display: flex; align-items: center; gap: 6px;"><input type="checkbox" checked disabled> ${isEn ? 'Consumption & Audit Reports' : 'Tüketim ve Denetim Raporları'}</label>
                <label style="display: flex; align-items: center; gap: 6px; grid-column: 1 / -1; color: #2563EB; font-weight: 600;"><input type="checkbox" checked disabled> ${isEn ? 'Delegation Desk (Re-delegating while away)' : 'Görev Devri Masası (İzne çıkarken vekil atama yetkisi)'}</label>
              </div>
            </div>

            <!-- F. Resmi İdari Not -->
            <div class="form-group">
              <label style="font-size: 12px; font-weight: 600; color: #0F172A; display: block; margin-bottom: 4px;">
                ${isEn ? 'Official Administrative Note' : 'Resmi İdari Görevlendirme Notu'}
              </label>
              <input type="text" id="modalVekilNedeni" placeholder="${isEn ? 'e.g. 2026-2027 Stationery Manager Appointment or Annual Leave...' : 'Örn: 2026-2027 Dönemi Kırtasiye Yöneticisi veya Yıllık İzin Devri...'}" value="${escapeHtml(aktifVekalet?.neden || (isEn ? 'Stationery & Inventory Portal Manager Appointment' : 'Kırtasiye ve Depo Portalı Yönetici Görevlendirmesi'))}" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1.5px solid #CBD5E1; font-size: 12.5px; box-sizing: border-box;">
            </div>

          </div>
        </div>

        <!-- 3. Alt Buton Satırı -->
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; padding-top: 14px; border-top: 1px solid #E2E8F0; margin-top: 16px;">
          ${isAssigned ? `
            <button id="btnVekaletSonlandir" class="btn btn-secondary" style="color: #DC2626; border-color: rgba(220, 38, 38, 0.3); font-weight: 600; font-size: 13px;">
              ${isEn ? 'Revoke Authority (Return to Director)' : 'Yetkiyi Geri Al (Müdürlük Makamına İade Et)'}
            </button>
          ` : `<div></div>`}
          <div style="display: flex; gap: 10px;">
            <button id="btnVekaletIptal" class="btn btn-secondary" style="font-size: 13px;">${t('common.close', 'Kapat')}</button>
            <button id="btnVekaletKaydet" class="btn btn-primary" style="background: #2563EB; font-weight: 700; font-size: 13px;">
              ${isEn ? 'Save Delegation & Assign' : 'Yetkiyi Devret ve Görevlendir'}
            </button>
          </div>
        </div>
      </div>
    `
  });

  modal.open();

  // Sol Kolon Canlı Önizleme Güncelleme
  const sel = modal.element.querySelector('#modalVekilSelect');
  const cardName = modal.element.querySelector('#cardPersonName');
  const cardAvatar = modal.element.querySelector('#cardAvatarCircle');
  const cardGorev = modal.element.querySelector('#cardPersonGorev');
  const cardTel = modal.element.querySelector('#cardPersonTel');
  const wrapZaman = modal.element.querySelector('#wrapZamanAyari');
  const radioDevir = modal.element.querySelector('input[name="yetkiModeli"][value="devir"]');
  const radioIzin = modal.element.querySelector('input[name="yetkiModeli"][value="izin"]');
  const sablonSelect = modal.element.querySelector('#modalSablonSelect');

  const updateCardPreview = () => {
    const opt = sel.options[sel.selectedIndex];
    if (opt && opt.value) {
      const name = opt.dataset.name || '';
      cardName.textContent = name;
      cardAvatar.textContent = name.slice(0, 2).toLocaleUpperCase('tr-TR');
      cardGorev.textContent = tTitle(opt.dataset.gorev) || (isEn ? 'Staff' : 'Personel');
      cardTel.textContent = opt.dataset.tel || '-';
    } else {
      cardName.textContent = isEn ? 'Procurement Director' : 'Satın Alma Müdürü';
      cardAvatar.textContent = 'SA';
      cardGorev.textContent = isEn ? 'Director' : 'Müdür';
      cardTel.textContent = '4050';
    }
  };

  sel?.addEventListener('change', updateCardPreview);
  updateCardPreview();

  // Yetki Modeli Tıklaması (Devir vs İzin Zaman Kutusu Aç/Kapat)
  modal.element.querySelectorAll('input[name="yetkiModeli"]').forEach(r => {
    r.addEventListener('change', () => {
      if (wrapZaman) {
        wrapZaman.style.display = radioIzin.checked ? 'grid' : 'none';
      }
    });
  });

  // Hazır Şablon Seçimi
  sablonSelect?.addEventListener('change', () => {
    const val = sablonSelect.value;
    if (val === 'asilsorumlu') {
      radioDevir.checked = true;
      if (wrapZaman) wrapZaman.style.display = 'none';
      modal.element.querySelector('#modalVekilNedeni').value = isEn ? 'Stationery & Inventory Head Manager Full Delegation' : 'Kırtasiye ve Depo Baş Sorumlusu Tam Yetkilendirmesi';
      // Ozan Can Şimşek'i seç
      for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].text.includes('Ozan')) {
          sel.selectedIndex = i;
          break;
        }
      }
      updateCardPreview();
      toast.info(isEn ? 'Template applied: Ozan Can Simsek assigned as primary lead.' : 'Şablon uygulandı: Ozan Can Şimşek asıl sorumlu olarak seçildi.');
    } else if (val === 'yillikizin') {
      radioIzin.checked = true;
      if (wrapZaman) wrapZaman.style.display = 'grid';
      modal.element.querySelector('#modalVekilNedeni').value = isEn ? 'Annual Leave Temporary Handover' : 'Yıllık İzin Geçici Görev Devri';
      // Varsayılan bitişi 10 gün sonraya ayarla
      const endDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
      modal.element.querySelector('#vekaletBitis').value = endDate.toISOString().slice(0, 16);
      toast.info(isEn ? 'Template applied: Scheduled leave handover activated.' : 'Şablon uygulandı: Saatli & Tarihli İzin Vekaleti aktif.');
    } else if (val === 'depolojistik') {
      radioDevir.checked = true;
      if (wrapZaman) wrapZaman.style.display = 'none';
      modal.element.querySelector('#modalVekilNedeni').value = isEn ? 'Wednesday Logistics & Warehouse Lead Assignment' : 'Çarşamba Dağıtım ve Depo Sorumlusu Görevlendirmesi';
    }
  });

  modal.element.querySelector('#btnVekaletIptal').onclick = () => modal.close();

  // Yetkiyi Geri Al Butonu
  const btnSonlandir = modal.element.querySelector('#btnVekaletSonlandir');
  if (btnSonlandir) {
    btnSonlandir.onclick = async () => {
      const ok = await confirmModal({
        title: isEn ? 'Revoke Authority' : 'Yetkiyi Geri Al',
        message: isEn ? 'The active delegation will be terminated and all approval and inventory controls will revert to the Procurement Director seat. Do you confirm?' : 'Aktif görev devri sonlandırılarak tüm kırtasiye onay ve yönetim yetkileri Satın Alma Müdürü makamına iade edilecektir. Onaylıyor musunuz?',
        confirmText: isEn ? 'Yes, Revoke Delegation' : 'Evet, Yetkiyi Geri Al',
        confirmVariant: 'danger'
      });
      if (!ok) return;

      try {
        await api.sonlandirGorevDevri();
        localStorage.removeItem('satinalma_vekil_info');
        toast.success(isEn ? 'Delegation terminated. Authority reverted to Procurement Director.' : 'Görev devri sonlandırıldı. Yetki Satın Alma Müdürü makamına iade edildi.');
        modal.close();
        if (typeof onUpdated === 'function') onUpdated();
      } catch (err) {
        toast.error((isEn ? 'Could not revoke authority: ' : 'Yetki geri alınamadı: ') + err.message);
      }
    };
  }

  // Kaydet Butonu
  modal.element.querySelector('#btnVekaletKaydet').onclick = async () => {
    const selectedOption = sel.options[sel.selectedIndex];
    const val = sel.value;

    if (!val) {
      const ok = await confirmModal({
        title: isEn ? 'Revoke Authority' : 'Yetkiyi Geri Al',
        message: isEn ? 'No staff selected. Active delegation will be canceled and authority will revert to Procurement Director. Do you confirm?' : 'Personel seçilmedi. Aktif görev devri iptal edilecek ve yetkiler Satın Alma Müdürü makamına iade edilecektir. Onaylıyor musunuz?',
        confirmText: isEn ? 'Yes, Revert' : 'Evet, İade Et',
        confirmVariant: 'danger'
      });
      if (!ok) return;

      try {
        await api.sonlandirGorevDevri();
        localStorage.removeItem('satinalma_vekil_info');
        toast.info(isEn ? 'No staff selected, authority reverted to Procurement Director.' : 'Personel seçilmedi, yetki Satın Alma Müdürü makamına iade edildi.');
        modal.close();
        if (typeof onUpdated === 'function') onUpdated();
      } catch (err) {
        toast.error(err.message);
      }
      return;
    }

    const selectedModel = modal.element.querySelector('input[name="yetkiModeli"]:checked')?.value || 'devir';
    const baslangicVal = modal.element.querySelector('#vekaletBaslangic')?.value || null;
    const bitisVal = modal.element.querySelector('#vekaletBitis')?.value || null;
    const nedenVal = modal.element.querySelector('#modalVekilNedeni')?.value || null;

    try {
      const payload = {
        alan_personel_id: parseInt(val, 10),
        tur: selectedModel,
        rol_model_etiket: selectedModel === 'izin' ? 'Yıllık İzin Vekili' : 'Kırtasiye ve Depo Sorumlusu',
        neden: nedenVal,
        baslangic_tarihi: selectedModel === 'izin' ? baslangicVal : null,
        bitis_tarihi: selectedModel === 'izin' ? bitisVal : null
      };

      const res = await api.kaydetGorevDevri(payload);

      // İstemci yerel durumunu da güncelle
      const localInfo = {
        personelId: parseInt(val, 10),
        adSoyad: selectedOption.dataset.name,
        eposta: selectedOption.dataset.email,
        birimAdi: selectedOption.dataset.birim,
        telefon: selectedOption.dataset.tel,
        tur: selectedModel,
        turEtiket: selectedModel === 'izin' ? 'Yıllık İzin Vekili' : 'Kırtasiye Sorumlusu',
        rolModelEtiket: selectedModel === 'izin' ? 'Yıllık İzin Vekili' : 'Kırtasiye Sorumlusu',
        neden: nedenVal,
        bitis: bitisVal
      };
      localStorage.setItem('satinalma_vekil_info', JSON.stringify(localInfo));

      toast.success(res.mesaj || (isEn ? `Authority successfully delegated: ${selectedOption.dataset.name}` : `Kırtasiye yönetim yetkisi başarıyla devredildi: ${selectedOption.dataset.name}`));
      modal.close();
      if (typeof onUpdated === 'function') onUpdated();
    } catch (err) {
      toast.error((isEn ? 'Could not delegate authority: ' : 'Yetki devredilemedi: ') + err.message);
    }
  };
}

if (typeof window !== 'undefined') {
  window.openVekaletModal = openVekaletModal;
}

export default openVekaletModal;
