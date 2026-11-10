// hizliTeslim.js - Mobil QR Kod ile Hızlı Teslimat Onay Ekranı
import api from '../api.js';
import toast from '../components/toast.js';

export async function renderHizliTeslim(appContainer, talepNo) {
  appContainer.innerHTML = `
    <div style="min-height: 100vh; width: 100%; display: flex; align-items: center; justify-content: center; padding: 16px; box-sizing: border-box; background: #f8fafc;">
      <div class="card" style="max-width: 520px; width: 100%; padding: 24px; box-shadow: 0 12px 36px rgba(15, 23, 42, 0.12); border-radius: 20px; border: 1.5px solid rgba(226, 232, 240, 0.9); background: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="/assets/logo.svg" alt="KampüsStok" style="height: 54px; width: auto; object-fit: contain; margin-bottom: 10px;">
          <h2 style="font-size: 19px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">Malzeme Teslim Onayı</h2>
          <p style="color: #64748b; font-size: 13px;">QR Kod Doğrulamalı Hızlı Teslimat Sayfası</p>
        </div>

        <div id="hizliTeslimIcerik">
          <div style="text-align: center; padding: 32px; color: #64748b;">
            Talep bilgileri yükleniyor...
          </div>
        </div>
      </div>
    </div>
  `;

  const container = appContainer.querySelector('#hizliTeslimIcerik');
  if (!talepNo) {
    container.innerHTML = `
      <div style="text-align: center; padding: 20px; color: #dc2626;">
        <div style="font-weight: 800; font-size: 16px; margin-bottom: 4px;">Uyarı</div>
        <strong>Geçersiz Talep Numarası</strong>
      </div>
    `;
    return;
  }

  try {
    const res = await api.getHizliTeslimBilgi(talepNo);
    const talep = res.talep;
    const kalemler = res.kalemler || [];

    const isAlreadyDelivered = talep.kullanici_teslim_aldi === 1;

    container.innerHTML = `
      <div>
        <!-- Talep Özet Kartı -->
        <div style="background: rgba(241, 245, 249, 0.7); border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px 16px; margin-bottom: 18px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-weight: 800; color: #2563eb; font-size: 15px;">${talep.talep_no}</span>
            <span class="badge ${isAlreadyDelivered ? 'badge-success' : 'badge-primary'}" style="font-size: 11px; padding: 3px 8px;">
              ${isAlreadyDelivered ? '✓ Teslim Edildi' : talep.durum}
            </span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; color: #334155;">
            <div><strong>Birim:</strong> ${talep.birim_adi}</div>
            <div><strong>İstek Sahibi:</strong> ${talep.personel_adi}</div>
            ${(talep.bina_adi || talep.oda_no) ? `<div><strong>Adres:</strong> ${[talep.bina_adi, talep.oda_no ? 'Oda: ' + talep.oda_no : ''].filter(Boolean).join(' • ')}</div>` : ''}
            <div><strong>Planlanan Teslimat:</strong> ${talep.teslimatTarihiText}</div>
          </div>
        </div>

        <!-- Malzeme Listesi -->
        <h4 style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Teslim Edilecek Malzemeler (${kalemler.length} Kalem)</h4>
        <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 20px;">
          ${kalemler.map((k, idx) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; border-bottom: ${idx < kalemler.length - 1 ? '1px solid #f1f5f9' : 'none'}; font-size: 13px;">
              <div>
                <strong style="color: #0f172a;">${k.urun_adi}</strong>
                ${k.demirbas ? `<span class="badge" style="background: #ede9fe; color: #6d28d9; border: 1px solid #ddd6fe; font-size: 10px; padding: 0 5px; margin-left: 4px;">Dayanıklı</span>` : ''}
                <div style="font-size: 11px; color: #64748b;">${k.olcu_birimi}</div>
              </div>
              <div style="text-align: right;">
                <span style="font-weight: 800; font-size: 14px; color: #1e3a8a;">
                  ${k.onaylanan_adet !== null ? k.onaylanan_adet : k.istenen_adet} ${k.olcu_birimi}
                </span>
              </div>
            </div>
          `).join('')}
        </div>

        ${isAlreadyDelivered ? `
          <div style="background: #ecfdf5; border: 1.5px solid #a7f3d0; border-radius: 14px; padding: 16px; text-align: center; margin-bottom: 16px;">
            <div style="font-weight: 800; color: #065f46; font-size: 15px;">Teslimat Daha Önce Onaylanmıştır</div>
            <div style="font-size: 12.5px; color: #047857; margin-top: 4px;">
              Onay Tarihi: ${talep.kullanici_teslim_tarihi ? talep.kullanici_teslim_tarihi.substring(0, 16) : 'Kayıtlı'}
            </div>
          </div>
        ` : `
          <div style="margin-bottom: 16px;">
            <label style="font-size: 12px; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">Teslimat Notu (İsteğe Bağlı)</label>
            <input type="text" id="hizliTeslimNot" placeholder="Örn: Eksiksiz teslim alındı / Depocudan elden teslim alındı" style="width: 100%; font-size: 13px;">
          </div>

          <button id="btnHizliTeslimOnayla" class="btn btn-primary" style="width: 100%; padding: 14px; font-size: 15px; font-weight: 800; background: linear-gradient(180deg, #059669 0%, #047857 100%); border: none; border-radius: 12px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35); cursor: pointer;">
            Malzemeleri Teslim Aldım / Ettim
          </button>
        `}

        <div style="text-align: center; margin-top: 16px;">
          <a href="#/giris" style="font-size: 12.5px; color: var(--color-primary); text-decoration: none; font-weight: 600;">
            ← Portal Ana Sayfasına Dön
          </a>
        </div>
      </div>
    `;

    if (!isAlreadyDelivered) {
      container.querySelector('#btnHizliTeslimOnayla')?.addEventListener('click', async () => {
        const not = container.querySelector('#hizliTeslimNot')?.value || '';
        try {
          const btn = container.querySelector('#btnHizliTeslimOnayla');
          btn.disabled = true;
          btn.textContent = 'Onaylanıyor...';

          const res = await api.hizliTeslimOnayla(talepNo, not);
          toast.success(res.mesaj);

          renderHizliTeslim(appContainer, talepNo);
        } catch (err) {
          toast.error(err.message);
        }
      });
    }

  } catch (err) {
    container.innerHTML = `
      <div style="text-align: center; padding: 24px; color: #dc2626;">
        <div style="font-weight: 800; font-size: 15px; margin-bottom: 4px;">Hata Oluştu</div>
        <div style="font-size: 13px;">${err.message}</div>
        <div style="margin-top: 16px;">
          <a href="#/giris" class="btn btn-secondary btn-sm">Giriş Ekranına Dön</a>
        </div>
      </div>
    `;
  }
}

export default renderHizliTeslim;
