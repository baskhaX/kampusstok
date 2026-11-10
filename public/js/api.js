// api.js - Merkezi API İstemcisi

function cleanQuery(params = {}) {
  const clean = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '' && v !== 'undefined' && v !== 'null') {
      clean[k] = v;
    }
  }
  const q = new URLSearchParams(clean).toString();
  return q ? `?${q}` : '';
}

export async function apiRequest(endpoint, options = {}) {
  const defaultHeaders = {
    'Accept': 'application/json'
  };

  if (!(options.body instanceof FormData) && options.body && typeof options.body === 'object') {
    defaultHeaders['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  const response = await fetch(endpoint, config);

  // Dosya indirme (Excel vb.) kontrolü
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/vnd.openxmlformats-officedocument')) {
    if (!response.ok) throw new Error('Dosya indirilemedi.');
    return response.blob();
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = { mesaj: response.statusText };
  }

  if (!response.ok) {
    const errorMsg = data.hata?.mesaj || data.mesaj || `Hata: ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Genel Metotlar
  get: (url) => apiRequest(url),
  post: (url, body) => apiRequest(url, { method: 'POST', body }),
  put: (url, body) => apiRequest(url, { method: 'PUT', body }),
  patch: (url, body) => apiRequest(url, { method: 'PATCH', body }),
  delete: (url) => apiRequest(url, { method: 'DELETE' }),

  // Auth
  login: (credentials) => apiRequest('/api/auth/login', { method: 'POST', body: credentials }),
  logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),
  sifremiUnuttum: (eposta) => apiRequest('/api/auth/sifremi-unuttum', { method: 'POST', body: { eposta } }),
  getMe: () => apiRequest('/api/auth/me'),
  sifreDegistir: (data) => apiRequest('/api/auth/sifre-degistir', { method: 'POST', body: data }),
  changePassword: (mevcut_sifre, yeni_sifre) => apiRequest('/api/auth/sifre-degistir', { method: 'POST', body: { mevcut_sifre, yeni_sifre } }),
  getBirimPersoneller: () => apiRequest('/api/auth/personeller'),
  selectPersonel: (data) => apiRequest('/api/auth/personel-sec', { method: 'POST', body: data }),
  addPersonel: (data) => apiRequest('/api/auth/personel-ekle', { method: 'POST', body: data }),

  // Katalog
  getKategoriler: () => apiRequest('/api/katalog/kategoriler'),
  getUrunler: (params = {}) => apiRequest(`/api/katalog/urunler${cleanQuery(params)}`),

  // Sepet
  getSepet: () => apiRequest('/api/sepet'),
  sepeteEkle: (urun_id, adet) => apiRequest('/api/sepet/ekle', { method: 'POST', body: { urun_id, adet } }),
  sepetGuncelle: (urun_id, adet) => apiRequest('/api/sepet/guncelle', { method: 'PUT', body: { urun_id, adet } }),
  sepettenSil: (urunId) => apiRequest(`/api/sepet/kalem/${urunId}`, { method: 'DELETE' }),
  sepetiTemizle: () => apiRequest('/api/sepet/temizle', { method: 'DELETE' }),

  // Talepler (Birim)
  talepOlustur: (notlar, extra = {}) => apiRequest('/api/talepler', { method: 'POST', body: (typeof notlar === 'object' && notlar !== null ? notlar : { notlar, ...extra }) }),
  getTaleplerim: (params = {}) => apiRequest(`/api/talepler${cleanQuery(params)}`),
  getTalepDetay: (id) => apiRequest(`/api/talepler/${id}`),
  talebiKopyala: (id) => apiRequest(`/api/talepler/${id}/kopyala`, { method: 'POST' }),
  talepTeslimAl: (id, payload = {}) => apiRequest(`/api/talepler/${id}/teslim-al`, { method: 'POST', body: payload }),
  getHizliTeslimBilgi: (talepNo, k = null) => {
    const key = k || new URLSearchParams(window.location.search).get('k') || (window.location.hash.includes('?') ? new URLSearchParams(window.location.hash.split('?')[1]).get('k') : '') || '';
    return apiRequest(`/api/talepler/hizli-teslim-bilgi/${encodeURIComponent(talepNo)}${key ? `?k=${encodeURIComponent(key)}` : ''}`);
  },
  hizliTeslimOnayla: (talepNo, not = null, k = null) => {
    const key = k || new URLSearchParams(window.location.search).get('k') || (window.location.hash.includes('?') ? new URLSearchParams(window.location.hash.split('?')[1]).get('k') : '') || '';
    return apiRequest(`/api/talepler/hizli-teslim/${encodeURIComponent(talepNo)}`, { method: 'POST', body: { not, k: key } });
  },

  // Satın Alma
  getGelenTalepler: (params = {}) => apiRequest(`/api/satinalma/talepler${cleanQuery(params)}`),
  getSatinalmaOzet: () => apiRequest('/api/satinalma/ozet'),
  getSatinalmaTalepDetay: (id) => apiRequest(`/api/satinalma/talepler/${id}`),
  talepSonuclandir: (id, payload) => apiRequest(`/api/satinalma/talepler/${id}/sonuclandir`, { method: 'POST', body: payload }),
  talepTeslimEt: (id) => apiRequest(`/api/satinalma/talepler/${id}/teslim-et`, { method: 'POST' }),
  yenidenGonderMail: (kuyrukId) => apiRequest(`/api/satinalma/mail/${kuyrukId}/tekrar-gonder`, { method: 'POST' }),
  getKritikStok: () => apiRequest('/api/satinalma/kritik-stok'),

  // Yönetim
  getYonetimUrunler: () => apiRequest('/api/yonetim/urunler'),
  getUrunByBarkod: (barkod) => apiRequest(`/api/yonetim/urunler/barkod/${encodeURIComponent(barkod)}`),
  addUrun: (data) => apiRequest('/api/yonetim/urunler', { method: 'POST', body: data }),
  updateUrun: (id, data) => apiRequest(`/api/yonetim/urunler/${id}`, { method: 'PUT', body: data }),
  updateUrunDurum: (id, aktif) => apiRequest(`/api/yonetim/urunler/${id}/durum`, { method: 'PATCH', body: { aktif } }),
  stokHareketi: (data) => apiRequest('/api/yonetim/stok/hareket', { method: 'POST', body: data }),
  getStokHareketleri: (limit = 100) => apiRequest(`/api/yonetim/stok/hareketler?limit=${limit}`),
  topluStokGuncelle: (data) => apiRequest('/api/yonetim/stok/toplu-guncelle', { method: 'POST', body: data }),
  getYonetimKategoriler: () => apiRequest('/api/yonetim/kategoriler'),
  addKategori: (data) => apiRequest('/api/yonetim/kategoriler', { method: 'POST', body: data }),
  updateKategori: (id, data) => apiRequest(`/api/yonetim/kategoriler/${id}`, { method: 'PUT', body: data }),
  deleteKategori: (id) => apiRequest(`/api/yonetim/kategoriler/${id}`, { method: 'DELETE' }),
  getYonetimBirimler: () => apiRequest('/api/yonetim/birimler'),
  addBirim: (data) => apiRequest('/api/yonetim/birimler', { method: 'POST', body: data }),
  updateBirim: (id, data) => apiRequest(`/api/yonetim/birimler/${id}`, { method: 'PUT', body: data }),
  updateBirimDurum: (id, aktif) => apiRequest(`/api/yonetim/birimler/${id}/durum`, { method: 'PATCH', body: { aktif } }),
  deleteBirim: (id) => apiRequest(`/api/yonetim/birimler/${id}`, { method: 'DELETE' }),
  sifirlaBirimSifre: (birim_id, yeni_sifre) => apiRequest('/api/yonetim/birimler/sifre-sifirla', { method: 'POST', body: { birim_id, yeni_sifre } }),
  araGorsel: (q) => apiRequest(`/api/yonetim/gorsel/ara?q=${encodeURIComponent(q)}`),
  indirGorselUrl: (gorsel_url) => apiRequest('/api/yonetim/gorsel/indir', { method: 'POST', body: { gorsel_url } }),
  yukleGorselBase64: (data) => apiRequest('/api/yonetim/gorsel/yukle', { method: 'POST', body: data }),

  // Personel & Rehber Yönetimi & Hesap Açma
  getYonetimPersoneller: (params = {}) => apiRequest(`/api/yonetim/personel${cleanQuery(params)}`),
  addYonetimPersonel: (data) => apiRequest('/api/yonetim/personel', { method: 'POST', body: data }),
  updateYonetimPersonel: (id, data) => apiRequest(`/api/yonetim/personel/${id}`, { method: 'PUT', body: data }),
  deleteYonetimPersonel: (id) => apiRequest(`/api/yonetim/personel/${id}`, { method: 'DELETE' }),
  sifirlaPersonelSifre: (id, yeni_sifre = 'Etu1234!.') => apiRequest(`/api/yonetim/personel/${id}/sifre-sifirla`, { method: 'POST', body: { yeni_sifre } }),
  olusturPersonelHesaplari: (data) => apiRequest('/api/yonetim/personel/hesap-olustur', { method: 'POST', body: data }),
  getYonetimHiyerarsi: () => apiRequest('/api/yonetim/hiyerarsi'),
  getDenetimLoglari: (params = {}) => apiRequest(`/api/yonetim/denetim-loglari${cleanQuery(params)}`),

  // Görev Devri & Saatli İzin Motoru
  getAktifGorevDevri: () => apiRequest('/api/yonetim/gorev-devri/aktif'),
  kaydetGorevDevri: (data) => apiRequest('/api/yonetim/gorev-devri', { method: 'POST', body: data }),
  sonlandirGorevDevri: (data = {}) => apiRequest('/api/yonetim/gorev-devri/sonlandir', { method: 'POST', body: data }),

  // Telemetri Radarı
  getRadarOzeti: () => apiRequest('/api/telemetri/radar-ozeti'),

  // Rehber & Personel Aliasları (Geriye Uyumluluk)
  createPersonel: (data) => apiRequest('/api/yonetim/personel', { method: 'POST', body: data }),
  updatePersonel: (id, data) => apiRequest(`/api/yonetim/personel/${id}`, { method: 'PUT', body: data }),
  deletePersonel: (id) => apiRequest(`/api/yonetim/personel/${id}`, { method: 'DELETE' }),
  createBirim: (data) => apiRequest('/api/yonetim/birimler', { method: 'POST', body: data }),

  // Bildirimler
  getBildirimler: () => apiRequest('/api/bildirimler'),
  bildirimOkundu: (id) => apiRequest(`/api/bildirimler/${id}/okundu`, { method: 'POST' }),
  bildirimTumunuOku: () => apiRequest('/api/bildirimler/tumunu-oku', { method: 'POST' }),

  // İhtiyaç Fazlası Atıl Malzeme
  bildirAtilMalzeme: (data) => apiRequest('/api/atil-malzeme', { method: 'POST', body: data }),
  getBekleyenAtilMalzemeler: () => apiRequest('/api/atil-malzeme'),
  getTumAtilMalzemeler: () => apiRequest('/api/atil-malzeme/tum-bildirimler'),
  getAtilMalzemeById: (id) => apiRequest(`/api/atil-malzeme/${id}`),
  teslimAlAtilMalzeme: (id) => apiRequest(`/api/atil-malzeme/${id}/teslim-al`, { method: 'POST' }),

  // Acil Ödünç / Ortak Ekipman Havuzu
  getOduncEkipmanlar: () => apiRequest('/api/odunc-ekipman'),
  rezerveEtEkipman: (data) => apiRequest('/api/odunc-ekipman/rezerve-et', { method: 'POST', body: data }),
  getTumEkipmanRezervasyonlari: () => apiRequest('/api/odunc-ekipman/tum-rezervasyonlar'),
  getEkipmanRezervasyonById: (id) => apiRequest(`/api/odunc-ekipman/rezervasyon/${id}`),
  teslimEtEkipman: (id) => apiRequest(`/api/odunc-ekipman/${id}/teslim-et`, { method: 'POST' }),
  iadeAlEkipman: (id) => apiRequest(`/api/odunc-ekipman/${id}/iade-al`, { method: 'POST' }),
  getBirimEkipmanRezervasyonlari: () => apiRequest('/api/odunc-ekipman/rezervasyonlarim'),

  // Sistem & Veritabanı Yedekleri
  getYedekler: () => apiRequest('/api/yonetim/yedekler'),
  alYedek: () => apiRequest('/api/yonetim/yedekler/al', { method: 'POST' }),
  geriYukleYedek: (dosya) => apiRequest('/api/yonetim/yedekler/geri-yukle', { method: 'POST', body: { dosya } }),
  silYedek: (dosya) => apiRequest(`/api/yonetim/yedekler/${encodeURIComponent(dosya)}`, { method: 'DELETE' }),

  // Raporlar
  getYesilKampus: (params = {}) => apiRequest(`/api/raporlar/yesil-kampus${cleanQuery(params)}`),
  exportExcel: async (params = {}) => apiRequest(`/api/raporlar/excel${cleanQuery(params)}`),
  getHaftalikToplama: (carsambaTarihi, binaSirali = 1) => apiRequest(`/api/raporlar/haftalik-toplama?carsambaTarihi=${encodeURIComponent(carsambaTarihi)}&binaSirali=${binaSirali}`),
  getTopluTeslimFisleri: (carsambaTarihi, binaSirali = 1) => apiRequest(`/api/raporlar/toplu-teslim-fisleri?carsambaTarihi=${encodeURIComponent(carsambaTarihi)}&format=json&binaSirali=${binaSirali}`),
  getTopluTeslimFisleriUrl: (carsambaTarihi, print = true, binaSirali = 1) => `/api/raporlar/toplu-teslim-fisleri?carsambaTarihi=${encodeURIComponent(carsambaTarihi)}&binaSirali=${binaSirali}${print ? '&print=1' : ''}`,
  getTeslimFisi: (talepId) => apiRequest(`/api/raporlar/teslim-fisi/${talepId}`),
  getYoneticiBulteni: (params = {}) => apiRequest(`/api/raporlar/yonetici-bulteni${cleanQuery(params)}`),
  getYoneticiBulteniUrl: (params = {}, print = true) => `/api/raporlar/yonetici-bulteni${cleanQuery({ ...params, format: 'html', print: print ? '1' : '0' })}`,
  getDetayliAnaliz: (params = {}) => apiRequest(`/api/raporlar/detayli-analiz${cleanQuery(params)}`)
};

export default api;
