// rehber.js - Kurumsal Organizasyon Hiyerarşisi & Telefon Rehberi (Apple Liquid Glass UI, İkonsuz)
import api from '../api.js';
import toast from '../components/toast.js';
import createModal, { confirmModal } from '../components/modal.js';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function cleanAdSoyad(name) {
  if (!name) return '';
  return name.replace(/^(prof\.\s*dr\.|prof\.|doç\.\s*dr\.|doç\.|dr\.\s*öğr\.\s*üyesi|dr\.\s*öğr\.\s*gör\.|öğr\.\s*gör\.\s*dr\.|öğr\.\s*gör\.|arş\.\s*gör\.\s*dr\.|arş\.\s*gör\.|dr\.|uzm\.\s*dr\.|uzm\.)\s+/gi, '').trim();
}

function getInitials(name) {
  if (!name) return '??';
  const clean = cleanAdSoyad(name).trim().split(/\s+/);
  if (clean.length === 1) return clean[0].substring(0, 2).toLocaleUpperCase('tr-TR');
  return (clean[0][0] + clean[clean.length - 1][0]).toLocaleUpperCase('tr-TR');
}

/**
 * Görev ve Unvan Hiyerarşik Öncelik Puanı (Görev 6: En üstte Rektör, Dekan, Bölüm Başkanı, Müdür vb.)
 */
// Görev ve Unvan Hiyerarşi Sıralaması (Görev 3: En üstte Rektör, Rektör Yrd, Dekan, Bölüm Başkanı, Müdür vb.)
function getGorevRank(p) {
  const g = (p.gorev || '').trim().toLowerCase();
  const u = (p.unvan || '').trim().toLowerCase();
  const ad = (p.ad_soyad || '').trim().toLowerCase();

  // 1. REKTÖR (Rektör Danışmanı, Katı veya Güvenlik hariç tam yetkili Rektör)
  if (g === 'rektör' || (g.includes('rektör') && !g.includes('yardımc') && !g.includes('danışman') && !g.includes('katı') && !g.includes('güvenlik'))) {
    return 1;
  }

  // 2. REKTÖR YARDIMCISI (Gerçek personel)
  if (g.includes('rektör yardımcısı') || g.includes('rektör yrd') || g.includes('rektör y.')) {
    if (ad.includes('fuaye') || ad.includes('güvenlik') || ad.includes('katı')) return 50;
    return 2;
  }

  // 3. REKTÖR DANIŞMANI
  if (g.includes('rektör danışmanı') || g.includes('danışman')) {
    return 3;
  }

  // 4. ÖZEL KALEM MÜDÜRÜ
  if (g.includes('özel kalem')) {
    return 4;
  }

  // 5. DEKAN
  if (g === 'dekan' || (g.includes('dekan') && !g.includes('yardımc') && !g.includes('danışman') && !g.includes('sekreter'))) {
    return 5;
  }

  // 6. DEKAN YARDIMCISI
  if (g.includes('dekan yardımcısı') || g.includes('dekan yrd') || g.includes('dekan y.')) {
    return 6;
  }

  // 7. GENEL SEKRETER
  if (g === 'genel sekreter' || (g.includes('genel sekreter') && !g.includes('yardımc'))) {
    return 7;
  }

  // 8. GENEL SEKRETER YARDIMCISI
  if (g.includes('genel sekreter yardımcısı') || g.includes('genel sekreter yrd') || g.includes('genel sekreter y.')) {
    return 8;
  }

  // 9. ENSTİTÜ MÜDÜRÜ / MÜDÜR
  if ((g.includes('enstitü müdür') && !g.includes('yardımc')) || (g === 'müdür' || (g.includes('müdür') && !g.includes('yardımc') && !g.includes('şube')))) {
    return 9;
  }

  // 10. MÜDÜR YARDIMCISI / ŞUBE MÜDÜRÜ
  if (g.includes('müdür yardımcısı') || g.includes('müdür yrd') || g.includes('şube müdürü')) {
    return 10;
  }

  // 11. BÖLÜM BAŞKANI
  if (g.includes('bölüm başkanı') || g.includes('anabilim dalı başkanı') || g.includes('ana bilim dalı başkanı')) {
    return 11;
  }

  // 12. BÖLÜM BAŞKAN YARDIMCISI
  if (g.includes('bölüm başkan yardımcısı') || g.includes('bölüm başkan yrd')) {
    return 12;
  }

  // 13. AKADEMİK UNVANLAR (Prof -> Doç -> Dr. Öğr. Üyesi -> Öğr. Gör. -> Arş. Gör.)
  if (u.includes('prof') || g.includes('prof')) return 20;
  if (u.includes('doç') || g.includes('doç')) return 21;
  if (u.includes('dr. öğr') || u.includes('doktor') || g.includes('öğretim üyesi')) return 22;
  if (u.includes('öğr. gör') || g.includes('öğretim görevlisi')) return 23;
  if (u.includes('arş. gör') || g.includes('araştırma görevlisi')) return 24;

  // 14. İDARİ ROLLER
  if (g.includes('uzman') || g.includes('avukat') || g.includes('mühendis') || g.includes('şef')) return 30;

  // 15. SEKRETERLİK
  if (g.includes('fakülte sekreteri') || g.includes('enstitü sekreteri')) return 40;
  if (g.includes('sekreter')) return 45;
  if (g.includes('memur') || g.includes('bilgisayar işletmeni')) return 48;

  return 100;
}

