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
      confirmReceipt: 'Teslim Aldım',
      trackDetails: 'Süreç Takip & Detay',
      repeat: 'Tekrarla'
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
      awaitingUserConfirm: 'Teslim Edildi (Kullanıcı Teyidi Bekleniyor)',
      reportedItems: 'Bildirilen Malzemeler:',
      reportedBy: 'Bildiren:',
      deptOfficer: 'Birim Yetkilisi',
      surplusAwaiting: 'İnceleme & Teslim Bekliyor',
      surplusReceivedBadge: 'Depoya Alındı (+20 Puan Verildi)',
      loanPurpose: 'Kullanım Amacı:',
      loanPeriod: 'Kullanım Süresi:',
      loanDays: 'gün',
      loanAwaiting: 'Onay Bekliyor',
      loanApproved: 'Rezervasyon Onaylandı (Teslim Hazır)',
      loanInUse: 'Birim Tarafından Kullanılıyor',
      loanCompletedStatus: 'Depoya İade Edildi (+5 P)',
      btnApproveReservation: 'Rezervasyonu Onayla',
      btnDeliverToDept: 'Birime Teslim Et',
      btnReceiveReturn: 'Depoya Teslim Al & İadeyi Kapat (+5 P)'
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
      room: 'Oda',
      building: 'Bina',
      pcs: 'adet',
      pack: 'paket',
      box: 'kutu',
      case: 'koli',
      set: 'takım',
      roll: 'rulo',
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
      queryBarcodeBtn: 'Barkodu Bul ve Getir',
      allUnits: 'Tüm Birimler',
      adminUnits: 'İdari Birimler',
      academicUnits: 'Akademik Birimler',
      researchCenters: 'Araştırma Merkezleri',
      searchUnitPlaceholder: 'Birim adı veya türü ara...',
      colUnitName: 'Birim Adı',
      colCategoryType: 'Kategori & Tür',
      colParentUnit: 'Bağlı Olduğu Üst Birim',
      colFullName: 'Ad Soyad',
      colTitleRole: 'Unvan / Görev',
      colCorporateEmail: 'Kurumsal E-posta',
      colBuildingRoom: 'Bina & Oda',
      colAccountStatus: 'Hesap Durumu',
      facultyDeansOffice: 'Fakülte Dekanlığı',
      academicDept: 'Bölüm',
      researchCenter: 'Araştırma Merkezi',
      adminDept: 'İdari Birim',
      open: 'Açık',
      closed: 'Kapalı',
      resetPassword: 'Şifre Sıfırla',
      directoryAccountsTitle: 'Rehber Personeline Bireysel Hesap Tanımlama & E-posta Bildirimi',
      directoryAccountsSub: 'Kurumsal rehberdeki personele otomatik kullanıcı hesabı açın ve ilk giriş davet e-postasını gönderin.',
      staffGroup: 'Personel Grubu:',
      allStaff: 'Tümü',
      adminStaff: 'İdari Personel',
      academicStaff: 'Akademik Personel',
      deptFilter: 'Birim Filtresi:',
      allOrgWide: 'Tüm Kurum Geneli',
      searchStaffPlaceholder: 'İsim, unvan veya e-posta...',
      excludeExecManagement: 'Üst Yönetimi Hariç Tut (Rektör, Dekan vb.)',
      provisionSelectedAccounts: 'Seçilenlere Hesap Aç & Şifre E-postası Gönder',
      colParentCategory: 'Üst Kategori',
      colProductCount: 'Ürün Sayısı',
      colOrder: 'Sıra',
      mainCategoryBadge: 'Ana Kategori',
      subCategoryBadge: 'Alt Kategori',
      addCategory: 'Yeni Kategori Ekle',
      categoryTreeSub: 'Katalog hiyerarşisini, ana kategorileri ve alt kategorileri düzenleyin.',
      backupTabTitle: 'Sistem ve Veritabanı Yedekleri',
      backupTabSub: 'Sistem kesintisiz SQLite online backup yöntemiyle sıcak yedek alır ve son 14 yedeği saklar.',
      takeBackupNow: 'Şimdi Sıcak Yedek Al',
      zeroDataLossGuarantee: 'Sıfır Veri Kaybı Güvencesi:',
      zeroDataLossSub: 'Bir yedeği geri yüklediğiniz anda sistem anlık bir acil durum güvenlik yedeği alır.',
      colBackupFile: 'Yedek Dosyası',
      colBackupType: 'Yedek Türü',
      colBackupSize: 'Boyut',
      colBackupDate: 'Yedekleme Tarihi',
      restore: 'Geri Yükle',
      download: 'İndir',
      stockInBadge: 'Giriş',
      stockOutBadge: 'Çıkış',
      stockAdjustBadge: 'Düzeltme',
      noMovementsFound: 'Kriterlere uygun stok hareketi bulunamadı.',
      initialStockLabel: 'Başlangıç Depo Stoğu'
    },
    loglar: {
      title: 'Denetim Logları & Sistem İzleri',
      subtitle: 'Tüm talep onayları, teslimat teyitleri, stok hareketleri, kullanıcı oturumları ve şifre güncellemelerinin resmi denetim kayıtları.',
      radarTitle: 'CANLI İZLEME VE TEST RADARI (Yönetim & Komisyon Takibi)',
      listeningMode: 'Aktif Dinleme Modu',
      presentationStatus: 'Sunum İnceleme Durumu',
      liveTestLogins: 'CANLI SİSTEM TEST GİRİŞLERİ',
      todayViewsCount: 'BUGÜN SUNUM AÇILIŞ SAYISI',
      radarSessions: 'Genel Sekreterlik / Komisyon oturumları',
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
      refresh: 'Yenile',
      noSunumYet: 'Henüz Sunum Açılmadı',
      noSunumYetSub: 'Canlı link tıklandığında anlık buraya düşecektir.',
      noTestYet: 'Henüz Test Girişi Yok',
      noTestYetSub: 'Ktest veya Atest ile giriş yapıldığında listelenir.'
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
      wednesdayBadge: 'Çarşamba',
      cardSlipsSub: 'Depo toplama listesi ve birimlere imzalatılacak A4 Malzeme Teslim Fişlerini topluca yazdırın.',
      deliveryDateWed: 'Teslimat Çarşambası',
      campusRouteSorted: 'Kampüs Rota Sıralı (Bina ve Kat/Oda Sıralaması)',
      pickingListBtn: 'Toplama Listesi',
      btnPrintSlips: 'Toplu Fişleri Yazdır',
      bulletinTitle: 'Yönetici Tüketim Bülteni',
      bulletinBadge: 'Yönetim • GS',
      bulletinSub: 'Yönetim ve Genel Sekreterlik için aylık talep, birim sarfiyatı ve israf tasarruf oranlarını içeren resmi A4 bülten.',
      reportingMonth: 'Dönem Ayı',
      year: 'Yıl',
      viewOnScreen: 'Ekranda İncele',
      officialBulletinA4: 'Resmi Bülten (A4)',
      deliveryWed: 'Teslimat Çarşambası',
      btnExportExcel: 'Filtrelenmiş Excel İndir'
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
      cardNudgeDesc: 'Sepetinizdeki yeşil tasarruf önerilerini kabul ettiğinizde puan kazanın.',
      cardDeliveryTitle: 'Zamanında Teslim Onayı',
      cardDeliveryBadge: '+5 Puan',
      cardDeliveryDesc: 'Çarşamba teslimatında malzemelerinizi teslim alıp sisteme anında onay vererek kampüs lojistik rotasını hızlandırın.',
      topAcademicDepts: 'En Yeşil Akademik Bölümler',
      totalDepts: 'Toplam {count} Bölüm',
      topAdminDepts: 'En Yeşil İdari Müdürlükler',
      totalDirectorates: 'Toplam {count} Müdürlük',
      myDeptRank: 'Biriminizin Sırası:',
      myDeptScore: 'Toplam Puanınız:',
      rankSuffix: '. Sırada',
      liveLeaderboard: 'Canlı Liderlik Tablosu',
      leaderboardSub: 'Her ay 100 taban puanla başlar; çevre dostu eylemlerle puan kazanılır.',
      tabAdminDirectorates: 'İdari Müdürlükler',
      tabAcademicDepts: 'Akademik Bölümler',
      colRank: 'Sıra',
      colDeptName: 'Birim Adı',
      colReturn: 'İade',
      colNudge: 'Nudge',
      colDelivery: 'Teslim',
      colTotalPoints: 'Toplam Puan',
      staffCount: '{count} Personel',
      dataPreparing: 'Veri hazırlanıyor...',
      noDeptsInLeague: 'Bu ligde henüz kayıtlı birim bulunmuyor.'
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
      confirmReceipt: 'Confirm Receipt',
      trackDetails: 'Track Order & Details',
      repeat: 'Reorder'
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
      awaitingUserConfirm: 'Delivered (Awaiting User Confirmation)',
      reportedItems: 'Reported Items:',
      reportedBy: 'Reported by:',
      deptOfficer: 'Department Officer',
      surplusAwaiting: 'Awaiting Inspection & Pickup',
      surplusReceivedBadge: 'Received to Warehouse (+20 Points)',
      loanPurpose: 'Purpose of Use:',
      loanPeriod: 'Loan Period:',
      loanDays: 'days',
      loanAwaiting: 'Awaiting Approval',
      loanApproved: 'Reservation Approved (Ready for Pickup)',
      loanInUse: 'In Use by Department',
      loanCompletedStatus: 'Returned to Warehouse (+5 P)',
      btnApproveReservation: 'Approve Reservation',
      btnDeliverToDept: 'Dispatch to Department',
      btnReceiveReturn: 'Accept Return & Complete (+5 P)'
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
      room: 'Room',
      building: 'Building',
      pcs: 'pcs',
      pack: 'pack',
      box: 'box',
      case: 'case',
      set: 'set',
      roll: 'roll',
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
      queryBarcodeBtn: 'Lookup Barcode',
      allUnits: 'All Departments',
      adminUnits: 'Administrative Directorates',
      academicUnits: 'Academic Faculties & Departments',
      researchCenters: 'Application & Research Centers',
      searchUnitPlaceholder: 'Search department name or type...',
      colUnitName: 'DEPARTMENT NAME',
      colCategoryType: 'CATEGORY & TYPE',
      colParentUnit: 'PARENT DEPARTMENT',
      colFullName: 'FULL NAME',
      colTitleRole: 'TITLE & POSITION',
      colCorporateEmail: 'OFFICIAL EMAIL',
      colBuildingRoom: 'BUILDING & ROOM',
      colAccountStatus: 'ACCOUNT STATUS',
      facultyDeansOffice: "Faculty Dean's Office",
      academicDept: 'Academic Department',
      researchCenter: 'Research Center',
      adminDept: 'Administrative Unit',
      open: 'Active',
      closed: 'Closed',
      resetPassword: 'Reset Password',
      directoryAccountsTitle: 'Staff Account Provisioning & Email Notifications',
      directoryAccountsSub: 'Provision user accounts for directory personnel and send temporary password invitation emails.',
      staffGroup: 'Staff Group:',
      allStaff: 'All Staff',
      adminStaff: 'Administrative Staff',
      academicStaff: 'Academic Staff',
      deptFilter: 'Department Filter:',
      allOrgWide: 'Organization-Wide',
      searchStaffPlaceholder: 'Search name, title or email...',
      excludeExecManagement: 'Exclude Executive Management (Leadership)',
      provisionSelectedAccounts: 'Provision Accounts & Send Passwords',
      colParentCategory: 'PARENT CATEGORY',
      colProductCount: 'ITEM COUNT',
      colOrder: 'ORDER',
      mainCategoryBadge: 'Main Category',
      subCategoryBadge: 'Subcategory',
      addCategory: 'Add Category',
      categoryTreeSub: 'Manage catalog hierarchy, root categories, and subcategories.',
      backupTabTitle: 'System & Database Backups',
      backupTabSub: 'Automated online zero-downtime hot backups preserved with rolling 14-day retention.',
      takeBackupNow: 'Create Live Backup Now',
      zeroDataLossGuarantee: 'Zero Data Loss Guarantee:',
      zeroDataLossSub: 'An automated safety pre-restore backup is always recorded prior to restoration.',
      colBackupFile: 'BACKUP FILE',
      colBackupType: 'BACKUP TYPE',
      colBackupSize: 'SIZE',
      colBackupDate: 'BACKUP DATE',
      restore: 'Restore',
      download: 'Download',
      stockInBadge: 'Receipt',
      stockOutBadge: 'Dispatched',
      stockAdjustBadge: 'Adjustment',
      noMovementsFound: 'No stock movements match your criteria.',
      initialStockLabel: 'Initial Stock Balance'
    },
    loglar: {
      title: 'Audit Trail Logs & System Records',
      subtitle: 'Official compliance logs for approvals, delivery receipts, inventory movements, logins, and security events.',
      radarTitle: 'LIVE TELEMETRY & TEST RADAR (Executive & Commission)',
      listeningMode: 'Active Telemetry Stream',
      presentationStatus: 'PRESENTATION REVIEW STATUS',
      liveTestLogins: 'LIVE SYSTEM TEST LOGINS',
      todayViewsCount: 'PRESENTATION SESSIONS TODAY',
      radarSessions: 'Executive & Commission review sessions',
      auditLogsTitle: 'System Audit Trail & Telemetry Logs',
      auditLogsSub: 'Official compliance log of sign-ins, security credentials, bulk inventory updates, and administrative events.',
      colDate: 'DATE / TIME',
      colActionType: 'EVENT TYPE',
      colUser: 'USER / ACCOUNT',
      colRole: 'ROLE',
      colIp: 'IP ADDRESS',
      colDetail: 'DETAILS',
      optAllActions: 'All Event Types',
      optDeptActions: 'Department Actions',
      refresh: 'Refresh',
      noSunumYet: 'No Presentations Viewed Yet',
      noSunumYetSub: 'Real-time telemetry will appear when the live link is clicked.',
      noTestYet: 'No Test Logins Yet',
      noTestYetSub: 'Listed when logging in with ktest or atest.'
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
      wednesdayBadge: 'Wednesday',
      cardSlipsSub: 'Batch print warehouse picking lists and A4 signed delivery receipt slips.',
      deliveryDateWed: 'Delivery Date (Wednesday)',
      campusRouteSorted: 'Campus Route Sorted (Building & Floor/Room Sequence)',
      pickingListBtn: 'Picking List',
      btnPrintSlips: 'Print Bulk Slips',
      bulletinTitle: 'Executive Consumption Bulletin',
      bulletinBadge: 'Executive • GS',
      bulletinSub: 'Official A4 bulletin featuring monthly demand, department consumption, and waste-reduction savings ratios for Executive Leadership.',
      reportingMonth: 'Reporting Month',
      year: 'Year',
      viewOnScreen: 'Review on Screen',
      officialBulletinA4: 'Official Bulletin (A4)',
      deliveryWed: 'Delivery Date',
      btnExportExcel: 'Export Filtered Excel'
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
      cardNudgeDesc: 'Earn green points when accepting eco-friendly alternatives in your cart.',
      cardDeliveryTitle: 'Timely Delivery Confirmation',
      cardDeliveryBadge: '+5 Points',
      cardDeliveryDesc: 'Confirm received supplies on distribution day to accelerate campus logistics routing.',
      topAcademicDepts: 'Top Green Academic Departments',
      totalDepts: 'Total {count} Departments',
      topAdminDepts: 'Top Green Administrative Directorates',
      totalDirectorates: 'Total {count} Directorates',
      myDeptRank: 'Your Department Rank:',
      myDeptScore: 'Your Total Score:',
      rankSuffix: ' in Rank',
      liveLeaderboard: 'Live Sustainability Leaderboard',
      leaderboardSub: 'Starts at 100 base points monthly; bonus points earned through eco-conscious actions.',
      tabAdminDirectorates: 'Administrative Directorates',
      tabAcademicDepts: 'Academic Departments',
      colRank: 'RANK',
      colDeptName: 'DEPARTMENT',
      colReturn: 'RETURN',
      colNudge: 'NUDGE',
      colDelivery: 'DELIVERY',
      colTotalPoints: 'TOTAL POINTS',
      staffCount: '{count} Staff',
      dataPreparing: 'Preparing data...',
      noDeptsInLeague: 'No departments registered in this league yet.'
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
  window.__tCategory = tCategory;
  window.__tProduct = tProduct;
  window.__tDepartment = tDepartment;
  window.__tUnit = tUnit;
  window.__tBuilding = tBuilding;
  window.__tMonth = tMonth;
  window.__tActionType = tActionType;
  window.__i18n = {
    getLanguage,
    setLanguage,
    t,
    tCategory,
    tProduct,
    tDepartment,
    tUnit,
    tBuilding,
    tMonth,
    tActionType,
    supportedLangs: SUPPORTED_LANGS
  };
}

