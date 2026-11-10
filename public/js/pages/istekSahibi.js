// istekSahibi.js - Birim İstek Sahibi (Personel) Seçim Ekranı
import api from '../api.js';
import state from '../state.js';
import toast from '../components/toast.js';

export async function renderIstekSahibi(appContainer) {
  const user = state.user;

  appContainer.innerHTML = `
    <div style="min-height: calc(100vh - 120px); display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div class="card" style="max-width: 520px; width: 100%; padding: 32px; box-shadow: var(--shadow-lg);">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="font-size: 20px; margin-bottom: 6px;">İstek Sahibi Belirleme</h2>
          <p style="color: var(--color-muted-foreground); font-size: 14px;">
            <strong>${user?.birimAdi || 'Biriminiz'}</strong> adına bu talebi kimin oluşturduğunu seçiniz veya yeni kişi ekleyiniz.
          </p>
        </div>

        <!-- Personel Seçim / Yeni Ekleme Sekmeleri -->
        <div style="display: flex; gap: 8px; margin-bottom: 20px; background-color: var(--color-muted); padding: 4px; border-radius: var(--radius-md);">
          <button id="tabSecim" class="btn btn-sm" style="flex: 1; background-color: #FFFFFF; box-shadow: var(--shadow-sm);">Listeden Seç</button>
          <button id="tabYeni" class="btn btn-sm" style="flex: 1; color: var(--color-muted-foreground);">Yeni Personel Ekle</button>
        </div>

        <!-- Form 1: Listeden Seç -->
        <form id="secimForm" style="display: flex; flex-direction: column; gap: 16px;">
          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">Personel Listesi</label>
            <select id="personelSelect" required>
              <option value="">Yükleniyor...</option>
            </select>
          </div>

          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">Kurumsal E-Posta Adresi</label>
            <input type="email" id="personelEposta" placeholder="ad.soyad@kurum.edu.tr" required>
            <span style="font-size: 12px; color: var(--color-muted-foreground); margin-top: 4px; display: block;">
              Talep onay ve teslimat bilgilendirme mesajları bu adrese gönderilecektir.
            </span>
          </div>

          <button type="submit" class="btn btn-accent" style="width: 100%; padding: 12px; margin-top: 8px;">
            Seçimi Onayla ve Kataloğa Geç
          </button>
        </form>

        <!-- Form 2: Yeni Personel Ekle -->
        <form id="yeniForm" style="display: none; flex-direction: column; gap: 16px;">
          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">Ad Soyad (Unvan Dahil)</label>
            <input type="text" id="yeniAdSoyad" placeholder="Örn: Dr. Ahmet Yılmaz" required>
          </div>

          <div>
            <label style="font-size: 13px; font-weight: 600; display: block; margin-bottom: 6px;">Kurumsal E-Posta Adresi</label>
            <input type="email" id="yeniEposta" placeholder="ad.soyad@kurum.edu.tr" required>
          </div>

          <button type="submit" class="btn btn-accent" style="width: 100%; padding: 12px; margin-top: 8px;">
            Kaydet ve Kataloğa Geç
          </button>
        </form>
      </div>
    </div>
  `;

  const tabSecim = appContainer.querySelector('#tabSecim');
  const tabYeni = appContainer.querySelector('#tabYeni');
  const secimForm = appContainer.querySelector('#secimForm');
  const yeniForm = appContainer.querySelector('#yeniForm');
  const select = appContainer.querySelector('#personelSelect');
  const inputEposta = appContainer.querySelector('#personelEposta');

  tabSecim.addEventListener('click', () => {
    tabSecim.style.backgroundColor = '#FFFFFF';
    tabSecim.style.color = 'var(--color-foreground)';
    tabYeni.style.backgroundColor = 'transparent';
    tabYeni.style.color = 'var(--color-muted-foreground)';
    secimForm.style.display = 'flex';
    yeniForm.style.display = 'none';
  });

  tabYeni.addEventListener('click', () => {
    tabYeni.style.backgroundColor = '#FFFFFF';
    tabYeni.style.color = 'var(--color-foreground)';
    tabSecim.style.backgroundColor = 'transparent';
    tabSecim.style.color = 'var(--color-muted-foreground)';
    secimForm.style.display = 'none';
    yeniForm.style.display = 'flex';
  });

  // Personel listesini yükle
  let personeller = [];
  try {
    const res = await api.getBirimPersoneller();
    personeller = res.personeller || [];

    if (personeller.length === 0) {
      select.innerHTML = '<option value="">Bu birimde henüz kayıtlı personel yok</option>';
      tabYeni.click();
    } else {
      select.innerHTML = personeller.map(p => `
        <option value="${p.id}" data-eposta="${p.eposta}">${p.ad_soyad} (${p.eposta})</option>
      `).join('');

      // İlk personelin e-postasını doldur
      if (personeller[0]) {
        inputEposta.value = personeller[0].eposta;
      }
    }
  } catch (err) {
    toast.error('Personel listesi yüklenemedi: ' + err.message);
  }

  select.addEventListener('change', () => {
    const selectedOpt = select.options[select.selectedIndex];
    if (selectedOpt) {
      inputEposta.value = selectedOpt.dataset.eposta || '';
    }
  });

  // Form 1 Submit: Listeden seç
  secimForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const personel_id = parseInt(select.value, 10);
    const eposta = inputEposta.value.trim();

    if (!personel_id) {
      toast.error('Lütfen bir personel seçiniz.');
      return;
    }

    try {
      const res = await api.selectPersonel({ personel_id, eposta });
      state.setUser({
        ...state.user,
        seciliPersonel: res.seciliPersonel
      });
      toast.success(`İstek sahibi: ${res.seciliPersonel.adSoyad}`);
      location.hash = '#/katalog';
    } catch (err) {
      toast.error(err.message);
    }
  });

  // Form 2 Submit: Yeni ekle
  yeniForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const ad_soyad = yeniForm.querySelector('#yeniAdSoyad').value.trim();
    const eposta = yeniForm.querySelector('#yeniEposta').value.trim();

    try {
      const res = await api.addPersonel({ ad_soyad, eposta });
      state.setUser({
        ...state.user,
        seciliPersonel: res.seciliPersonel
      });
      toast.success(`Personel eklendi ve seçildi: ${res.seciliPersonel.adSoyad}`);
      location.hash = '#/katalog';
    } catch (err) {
      toast.error(err.message);
    }
  });
}

export default renderIstekSahibi;