export default async function renderRehber(appContainer) {
  appContainer.innerHTML = `
    <div class="rehber-page-wrap" style="width: 100%; max-width: 100%; box-sizing: border-box;">
      <!-- Üst Başlık ve Aksiyon Kontrolleri -->
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 24px;">
        <div>
          <h2 style="font-size: 26px; font-weight: 700; letter-spacing: -0.02em; color: #0F172A;">Kurumsal Rehber & Yetkilendirme</h2>
          <p style="color: var(--text-dim); font-size: 13.5px; margin-top: 4px;" id="treeStats">
            Kurumsal ağaç yapısı ve telefon rehberi yükleniyor...
          </p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <button id="btnTreeToggleAll" class="btn btn-secondary btn-sm">
            <span id="btnTreeToggleText">Tümünü Genişlet</span>
          </button>
          <button id="btnTopluHesapModal" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; border-color: #3b82f6; color: #1d4ed8; background: rgba(59, 130, 246, 0.08); font-weight: 600;">
            Toplu Hesap Tanımla
          </button>
          <button id="btnExcelAktarModal" class="btn btn-secondary btn-sm" style="display: inline-flex; align-items: center; gap: 6px; border-color: #10B981; color: #047857; background: rgba(16, 185, 129, 0.08); font-weight: 600;">
            Excel İçe Aktar
          </button>
          <button id="btnYeniBirimModalTree" class="btn btn-secondary btn-sm">
            + Yeni Birim
          </button>
          <button id="btnYeniPersonelModal" class="btn btn-primary btn-sm">
            + Yeni Kişi Ekle
          </button>
        </div>
      </div>

      <!-- Kategori Filtresi & Canlı Arama Çubuğu (Görev 2, 4, 5) -->
      <div class="card" style="padding: 14px 20px; margin-bottom: 22px; display: flex; flex-direction: column; gap: 14px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <!-- Kategori Sekmeleri (Apple Pill Nav) -->
          <div style="display: flex; gap: 6px; background: rgba(226, 232, 240, 0.6); padding: 4px; border-radius: 9999px; flex-wrap: wrap;">
            <button class="btn btn-sm btn-kategori-filtre active" data-tur="tumu" style="padding: 6px 16px; border-radius: 9999px; font-size: 12.5px;">
              Tümü
            </button>
            <button class="btn btn-sm btn-kategori-filtre" data-tur="akademik" style="padding: 6px 16px; border-radius: 9999px; font-size: 12.5px;">
              Akademik Birimler
            </button>
            <button class="btn btn-sm btn-kategori-filtre" data-tur="idari" style="padding: 6px 16px; border-radius: 9999px; font-size: 12.5px;">
              İdari Birimler
            </button>
            <button class="btn btn-sm btn-kategori-filtre" data-tur="merkezler" style="padding: 6px 16px; border-radius: 9999px; font-size: 12.5px;">
              Araştırma Merkezleri
            </button>
          </div>

          <!-- Canlı Arama -->
          <div style="flex: 1; min-width: 260px; max-width: 480px; position: relative;">
            <input type="text" id="treeSearchInput" placeholder="Kişi, unvan, görev, dahili no veya birim ara..." style="width: 100%; padding: 8px 16px; font-size: 13px; border-radius: 9999px;">
          </div>
        </div>
      </div>

      <!-- Devre / Ağaç Hiyerarşi Konteyneri -->
      <div id="treeContentArea">
        <div style="text-align: center; padding: 48px; color: var(--text-dim); font-size: 14px;">
          Rehber ve hiyerarşi yükleniyor...
        </div>
      </div>
    </div>
  `;

  let hiyerarsiData = null;
  let allExpanded = false;
  let aktifKategori = 'tumu'; // 'tumu', 'akademik', 'idari', 'merkezler'
  let openUnitIds = new Set();

  const loadTree = async () => {
    try {
      const res = await api.getYonetimHiyerarsi();
      hiyerarsiData = res;
      const statsEl = appContainer.querySelector('#treeStats');
      if (statsEl) {
        statsEl.textContent = `Toplam ${res.toplamBirim || 0} Birim (${res.toplamTalebeAcikBirim || 0} Talebe Açık) • ${res.toplamPersonel || 0} Personel (${res.toplamHesap || 0} Giriş Hesabı Tanımlı)`;
      }
      renderTreeList(appContainer.querySelector('#treeSearchInput')?.value || '');
    } catch (err) {
      const area = appContainer.querySelector('#treeContentArea');
      if (area) {
        area.innerHTML = `
          <div class="card" style="padding: 32px; text-align: center;">
            <div style="font-weight: 700; color: #dc2626; margin-bottom: 8px;">Bağlantı Hatası</div>
            <div style="color: #DC2626; font-weight: 600; font-size: 15px; margin-bottom: 8px;">
              Rehber verileri alınamadı (${err.message})
            </div>
            <p style="color: #64748B; font-size: 13px; margin-bottom: 16px;">
              Sunucu bağlantısı anlık olarak yenilenmiş olabilir. Lütfen tekrar deneyiniz.
            </p>
            <button id="btnRetryTree" class="btn btn-primary btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
              Yeniden Dene
            </button>
          </div>
        `;
        area.querySelector('#btnRetryTree')?.addEventListener('click', () => loadTree());
      }
    }
  };

  /**
   * Personelleri Görev Rankına ve Ad Soyad A-Z'ye göre sırala (Görev 6 & 7)
   */
  const sortPersons = (list) => {
    return [...list].sort((a, b) => {
      const rDiff = getGorevRank(a) - getGorevRank(b);
      if (rDiff !== 0) return rDiff;
      const nameA = cleanAdSoyad(a.ad_soyad);
      const nameB = cleanAdSoyad(b.ad_soyad);
      return nameA.localeCompare(nameB, 'tr-TR');
    });
  };

  /**
   * Birimin altındaki toplam kişi sayısını özyinelemeli hesapla
   */
  const countTotalPersons = (node) => {
    let count = node.personeller?.length || 0;
    if (node.altBirimler && node.altBirimler.length > 0) {
      for (const sub of node.altBirimler) {
        count += countTotalPersons(sub);
      }
    }
    return count;
  };

  /**
   * Personel Şifre Sıfırlama ve Outlook Taslağı Oluşturma
   */
  const sifreSifirlaVeOutlookGonder = async (personelId, adSoyad, eposta) => {
    try {
      const res = await api.sifirlaPersonelSifre(personelId, 'Etu1234!.');
      toast.success(`${adSoyad} şifresi sıfırlandı. Outlook bildirim taslağı açılıyor...`);

      const portalUrl = window.location.origin;
      const targetEmail = eposta || res.eposta;
      const subject = encodeURIComponent('Üniversite Kırtasiye Portalı - Giriş Şifreniz Sıfırlandı');
      const body = encodeURIComponent(
`Sayın ${adSoyad},

Üniversite Kırtasiye ve Ofis Malzemesi Talep Portalı giriş şifreniz güncellenmiştir.

Portal Giriş Adresi : ${portalUrl}
Kullanıcı Adı       : ${targetEmail || res.kullanici_adi}
Geçici Şifre        : Etu1234!.

Kurumsal güvenliğiniz için sisteme ilk girişinizde şifrenizi yenilemeniz istenecektir.

Bilgilerinize sunar, iyi çalışmalar dileriz.
Üniversite Satın Alma Müdürlüğü
İdari İşler Müdürlüğü`
      );

      const mailtoUrl = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
      window.location.href = mailtoUrl;

      createModal({
        title: 'Şifre Sıfırlandı ve Outlook Taslağı Hazırlandı',
        content: `
          <div style="padding: 6px 0;">
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
              <div style="font-weight: 700; color: #065f46; font-size: 14px; margin-bottom: 4px;">Şifre Başarıyla Sıfırlandı</div>
              <div style="font-size: 13px; color: #047857;"><strong>${adSoyad}</strong> için yeni şifre: <code style="font-size: 13px; font-weight: 800; background: #fff; padding: 2px 8px; border-radius: 4px; border: 1px solid #6ee7b7;">Etu1234!.</code></div>
            </div>
            <p style="font-size: 13px; color: #334155; margin-bottom: 12px; line-height: 1.5;">
              Varsayılan e-posta istemcinizde (Microsoft Outlook) alıcı adresi, konu ve şifre bilgileriyle birlikte hazır taslak açılmıştır. Doğrudan <strong>Gönder</strong> butonuna basmanız yeterlidir.
            </p>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; font-size: 12px; font-family: monospace; white-space: pre-wrap; color: #1e293b; margin-bottom: 16px;">Kullanıcı Adı: ${targetEmail || res.kullanici_adi}\nGeçici Şifre : Etu1234!.\nGiriş Adresi : ${portalUrl}</div>
          </div>
        `,
        buttons: [
          {
            text: 'Giriş Bilgilerini Kopyala',
            class: 'btn-secondary',
            onClick: () => {
              navigator.clipboard.writeText(`Kullanıcı Adı: ${targetEmail || res.kullanici_adi}\nGeçici Şifre: Etu1234!.\nGiriş Adresi: ${portalUrl}`);
              toast.success('Giriş bilgileri panoya kopyalandı.');
            }
          },
          {
            text: 'Outlook Taslağını Yeniden Aç',
            class: 'btn-primary',
            onClick: () => {
              window.location.href = mailtoUrl;
            }
          },
          {
            text: 'Kapat',
            class: 'btn-outline',
            onClick: (m) => m.close()
          }
        ]
      });
    } catch (err) {
      toast.error(`Şifre sıfırlanamadı: ${err.message}`);
    }
  };

  /**
   * Tek bir personel satırı HTML'i üret (Görev 1: Dirsekli hat & parlayan düğüm; Görev 7: İsim önde, unvan badge'de)
   */
  const renderPersonRowHtml = (p, levelClass, isLast) => {
    const cleanName = cleanAdSoyad(p.ad_soyad);
    const initials = getInitials(cleanName);

    return `
      <div class="tree-row ${levelClass} ${isLast ? 'last-node' : ''}" data-person-id="${p.id}">
        <div class="tree-row-left">
          <div class="tree-node-col">
            <div class="tree-avatar">${initials}</div>
          </div>
          <div class="tree-content">
            <div class="tree-title" style="font-size: 13.5px; font-weight: 600; color: #1E293B;">
              ${cleanName}
            </div>
            <div class="tree-desc" style="font-size: 12px; color: var(--text-dim); margin-top: 2px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              ${p.unvan ? `<span class="badge badge-neutral" style="font-size: 11px; font-weight: 700; color: #0284C7; background: rgba(2, 132, 199, 0.12); padding: 1px 8px; border-radius: 9999px;">${p.unvan}</span>` : ''}
              ${p.gorev ? `<span class="badge badge-neutral" style="font-size: 11px; padding: 1px 8px; border-radius: 9999px;">${p.gorev}</span>` : ''}
              ${p.eposta ? `<span>${p.eposta}</span>` : ''}
              ${p.telefon ? `<span style="margin-left: 6px;">• Dahili: <strong>${p.telefon}</strong></span>` : ''}
              ${p.hesap_id ? `<span class="badge" style="font-size: 11px; font-weight: 600; color: #059669; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25); padding: 1px 8px; border-radius: 9999px;" title="Kullanıcı adı: ${escapeHtml(p.hesap_kullanici_adi || p.eposta)}">Hesap: ${escapeHtml(p.hesap_kullanici_adi || p.eposta)}</span>` : `<span class="badge" style="font-size: 11px; font-weight: 500; color: #64748B; background: rgba(100, 116, 139, 0.1); border: 1px solid rgba(148, 163, 184, 0.25); padding: 1px 8px; border-radius: 9999px;">Hesap Yok</span>`}
            </div>
          </div>
        </div>
        <div class="tree-meta">
          <div class="tree-actions" style="display: flex; gap: 6px;">
            <button class="btn btn-outline btn-sm btn-personel-sifre-outlook" data-id="${p.id}" data-name="${cleanName}" data-email="${p.eposta || ''}" style="font-size: 11px; padding: 4px 8px; color: #2563eb; border-color: #93c5fd; background: rgba(239, 246, 255, 0.7); display: inline-flex; align-items: center; gap: 4px;" title="Şifreyi sıfırla ve Outlook ile bildirim gönder">
              Şifre ve Outlook
            </button>
            <button class="btn btn-secondary btn-sm btn-personel-duzenle" data-id="${p.id}" style="font-size: 12px; padding: 4px 10px;">Düzenle</button>
            <button class="btn btn-secondary btn-sm btn-personel-sil" data-id="${p.id}" data-name="${cleanName}" style="font-size: 12px; padding: 4px 10px; color: #DC2626;">Sil</button>
          </div>
        </div>
      </div>
    `;
  };

  const renderTreeList = (filterTerm = null) => {
    if (!hiyerarsiData || !hiyerarsiData.kokBirimler) return;

    const rawTerm = filterTerm !== null ? filterTerm : (appContainer.querySelector('#treeSearchInput')?.value || '');
    const term = rawTerm.trim().toLocaleLowerCase('tr-TR');
    const treeArea = appContainer.querySelector('#treeContentArea');
    if (!treeArea) return;

    const matchesFilter = (text) => {
      if (!term) return true;
      return (text || '').toLocaleLowerCase('tr-TR').includes(term);
    };

    const nodeHasMatch = (node) => {
      if (!term) return true;
      if (matchesFilter(node.ad)) return true;
      const personMatch = (node.personeller || []).some(p =>
        matchesFilter(cleanAdSoyad(p.ad_soyad)) ||
        matchesFilter(p.eposta) ||
        matchesFilter(p.gorev) ||
        matchesFilter(p.unvan) ||
        matchesFilter(p.telefon)
      );
      if (personMatch) return true;
      return (node.altBirimler || []).some(sub => nodeHasMatch(sub));
    };

    // 1. Doğrudan Eşleşen Personeller Kart Bölümü (Arama Terimi Varsa)
    let directSearchResultsHtml = '';
    if (term.length >= 2) {
      const collectAllPersonsWithUnit = (nodes, parentPath = '') => {
        let list = [];
        for (const n of nodes) {
          const path = parentPath ? `${parentPath} › ${n.ad}` : n.ad;
          if (n.personeller) {
            for (const p of n.personeller) {
              list.push({ ...p, birim_adi: n.ad, birim_yolu: path });
            }
          }
          if (n.altBirimler) {
            list = list.concat(collectAllPersonsWithUnit(n.altBirimler, path));
          }
        }
        return list;
      };

      const allFlattenedPersons = collectAllPersonsWithUnit(hiyerarsiData.kokBirimler);
      const matches = allFlattenedPersons.filter(p => {
        return matchesFilter(cleanAdSoyad(p.ad_soyad)) ||
               matchesFilter(p.eposta) ||
               matchesFilter(p.gorev) ||
               matchesFilter(p.unvan) ||
               matchesFilter(p.telefon) ||
               matchesFilter(p.birim_adi);
      });

      if (matches.length > 0) {
        directSearchResultsHtml = `
          <div class="card" style="padding: 20px; margin-bottom: 24px; border: 1.5px solid #3b82f6; background: rgba(239, 246, 255, 0.75); backdrop-filter: blur(12px); box-shadow: 0 10px 25px rgba(37, 99, 235, 0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
              <div>
                <h3 style="font-size: 16px; font-weight: 800; color: #1e3a8a; display: flex; align-items: center; gap: 8px;">
                  <span>Doğrudan Eşleşen Personeller</span>
                  <span class="badge badge-primary" style="font-size: 11px;">${matches.length} Kişi Bulundu</span>
                </h3>
                <p style="font-size: 12.5px; color: #475569; margin-top: 2px;">
                  "<strong>${escapeHtml(rawTerm)}</strong>" aramasıyla eşleşen personeller aşağıda doğrudan listelenmiştir.
                </p>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px;">
              ${matches.map(p => {
                const cleanName = cleanAdSoyad(p.ad_soyad);
                const initials = getInitials(cleanName);
                return `
                  <div class="card" style="padding: 14px 16px; background: #ffffff; border: 1px solid #bfdbfe; border-radius: 12px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                    <div style="display: flex; gap: 12px; align-items: flex-start;">
                      <div class="tree-avatar" style="background: rgba(224, 242, 254, 0.95); color: #0284C7; font-weight: 700; width: 42px; height: 42px; font-size: 14px; flex-shrink: 0;">
                        ${initials}
                      </div>
                      <div style="flex: 1; min-width: 0;">
                        <div style="font-size: 14.5px; font-weight: 700; color: #0f172a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                          ${cleanName}
                        </div>
                        <div style="font-size: 12px; color: #2563eb; font-weight: 700; margin-top: 2px;">
                          ${escapeHtml(p.birim_adi)}
                        </div>
                        <div style="font-size: 11.5px; color: var(--text-dim); margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
                          ${p.unvan ? `<span class="badge badge-neutral" style="font-size: 10.5px; font-weight: 700; color: #0284C7; background: rgba(2, 132, 199, 0.12); padding: 1px 7px;">${escapeHtml(p.unvan)}</span>` : ''}
                          ${p.gorev ? `<span class="badge badge-neutral" style="font-size: 10.5px; padding: 1px 7px;">${escapeHtml(p.gorev)}</span>` : ''}
                          ${p.hesap_id ? `<span class="badge" style="font-size: 10.5px; font-weight: 600; color: #059669; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25); padding: 1px 7px; border-radius: 9999px;">Giriş Hesabı Var</span>` : `<span class="badge" style="font-size: 10.5px; font-weight: 500; color: #64748B; background: rgba(100, 116, 139, 0.1); border: 1px solid rgba(148, 163, 184, 0.25); padding: 1px 7px; border-radius: 9999px;">Hesap Yok</span>`}
                        </div>
                        <div style="font-size: 12px; color: #475569; margin-top: 6px; display: flex; flex-direction: column; gap: 2px;">
                          ${p.eposta ? `<span>${escapeHtml(p.eposta)}</span>` : ''}
                          ${p.telefon ? `<span>Dahili: <strong>${escapeHtml(p.telefon)}</strong></span>` : ''}
                          ${(p.bina_adi || p.oda_no) ? `<span>${escapeHtml([p.bina_adi, p.oda_no ? 'Oda: ' + p.oda_no : ''].filter(Boolean).join(' • '))}</span>` : ''}
                        </div>
                      </div>
                    </div>

                    <div style="display: flex; justify-content: flex-end; gap: 6px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                      <button class="btn btn-outline btn-sm btn-personel-sifre-outlook" data-id="${p.id}" data-name="${cleanName}" data-email="${p.eposta || ''}" style="font-size: 11px; padding: 4px 8px; color: #2563eb; border-color: #93c5fd; background: rgba(239, 246, 255, 0.7); display: inline-flex; align-items: center; gap: 4px;" title="Şifreyi sıfırla ve Outlook ile bildirim gönder">
                        Şifre ve Outlook
                      </button>
                      <button class="btn btn-secondary btn-sm btn-personel-duzenle" data-id="${p.id}" style="font-size: 11px; padding: 4px 8px;">Düzenle</button>
                      <button class="btn btn-secondary btn-sm btn-personel-sil" data-id="${p.id}" data-name="${cleanName}" style="font-size: 11px; padding: 4px 8px; color: #DC2626;">Sil</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }
    }

    // 2. Kök Birimleri Sırala
    let filteredRoots = [...hiyerarsiData.kokBirimler].sort((a, b) => {
      const getRootRank = (node) => {
        const name = (node.ad || '').toLowerCase();
        if (name.includes('rektörlük') && !name.includes('özel kalem') && !name.includes('yardımcı')) return 1;
        if (name.includes('genel sekreterlik')) return 2;
        return 10;
      };
      const rankA = getRootRank(a);
      const rankB = getRootRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return a.ad.localeCompare(b.ad, 'tr-TR');
    });

    // 3. Kategori Filtresi
    filteredRoots = filteredRoots.filter(root => {
      if ((root.ad || '').includes('Patent Temelli')) return false;
      if (aktifKategori === 'akademik') return root.ad === 'Akademik Birimler';
      if (aktifKategori === 'idari') return root.ad === 'İdari Birimler';
      if (aktifKategori === 'merkezler') return root.ad === 'Uygulama ve Araştırma Merkezleri';
      return true;
    });

    // Arama aktifse, eşleşmeyen kök birimleri filtrele/gizle
    if (term) {
      filteredRoots = filteredRoots.filter(root => nodeHasMatch(root));
    }

    let visibleRootsCount = 0;
    let html = `${directSearchResultsHtml}<div class="gorsel3-tree-view">`;

    for (const root of filteredRoots) {
      const rootTotal = countTotalPersons(root);
      const rootInitials = getInitials(root.ad);
      const isSearchActive = Boolean(term);
      const isRootExpanded = allExpanded || isSearchActive || aktifKategori !== 'tumu' || openUnitIds.has(`unit-children-${root.id}`);

      visibleRootsCount++;

      // Kök Birim Satırı (Level 0)
      html += `
        <div class="tree-unit-group" id="unit-group-${root.id}">
          <div class="tree-row root-node clickable-unit-row ${isRootExpanded ? 'is-expanded has-open-children' : ''}" data-target="unit-children-${root.id}" style="cursor: pointer;">
            <div class="tree-row-left">
              <div class="tree-node-col">
                <div class="tree-avatar" style="background: rgba(224, 242, 254, 0.95); color: #0284C7; font-weight: 700; border-color: #3B82F6;">
                  ${rootInitials}
                </div>
              </div>
              <div class="tree-content">
                <div class="tree-title" style="font-size: 15px; font-weight: 700; color: #0F172A;">
                  ${root.ad}
                </div>
                <div class="tree-desc" style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">
                  ${rootTotal} Kayıtlı Personel • ${root.altBirimler?.length || 0} Bağlı Birim
                </div>
              </div>
            </div>
            <div class="tree-meta" style="display: flex; align-items: center; gap: 8px;">
              <div class="unit-toggle-control btn-unit-durum-toggle" data-birim-id="${root.id}" data-birim-ad="${escapeHtml(root.ad)}" data-aktif="${root.aktif ? '1' : '0'}" style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 10px; border-radius: 9999px; background: rgba(241, 245, 249, 0.7); border: 1px solid rgba(203, 213, 225, 0.6); user-select: none;" title="${root.aktif ? 'Kırtasiye talebine açık (kapatmak için switch\'i kaydırın)' : 'Kırtasiye talebine kapalı (açmak için switch\'i kaydırın)'}">
                <div class="mini-settings-switch is-success ${root.aktif ? 'is-on' : 'is-off'}">
                  <div class="mini-switch-handle"></div>
                </div>
                <span style="font-size: 11.5px; font-weight: 700; color: ${root.aktif ? '#047857' : '#64748B'};">
                  ${root.aktif ? 'Talebe Açık' : 'Talebe Kapalı'}
                </span>
              </div>
              <button class="btn btn-secondary btn-sm btn-birim-duzenle" data-birim-id="${root.id}" style="font-size: 12px; padding: 4px 10px;">
                Düzenle
              </button>
              <button class="btn btn-secondary btn-sm btn-tree-kisi-ekle" data-birim-id="${root.id}" style="font-size: 12px; padding: 4px 10px;">
                + Kişi Ekle
              </button>
              <button class="btn btn-secondary btn-sm btn-toggle-unit" data-target="unit-children-${root.id}" style="font-size: 12px; padding: 4px 10px;">
                ${isRootExpanded ? 'Daralt' : 'Genişlet'}
              </button>
            </div>
          </div>

          <!-- Kök Birimin Çocukları (Level 1) -->
          <div id="unit-children-${root.id}" class="unit-children-block" style="display: ${isRootExpanded ? 'block' : 'none'};">
      `;

      // 1) Kök birimin doğrudan personelleri
      const directPersons = sortPersons(root.personeller || []).filter(p =>
        !term || matchesFilter(cleanAdSoyad(p.ad_soyad)) || matchesFilter(p.gorev) || matchesFilter(p.unvan) || matchesFilter(p.eposta) || matchesFilter(p.telefon)
      );

      // 2) Kök birimin alt birimleri (A-Z Sıralı, Arama varsa eşleşenler)
      let subUnits = [...(root.altBirimler || [])].sort((a, b) => a.ad.localeCompare(b.ad, 'tr-TR'));
      if (term) {
        subUnits = subUnits.filter(sub => nodeHasMatch(sub));
      }

      const totalLevel1Items = directPersons.length + subUnits.length;
      let level1Index = 0;

      directPersons.forEach(p => {
        level1Index++;
        const isLast = level1Index === totalLevel1Items;
        html += renderPersonRowHtml(p, 'level-1', isLast);
      });

      subUnits.forEach(sub => {
        level1Index++;
        const isSubLast = level1Index === totalLevel1Items;
        const subTotal = countTotalPersons(sub);
        const subInitials = getInitials(sub.ad);
        const isSubExpanded = allExpanded || isSearchActive || openUnitIds.has(`sub-children-${sub.id}`);

        const subPersons = sortPersons(sub.personeller || []).filter(p =>
          !term || matchesFilter(cleanAdSoyad(p.ad_soyad)) || matchesFilter(p.gorev) || matchesFilter(p.unvan) || matchesFilter(p.eposta) || matchesFilter(p.telefon)
        );

        let subSubUnits = [...(sub.altBirimler || [])].sort((a, b) => a.ad.localeCompare(b.ad, 'tr-TR'));
        if (term) {
          subSubUnits = subSubUnits.filter(dept => nodeHasMatch(dept));
        }

        html += `
          <div class="tree-row level-1 clickable-unit-row ${isSubLast ? 'last-node' : ''} ${isSubExpanded ? 'is-expanded has-open-children' : ''}" data-target="sub-children-${sub.id}" style="cursor: pointer; background: rgba(255, 255, 255, 0.45);">
            <div class="tree-row-left">
              <div class="tree-node-col">
                <div class="tree-avatar" style="background: rgba(236, 253, 245, 0.95); color: #047857; font-weight: 700;">
                  ${subInitials}
                </div>
              </div>
              <div class="tree-content">
                <div class="tree-title" style="font-weight: 700; font-size: 13.5px; color: #0F172A;">
                  ${sub.ad}
                </div>
                <div class="tree-desc" style="font-size: 12px; color: var(--text-dim); margin-top: 2px;">
                  ${subTotal} Personel ${subSubUnits.length > 0 ? `• ${subSubUnits.length} Bölüm` : ''}
                </div>
              </div>
            </div>
            <div class="tree-meta" style="display: flex; gap: 8px; align-items: center;">
              <div class="unit-toggle-control btn-unit-durum-toggle" data-birim-id="${sub.id}" data-birim-ad="${escapeHtml(sub.ad)}" data-aktif="${sub.aktif ? '1' : '0'}" style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; padding: 4px 10px; border-radius: 9999px; background: rgba(241, 245, 249, 0.7); border: 1px solid rgba(203, 213, 225, 0.6); user-select: none;" title="${sub.aktif ? 'Kırtasiye talebine açık (kapatmak için switch\'i kaydırın)' : 'Kırtasiye talebine kapalı (açmak için switch\'i kaydırın)'}">
                <div class="mini-settings-switch is-success ${sub.aktif ? 'is-on' : 'is-off'}">
                  <div class="mini-switch-handle"></div>
                </div>
                <span style="font-size: 11px; font-weight: 700; color: ${sub.aktif ? '#047857' : '#64748B'};">
                  ${sub.aktif ? 'Talebe Açık' : 'Talebe Kapalı'}
                </span>
              </div>
              <button class="btn btn-secondary btn-sm btn-birim-duzenle" data-birim-id="${sub.id}" style="font-size: 12px; padding: 4px 10px;">
                Düzenle
              </button>
              <button class="btn btn-secondary btn-sm btn-tree-kisi-ekle" data-birim-id="${sub.id}" style="font-size: 12px; padding: 4px 10px;">
                + Kişi Ekle
              </button>
              <button class="btn btn-secondary btn-sm btn-toggle-unit" data-target="sub-children-${sub.id}" style="font-size: 12px; padding: 4px 10px;">
                ${isSubExpanded ? 'Daralt' : 'Genişlet'}
              </button>
            </div>
          </div>

          <div id="sub-children-${sub.id}" class="sub-children-block" style="display: ${isSubExpanded ? 'block' : 'none'};">
        `;

        const totalLevel2Items = subPersons.length + subSubUnits.length;
        let level2Index = 0;

        subPersons.forEach(p => {
          level2Index++;
          const isP2Last = level2Index === totalLevel2Items;
          html += renderPersonRowHtml(p, 'level-2', isP2Last);
        });

        subSubUnits.forEach(dept => {
          level2Index++;
          const isDeptLast = level2Index === totalLevel2Items;
          const deptTotal = countTotalPersons(dept);
          const deptInitials = getInitials(dept.ad);
          const isDeptExpanded = allExpanded || isSearchActive || openUnitIds.has(`dept-children-${dept.id}`);

          const deptPersons = sortPersons(dept.personeller || []).filter(p =>
            !term || matchesFilter(cleanAdSoyad(p.ad_soyad)) || matchesFilter(p.gorev) || matchesFilter(p.unvan) || matchesFilter(p.eposta) || matchesFilter(p.telefon)
          );

          html += `
            <div class="tree-row level-2 clickable-unit-row ${isDeptLast ? 'last-node' : ''} ${isDeptExpanded ? 'is-expanded has-open-children' : ''}" data-target="dept-children-${dept.id}" style="cursor: pointer; background: rgba(255, 255, 255, 0.35);">
              <div class="tree-row-left">
                <div class="tree-node-col">
                  <div class="tree-avatar" style="background: rgba(254, 243, 199, 0.95); color: #B45309; font-weight: 700;">
                    ${deptInitials}
                  </div>
                </div>
                <div class="tree-content">
                  <div class="tree-title" style="font-weight: 600; font-size: 13px; color: #0F172A;">
                    ${dept.ad}
                  </div>
                  <div class="tree-desc" style="font-size: 11.5px; color: var(--text-dim); margin-top: 2px;">
                    ${deptTotal} Kayıtlı Personel
                  </div>
                </div>
              </div>
              <div class="tree-meta" style="display: flex; gap: 8px; align-items: center;">
                <div class="unit-toggle-control btn-unit-durum-toggle" data-birim-id="${dept.id}" data-birim-ad="${escapeHtml(dept.ad)}" data-aktif="${dept.aktif ? '1' : '0'}" style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; padding: 3px 8px; border-radius: 9999px; background: rgba(241, 245, 249, 0.7); border: 1px solid rgba(203, 213, 225, 0.6); user-select: none;" title="${dept.aktif ? 'Kırtasiye talebine açık (kapatmak için switch\'i kaydırın)' : 'Kırtasiye talebine kapalı (açmak için switch\'i kaydırın)'}">
                  <div class="mini-settings-switch is-success ${dept.aktif ? 'is-on' : 'is-off'}" style="transform: scale(0.9); transform-origin: center;">
                    <div class="mini-switch-handle"></div>
                  </div>
                  <span style="font-size: 10.5px; font-weight: 700; color: ${dept.aktif ? '#047857' : '#64748B'};">
                    ${dept.aktif ? 'Açık' : 'Kapalı'}
                  </span>
                </div>
                <button class="btn btn-secondary btn-sm btn-birim-duzenle" data-birim-id="${dept.id}" style="font-size: 11px; padding: 3px 8px;">
                  Düzenle
                </button>
                <button class="btn btn-secondary btn-sm btn-tree-kisi-ekle" data-birim-id="${dept.id}" style="font-size: 11.5px; padding: 3px 8px;">
                  + Kişi Ekle
                </button>
                <button class="btn btn-secondary btn-sm btn-toggle-unit" data-target="dept-children-${dept.id}" style="font-size: 11.5px; padding: 3px 8px;">
                  ${isDeptExpanded ? 'Daralt' : 'Genişlet'}
                </button>
              </div>
            </div>

            <div id="dept-children-${dept.id}" class="dept-children-block" style="display: ${isDeptExpanded ? 'block' : 'none'};">
          `;

          deptPersons.forEach((dp, dpIdx) => {
            const isDpLast = dpIdx === deptPersons.length - 1;
            html += renderPersonRowHtml(dp, 'level-3', isDpLast);
          });

          html += `</div>`; // dept-children
        });

        html += `</div>`; // sub-children
      });

      html += `</div></div>`; // unit-children & tree-unit-group
    }

    html += `</div>`;

    if (visibleRootsCount === 0 && !directSearchResultsHtml) {
      treeArea.innerHTML = `
        <div style="text-align: center; padding: 48px; background: rgba(255, 255, 255, 0.7); border-radius: 20px; border: 1.5px dashed rgba(148, 163, 184, 0.35);">
          <p style="font-size: 15px; font-weight: 600; color: #0F172A; margin-bottom: 4px;">Arama Kriterine Uygun Kayıt Bulunamadı</p>
          <p style="font-size: 13px; color: var(--text-dim);">Farklı bir isim, unvan veya birim adı ile tekrar arayabilirsiniz.</p>
        </div>
      `;
      return;
    }

    treeArea.innerHTML = html;

    // Yüksek Performanslı Event Delegation (Tek Dinleyici ile 0ms DOM Gecikmesi)
    if (!treeArea._hasDelegatedListener) {
      treeArea._hasDelegatedListener = true;

      treeArea.addEventListener('click', async (e) => {
        // 1) Şifre Sıfırla & Outlook
        const btnSifre = e.target.closest('.btn-personel-sifre-outlook');
        if (btnSifre) {
          e.stopPropagation();
          const personId = parseInt(btnSifre.dataset.id, 10);
          const personName = btnSifre.dataset.name;
          const personEmail = btnSifre.dataset.email;
          await sifreSifirlaVeOutlookGonder(personId, personName, personEmail);
          return;
        }

        // 2) Personel Düzenle
        const btnDuzenle = e.target.closest('.btn-personel-duzenle');
        if (btnDuzenle) {
          e.stopPropagation();
          const personId = parseInt(btnDuzenle.dataset.id, 10);
          const findPerson = (nodes) => {
            for (const n of nodes) {
              if (n.personeller) {
                const p = n.personeller.find(x => x.id === personId);
                if (p) return p;
              }
              if (n.altBirimler) {
                const p = findPerson(n.altBirimler);
                if (p) return p;
              }
            }
            return null;
          };
          const found = findPerson(hiyerarsiData.kokBirimler);
          openPersonelModal(found, found ? found.birim_id : null, loadTree);
          return;
        }

        // 3) Personel Sil
        const btnSil = e.target.closest('.btn-personel-sil');
        if (btnSil) {
          e.stopPropagation();
          const personId = parseInt(btnSil.dataset.id, 10);
          const personName = btnSil.dataset.name;
          const onay = await confirmModal({
            title: 'Personel Kaydını Sil',
            message: `'${personName}' isimli personeli sistemden silmek istediğinize emin misiniz?`,
            description: 'Personele ait geçmiş talep kaydı bulunmuyorsa veritabanından tamamen kaldırılacaktır.',
            confirmText: 'Evet, Personeli Sil',
            cancelText: 'Vazgeç',
            type: 'danger',
            icon: ''
          });
          if (!onay) return;

          try {
            await api.deleteYonetimPersonel(personId);
            toast.success('Personel başarıyla silindi.');
            loadTree();
          } catch (err) {
            toast.error('Personel silinemedi: ' + err.message);
          }
          return;
        }

        // 4) Kişi Ekle
        const btnKisiEkle = e.target.closest('.btn-tree-kisi-ekle');
        if (btnKisiEkle) {
          e.stopPropagation();
          openPersonelModal(null, parseInt(btnKisiEkle.dataset.birimId, 10), loadTree);
          return;
        }

        // 5) Birim Talebe Aç/Kapat Toggle Switch
        const btnDurumToggle = e.target.closest('.btn-unit-durum-toggle');
        if (btnDurumToggle) {
          e.preventDefault();
          e.stopPropagation();
          const birimId = parseInt(btnDurumToggle.dataset.birimId, 10);
          const birimAd = btnDurumToggle.dataset.birimAd;
          const currentAktif = btnDurumToggle.dataset.aktif === '1';
          const yeniAktif = currentAktif ? 0 : 1;
          btnDurumToggle.style.pointerEvents = 'none';
          btnDurumToggle.style.opacity = '0.5';
          try {
            await api.updateBirimDurum(birimId, yeniAktif);
            toast.success(`"${birimAd}" kırtasiye talebine ${yeniAktif ? 'AÇILDI' : 'KAPATILDI'}.`);
            await loadTree();
          } catch (err) {
            toast.error('Birim durumu güncellenemedi: ' + err.message);
            btnDurumToggle.style.pointerEvents = 'auto';
            btnDurumToggle.style.opacity = '1';
          }
          return;
        }

        // 6) Birim Düzenle
        const btnBirimDuzenle = e.target.closest('.btn-birim-duzenle');
        if (btnBirimDuzenle) {
          e.stopPropagation();
          const birimId = parseInt(btnBirimDuzenle.dataset.birimId, 10);
          const findBirim = (nodes) => {
            for (const n of nodes) {
              if (n.id === birimId) return n;
              if (n.altBirimler) {
                const res = findBirim(n.altBirimler);
                if (res) return res;
              }
            }
            return null;
          };
          const birim = findBirim(hiyerarsiData.kokBirimler);
          if (birim) openBirimModal(birim, loadTree);
          return;
        }

        // 7) Birim Satırı veya Genişlet / Daralt Butonuna Tıklama
        const btnToggle = e.target.closest('.btn-toggle-unit');
        const clickableRow = e.target.closest('.clickable-unit-row');
        if (btnToggle || clickableRow) {
          if (e.target.closest('button:not(.btn-toggle-unit)')) return;
          const targetId = btnToggle ? btnToggle.dataset.target : clickableRow?.dataset.target;
          if (!targetId) return;
          const container = document.getElementById(targetId);
          const row = clickableRow || btnToggle?.closest('.tree-row');
          const toggleBtn = row?.querySelector('.btn-toggle-unit') || btnToggle;
          if (container) {
            const isOpen = container.style.display !== 'none';
            container.style.display = isOpen ? 'none' : 'block';
            if (row) {
              row.classList.toggle('is-expanded', !isOpen);
              row.classList.toggle('has-open-children', !isOpen);
            }
            if (isOpen) {
              openUnitIds.delete(targetId);
            } else {
              openUnitIds.add(targetId);
            }
            if (toggleBtn) toggleBtn.textContent = isOpen ? 'Genişlet' : 'Daralt';
          }
          return;
        }

        // 8) Satır Seçimi (Mavi Işıma Vurgusu)
        const treeRow = e.target.closest('.tree-row');
        if (treeRow && !e.target.closest('button')) {
          treeArea.querySelectorAll('.tree-row.selected').forEach(r => r.classList.remove('selected'));
          treeRow.classList.add('selected');
        }
      });
    }
  };

  // Kategori Filtre Butonları
  appContainer.querySelectorAll('.btn-kategori-filtre').forEach(btn => {
    btn.addEventListener('click', () => {
      appContainer.querySelectorAll('.btn-kategori-filtre').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      aktifKategori = btn.dataset.tur;
      renderTreeList(appContainer.querySelector('#treeSearchInput')?.value || '');
    });
  });

  // Canlı Arama Input
  let searchTimer = null;
  const searchInput = appContainer.querySelector('#treeSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        renderTreeList(searchInput.value);
      }, 250);
    });
  }

  // Tümünü Genişlet / Daralt
  const btnToggleAll = appContainer.querySelector('#btnTreeToggleAll');
  if (btnToggleAll) {
    btnToggleAll.addEventListener('click', () => {
      allExpanded = !allExpanded;
      const textEl = appContainer.querySelector('#btnTreeToggleText');
      if (textEl) {
        textEl.textContent = allExpanded ? 'Tümünü Daralt' : 'Tümünü Genişlet';
      }
      renderTreeList(searchInput?.value || '');
    });
  }

  // Toplu Kurumsal Hesap Tanımlama Modalı
  const btnTopluHesap = appContainer.querySelector('#btnTopluHesapModal');
  if (btnTopluHesap) {
    btnTopluHesap.addEventListener('click', () => {
      openTopluHesapModal(loadTree);
    });
  }

  // Excel ile Personel İçe Aktarma Modalı
  const btnExcelAktar = appContainer.querySelector('#btnExcelAktarModal');
  if (btnExcelAktar) {
    btnExcelAktar.addEventListener('click', () => {
      openExcelAktarModal(loadTree);
    });
  }

  // Yeni Birim Ekleme Modalı
  const btnYeniBirim = appContainer.querySelector('#btnYeniBirimModalTree');
  if (btnYeniBirim) {
    btnYeniBirim.addEventListener('click', () => {
      openBirimModal(null, loadTree);
    });
  }

  // Yeni Kişi Ekleme Modalı
  const btnYeniPersonel = appContainer.querySelector('#btnYeniPersonelModal');
  if (btnYeniPersonel) {
    btnYeniPersonel.addEventListener('click', () => {
      openPersonelModal(null, null, loadTree);
    });
  }

  await loadTree();
}