// =====================================================================
// DOMAIN ENTITY TRANSLATION MAPS (Database Seed Entities -> Multi-Language)
// =====================================================================

export const CATEGORY_MAP = {
  // Main Categories
  'Kağıt ve Defter Grubu': { en: 'Paper & Notebooks Group', tr: 'Kağıt ve Defter Grubu' },
  'Yazım ve Çizim Gereçleri': { en: 'Writing & Drawing Supplies', tr: 'Yazım ve Çizim Gereçleri' },
  'Dosyalama ve Arşivleme': { en: 'Filing & Archiving', tr: 'Dosyalama ve Arşivleme' },
  'Masaüstü Kırtasiye Gereçleri': { en: 'Desktop Stationery Supplies', tr: 'Masaüstü Kırtasiye Gereçleri' },

  // Sub Categories
  'Fotokopi Kağıtları': { en: 'Copy Paper', tr: 'Fotokopi Kağıtları' },
  'Not Kağıtları ve Bloknot': { en: 'Notepads & Sticky Notes', tr: 'Not Kağıtları ve Bloknot' },
  'Resmi Zarf ve Formlar': { en: 'Official Envelopes & Forms', tr: 'Resmi Zarf ve Formlar' },
  'Tükenmez ve Jel Kalemler': { en: 'Ballpoint & Gel Pens', tr: 'Tükenmez ve Jel Kalemler' },
  'Tahta ve Fosforlu Kalemler': { en: 'Whiteboard & Highlighters', tr: 'Tahta ve Fosforlu Kalemler' },
  'Sınav ve Çizim Gereçleri': { en: 'Exam & Drafting Supplies', tr: 'Sınav ve Çizim Gereçleri' },
  'Klasör ve Telli Dosyalar': { en: 'Binders & Prong Folders', tr: 'Klasör ve Telli Dosyalar' },
  'Poşet Dosyalar ve Gömlekler': { en: 'Sheet Protectors & Sleeves', tr: 'Poşet Dosyalar ve Gömlekler' },
  'Arşivleme ve Sunum Dosyaları': { en: 'Archiving & Presentation Folders', tr: 'Arşivleme ve Sunum Dosyaları' },
  'Zımba, Delgeç ve Teller': { en: 'Staplers, Punches & Staples', tr: 'Zımba, Delgeç ve Teller' },
  'Bant, Yapıştırıcı ve Makas': { en: 'Tape, Glue & Scissors', tr: 'Bant, Yapıştırıcı ve Makas' },
  'Ataç ve Kıskaçlar': { en: 'Paperclips & Binder Clips', tr: 'Ataç ve Kıskaçlar' },
  'Masaüstü Düzen ve Kaşe': { en: 'Desk Organizers & Stamps', tr: 'Masaüstü Düzen ve Kaşe' },
  'Ofis Elektroniği ve Piller': { en: 'Office Electronics & Batteries', tr: 'Ofis Elektroniği ve Piller' }
};

