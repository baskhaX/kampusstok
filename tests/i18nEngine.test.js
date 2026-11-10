// i18nEngine.test.js - Çoklu Dil (i18n) Motoru ve Evrensel Yerelleştirme Testleri
import test from 'node:test';
import assert from 'node:assert/strict';

// Node.js test ortamında window, document ve localStorage mock'ları
if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    dispatchEvent: () => true
  };
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    documentElement: { lang: 'tr', dir: 'ltr' }
  };
}
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) || null,
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear()
  };
}

import { initI18n, getLanguage, setLanguage, getSupportedLanguages, t, tCategory, tProduct, tDepartment, tTitle, tUnit, tBuilding, tMonth, tActionType, tRole, tUser, formatLogDetail } from '../public/js/utils/i18n.js';

test('KampüsStok Çoklu Dil (i18n) Motoru Testleri', async (tSuite) => {
  localStorage.clear();

  await tSuite.test('Motor varsayılan dil olarak Türkçe (tr) ile başlamalıdır', () => {
    initI18n();
    assert.equal(getLanguage(), 'tr');
    assert.equal(document.documentElement.lang, 'tr');
    assert.equal(document.documentElement.dir, 'ltr');
  });

  await tSuite.test('Türkçe terimler doğru çözülmelidir', () => {
    setLanguage('tr');
    assert.equal(t('nav.catalog'), 'Malzeme Kataloğu');
    assert.equal(t('nav.cart'), 'Sepetim');
    assert.equal(t('nav.inbox'), 'Gelen Kutusu');
    assert.equal(t('header.logout'), 'Çıkış Yap');
    assert.equal(t('auth.title'), 'KampüsStok Portalı');
    assert.equal(t('satinalma.title'), 'Gelen Kutusu & Talep Yönetimi');
    assert.equal(t('satinalma.kpiPending'), 'Bekleyen Talep');
    assert.equal(t('yonetim.title'), 'Depo & Malzeme Yönetimi');
    assert.equal(t('loglar.title'), 'Denetim Logları & Sistem İzleri');
    assert.equal(t('raporlar.title'), 'Raporlar & Canlı Tüketim Analizi');
    assert.equal(t('rehber.title'), 'Kurumsal Rehber & Yetkilendirme');
    assert.equal(t('yesilKampus.title'), 'Kurumsal Yeşil Ofis & Sürdürülebilirlik Portalı');
    assert.equal(t('istekSahibi.title'), 'İstek Sahibi Belirleme');
  });

  await tSuite.test('İngilizceye geçiş yapılabilmeli ve EN terimler doğru dönmelidir', () => {
    setLanguage('en');
    assert.equal(getLanguage(), 'en');
    assert.equal(document.documentElement.lang, 'en');
    assert.equal(t('nav.catalog'), 'Supplies Catalog');
    assert.equal(t('nav.cart'), 'My Cart');
    assert.equal(t('nav.inbox'), 'Approval Inbox');
    assert.equal(t('header.logout'), 'Sign Out');
    assert.equal(t('auth.title'), 'CampusStock Portal');
    assert.equal(t('satinalma.title'), 'Approval Inbox & Order Flow');
    assert.equal(t('satinalma.kpiPending'), 'Pending Orders');
    assert.equal(t('yonetim.title'), 'Warehouse & Inventory Management');
    assert.equal(t('loglar.title'), 'Audit Trail Logs & System Records');
    assert.equal(t('raporlar.title'), 'Reports & Live Consumption Analytics');
    assert.equal(t('rehber.title'), 'Corporate Directory & Access Control');
    assert.equal(t('yesilKampus.title'), 'Corporate Green Office & Sustainability Portal');
    assert.equal(t('istekSahibi.title'), 'Select Requisitioner');
  });

  await tSuite.test('Bilinmeyen veya eksik anahtarlar için fallback metni veya Türkçe karşılığı dönmelidir', () => {
    setLanguage('en');
    // Var olmayan bir anahtar varsayılan metni döndürmeli
    assert.equal(t('nav.nonExistentKey', 'Varsayılan Metin'), 'Varsayılan Metin');
    // Eğer anahtar bulunamaz ve default verilmezse anahtar yolunu döndürür
    assert.equal(t('custom.unknown.path'), 'custom.unknown.path');
  });

  await tSuite.test('Desteklenen diller listesi 6 dili (TR, EN, DE, FR, ES, AR) içermelidir', () => {
    const langs = getSupportedLanguages();
    assert.equal(langs.length, 6);
    const codes = langs.map(l => l.code);
    assert.deepEqual(codes, ['tr', 'en', 'de', 'fr', 'es', 'ar']);

    // Arapça için RTL kuralı tanımlı olmalıdır
    const arabic = langs.find(l => l.code === 'ar');
    assert.equal(arabic.dir, 'rtl');

    // Arapçaya geçildiğinde DOM dir rtl olmalıdır
    setLanguage('ar');
    assert.equal(document.documentElement.dir, 'rtl');
    assert.equal(document.documentElement.lang, 'ar');

    // Tekrar Türkçe'ye dönüldüğünde dir ltr olmalıdır
    setLanguage('tr');
    assert.equal(document.documentElement.dir, 'ltr');
  });

  await tSuite.test('Geçersiz dil kodları yoksayılmalı ve mevcut dil korunmalıdır', () => {
    setLanguage('tr');
    setLanguage('invalid_lang_code');
    assert.equal(getLanguage(), 'tr');
  });

  await tSuite.test('Alan varlıkları (Domain Entities: Kategoriler, Ürünler, Birimler, Ölçü Birimleri, Aylar) TR ve EN olarak doğru çevrilmelidir', () => {
    // 1. Türkçe aktifken orijinal adlar dönmeli
    setLanguage('tr');
    assert.equal(tCategory('Kağıt ve Defter Grubu'), 'Kağıt ve Defter Grubu');
    assert.equal(tProduct('A4 Fotokopi Kağıdı 80 gr (500 Yaprak)'), 'A4 Fotokopi Kağıdı 80 gr (500 Yaprak)');
    assert.equal(tDepartment('Bilgi İşlem Müdürlüğü'), 'Bilgi İşlem Müdürlüğü');
    assert.equal(tTitle('Sistem Yöneticisi'), 'Sistem Yöneticisi');
    assert.equal(tTitle('Daire Başkanı'), 'Daire Başkanı');
    assert.equal(t('common.edit'), 'Düzenle');
    assert.equal(t('common.ext'), 'Dahili');
    assert.equal(tUnit('adet'), 'adet');
    assert.equal(tUnit('kutu'), 'kutu');
    assert.equal(tBuilding('Mühendislik Binası'), 'Mühendislik Binası');
    assert.equal(tMonth(11), 'Kasım');
    assert.equal(tActionType('GIRIS'), 'Kullanıcı Girişi');

    // 2. İngilizce aktifken tam İngilizce karşılıklar dönmeli
    setLanguage('en');
    assert.equal(tCategory('Kağıt ve Defter Grubu'), 'Paper & Notebooks Group');
    assert.equal(tProduct('A4 Fotokopi Kağıdı 80 gr (500 Yaprak)'), 'A4 Copy Paper 80 gsm (500 Sheets)');
    assert.equal(tDepartment('Bilgi İşlem Müdürlüğü'), 'IT Directorate');
    assert.equal(tDepartment('Genel Sekreterlik'), 'General Secretariat');
    assert.equal(tTitle('Sistem Yöneticisi'), 'System Administrator');
    assert.equal(tTitle('Daire Başkanı'), 'Department Head');
    assert.equal(tTitle('Bölüm Başkanı'), 'Department Chair');
    assert.equal(tTitle('Genel Sekreter'), 'Secretary General');
    assert.equal(t('common.edit'), 'Edit');
    assert.equal(t('common.ext'), 'Ext');
    assert.equal(tUnit('adet'), 'pcs');
    assert.equal(tUnit('kutu'), 'box');
    assert.equal(tUnit('paket'), 'pack');
    assert.equal(tBuilding('Mühendislik Binası'), 'Engineering Building');
    assert.equal(tMonth(11), 'November');
    assert.equal(tActionType('GIRIS'), 'User Login');
    assert.equal(tActionType('SUNUM_INCELEME'), 'Presentation Review');
    assert.equal(tRole('sunum'), 'Presentation Mode');
    assert.equal(tUser('ziyaretci'), 'visitor');
    assert.equal(formatLogDetail('Kullanıcı sisteme başarıyla giriş yaptı.'), 'User logged in to the system successfully.');
    assert.equal(formatLogDetail('Sunum Açıldı ve İnceleniyor'), 'Presentation Opened & Under Review');
    assert.equal(t('yonetim.allUnits'), 'All Departments');
    assert.equal(t('yonetim.backupTabTitle'), 'System & Database Backups');
  });
});
