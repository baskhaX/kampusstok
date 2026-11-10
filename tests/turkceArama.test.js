import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTurkishText, matchesTurkish } from '../src/utils/text.js';

describe('Türkçe Karakter Duyarsız Arama Testleri', () => {
  test('"kagit" araması ile "kâğıt" kelimesi eşleşmelidir', () => {
    assert.equal(matchesTurkish('A4 Fotokopi Kâğıdı 80 gr', 'kagit'), true);
    assert.equal(matchesTurkish('Fotokopi Kağıdı', 'kagit'), true);
  });

  test('Türkçe İ / ı ve I / i harfleri doğru eşleşmelidir', () => {
    // "isik" araması "IŞIK" ile eşleşmeli
    assert.equal(matchesTurkish('IŞIK ŞEFFAF BANT', 'isik'), true);
    // "inci" araması "İNCİ" ile eşleşmeli
    assert.equal(matchesTurkish('İnci Silgi', 'inci'), true);
    // Büyük harfle arama
    assert.equal(matchesTurkish('mavi tükenmez kalem', 'TÜKENMEZ'), true);
  });

  test('Ç, Ğ, Ö, Ş, Ü harfleri düz harflerle aranabilmelidir', () => {
    assert.equal(matchesTurkish('Zımba Teli No: 24/6', 'zimba'), true);
    assert.equal(matchesTurkish('Şeffaf Poşet Dosya', 'seffaf'), true);
    assert.equal(matchesTurkish('Metal Delgeç 30 Sayfa', 'delgec'), true);
  });
});