export const PRODUCT_MAP = {
  'A4 Fotokopi Kağıdı 80 gr (500 Yaprak)': { en: 'A4 Copy Paper 80 gsm (500 Sheets)', tr: 'A4 Fotokopi Kağıdı 80 gr (500 Yaprak)' },
  'A4 Fotokopi Kağıdı 80 gr (1 Kutu / 5 Paket)': { en: 'A4 Copy Paper 80 gsm (1 Box / 5 Reams)', tr: 'A4 Fotokopi Kağıdı 80 gr (1 Kutu / 5 Paket)' },
  'A3 Fotokopi Kağıdı 80 gr (500 Yaprak)': { en: 'A3 Copy Paper 80 gsm (500 Sheets)', tr: 'A3 Fotokopi Kağıdı 80 gr (500 Yaprak)' },
  "Mavi Tükenmez Kalem 0.7 mm (50'li Kutu)": { en: 'Blue Ballpoint Pen 0.7 mm (Box of 50)', tr: "Mavi Tükenmez Kalem 0.7 mm (50'li Kutu)" },
  "Siyah Jel Kalem 0.5 mm (12'li Kutu)": { en: 'Black Gel Pen 0.5 mm (Box of 12)', tr: "Siyah Jel Kalem 0.5 mm (12'li Kutu)" },
  "Kırmızı Tükenmez Kalem 0.7 mm (50'li Kutu)": { en: 'Red Ballpoint Pen 0.7 mm (Box of 50)', tr: "Kırmızı Tükenmez Kalem 0.7 mm (50'li Kutu)" },
  "Fosforlu Kalem 4'lü Karışık Set": { en: 'Highlighter Set 4 Assorted Colors', tr: "Fosforlu Kalem 4'lü Karışık Set" },
  'Beyaz Yazı Tahtası Kalemi 4 Renk Set': { en: 'Whiteboard Marker 4-Color Set', tr: 'Beyaz Yazı Tahtası Kalemi 4 Renk Set' },
  'Geniş Sırtlı Mekanizmalı A4 Klasör (Mavi)': { en: 'Wide Spine Lever Arch A4 Binder (Blue)', tr: 'Geniş Sırtlı Mekanizmalı A4 Klasör (Mavi)' },
  'Dar Sırtlı Mekanizmalı A4 Klasör (Siyah)': { en: 'Slim Spine Lever Arch A4 Binder (Black)', tr: 'Dar Sırtlı Mekanizmalı A4 Klasör (Siyah)' },
  "Şeffaf Poşet Dosya A4 (100'lü Paket)": { en: 'Clear Sheet Protectors A4 (Pack of 100)', tr: "Şeffaf Poşet Dosya A4 (100'lü Paket)" },
  "Renkli Plastik Telli Dosya (50'li Paket)": { en: 'Colored Plastic Prong Folders (Pack of 50)', tr: "Renkli Plastik Telli Dosya (50'li Paket)" },
  'Standart Masaüstü Zımba Makinesi No: 24/6': { en: 'Standard Desktop Stapler No: 24/6', tr: 'Standart Masaüstü Zımba Makinesi No: 24/6' },
  "Zımba Teli No: 24/6 (1000'li Kutu)": { en: 'Staples No: 24/6 (Box of 1000)', tr: "Zımba Teli No: 24/6 (1000'li Kutu)" },
  '2 Delikli Metal Masaüstü Delgeç (30 Sayfa)': { en: '2-Hole Metal Desktop Punch (30 Sheets)', tr: '2 Delikli Metal Masaüstü Delgeç (30 Sayfa)' },
  'Sıvı/Stick Yapıştırıcı Pritt 43 gr': { en: 'Glue Stick Pritt 43 g', tr: 'Sıvı/Stick Yapıştırıcı Pritt 43 gr' },
  'Şeffaf Koli Bandı 45 mm x 100 m': { en: 'Clear Packing Tape 45 mm x 100 m', tr: 'Şeffaf Koli Bandı 45 mm x 100 m' },
  'Post-it Kendinden Yapışkanlı Not Kağıdı Sarı': { en: 'Post-it Self-Adhesive Sticky Notes Yellow', tr: 'Post-it Kendinden Yapışkanlı Not Kağıdı Sarı' },
  "Nikelajlı Metal Ataç No: 3 (100'lü Kutu)": { en: 'Nickel-Plated Metal Paperclips No: 3 (Box of 100)', tr: "Nikelajlı Metal Ataç No: 3 (100'lü Kutu)" },
  "Büyük Boy Metal Kıskaç 32 mm (12'li Kutu)": { en: 'Large Metal Binder Clips 32 mm (Box of 12)', tr: "Büyük Boy Metal Kıskaç 32 mm (12'li Kutu)" },
  'Resmi Antetli A4 Kağıdı (500 Sayfa)': { en: 'Official Letterhead A4 Paper (500 Sheets)', tr: 'Resmi Antetli A4 Kağıdı (500 Sayfa)' },
  "Resmi Diplomat Zarf Pencereli (100'lü Kutu)": { en: 'Official Windowed Diplomat Envelopes (Box of 100)', tr: "Resmi Diplomat Zarf Pencereli (100'lü Kutu)" },
  'USB 3.0 Flash Bellek 32 GB (Metal Gövde)': { en: 'USB 3.0 Flash Drive 32 GB (Metal Body)', tr: 'USB 3.0 Flash Bellek 32 GB (Metal Gövde)' },
  'Alkalin Kalem Pil AA 1.5V (Tane)': { en: 'Alkaline AA Battery 1.5V (Single Unit)', tr: 'Alkalin Kalem Pil AA 1.5V (Tane)' }
};

