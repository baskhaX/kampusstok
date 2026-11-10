import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import getDb from '../src/db/connection.js';
import { generateHmacSignature, verifyHmacSignature } from '../src/utils/crypto.js';
import yedekService from '../src/services/yedekService.js';
import girisDenemeRepository from '../src/repositories/girisDenemeRepository.js';

describe('🛡️ Bars & Umay Güvenlik ve Sistem Bütünlüğü Testleri', () => {
  let db;

  before(() => {
    db = getDb();
  });

  it('Veritabanı tam fiziksel bütünlük testini (PRAGMA integrity_check) başarıyla geçmelidir', () => {
    const result = db.pragma('integrity_check');
    assert.ok(Array.isArray(result));
    assert.strictEqual(result[0].integrity_check, 'ok');
  });

  it('HMAC QR İmza Motoru geçerli tokeni doğrulamalı, sahte tokeni reddetmelidir', () => {
    const talepNo = 'TLP-2026-0099';
    const validSignature = generateHmacSignature(talepNo);
    assert.ok(typeof validSignature === 'string');
    assert.strictEqual(validSignature.length, 16);

    // Doğru imza testi
    assert.strictEqual(verifyHmacSignature(talepNo, validSignature), true);

    // Değiştirilmiş talepNo testi (IDOR saldırı simülasyonu)
    assert.strictEqual(verifyHmacSignature('TLP-2026-0100', validSignature), false);

    // Sahte imza testi
    assert.strictEqual(verifyHmacSignature(talepNo, 'bad-signature-123'), false);
    assert.strictEqual(verifyHmacSignature(talepNo, ''), false);
  });

  it('Kaba kuvvet (Brute Force) koruması başarısız denemeleri doğru saymalıdır', () => {
    const testIp = '10.99.88.77';
    const testUser = 'saldirgan_kullanici';

    // 3 başarısız deneme kaydet
    girisDenemeRepository.record({ kullanici_adi: testUser, ip: testIp, basarili: false }, db);
    girisDenemeRepository.record({ kullanici_adi: testUser, ip: testIp, basarili: false }, db);
    girisDenemeRepository.record({ kullanici_adi: testUser, ip: testIp, basarili: false }, db);

    const userFailures = girisDenemeRepository.countFailuresByUser(testUser, 15, db);
    assert.ok(userFailures >= 3);

    const ipFailures = girisDenemeRepository.countFailuresByIp(testIp, 15, db);
    assert.ok(ipFailures >= 3);
  });

  it('Otomatik çevrimiçi yedekleme servisi başarıyla .db üretmeli ve boyutu sıfırdan büyük olmalıdır', async () => {
    const sonuc = await yedekService.yedekAl();
    assert.strictEqual(sonuc.basarili, true);
    assert.ok(sonuc.boyut > 1024); // En az 1 KB
    assert.ok(sonuc.dosya.endsWith('.db'));
  });

  it('SQL Enjeksiyonu karakterleri içeren aramalar güvenle işlenmeli ve hata vermemelidir', () => {
    const sqlInjectionQueries = [
      "' OR '1'='1",
      "'; DROP TABLE urunler; --",
      "1 UNION SELECT 1,2,3--",
      "admin'--"
    ];

    for (const query of sqlInjectionQueries) {
      assert.doesNotThrow(() => {
        const stmt = db.prepare('SELECT id, ad FROM urunler WHERE ad LIKE ? OR barkod = ?');
        stmt.all(`%${query}%`, query);
      });
    }
  });
});
