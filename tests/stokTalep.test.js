import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/db/migrate.js';
import urunRepository from '../src/repositories/urunRepository.js';
import stokService from '../src/services/stokService.js';
import { ValidationError } from '../src/utils/errors.js';

describe('Stok ve Talep Entegrasyon Testleri', () => {
  let testDb;

  before(() => {
    testDb = new Database(':memory:');
    runMigrations(testDb);

    // Kategori ekle
    testDb.prepare(`INSERT INTO kategoriler (id, ad, sira, aktif) VALUES (1, 'Test Kategori', 1, 1)`).run();

    // Ürün ekle (stok: 10)
    urunRepository.create({
      kategori_id: 1,
      ad: 'Test Zımba',
      marka: 'TestMarka',
      olcu_birimi: 'adet',
      stok: 10,
      kritik_stok: 3
    }, testDb);
  });

  after(() => {
    testDb.close();
  });

  test('Yeterli stok varsa onayda stok başarıyla düşmelidir', () => {
    const urunOnce = urunRepository.findById(1, testDb);
    assert.equal(urunOnce.stok, 10);

    stokService.dus({
      urunId: 1,
      miktar: 4,
      talepId: null,
      aciklama: 'Test Talep Onayı',
      yapanHesapId: null
    }, testDb);

    const urunSonra = urunRepository.findById(1, testDb);
    assert.equal(urunSonra.stok, 6, 'Mevcut stok 10 - 4 = 6 olmalıdır');
  });

  test('Yetersiz stok durumunda işlem reddedilmeli ve hata fırlatmalıdır', () => {
    const urun = urunRepository.findById(1, testDb);
    assert.equal(urun.stok, 6);

    // Mevcut stok 6 iken 10 adet düşmeye çalışalım
    assert.throws(() => {
      stokService.dus({
        urunId: 1,
        miktar: 10,
        talepId: null,
        aciklama: 'Yetersiz stok testi'
      }, testDb);
    }, (err) => {
      assert.ok(err instanceof ValidationError, 'ValidationError fırlatılmalıdır');
      assert.match(err.message, /Yetersiz stok/);
      return true;
    });

    // Stok değişmemiş olmalıdır
    const urunAyni = urunRepository.findById(1, testDb);
    assert.equal(urunAyni.stok, 6, 'Hata sonrası stok 6 olarak korunmalıdır');
  });
});