export const DEPARTMENT_MAP = {
  'Rektörlük Makamı': { en: 'Executive Leadership Office', tr: 'Rektörlük Makamı' },
  'Genel Sekreterlik': { en: 'General Secretariat', tr: 'Genel Sekreterlik' },
  'Mühendislik Fakültesi Dekanlığı': { en: "Faculty of Engineering Dean's Office", tr: 'Mühendislik Fakültesi Dekanlığı' },
  'Bilgisayar Mühendisliği Bölümü': { en: 'Department of Computer Engineering', tr: 'Bilgisayar Mühendisliği Bölümü' },
  'Elektrik-Elektronik Mühendisliği Bölümü': { en: 'Department of Electrical & Electronics Engineering', tr: 'Elektrik-Elektronik Mühendisliği Bölümü' },
  'İktisadi ve İdari Bilimler Fakültesi': { en: 'Faculty of Economics & Administrative Sciences', tr: 'İktisadi ve İdari Bilimler Fakültesi' },
  'Fen-Edebiyat Fakültesi': { en: 'Faculty of Arts & Sciences', tr: 'Fen-Edebiyat Fakültesi' },
  'Öğrenci İşleri Müdürlüğü': { en: 'Student Affairs Directorate', tr: 'Öğrenci İşleri Müdürlüğü' },
  'İdari ve Mali İşler Müdürlüğü': { en: 'Administrative & Financial Affairs Directorate', tr: 'İdari ve Mali İşler Müdürlüğü' },
  'Bilgi İşlem Müdürlüğü': { en: 'IT Directorate', tr: 'Bilgi İşlem Müdürlüğü' },
  'Kütüphane ve Dokümantasyon Müdürlüğü': { en: 'Library & Documentation Directorate', tr: 'Kütüphane ve Dokümantasyon Müdürlüğü' },
  'Satın Alma Müdürlüğü': { en: 'Procurement Directorate', tr: 'Satın Alma Müdürlüğü' }
};

