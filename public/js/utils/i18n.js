// i18n.js - KampüsStok / CampusStock Hafif ve Evrensel Çoklu Dil Motoru
// Zero-dependency, token-efficient, performant client-side internationalization.

const SUPPORTED_LANGS = [
  { code: 'tr', name: 'Türkçe', dir: 'ltr' },
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' }
];

const SUPPORTED_LANG_CODES = SUPPORTED_LANGS.map(l => l.code);

const DICTIONARIES = {
  tr: {
    brand: {
      title: 'KampüsStok',
      subtitle: 'Kırtasiye & Depo Portalı'
    },
    nav: {
      catalog: 'Malzeme Kataloğu',
      greenCampus: 'Yeşil Kampüs',
      cart: 'Sepetim',
      requests: 'Taleplerim',
      inbox: 'Gelen Kutusu',
      inventory: 'Depo ve Stok',
      warehouseMgmt: 'Depo Yönetimi',
      pendingRequests: 'Bekleyen Talepler',
      waitingDelivery: 'Teslim Bekleyenler',
      revisedRequests: 'Revize Edilenler',
      rejectedRequests: 'Reddedilenler',
      deliveredRequests: 'Teslim Edilenler',
      returnedItems: 'İade Malzemeler',
      loanedEquipment: 'Ödünç Ekipmanlar',
      productsStock: 'Ürünler & Stok',
      stockMovements: 'Stok Hareketleri',
      categoriesTree: 'Kategori Ağacı',
      deliveredOrders: 'Teslim Edilen Siparişler',
      directory: 'Kurumsal Rehber & Yetki',
      auditLogs: 'Denetim Logları',
      reports: 'Raporlar',
      quickSearch: 'Hızlı Arama',
      collapse: 'Menüyü Daralt',
      expand: 'Menüyü Genişlet',
      subMenu: 'Alt Menü'
    },
    header: {
      soundOn: 'Ses Açık',
      soundOff: 'Ses Kapalı',
      soundTitle: 'Bildirim Sesini Aç veya Kapat',
      langTitle: 'Dili Değiştir / Switch Language',
      switchRequester: 'İstek Sahibi Değiştir',
      dutyDelegation: 'Yetki Devri ve Görevlendirme',
      dutyDelegationSub: 'Satın Alma Müdürü Onay Masası',
      changePassword: 'Şifre Değiştir',
      logout: 'Çıkış Yap',
      notifications: 'Bildirimler',
      markAllRead: 'Tümünü Okundu Say',
      noNotifications: 'Henüz yeni bildirim yok',
      allUpToDate: 'Tüm süreçler güncel görünüyor.'
    },
    breadcrumb: {
      defaultTitle: 'KampüsStok',
      defaultSub: 'Kurumsal Talep Portalı',
      catalog: 'Malzeme Kataloğu',
      catalogSub: 'Tüm Kırtasiye ve Ofis Gereçleri',
      cart: 'Malzeme Talep Sepeti',
      cartSub: 'Onay ve Sipariş Masası',
      requests: 'Taleplerim',
      requestsSub: 'Talep ve Teslimat Takibi',
      greenCampus: 'Yeşil Kampüs Portalı',
      greenCampusSub: 'Sürdürülebilirlik ve Sıfır Atık',
      procurement: 'Satın Alma Masası',
      procurementSub: 'Gelen Talepler ve Onay Akışı',
      admin: 'Sistem Yönetimi',
      adminSub: 'Birimler ve Envanter Kontrolü',
      directory: 'Kurumsal Rehber',
      directorySub: 'Organizasyon ve Birim Personeli',
      reports: 'Raporlar ve Analiz',
      reportsSub: 'Stok ve Talep İstatistikleri',
      logs: 'Denetim Logları',
      logsSub: 'Sistem Hareket Kayıtları',
      requesterSelect: 'İstek Sahibi Seçimi',
      requesterSelectSub: 'Birim Personel Eşleştirme'
    },
    auth: {
      title: 'KampüsStok Portalı',
      subtitle: 'Birim veya Satın Alma hesabınızla giriş yapınız.',
      identifier: 'Kullanıcı Adı veya Kurumsal E-Posta',
      password: 'Şifre',
      forgotPassword: 'Şifremi Unuttum?',
      rememberMe: 'Beni Hatırla (30 gün oturumu açık tut)',
      signIn: 'Giriş Yap',
      loginNotice: 'Kurumsal E-posta veya Kullanıcı Adınız ile giriş yapabilirsiniz.'
    },
    catalog: {
      title: 'Malzeme Kataloğu',
      subtitle: 'Biriminiz için gereken kırtasiye ve sarf malzemelerini seçip sepete ekleyin.',
      searchPlaceholder: 'Ürün adı, marka veya kategori ara...',
      allCategories: 'Tüm Kategoriler',
      favorites: 'Favorilerim',
      addFavorite: '+Fav',
      favorited: 'Favori',
      inStock: 'Stokta',
      outOfStock: 'Tükendi',
      durable: 'Demirbaş',
      inspect: 'İncele',
      addToCart: 'Sepete Ekle',
      added: 'Eklendi'
    },
    cart: {
      title: 'Malzeme Talep Sepeti',
      subtitle: 'Talep listenizi gözden geçirin, adetleri düzenleyin ve onaylayarak Satın Alma Müdürlüğü\'ne iletin.',
      emptyTitle: 'Sepetiniz Boş',
      emptyDesc: 'Katalogdan ihtiyacınız olan kırtasiye ürünlerini seçebilirsiniz.',
      browseCatalog: 'Kataloğa Git',
      clearCart: 'Sepeti Temizle',
      summary: 'Talep Özeti',
      requester: 'İstek Sahibi:',
      department: 'Birim:',
      totalVariety: 'Toplam Çeşit:',
      totalQty: 'Toplam Adet:',
      memoLabel: 'Talep Notu / Açıklama (İsteğe Bağlı):',
      memoPlaceholder: 'Gereksinim detayları veya aciliyet bilgisi...',
      deliveryRule: 'Teslimat Kuralı: Talebiniz onaylandıktan sonra depodan dağıtımlar Çarşamba günleri yapılır.',
      submit: 'Talebi Onayla ve Gönder'
    },
    requests: {
      title: 'Taleplerim',
      subtitle: 'Adınıza oluşturduğunuz geçmiş talepleri ve teslimat tarihlerini takip edin.',
      allStatuses: 'Tüm Durumlar',
      filter: 'Filtrele',
      colNo: 'TALEP NO',
      colDate: 'TARİH',
      colOwner: 'İSTEK SAHİBİ',
      colItems: 'KALEM SAYISI',
      colStatus: 'DURUM',
      colDelivery: 'TESLİM TARİHİ',
      colActions: 'İŞLEMLER',
      noRecords: 'Kayıtlı talep bulunamadı.',
      confirmReceipt: 'Teslim Aldım'
    },
    status: {
      beklemede: 'İnceleme Bekliyor',
      onaylandi: 'Onaylandı',
      reddedildi: 'Reddedildi',
      hazirlaniyor: 'Hazırlanıyor',
      teslim_edildi: 'Teslim Edildi',
      revize_onaylandi: 'Revize Onaylandı'
    },
    common: {
      close: 'Kapat',
      cancel: 'Vazgeç',
      save: 'Kaydet',
      confirm: 'Onayla',
      delete: 'Sil',
      search: 'Ara',
      loading: 'Yükleniyor...',
      error: 'Hata',
      success: 'Başarılı',
      actions: 'İşlemler'
    }
  },

  en: {
    brand: {
      title: 'CampusStock',
      subtitle: 'Supplies & Warehouse Portal'
    },
    nav: {
      catalog: 'Supplies Catalog',
      greenCampus: 'Green Workplace',
      cart: 'My Cart',
      requests: 'My Requisitions',
      inbox: 'Approval Inbox',
      inventory: 'Warehouse & Inventory',
      warehouseMgmt: 'Warehouse Management',
      pendingRequests: 'Pending Requisitions',
      waitingDelivery: 'Pending Delivery',
      revisedRequests: 'Revised Requisitions',
      rejectedRequests: 'Rejected Requisitions',
      deliveredRequests: 'Delivered Requisitions',
      returnedItems: 'Returned / Surplus Items',
      loanedEquipment: 'Equipment Loans',
      productsStock: 'Products & Stock',
      stockMovements: 'Stock Ledger',
      categoriesTree: 'Category Tree',
      deliveredOrders: 'Completed Deliveries',
      directory: 'Corporate Directory',
      auditLogs: 'Audit Trail Logs',
      reports: 'Reports & Analytics',
      quickSearch: 'Quick Search',
      collapse: 'Collapse Sidebar',
      expand: 'Expand Sidebar',
      subMenu: 'Sub Menu'
    },
    header: {
      soundOn: 'Sound On',
      soundOff: 'Sound Muted',
      soundTitle: 'Toggle notification chime sound',
      langTitle: 'Change Language / Dil Değiştir',
      switchRequester: 'Switch Requester',
      dutyDelegation: 'Duty Delegation & Acting Officer',
      dutyDelegationSub: 'Procurement Approval Desk',
      changePassword: 'Change Password',
      logout: 'Sign Out',
      notifications: 'Notifications',
      markAllRead: 'Mark All as Read',
      noNotifications: 'No new notifications yet',
      allUpToDate: 'All operations are up to date.'
    },
    breadcrumb: {
      defaultTitle: 'CampusStock',
      defaultSub: 'Corporate Requisition Portal',
      catalog: 'Supplies Catalog',
      catalogSub: 'All stationery and office supplies',
      cart: 'Requisition Cart',
      cartSub: 'Approval and order desk',
      requests: 'My Requisitions',
      requestsSub: 'Order and delivery tracking',
      greenCampus: 'Green Workplace Portal',
      greenCampusSub: 'Sustainability & Zero Waste',
      procurement: 'Procurement Desk',
      procurementSub: 'Incoming orders and approval flow',
      admin: 'System Administration',
      adminSub: 'Department and inventory control',
      directory: 'Corporate Directory',
      directorySub: 'Organization and staff roster',
      reports: 'Reports and Analytics',
      reportsSub: 'Stock and consumption statistics',
      logs: 'Audit Logs',
      logsSub: 'System activity records',
      requesterSelect: 'Requester Selection',
      requesterSelectSub: 'Staff assignment'
    },
    auth: {
      title: 'CampusStock Portal',
      subtitle: 'Sign in with your department or procurement account.',
      identifier: 'Username or Corporate Email',
      password: 'Password',
      forgotPassword: 'Forgot Password?',
      rememberMe: 'Remember me (stay signed in for 30 days)',
      signIn: 'Sign In',
      loginNotice: 'You can sign in using your corporate email or assigned username.'
    },
    catalog: {
      title: 'Supplies Catalog',
      subtitle: 'Select stationery, office supplies, and equipment needed for your department.',
      searchPlaceholder: 'Search item name, brand or category...',
      allCategories: 'All Categories',
      favorites: 'Favorites',
      addFavorite: '+Fav',
      favorited: 'Favorited',
      inStock: 'In Stock',
      outOfStock: 'Out of Stock',
      durable: 'Fixed Asset',
      inspect: 'Inspect',
      addToCart: 'Add to Cart',
      added: 'Added'
    },
    cart: {
      title: 'Requisition Cart',
      subtitle: 'Review requested items, adjust quantities, and submit for Procurement review.',
      emptyTitle: 'Your Cart is Empty',
      emptyDesc: 'Browse the catalog to request stationery and consumables.',
      browseCatalog: 'Browse Catalog',
      clearCart: 'Clear Cart',
      summary: 'Order Summary',
      requester: 'Requester:',
      department: 'Department:',
      totalVariety: 'Total Variety:',
      totalQty: 'Total Quantity:',
      memoLabel: 'Requisition Note / Urgency (Optional):',
      memoPlaceholder: 'Provide justification or delivery instructions...',
      deliveryRule: 'Distribution Rule: Deliveries are dispatched on scheduled distribution days.',
      submit: 'Submit Requisition for Approval'
    },
    requests: {
      title: 'My Requisitions',
      subtitle: 'Track your submitted orders, approval stages, and scheduled deliveries.',
      allStatuses: 'All Statuses',
      filter: 'Filter',
      colNo: 'REQ NO',
      colDate: 'DATE',
      colOwner: 'REQUESTER',
      colItems: 'ITEMS',
      colStatus: 'STATUS',
      colDelivery: 'DELIVERY DATE',
      colActions: 'ACTIONS',
      noRecords: 'No requisitions found.',
      confirmReceipt: 'Confirm Receipt'
    },
    status: {
      beklemede: 'Pending Review',
      onaylandi: 'Approved',
      reddedildi: 'Rejected',
      hazirlaniyor: 'Preparing',
      teslim_edildi: 'Delivered',
      revize_onaylandi: 'Approved with Revision'
    },
    common: {
      close: 'Close',
      cancel: 'Cancel',
      save: 'Save',
      confirm: 'Confirm',
      delete: 'Delete',
      search: 'Search',
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
      actions: 'Actions'
    }
  },

  // Almanca (Altyapı hazır)
  de: {
    brand: { title: 'CampusStock', subtitle: 'Bürobedarf & Lagerportal' },
    nav: { catalog: 'Materialkatalog', greenCampus: 'Grüner Campus', cart: 'Mein Warenkorb', requests: 'Meine Anforderungen' }
  },
  // Fransızca (Altyapı hazır)
  fr: {
    brand: { title: 'CampusStock', subtitle: 'Portail des fournitures et entrepôt' },
    nav: { catalog: 'Catalogue de fournitures', greenCampus: 'Campus Vert', cart: 'Mon Panier', requests: 'Mes Demandes' }
  },
  // İspanyolca (Altyapı hazır)
  es: {
    brand: { title: 'CampusStock', subtitle: 'Portal de suministros y almacén' },
    nav: { catalog: 'Catálogo de suministros', greenCampus: 'Campus Verde', cart: 'Mi Carrito', requests: 'Mis Solicitudes' }
  },
  // Arapça (Altyapı hazır)
  ar: {
    brand: { title: 'كامبوس ستوك', subtitle: 'بوابة المستلزمات والمستودع' },
    nav: { catalog: 'دليل المواد', greenCampus: 'الحرم الأخضر', cart: 'سلتي', requests: 'طلباتي' }
  }
};