/**
 * Personel Ekleme / Düzenleme Modalı
 */
async function openPersonelModal(personelData, defaultBirimId, onSaved) {
  let birimler = [];
  try {
    const res = await api.getYonetimBirimler();
    birimler = (res.birimler || []).filter(b => b.aktif);
  } catch (e) {}

  const isEdit = Boolean(personelData && personelData.id);
  const cleanName = isEdit ? cleanAdSoyad(personelData.ad_soyad) : '';

  const modal = createModal({
    title: isEdit ? `Personel Düzenle • ${cleanName}` : 'Yeni Personel Ekle',
    contentHtml: `
      <div style="padding: 4px 0;">
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="font-size: 12.5px; font-weight: 600; color: #0F172A; display: block; margin-bottom: 6px;">
            Bağlı Olduğu Birim *
          </label>
          <select id="modalPersonelBirim" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 12px;">
            ${birimler.map(b => `
              <option value="${b.id}" ${(isEdit ? personelData.birim_id === b.id : defaultBirimId === b.id) ? 'selected' : ''}>
                ${b.ad} (${b.tur || 'Birim'})
              </option>
            `).join('')}
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div class="form-group">
            <label style="font-size: 12.5px; font-weight: 600; color: #0F172A; display: block; margin-bottom: 6px;">
              Ad Soyad *
            </label>
            <input type="text" id="modalPersonelAd" placeholder="Örn: Selin Arslan" value="${cleanName}" style="width: 100%;">
          </div>
          <div class="form-group">
            <label style="font-size: 12.5px; font-weight: 600; color: #0F172A; display: block; margin-bottom: 6px;">
              Akademik / İdari Ünvan
            </label>
            <input type="text" id="modalPersonelUnvan" placeholder="Örn: Prof. Dr., Doç. Dr., Dr. Öğr. Üyesi" value="${personelData?.unvan || ''}" style="width: 100%;">
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px;">
          <div class="form-group">
            <label style="font-size: 12.5px; font-weight: 600; color: #0F172A; display: block; margin-bottom: 6px;">
              Görev / Pozisyon
            </label>
            <input type="text" id="modalPersonelGorev" placeholder="Örn: Dekan, Bölüm Başkanı, Uzman" value="${personelData?.gorev || ''}" style="width: 100%;">
          </div>
          <div class="form-group">
            <label style="font-size: 12.5px; font-weight: 600; color: #0F172A; display: block; margin-bottom: 6px;">
              Dahili Telefon
            </label>
            <input type="text" id="modalPersonelTelefon" placeholder="Örn: 4070" value="${personelData?.telefon || ''}" style="width: 100%;">
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 20px;">
          <label style="font-size: 12.5px; font-weight: 600; color: #0F172A; display: block; margin-bottom: 6px;">
            Kurumsal E-posta
          </label>
          <input type="email" id="modalPersonelEposta" placeholder="Örn: sarslan@kampus.edu.tr" value="${personelData?.eposta || ''}" style="width: 100%;">
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button id="btnModalPersonelIptal" class="btn btn-secondary">Vazgeç</button>
          <button id="btnModalPersonelKaydet" class="btn btn-primary">${isEdit ? 'Güncelle' : 'Kaydet'}</button>
        </div>
      </div>
    `
  });

  modal.open();
  modal.element.querySelector('#btnModalPersonelIptal').onclick = () => modal.close();

  modal.element.querySelector('#btnModalPersonelKaydet').onclick = async () => {
    const ad_soyad = modal.element.querySelector('#modalPersonelAd').value.trim();
    const unvan = modal.element.querySelector('#modalPersonelUnvan').value.trim();
    const gorev = modal.element.querySelector('#modalPersonelGorev').value.trim();
    const telefon = modal.element.querySelector('#modalPersonelTelefon').value.trim();
    const eposta = modal.element.querySelector('#modalPersonelEposta').value.trim();
    const birim_id = parseInt(modal.element.querySelector('#modalPersonelBirim').value, 10);

    if (!ad_soyad || !birim_id) {
      toast.error('Lütfen Ad Soyad ve Birim alanlarını doldurunuz.');
      return;
    }

    try {
      if (isEdit) {
        await api.updateYonetimPersonel(personelData.id, { birim_id, ad_soyad, unvan, gorev, telefon, eposta });
        toast.success('Personel başarıyla güncellendi.');
      } else {
        await api.addYonetimPersonel({ birim_id, ad_soyad, unvan, gorev, telefon, eposta });
        toast.success('Yeni personel kaydedildi.');
      }
      modal.close();
      if (onSaved) onSaved();
    } catch (err) {
      toast.error('İşlem başarısız: ' + err.message);
    }
  };
}