export const UNIT_MAP = {
  'adet': { en: 'pcs', tr: 'adet' },
  'paket': { en: 'pack', tr: 'paket' },
  'kutu': { en: 'box', tr: 'kutu' },
  'koli': { en: 'case', tr: 'koli' },
  'takim': { en: 'set', tr: 'takım' },
  'takım': { en: 'set', tr: 'takım' },
  'rulo': { en: 'roll', tr: 'rulo' }
};

export const BUILDING_MAP = {
  'Rektörlük Binası': { en: 'Executive Building', tr: 'Rektörlük Binası' },
  'Mühendislik Binası': { en: 'Engineering Building', tr: 'Mühendislik Binası' },
  'İİBF Binası': { en: 'FEAS Building', tr: 'İİBF Binası' },
  'Fen Binası': { en: 'Science Building', tr: 'Fen Binası' },
  'Öğrenci Merkezi': { en: 'Student Center', tr: 'Öğrenci Merkezi' },
  'İdari Bina': { en: 'Administrative Building', tr: 'İdari Bina' },
  'Bilişim Merkezi': { en: 'IT Center', tr: 'Bilişim Merkezi' },
  'Merkez Kütüphane': { en: 'Central Library', tr: 'Merkez Kütüphane' }
};

export const MONTH_NAMES = {
  1: { en: 'January', tr: 'Ocak' },
  2: { en: 'February', tr: 'Şubat' },
  3: { en: 'March', tr: 'Mart' },
  4: { en: 'April', tr: 'Nisan' },
  5: { en: 'May', tr: 'Mayıs' },
  6: { en: 'June', tr: 'Haziran' },
  7: { en: 'July', tr: 'Temmuz' },
  8: { en: 'August', tr: 'Ağustos' },
  9: { en: 'September', tr: 'Eylül' },
  10: { en: 'October', tr: 'Ekim' },
  11: { en: 'November', tr: 'Kasım' },
  12: { en: 'December', tr: 'Aralık' }
};