let currentLang = 'tr';

export function initI18n() {
  try {
    const saved = localStorage.getItem('app_lang');
    if (saved && SUPPORTED_LANG_CODES.includes(saved)) {
      currentLang = saved;
    } else {
      const browserLang = (navigator.language || 'tr').slice(0, 2).toLowerCase();
      currentLang = SUPPORTED_LANG_CODES.includes(browserLang) ? browserLang : 'tr';
    }
  } catch {
    currentLang = 'tr';
  }
  applyLangToDom(currentLang);
  return currentLang;
}

function applyLangToDom(lang) {
  document.documentElement.lang = lang;
  const match = SUPPORTED_LANGS.find(l => l.code === lang);
  document.documentElement.dir = match && match.dir ? match.dir : 'ltr';
}

export function getLanguage() {
  return currentLang;
}

export function getSupportedLanguages() {
  return SUPPORTED_LANGS;
}

export function setLanguage(lang) {
  if (!SUPPORTED_LANG_CODES.includes(lang)) return;
  currentLang = lang;
  try {
    localStorage.setItem('app_lang', lang);
  } catch {}
  applyLangToDom(lang);
  window.dispatchEvent(new CustomEvent('app:languageChanged', { detail: { lang } }));
}

/**
 * Belirtilen anahtar için mevcut dildeki metni döndürür.
 * İki kademeli fallback: Önce aktif dil -> sonra İngilizce -> sonra Türkçe -> varsayılan metin.
 */