/**
 * Birim Ekleme / Düzenleme Modalı
 */
async function openBirimModal(birimData, onSaved) {
  let birimler = [];
  try {
    const res = await api.getYonetimBirimler();
    birimler = (res.birimler || []).filter(b => b.aktif);
  } catch (e) {}

  const isEdit = Boolean(birimData && birimData.id);

  const modal = createModal({
    title: isEdit ? `Birim Düzenle • ${birimData.ad}` : 'Yeni Birim / Fakülte / Bölüm Ekle',
    contentHtml: `
      <div style="padding: 4px 0;">
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="font-size: 12.5px; font-weight: 600; color: #0F172A; display: block; margin-bottom: 6px;">
            Birim Adı *
          </label>
          <input type="text" id="modalBirimAd" placeholder="Örn: Bilgisayar Mühendisliği Bölümü" value="${birimData?.ad || ''}" style="width: 100%;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div class="form-group">
            <label style="font-size: 12.5px; font-weight: 600; color: #0F172A; display: block; margin-bottom: 6px;">
              Birim Türü
            </label>
            <select id="modalBirimTur" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 12px;">
              <option value="idari_birim" ${birimData?.tur === 'idari_birim' ? 'selected' : ''}>İdari Birim / Müdürlük</option>
              <option value="dekanlik" ${birimData?.tur === 'dekanlik' ? 'selected' : ''}>Fakülte Dekanlığı</option>
              <option value="bolum" ${birimData?.tur === 'bolum' ? 'selected' : ''}>Akademik Bölüm</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-size: 12.5px; font-weight: 600; color: #0F172A; display: block; margin-bottom: 6px;">
              Üst Birim (Hiyerarşi)
            </label>
            <select id="modalBirimUst" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 12px;">
              <option value="">-- Kök Birim (En Üst Düzey) --</option>
              ${birimler.filter(b => !birimData || b.id !== birimData.id).map(b => `
                <option value="${b.id}" ${birimData?.ust_birim_id === b.id ? 'selected' : ''}>
                  ${b.ad}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button id="btnModalBirimIptal" class="btn btn-secondary">Vazgeç</button>
          <button id="btnModalBirimKaydet" class="btn btn-primary">${isEdit ? 'Güncelle' : 'Kaydet'}</button>
        </div>
      </div>
    `
  });

  modal.open();
  modal.element.querySelector('#btnModalBirimIptal').onclick = () => modal.close();

  modal.element.querySelector('#btnModalBirimKaydet').onclick = async () => {
    const ad = modal.element.querySelector('#modalBirimAd').value.trim();
    const tur = modal.element.querySelector('#modalBirimTur').value;
    const ustVal = modal.element.querySelector('#modalBirimUst').value;
    const ust_birim_id = ustVal ? parseInt(ustVal, 10) : null;

    if (!ad) {
      toast.error('Lütfen birim adını giriniz.');
      return;
    }

    try {
      if (isEdit) {
        await api.updateBirim(birimData.id, { ad, tur, ust_birim_id });
        toast.success('Birim güncellendi.');
      } else {
        await api.addBirim({ ad, tur, ust_birim_id });
        toast.success('Yeni birim oluşturuldu.');
      }
      modal.close();
      if (onSaved) onSaved();
    } catch (err) {
      toast.error('İşlem başarısız: ' + err.message);
    }
  };
}

/**
 * Toplu Hesap Açma & Yetkilendirme Modalı
 */
async function openTopluHesapModal(onComplete) {
  let birimler = [];
  try {
    const res = await api.getYonetimBirimler();
    birimler = (res.birimler || []).sort((a, b) => a.ad.localeCompare(b.ad, 'tr-TR'));
  } catch (e) {}

  const modal = createModal({
    title: 'Toplu Kurumsal Hesap ve Yetki Tanımla',
    maxWidth: '560px',
    contentHtml: `
      <div style="padding: 4px 0;">
        <p style="font-size: 13.5px; color: #475569; margin-bottom: 16px; line-height: 1.5;">
          Üniversite personeline tek tıkla kurumsal portal hesabı açabilir, geçici şifre atayabilir ve kullanıcıların sisteme giriş yapabilmesini sağlayabilirsiniz.
        </p>

        <div class="form-group" style="margin-bottom: 14px;">
          <label style="font-size: 12.5px; font-weight: 600; color: #0F172A; display: block; margin-bottom: 6px;">
            Hesap Tanımlanacak Kapsam / Birim *
          </label>
          <select id="modalTopluKapsam" style="width: 100%; padding: 10px 14px; font-size: 13.5px; border-radius: 12px; border: 1px solid #cbd5e1;">
            <option value="tumu">Tüm Kurum Geneli (Tüm Birimler)</option>
            <optgroup label="Birim / Fakülte / Bölüm Seç">
              ${birimler.map(b => `<option value="${b.id}">${escapeHtml(b.ad)}</option>`).join('')}
            </optgroup>
          </select>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 10px;">
          <label style="display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: #1e293b; cursor: pointer;">
            <input type="checkbox" id="modalTopluUstYonetimHaric" checked style="width: 16px; height: 16px; margin-top: 2px;">
            <div>
              <strong>Üst Yönetimi Hariç Tut</strong>
              <div style="font-size: 11.5px; color: #64748B;">Rektör, Rektör Yardımcısı, Dekan gibi makamlara otomatik hesap açılmaz.</div>
            </div>
          </label>
          <label style="display: flex; align-items: flex-start; gap: 10px; font-size: 13px; color: #1e293b; cursor: pointer;">
            <input type="checkbox" id="modalTopluSadeceHesapsizlar" checked style="width: 16px; height: 16px; margin-top: 2px;">
            <div>
              <strong>Yalnızca Hesabı Olmayanlara Aç</strong>
              <div style="font-size: 11.5px; color: #64748B;">Mevcut hesabı ve şifresi olan personellerin şifreleri korunur, ezilmez.</div>
            </div>
          </label>
        </div>

        <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 8px; padding: 12px; font-size: 12px; color: #1e40af; line-height: 1.4; margin-bottom: 16px;">
          ℹ️ Oluşturulan hesapların kullanıcı adı personelin kurumsal e-posta adresi (<code>@kampus.edu.tr</code>) olacaktır. İlk girişlerinde sistem kendilerinden teslimat bina/oda ve yeni kalıcı şifre belirlemelerini isteyecektir.
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px;">
          <button id="btnModalTopluIptal" class="btn btn-secondary">Vazgeç</button>
          <button id="btnModalTopluCalistir" class="btn btn-primary" style="background: #2563eb;">Hesapları Oluştur</button>
        </div>
      </div>
    `
  });

  modal.open();
  modal.element.querySelector('#btnModalTopluIptal').onclick = () => modal.close();

  modal.element.querySelector('#btnModalTopluCalistir').onclick = async () => {
    const kapsam = modal.element.querySelector('#modalTopluKapsam').value;
    const ustYonetimHaric = modal.element.querySelector('#modalTopluUstYonetimHaric').checked;
    const sadeceHesapsizlar = modal.element.querySelector('#modalTopluSadeceHesapsizlar').checked;
    const btnCalistir = modal.element.querySelector('#btnModalTopluCalistir');

    btnCalistir.disabled = true;
    btnCalistir.textContent = 'Hesaplar Tanımlanıyor...';

    try {
      const payload = {
        ust_yonetim_haric: ustYonetimHaric,
        sadece_hesapsizlar: sadeceHesapsizlar
      };
      if (kapsam === 'tumu') {
        payload.tum_personel = true;
        payload.birim_id = 'tumu';
      } else {
        payload.birim_id = parseInt(kapsam, 10);
      }

      const res = await api.olusturPersonelHesaplari(payload);
      modal.close();

      createModal({
        title: 'Toplu Hesap Tanımlama Tamamlandı',
        content: `
          <div style="padding: 10px 0;">
            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 16px; margin-bottom: 14px;">
              <div style="font-weight: 700; color: #065f46; font-size: 15px; margin-bottom: 6px;">İşlem Başarıyla Gerçekleşti</div>
              <div style="font-size: 13px; color: #047857;">${res.mesaj || 'Personel hesapları başarıyla oluşturuldu.'}</div>
            </div>
            <p style="font-size: 13px; color: #475569; line-height: 1.5;">
              Kurumsal rehber & yetkilendirme listesinde kullanıcıların hesap durumları güncellenmiştir. Dilediğiniz personele tek tıkla <strong>[Şifre ve Outlook]</strong> butonuna basarak giriş bilgilerini Outlook üzerinden doğrudan iletebilirsiniz.
            </p>
          </div>
        `,
        buttons: [{ text: 'Tamam', class: 'btn-primary', onClick: (m) => m.close() }]
      });

      if (onComplete) onComplete();
    } catch (err) {
      toast.error('İşlem başarısız: ' + err.message);
      btnCalistir.disabled = false;
      btnCalistir.textContent = 'Hesapları Oluştur';
    }
  };
}

/**
 * Excel ile Toplu Personel İçe Aktarma Modalı
 */
function openExcelAktarModal(onSuccess) {
  const modal = createModal({
    title: 'Excel ile Toplu Personel ve Birim İçe Aktar',
    maxWidth: '560px',
    content: `
      <div style="font-size: 13.5px; color: #334155; line-height: 1.6;">
        <p style="margin: 0 0 16px;">
          Kurumunuzdaki personeli ve birimleri tek tıkla Excel dosyasından içe aktarabilirsiniz. 
          Sistem, Excel'deki birimler henüz kayıtlı değilse otomatik oluşturur ve personelleri ilgili birimlere bağlar.
        </p>

        <div style="margin-bottom: 20px; padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
          <div>
            <strong style="color: #166534; font-size: 13px;">Hazır Şablon</strong>
            <div style="font-size: 12px; color: #15803d;">Sütun başlıklarını ve örnek satırları içeren dosya.</div>
          </div>
          <a href="/api/yonetim/personel/ornek-sablon" class="btn btn-sm btn-outline" style="border-color: #16a34a; color: #166534; font-weight: 600; text-decoration: none;" download="kampusstok_personel_sablonu.xlsx">
            Şablonu İndir (.xlsx)
          </a>
        </div>

        <div style="margin-bottom: 20px;">
          <label style="display: block; font-weight: 600; margin-bottom: 6px; color: #0f172a;">Excel / CSV Dosyası Seçin (.xlsx, .csv)</label>
          <input type="file" id="inputExcelFile" accept=".xlsx, .xls, .csv" style="display: block; width: 100%; padding: 12px; border: 2px dashed #cbd5e1; border-radius: 8px; background: #f8fafc; cursor: pointer;">
          <div id="fileSelectionInfo" style="font-size: 12px; color: #64748b; margin-top: 6px;">Maksimum dosya boyutu: 10 MB.</div>
        </div>

        <div id="excelImportProgress" style="display: none; padding: 12px; background: #eff6ff; border-radius: 8px; border: 1px solid #bfdbfe; font-size: 13px; color: #1e40af; text-align: center;">
          ⏳ Excel dosyası okunuyor ve veritabanına aktarılıyor, lütfen bekleyin...
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
          <button id="btnModalExcelIptal" class="btn btn-secondary">Vazgeç</button>
          <button id="btnModalExcelBaslat" class="btn btn-primary" style="background: #10B981; border-color: #10B981;">
            İçe Aktarmayı Başlat
          </button>
        </div>
      </div>
    `
  });

  const btnIptal = modal.element.querySelector('#btnModalExcelIptal');
  const btnBaslat = modal.element.querySelector('#btnModalExcelBaslat');
  const fileInput = modal.element.querySelector('#inputExcelFile');
  const progressBox = modal.element.querySelector('#excelImportProgress');

  btnIptal.onclick = () => modal.close();

  btnBaslat.onclick = async () => {
    if (!fileInput.files || fileInput.files.length === 0) {
      toast.warning('Lütfen bir Excel (.xlsx) veya CSV dosyası seçiniz.');
      return;
    }

    const file = fileInput.files[0];
    btnBaslat.disabled = true;
    btnIptal.disabled = true;
    progressBox.style.display = 'block';

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Data = e.target.result;
        const res = await api.post('/api/yonetim/personel/excel-aktar', { dosyaBase64: base64Data });

        modal.close();

        if (res.basarili) {
          const ozet = res.ozet || {};
          createModal({
            title: 'İçe Aktarma Başarılı',
            maxWidth: '480px',
            content: `
              <div style="font-size: 13.5px; line-height: 1.6; color: #334155;">
                <p><strong>${ozet.toplamSatir || 0}</strong> satır başarıyla işlendi:</p>
                <ul style="padding-left: 20px; margin: 12px 0;">
                  <li><strong style="color: #10B981;">+${ozet.eklenenPersonel || 0}</strong> yeni personel eklendi.</li>
                  <li><strong>${ozet.guncellenenPersonel || 0}</strong> mevcut personel güncellendi.</li>
                  <li><strong style="color: #3B82F6;">+${ozet.eklenenBirim || 0}</strong> yeni birim oluşturuldu.</li>
                </ul>
                ${(ozet.hatalar && ozet.hatalar.length > 0) ? `
                  <div style="margin-top: 12px; padding: 10px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 6px; font-size: 12px; color: #9f1239; max-height: 120px; overflow-y: auto;">
                    <strong>Atlanan / Hatalı Satırlar (${ozet.hatalar.length}):</strong><br>
                    ${ozet.hatalar.map(h => `• ${escapeHtml(h)}`).join('<br>')}
                  </div>
                ` : ''}
              </div>
            `,
            buttons: [{ text: 'Tamam', class: 'btn-primary', onClick: (m) => m.close() }]
          });

          toast.success(res.mesaj || 'Personel listesi başarıyla güncellendi.');
          if (typeof onSuccess === 'function') onSuccess();
        } else {
          toast.error(res.mesaj || 'İçe aktarma sırasında bir hata oluştu.');
        }
      } catch (err) {
        toast.error(err.message || 'Dosya işlenirken sunucu hatası oluştu.');
      } finally {
        btnBaslat.disabled = false;
        btnIptal.disabled = false;
        progressBox.style.display = 'none';
      }
    };

    reader.onerror = () => {
      toast.error('Dosya okunamadı.');
      btnBaslat.disabled = false;
      btnIptal.disabled = false;
      progressBox.style.display = 'none';
    };

    reader.readAsDataURL(file);
  };
}
