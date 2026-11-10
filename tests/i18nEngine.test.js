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

import { initI18n, getLanguage, setLanguage, getSupportedLanguages, t } from '../public/js/utils/i18n.js';

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
});