export function t(keyPath, defaultText = '') {
  if (!keyPath) return '';
  const parts = keyPath.split('.');

  // 1. Aktif dil
  let target = DICTIONARIES[currentLang];
  for (const part of parts) {
    if (target && target[part] !== undefined) {
      target = target[part];
    } else {
      target = null;
      break;
    }
  }
  if (target !== null && target !== undefined) return target;

  // 2. İngilizce fallback
  let fallbackEn = DICTIONARIES['en'];
  for (const part of parts) {
    if (fallbackEn && fallbackEn[part] !== undefined) {
      fallbackEn = fallbackEn[part];
    } else {
      fallbackEn = null;
      break;
    }
  }
  if (fallbackEn !== null && fallbackEn !== undefined) return fallbackEn;

  // 3. Türkçe fallback
  let fallbackTr = DICTIONARIES['tr'];
  for (const part of parts) {
    if (fallbackTr && fallbackTr[part] !== undefined) {
      fallbackTr = fallbackTr[part];
    } else {
      fallbackTr = null;
      break;
    }
  }
  if (fallbackTr !== null && fallbackTr !== undefined) return fallbackTr;

  return defaultText || keyPath;
}

// Global window erişimi
if (typeof window !== 'undefined') {
  window.__t = t;
  window.__i18n = { getLanguage, setLanguage, t, supportedLangs: SUPPORTED_LANGS };
}

export default { initI18n, getLanguage, setLanguage, getSupportedLanguages, t, supportedLangs: SUPPORTED_LANGS };