export const ACTION_TYPE_MAP = {
  'SUNUM_INCELEME': { en: 'Presentation Review', tr: 'Sunum İnceleme' },
  'GIRIS': { en: 'User Login', tr: 'Kullanıcı Girişi' },
  'CIKIS': { en: 'User Logout', tr: 'Kullanıcı Çıkışı' },
  'TALEP_OLUSTURMA': { en: 'Requisition Created', tr: 'Talep Oluşturma' },
  'TALEP_ONAY': { en: 'Requisition Approved', tr: 'Talep Onayı' },
  'TALEP_RED': { en: 'Requisition Rejected', tr: 'Talep Reddi' },
  'TALEP_REVIZE': { en: 'Requisition Revised', tr: 'Talep Revizesi' },
  'TALEP_TESLIM': { en: 'Requisition Delivered', tr: 'Talep Teslimi' },
  'STOK_HAREKET': { en: 'Stock Movement', tr: 'Stok Hareketi' },
  'STOK_GIRIS': { en: 'Stock Receipt', tr: 'Stok Girişi' },
  'STOK_GUNCELLE': { en: 'Stock Update', tr: 'Stok Güncelleme' },
  'SIFREMI_UNUTTUM': { en: 'Password Reset Request', tr: 'Şifremi Unuttum Talebi' },
  'SIFRE_GUNCELLEME': { en: 'Password Changed', tr: 'Şifre Güncelleme' },
  'SIFRE_VE_ADRES_GUNCELLEME': { en: 'Credentials & Address Updated', tr: 'Şifre ve Adres Güncelleme' },
  'TOPLU_STOK_GUNCELLEME': { en: 'Bulk Inventory Update', tr: 'Toplu Stok Güncelleme' },
  'TOPLU_HESAP_ACMA': { en: 'Bulk Account Creation', tr: 'Toplu Hesap Açma' },
  'BIRIM_DURUM_DEGISTIRILDI': { en: 'Department Status Toggled', tr: 'Birim Durumu Değiştirildi' },
  'BIRIM_SILINDI': { en: 'Department Deleted', tr: 'Birim Silindi' },
  'BIRIM_EKLENDI': { en: 'Department Created', tr: 'Birim Eklendi' },
  'BIRIM_GUNCELLENDI': { en: 'Department Updated', tr: 'Birim Güncellendi' },
  'PERSONEL_EKLENDI': { en: 'Staff Added', tr: 'Personel Eklendi' },
  'PERSONEL_GUNCELLENDI': { en: 'Staff Updated', tr: 'Personel Güncellendi' },
  'PERSONEL_SILINDI': { en: 'Staff Removed', tr: 'Personel Silindi' },
  'YEDEK_ALINDI': { en: 'System Backup Created', tr: 'Sistem Yedeği Alındı' },
  'YEDEK_GERI_YUKLENDI': { en: 'System Restored from Backup', tr: 'Yedekten Geri Yüklendi' },
  'VEKALET_VERILDI': { en: 'Delegation Assigned', tr: 'Yetki Devri Verildi' },
  'VEKALET_SONLANDI': { en: 'Delegation Ended', tr: 'Yetki Devri Sona Erdi' }
};

