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
    satinalma: {
      title: 'Gelen Kutusu & Talep Yönetimi',
      subtitle: 'Birimlerden gelen kırtasiye taleplerini hiyerarşik ağaç akışında inceleyin ve sonuçlandırın.',
      kpiPending: 'Bekleyen Talep',
      kpiPendingSub: 'İnceleme ve Onay Bekliyor',
      kpiDelivery: 'Çarşamba Teslimat',
      deliveryBadge: 'Teslimat',
      batchDeliver: 'Toplu Teslim Et',
      kpiRevised: 'Revize Onaylanan',
      kpiRevisedSub: 'Miktar Düzeltmeli Onay',
      kpiRejected: 'Reddedilen',
      kpiRejectedSub: 'İptal Edilen Talepler',
      kpiDelivered: 'Teslim Edilenler',
      kpiDeliveredSub: 'Tamamlanan Talepler',
      tabPending: 'Bekleyen Talepler',
      tabDelivery: 'Teslim Bekleyenler',
      tabRevised: 'Revize Edilenler',
      tabRejected: 'Reddedilenler',
      tabDelivered: 'Teslim Edilenler',
      tabReturned: 'İade Malzemeler',
      tabLoaned: 'Ödünç Ekipmanlar',
      tabAll: 'Tüm Talepler',
      searchPlaceholder: 'Talep No, Birim veya İstek Sahibi ara (Örn: TLP-2026, Mühendislik, Ahmet)...',
      optPendingOnly: 'Sadece Bekleyenler',
      optDeliveryWed: 'Çarşamba Teslimatı Bekleyenler',
      optReturned: 'İade Malzemeler',
      optLoaned: 'Ödünç Ekipman Talepleri',
      optAll: 'Tüm Talepler',
      optApproved: 'Onaylananlar',
      optRevised: 'Revize Onaylananlar',
      optDelivered: 'Teslim Edilenler',
      optRejected: 'Reddedilenler',
      refresh: 'Yenile',
      loading: 'Talepler yükleniyor...',
      noRequestsTitle: 'Kayıtlı Talep Bulunamadı',
      noRequestsSub: 'Seçili filtrelere uygun gelen talep bulunmuyor.',
      noSurplusTitle: 'Atıl Malzeme Bildirimi Bulunamadı',
      noSurplusSub: 'Henüz bekleyen veya teslim alınmış bir atıl malzeme bildirimi bulunmuyor.',
      noLoanedTitle: 'Ödünç Ekipman Talebi Bulunamadı',
      noLoanedSub: 'Henüz kayıtlı bir ekipman rezervasyon talebi bulunmuyor.',
      inspectAndApprove: 'İncele & Onayla',
      inspect: 'İncele',
      markDelivered: 'Teslim Edildi Yap',
      deliveryReceipt: 'Teslim Fişi',
      print: 'Yazdır',
      receiveSurplus: 'Depoya Teslim Al (+20 P)',
      surplusReceived: 'Kuruma Kazandırıldı',
      loanDelivered: 'Birime Teslim Edildi',
      loanReturned: 'Depoya İade Alındı (+5 P)',
      loanCompleted: 'Tamamlandı',
      itemsCount: 'Kalem Malzeme',
      requestsCount: 'İstek',
      notificationsCount: 'Talep Bildirimi',
      userConfirmed: '✓ Teslim Alındı (Kullanıcı Teyitli)',
      awaitingUserConfirm: 'Teslim Edildi (Kullanıcı Teyidi Bekleniyor)'
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
      actions: 'İşlemler',
      procurementOffice: 'Satın Alma Müdürlüğü',
      departmentUser: 'Birim Kullanıcısı',
      systemArchitect: 'Sistem Tasarımcısı',
      actingOfficer: 'Vekil'
    },
    yonetim: {
      title: 'Depo & Malzeme Yönetimi',
      subtitle: 'Ürün kataloğu, anlık depo stokları, giriş/çıkış hareketleri, kategori hiyerarşisi ve sistem yedeklerini yönetin.',
      authTitle: 'Yetkilendirme & Hesap Yönetimi',
      authSubtitle: 'Kurumsal birimler, personel hesapları, rol atamaları, ilk giriş şifreleri ve teslimat adreslerini yönetin.',
      tabProducts: 'Ürünler & Stok',
      tabMovements: 'Stok Hareketleri',
      tabCategories: 'Kategori Ağacı',
      tabBackups: 'Sistem ve Yedekleme',
      categoryTree: 'Kategori Ağacı',
      allProducts: 'Tüm Ürünler',
      searchPlaceholder: 'Ürün adı, barkod (869...), marka ara...',
      scanBarcode: 'Barkod Okut',
      allCategories: 'Tüm Kategoriler',
      allStockLevels: 'Tüm Stok Seviyeleri',
      criticalStock: 'Kritik Stoktakiler',
      outOfStock: 'Tükenenler (0 Stok)',
      adequateStock: 'Yeterli Stok',
      addNewProduct: 'Yeni Ürün Ekle',
      scannerReady: 'Barkod Okuyucu Tabanca Aktif (Hazır)',
      scannerReadyShort: 'Tabanca Hazır',
      scanOrSearchBarcode: 'Barkod Okut / Ara:',
      scanBarcodePlaceholder: 'Barkodu okutun (869...)',
      find: 'Bul',
      scannerHint: 'Barkod tabancasını okutabilir veya 13 haneli barkodu yazabilirsiniz.',
      selectProduct: 'Ürün Seçiniz',
      selectFromList: 'Listeden Seçiniz...',
      actionType: 'İşlem Türü',
      stockIn: 'Stok Ekle (Depo Girişi)',
      stockAdjust: 'Stok Düzelt / Eşitle (Sayım)',
      quantity: 'Miktar',
      qtyPlaceholder: 'Giriş / Sayım Miktarı',
      descriptionOptional: 'Açıklama (Opsiyonel)',
      descPlaceholder: 'Örn: Fatura No: 2026/41',
      saveStockMovement: 'Stok Hareketini Kaydet',
      recentMovements: 'Son Stok Hareketleri',
      recentMovementsSub: 'Giriş, çıkış ve sayım düzeltmelerini inceleyin.',
      searchMovementsPlaceholder: 'Ürün adı, barkod (869...), açıklama ara...',
      colImage: 'Görsel',
      colProductName: 'Ürün Adı & Barkod',
      colCategory: 'Kategori',
      colUnit: 'Ölçü Birimi',
      colCurrentStock: 'Mevcut Stok',
      colCriticalThreshold: 'Kritik Eşik',
      colOpenForRequisition: 'Talebe Açık',
      colDate: 'Tarih',
      colProductBarcode: 'Ürün & Barkod',
      colType: 'Tür',
      colQty: 'Miktar',
      colDescription: 'Açıklama',
      colOperator: 'İşlemi Yapan',
      active: 'Aktif',
      passive: 'Pasif',
      edit: 'Düzenle',
      delete: 'Sil',
      updateStock: 'Stok Güncelle',
      selectedItems: 'ürün seçildi',
      selectedStockTo: '| Seçilenlerin Stoğunu:',
      makeTo: 'Yap',
      applyBatchStock: 'Tek Tıkla Stoğu Güncelle',
      clearSelection: 'Seçimi Kaldır',
      totalItemsListed: 'Toplam {count} ürün listeleniyor',
      loadingItems: 'Depo ürünleri yükleniyor...',
      quickStockTitle: 'Barkod Okundu: Hızlı Depo İşlemi',
      currentStockLabel: 'Mevcut Depo Stoğu',
      criticalLevelWarning: 'Kritik Stok Seviyesinde! (Eşik: {threshold})',
      quickAdjustLabel: 'Hızlı Stok Arttır / Azalt:',
      setManualStockLabel: 'Yeni Stok Belirle:',
      saveStockBtn: 'Stoğu Kaydet',
      editAllBtn: 'Tüm Bilgileri Düzenle',
      scanModalTitle: 'Barkod Tara / Manuel Barkod Sorgula',
      scanModalSub: 'Barkod Okuyucu Tabanca ile Okutun',
      scanModalDesc: 'Barkod okuyucu tabancayı doğrudan bu pencere açıkken tetiğe basarak kullanabilirsiniz veya 13 haneli barkodu yazabilirsiniz.',
      barcodeLabel: 'Barkod Numarası (EAN-13):',
      queryBarcodeBtn: 'Barkodu Bul ve Getir'
    },
    loglar: {
      title: 'Denetim Logları & Sistem İzleri',
      subtitle: 'Tüm talep onayları, teslimat teyitleri, stok hareketleri, kullanıcı oturumları ve şifre güncellemelerinin resmi denetim kayıtları.',
      radarTitle: 'CANLI İZLEME VE TEST RADARI (Yönetim & Komisyon Takibi)',
      listeningMode: 'Aktif Dinleme Modu',
      presentationStatus: 'Sunum İnceleme Durumu',
      liveTestLogins: 'CANLI SİSTEM TEST GİRİŞLERİ',
      todayViewsCount: 'BUGÜN SUNUM AÇILIŞ SAYISI',
      auditLogsTitle: 'Sistem Denetim İzleri (Audit Logs)',
      auditLogsSub: 'Kullanıcı girişleri, şifre/adres güncellemeleri, toplu stok değişiklikleri ve yönetimsel işlemlerin kayıtları.',
      colDate: 'TARİH / SAAT',
      colActionType: 'İŞLEM TÜRÜ',
      colUser: 'KULLANICI / HESAP',
      colRole: 'ROL',
      colIp: 'IP ADRESİ',
      colDetail: 'DETAY',
      optAllActions: 'Tüm İşlem Türleri',
      optDeptActions: 'Birim Hareketleri',
      refresh: 'Yenile'
    },
    raporlar: {
      title: 'Raporlar & Canlı Tüketim Analizi',
      subtitle: 'Kurum geneli, departman, birim ve personel bazında canlı kırtasiye tüketim tablosu, KPI özetleri ve resmi çıktılar.',
      kpiTotalItems: 'Toplam Kalem',
      kpiTotalItemsSub: 'Tüm taleplerdeki ürün satırı',
      kpiDeliveredQty: 'Teslim Edilen Adet',
      kpiDeliveredQtySub: 'Dağıtılan toplam malzeme',
      kpiTopDept: 'En Çok Talep Eden Birim',
      kpiTopDeptSub: 'En yüksek tüketim hacmi',
      kpiTopItem: 'En Çok İstenen Malzeme',
      kpiTopItemSub: 'En popüler kırtasiye ürünü',
      tableTitle: 'Canlı Tüketim & Talep Tablosu',
      tableSub: 'İndirmeden doğrudan tarayıcıda inceleyin, arayın ve tek tıkla filtrelenmiş veriyi Excel\'e dökün.',
      downloadExcel: 'Excel (.xlsx) İndir',
      printTable: 'Tabloyu Yazdır',
      lblDept: 'Birim / Departman',
      allDepts: 'Tüm Birimler (Kurum Geneli)',
      lblStatus: 'Talep Durumu',
      allStatuses: 'Tüm Durumlar',
      quickSearch: 'Hızlı Arama',
      searchPlaceholder: 'Personel adı, ürün adı, talep no...',
      reset: 'Sıfırla',
      colReqNo: 'TALEP NO',
      colDate: 'TARİH',
      colDept: 'BİRİM / DEPARTMAN',
      colStaff: 'TALEP EDEN PERSONEL',
      colLocation: 'TESLİMAT YERİ (BİNA/ODA)',
      colItem: 'MALZEME / ÜRÜN ADI',
      colRequested: 'İSTENEN',
      colDelivered: 'VERİLEN',
      colStatus: 'DURUM',
      noData: 'Filtre kriterlerine uygun talep kaydı bulunamadı.',
      cardExcelTitle: 'Talepleri Excel\'e Aktar (.xlsx)',
      cardExcelSub: 'Filtrelenen tüm talepleri ve durumlarını Excel çalışma kitabı olarak bilgisayarınıza indirin.',
      cardSlipsTitle: 'Haftalık Dağıtım & Fişler (A4)',
      cardSlipsSub: 'Depo toplama listesi ve birimlere imzalatılacak A4 Malzeme Teslim Fişlerini topluca yazdırın.',
      deliveryWed: 'Teslimat Çarşambası',
      btnExportExcel: 'Filtrelenmiş Excel İndir',
      btnPrintSlips: 'Toplu Fişleri Yazdır'
    },
    rehber: {
      title: 'Kurumsal Rehber & Yetkilendirme',
      subtitle: 'Kurumsal ağaç yapısı ve telefon rehberi.',
      expandAll: 'Tümünü Genişlet',
      collapseAll: 'Tümünü Daralt',
      batchAccount: 'Toplu Hesap Tanımla',
      importExcel: 'Excel İçe Aktar',
      newUnit: '+ Yeni Birim',
      newPerson: '+ Yeni Kişi Ekle',
      tabAll: 'Tümü',
      tabAcademic: 'Akademik Birimler',
      tabAdministrative: 'İdari Birimler',
      tabCenters: 'Uygulama ve Araştırma Merkezleri',
      searchPlaceholder: 'Rehberde isim, unvan, dahili telefon, oda no veya birim ara...',
      hasAccount: 'Giriş Hesabı Var',
      noAccount: 'Hesap Yok',
      ext: 'Dahili',
      room: 'Oda',
      expand: 'Genişlet',
      collapse: 'Daralt',
      edit: 'Düzenle',
      delete: 'Sil',
      pwdOutlook: 'Şifre ve Outlook'
    },
    yesilKampus: {
      title: 'Kurumsal Yeşil Ofis & Sürdürülebilirlik Portalı',
      subtitle: 'Nobel Ödüllü Davranışsal İktisat (Nudge) ve Sıfır Atık ilkeleriyle kurum kaynaklarını birlikte koruyoruz.',
      btnSurplus: 'İhtiyaç Fazlası Bildir (+20 P)',
      btnLoan: 'Ortak Ekipman Ödünç Al (+10 P)',
      btnLeaderboard: 'Tam Sıralama',
      cardSurplusTitle: 'Atıl Malzeme İadesi',
      cardSurplusBadge: '+20 Puan',
      cardSurplusDesc: 'Dolapta veya çekmecede atıl bekleyen klasör, zımba vb. kırtasiyeleri depoya bildirin, Çarşamba günü odanızdan teslim alalım.',
      cardLoanTitle: 'Ortak Havuz Ekipmanı',
      cardLoanBadge: '+10 Puan',
      cardLoanDesc: 'Nadir kullanılan araçları satın almak yerine ortak havuzdan geçici ödünç alın.',
      cardNudgeTitle: 'Nudge Akıllı Sepet',
      cardNudgeBadge: '+10 Puan',
      cardNudgeDesc: 'Sepetinizdeki yeşil tasarruf önerilerini kabul ettiğinizde puan kazanın.'
    },
    istekSahibi: {
      title: 'İstek Sahibi Belirleme',
      subtitle: 'adına bu talebi kimin oluşturduğunu seçiniz veya yeni kişi ekleyiniz.',
      tabSelect: 'Listeden Seç',
      tabNew: 'Yeni Personel Ekle',
      staffList: 'Personel Listesi',
      corpEmail: 'Kurumsal E-Posta Adresi',
      emailNotice: 'Talep onay ve teslimat bilgilendirme mesajları bu adrese gönderilecektir.',
      btnConfirm: 'Seçimi Onayla ve Kataloğa Geç',
      nameWithTitle: 'Ad Soyad (Unvan Dahil)',
      btnSave: 'Kaydet ve Kataloğa Geç',
      noStaff: 'Bu birimde henüz kayıtlı personel yok'
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
    satinalma: {
      title: 'Approval Inbox & Order Flow',
      subtitle: 'Review, evaluate and process department stationery requisitions hierarchically.',
      kpiPending: 'Pending Orders',
      kpiPendingSub: 'Awaiting Review & Approval',
      kpiDelivery: 'Scheduled Delivery',
      deliveryBadge: 'Delivery',
      batchDeliver: 'Batch Delivery',
      kpiRevised: 'Approved with Revision',
      kpiRevisedSub: 'Quantity Adjusted Approval',
      kpiRejected: 'Rejected',
      kpiRejectedSub: 'Cancelled Orders',
      kpiDelivered: 'Delivered',
      kpiDeliveredSub: 'Fulfilled Orders Archive',
      tabPending: 'Pending Orders',
      tabDelivery: 'Pending Delivery',
      tabRevised: 'Revised Orders',
      tabRejected: 'Rejected Orders',
      tabDelivered: 'Completed Deliveries',
      tabReturned: 'Surplus Materials',
      tabLoaned: 'Equipment Loans',
      tabAll: 'All Requisitions',
      searchPlaceholder: 'Search Req No, Department or Requester (e.g. REQ-2026, Engineering)...',
      optPendingOnly: 'Pending Review Only',
      optDeliveryWed: 'Pending Scheduled Delivery',
      optReturned: 'Returned Surplus Items',
      optLoaned: 'Equipment Loan Requests',
      optAll: 'All Requisitions',
      optApproved: 'Approved',
      optRevised: 'Approved with Revision',
      optDelivered: 'Delivered',
      optRejected: 'Rejected',
      refresh: 'Refresh',
      loading: 'Loading requisitions...',
      noRequestsTitle: 'No Requisitions Found',
      noRequestsSub: 'There are no requisitions matching your selected filters.',
      noSurplusTitle: 'No Surplus Materials Found',
      noSurplusSub: 'No pending or received surplus material reports at this time.',
      noLoanedTitle: 'No Equipment Loans Found',
      noLoanedSub: 'No registered equipment reservation requests at this time.',
      inspectAndApprove: 'Review & Approve',
      inspect: 'Review',
      markDelivered: 'Mark Delivered',
      deliveryReceipt: 'Delivery Receipt',
      print: 'Print',
      receiveSurplus: 'Accept to Warehouse (+20 P)',
      surplusReceived: 'Recovered for Workplace',
      loanDelivered: 'Dispatched to Department',
      loanReturned: 'Returned to Warehouse (+5 P)',
      loanCompleted: 'Completed',
      itemsCount: 'Items',
      requestsCount: 'Requisitions',
      notificationsCount: 'Requisition Notice',
      userConfirmed: '✓ Received (User Confirmed)',
      awaitingUserConfirm: 'Delivered (Awaiting User Confirmation)'
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
      actions: 'Actions',
      procurementOffice: 'Procurement Directorate',
      departmentUser: 'Department User',
      systemArchitect: 'System Architect',
      actingOfficer: 'Acting Officer'
    },
    yonetim: {
      title: 'Warehouse & Inventory Management',
      subtitle: 'Manage item catalog, real-time stock balances, stock ledger movements, category tree, and system backups.',
      authTitle: 'Access Control & Account Management',
      authSubtitle: 'Manage institutional departments, staff accounts, role assignments, temporary passwords, and delivery addresses.',
      tabProducts: 'Products & Stock',
      tabMovements: 'Stock Ledger',
      tabCategories: 'Category Tree',
      tabBackups: 'System & Backups',
      categoryTree: 'Category Tree',
      allProducts: 'All Products',
      searchPlaceholder: 'Search product name, barcode (869...), brand...',
      scanBarcode: 'Scan Barcode',
      allCategories: 'All Categories',
      allStockLevels: 'All Stock Levels',
      criticalStock: 'Critical Stock Level',
      outOfStock: 'Out of Stock (0 Balance)',
      adequateStock: 'Adequate Stock',
      addNewProduct: 'Add New Product',
      scannerReady: 'Barcode Scanner Gun Active (Ready)',
      scannerReadyShort: 'Scanner Ready',
      scanOrSearchBarcode: 'Scan / Search Barcode:',
      scanBarcodePlaceholder: 'Scan barcode (869...)',
      find: 'Find',
      scannerHint: 'Scan barcode with gun scanner or type the 13-digit code.',
      selectProduct: 'Select Product',
      selectFromList: 'Select from list...',
      actionType: 'Action Type',
      stockIn: 'Add Stock (Warehouse Receipt)',
      stockAdjust: 'Stock Adjustment / Audit Count',
      quantity: 'Quantity',
      qtyPlaceholder: 'Receipt / Count Quantity',
      descriptionOptional: 'Description / Notes (Optional)',
      descPlaceholder: 'e.g. Invoice / PO No: 2026/41',
      saveStockMovement: 'Save Stock Movement',
      recentMovements: 'Recent Stock Movements',
      recentMovementsSub: 'Review receipt, issue, and audit adjustment entries.',
      searchMovementsPlaceholder: 'Search item name, barcode (869...), notes...',
      colImage: 'IMAGE',
      colProductName: 'PRODUCT NAME & BARCODE',
      colCategory: 'CATEGORY',
      colUnit: 'UNIT',
      colCurrentStock: 'CURRENT STOCK',
      colCriticalThreshold: 'THRESHOLD',
      colOpenForRequisition: 'AVAILABLE',
      colDate: 'DATE',
      colProductBarcode: 'PRODUCT & BARCODE',
      colType: 'TYPE',
      colQty: 'QUANTITY',
      colDescription: 'DESCRIPTION',
      colOperator: 'OPERATOR',
      active: 'Active',
      passive: 'Inactive',
      edit: 'Edit',
      delete: 'Delete',
      updateStock: 'Update Stock',
      selectedItems: 'products selected',
      selectedStockTo: '| Set selected items stock to:',
      makeTo: '',
      applyBatchStock: 'Update Stock with One-Click',
      clearSelection: 'Clear Selection',
      totalItemsListed: 'Total {count} products listed',
      loadingItems: 'Loading warehouse inventory...',
      quickStockTitle: 'Barcode Scanned: Quick Stock Action',
      currentStockLabel: 'Current Warehouse Balance',
      criticalLevelWarning: 'Critical Threshold Alert! (Threshold: {threshold})',
      quickAdjustLabel: 'Quick Increment / Decrement:',
      setManualStockLabel: 'Set New Stock Balance:',
      saveStockBtn: 'Save Stock',
      editAllBtn: 'Edit All Details',
      scanModalTitle: 'Scan Barcode / Manual Search',
      scanModalSub: 'Scan with Barcode Gun',
      scanModalDesc: 'Pull the trigger on your hardware barcode scanner while this dialog is open or type the 13-digit barcode.',
      barcodeLabel: 'Barcode Number (EAN-13):',
      queryBarcodeBtn: 'Lookup Barcode'
    },
    loglar: {
      title: 'Audit Trail Logs & System Records',
      subtitle: 'Official compliance logs for approvals, delivery receipts, inventory movements, logins, and security events.',
      radarTitle: 'LIVE MONITORING & AUDIT RADAR (Oversight & Telemetry)',
      listeningMode: 'Active Listening Mode',
      presentationStatus: 'Presentation View Status',
      liveTestLogins: 'LIVE SYSTEM TEST ACTIVITY',
      todayViewsCount: 'TODAY PRESENTATION VIEWS',
      auditLogsTitle: 'System Audit Logs',
      auditLogsSub: 'Logs of user sessions, password updates, bulk stock modifications, and administrative operations.',
      colDate: 'DATE / TIME',
      colActionType: 'ACTION TYPE',
      colUser: 'USER / ACCOUNT',
      colRole: 'ROLE',
      colIp: 'IP ADDRESS',
      colDetail: 'DETAILS',
      optAllActions: 'All Action Types',
      optDeptActions: 'Department Actions',
      refresh: 'Refresh'
    },
    raporlar: {
      title: 'Reports & Live Consumption Analytics',
      subtitle: 'Real-time stationery consumption roster, KPI summaries, and export documents across the entire organization.',
      kpiTotalItems: 'TOTAL ITEMS',
      kpiTotalItemsSub: 'Product lines across all requisitions',
      kpiDeliveredQty: 'DELIVERED QUANTITY',
      kpiDeliveredQtySub: 'Total supplies dispatched',
      kpiTopDept: 'TOP REQUESTING DEPARTMENT',
      kpiTopDeptSub: 'Highest requisition volume',
      kpiTopItem: 'MOST REQUESTED ITEM',
      kpiTopItemSub: 'Most popular stationery item',
      tableTitle: 'Live Requisition & Consumption Roster',
      tableSub: 'Inspect and search requisitions directly in your browser or export filtered records to Excel with one click.',
      downloadExcel: 'Export Excel (.xlsx)',
      printTable: 'Print Table',
      lblDept: 'Department / Unit',
      allDepts: 'All Departments (Organization-Wide)',
      lblStatus: 'Requisition Status',
      allStatuses: 'All Statuses',
      quickSearch: 'Quick Search',
      searchPlaceholder: 'Search staff name, product, req no...',
      reset: 'Reset',
      colReqNo: 'REQ NO',
      colDate: 'DATE',
      colDept: 'DEPARTMENT',
      colStaff: 'REQUESTER',
      colLocation: 'LOCATION (BUILDING/ROOM)',
      colItem: 'SUPPLY / ITEM',
      colRequested: 'REQUESTED',
      colDelivered: 'DISPATCHED',
      colStatus: 'STATUS',
      noData: 'No requisitions matching selected filters found.',
      cardExcelTitle: 'Export Requisitions to Excel (.xlsx)',
      cardExcelSub: 'Download all filtered requisitions and statuses as an Excel spreadsheet workbook.',
      cardSlipsTitle: 'Weekly Distribution & Delivery Slips (A4)',
      cardSlipsSub: 'Batch print warehouse picking lists and A4 signed delivery receipt slips.',
      deliveryWed: 'Delivery Date',
      btnExportExcel: 'Export Filtered Excel',
      btnPrintSlips: 'Print Bulk Slips'
    },
    rehber: {
      title: 'Corporate Directory & Access Control',
      subtitle: 'Organizational hierarchy and staff directory.',
      expandAll: 'Expand All',
      collapseAll: 'Collapse All',
      batchAccount: 'Batch Create Accounts',
      importExcel: 'Import Excel',
      newUnit: '+ New Department',
      newPerson: '+ Add New Staff',
      tabAll: 'All',
      tabAcademic: 'Academic Units',
      tabAdministrative: 'Administrative Units',
      tabCenters: 'Research Centers',
      searchPlaceholder: 'Search name, title, extension phone, room no, or department...',
      hasAccount: 'Active Account',
      noAccount: 'No Account',
      ext: 'Ext',
      room: 'Room',
      expand: 'Expand',
      collapse: 'Collapse',
      edit: 'Edit',
      delete: 'Delete',
      pwdOutlook: 'Password & Outlook'
    },
    yesilKampus: {
      title: 'Corporate Green Office & Sustainability Portal',
      subtitle: 'Conserving institutional resources through behavioral economics (nudge) and zero-waste initiatives.',
      btnSurplus: 'Report Surplus Materials (+20 P)',
      btnLoan: 'Borrow Shared Equipment (+10 P)',
      btnLeaderboard: 'Full Leaderboard',
      cardSurplusTitle: 'Surplus Materials Return',
      cardSurplusBadge: '+20 Points',
      cardSurplusDesc: 'Return unused stationery from cabinets to the warehouse. Scheduled weekly pickup directly from your office.',
      cardLoanTitle: 'Shared Equipment Pool',
      cardLoanBadge: '+10 Points',
      cardLoanDesc: 'Borrow infrequently used equipment temporarily instead of purchasing new supplies.',
      cardNudgeTitle: 'Nudge Smart Cart',
      cardNudgeBadge: '+10 Points',
      cardNudgeDesc: 'Earn green points when accepting eco-friendly alternatives in your cart.'
    },
    istekSahibi: {
      title: 'Select Requisitioner',
      subtitle: 'Select the staff member placing this requisition or add a new person.',
      tabSelect: 'Select from List',
      tabNew: 'Add New Staff',
      staffList: 'Staff Roster',
      corpEmail: 'Corporate Email Address',
      emailNotice: 'Approval and delivery notices will be sent to this email.',
      btnConfirm: 'Confirm and Proceed to Catalog',
      nameWithTitle: 'Full Name & Title',
      btnSave: 'Save and Proceed to Catalog',
      noStaff: 'No staff registered for this department yet'
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