export function tRole(role) {
  if (!role) return '-';
  const lang = currentLang === 'en' ? 'en' : 'tr';
  const map = {
    'admin': { en: 'System Administrator', tr: 'Sistem Yöneticisi' },
    'yapici': { en: 'System Architect', tr: 'Sistem Mimarı' },
    'satin_alma': { en: 'Procurement Directorate', tr: 'Satın Alma Müdürlüğü' },
    'birim': { en: 'Department User', tr: 'Birim Kullanıcısı' },
    'sunum': { en: 'Presentation Mode', tr: 'Sunum İnceleme' },
    'ziyaretci': { en: 'Guest Visitor', tr: 'Ziyaretçi' }
  };
  return (map[role] && map[role][lang]) || role;
}

export function tUser(username) {
  if (!username) return '-';
  const lang = currentLang === 'en' ? 'en' : 'tr';
  if (username === 'ziyaretci') return lang === 'en' ? 'visitor' : 'ziyaretci';
  if (username === 'yapici') return lang === 'en' ? 'architect' : 'yapici';
  return username;
}

export function formatLogDetail(text) {
  if (!text) return '-';
  if (currentLang !== 'en') return text;
  if (text.includes('Kullanıcı sisteme başarıyla giriş yaptı.')) {
    return 'User logged in to the system successfully.';
  }
  if (text.includes('Sunum Açıldı ve İnceleniyor') || text.includes('Sunum Açıldı - İnceleme Başladı')) {
    return 'Presentation Opened & Under Review';
  }
  if (text.includes('Slayt Geçişi')) {
    return text.replace('Slayt Geçişi', 'Slide Transition')
               .replace('Slayt', 'Slide');
  }
  if (text.includes('Sunum Tamamlandı')) {
    return text.replace('Sunum Tamamlandı', 'Presentation Completed')
               .replace('Slayt', 'Slide');
  }
  if (text.includes('Şifre ve teslimat adresi güncellendi')) {
    return 'Password and delivery address successfully updated.';
  }
  if (text.includes('Yeni kırtasiye talebi oluşturuldu')) {
    return 'New stationery requisition submitted.';
  }
  if (text.includes('Talep onaylandı')) {
    return 'Requisition approved by procurement.';
  }
  if (text.includes('Talep teslim edildi')) {
    return 'Requisition delivery confirmed.';
  }
  return text;
}

export function tCategory(name) {
  if (!name) return '';
  const lang = currentLang === 'en' ? 'en' : 'tr';
  return (CATEGORY_MAP[name] && CATEGORY_MAP[name][lang]) || name;
}

export function tProduct(name) {
  if (!name) return '';
  const lang = currentLang === 'en' ? 'en' : 'tr';
  return (PRODUCT_MAP[name] && PRODUCT_MAP[name][lang]) || name;
}

export function tDepartment(name) {
  if (!name) return '';
  const lang = currentLang === 'en' ? 'en' : 'tr';
  return (DEPARTMENT_MAP[name] && DEPARTMENT_MAP[name][lang]) || name;
}

export function tUnit(unit) {
  if (!unit) return '';
  const lang = currentLang === 'en' ? 'en' : 'tr';
  const clean = String(unit).toLowerCase().trim();
  return (UNIT_MAP[clean] && UNIT_MAP[clean][lang]) || unit;
}

export function tBuilding(name) {
  if (!name) return '';
  const lang = currentLang === 'en' ? 'en' : 'tr';
  return (BUILDING_MAP[name] && BUILDING_MAP[name][lang]) || name;
}

export function tMonth(monthVal) {
  const lang = currentLang === 'en' ? 'en' : 'tr';
  const num = parseInt(monthVal, 10);
  if (!isNaN(num) && MONTH_NAMES[num]) {
    return MONTH_NAMES[num][lang];
  }
  for (const k in MONTH_NAMES) {
    if (MONTH_NAMES[k].tr.toLowerCase() === String(monthVal).toLowerCase() ||
        MONTH_NAMES[k].en.toLowerCase() === String(monthVal).toLowerCase()) {
      return MONTH_NAMES[k][lang];
    }
  }
  return monthVal;
}

export function tActionType(type) {
  if (!type) return '';
  const lang = currentLang === 'en' ? 'en' : 'tr';
  return (ACTION_TYPE_MAP[type] && ACTION_TYPE_MAP[type][lang]) || type;
}

export default {
  initI18n,
  getLanguage,
  setLanguage,
  getSupportedLanguages,
  t,
  tCategory,
  tProduct,
  tDepartment,
  tUnit,
  tBuilding,
  tMonth,
  tActionType,
  tRole,
  tUser,
  formatLogDetail,
  supportedLangs: SUPPORTED_LANGS
};
