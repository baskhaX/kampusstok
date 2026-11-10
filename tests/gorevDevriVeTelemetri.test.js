import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import getDb from '../src/db/connection.js';
import { gorevDevriRepository } from '../src/repositories/gorevDevriRepository.js';
import express from 'express';
import telemetriRouter from '../src/routes/telemetri.js';

describe('Görev Devri ve İzin Motoru Depo Testleri', () => {
  const db = getDb();
  let testDevirId = null;
  let testIzinId = null;

  before(() => {
    // Test öncesi temiz başlangıç durumu hazırla
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version TEXT NOT NULL UNIQUE,
        uygulama_tarihi TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  });

  after(() => {
    // Test verilerini temizle
    if (testDevirId) {
      db.prepare("DELETE FROM gorev_devirleri WHERE id = ?").run(testDevirId);
    }
    if (testIzinId) {
      db.prepare("DELETE FROM gorev_devirleri WHERE id = ?").run(testIzinId);
    }
  });

  test('Asıl görev devri (tur: devir) aktif olduğunda findAktif asıl devralanı getirmelidir', () => {
    const p1 = db.prepare('SELECT id, ad_soyad, birim_id FROM personel LIMIT 1 OFFSET 0').get();
    // Geçici devir kaydı oluştur
    const yeniDevir = gorevDevriRepository.create({
      verenMakam: 'Satın Alma Müdürü',
      verenAdSoyad: 'Satın Alma Müdürü',
      alanPersonelId: p1.id,
      alanAdSoyad: p1.ad_soyad,
      alanBirimId: p1.birim_id,
      tur: 'devir',
      rolModelEtiket: 'Kırtasiye ve Depo Sorumlusu',
      neden: 'Birim İçi Test Görev Devri'
    }, db);

    testDevirId = yeniDevir.id;
    assert.ok(testDevirId, 'Yeni devir kaydı oluşturulmalıdır');

    const aktif = gorevDevriRepository.findAktif(db);
    assert.ok(aktif, 'Aktif devir bulunmalıdır');
    assert.equal(Number(aktif.alan_personel_id), p1.id);
    assert.equal(aktif.tur, 'devir');
    assert.equal(gorevDevriRepository.isPersonelAktifYetkili(p1.id, db), true);
    assert.equal(gorevDevriRepository.isPersonelAktifYetkili(9999, db), false);
  });

  test('Zamanı gelmiş aktif izin vekaleti (tur: izin), asıl devrin önüne geçmelidir', () => {
    const p1 = db.prepare('SELECT id, ad_soyad, birim_id FROM personel LIMIT 1 OFFSET 0').get();
    const p2 = db.prepare('SELECT id, ad_soyad, birim_id FROM personel LIMIT 1 OFFSET 1').get();
    const simdi = new Date();
    const yarin = new Date(Date.now() + 24 * 3600 * 1000);

    const baslangicStr = simdi.toISOString().slice(0, 19).replace('T', ' ');
    const bitisStr = yarin.toISOString().slice(0, 19).replace('T', ' ');

    const yeniIzin = gorevDevriRepository.create({
      verenMakam: 'Kırtasiye Sorumlusu',
      verenPersonelId: p1.id,
      verenAdSoyad: p1.ad_soyad,
      alanPersonelId: p2.id,
      alanAdSoyad: p2.ad_soyad,
      alanBirimId: p2.birim_id,
      tur: 'izin',
      rolModelEtiket: 'Vekil Kırtasiye Yöneticisi',
      neden: 'Yıllık İzin Vekaleti',
      baslangicTarihi: baslangicStr,
      bitisTarihi: bitisStr
    }, db);

    testIzinId = yeniIzin.id;
    assert.ok(testIzinId, 'İzin vekaleti kaydı oluşturulmalıdır');

    const aktif = gorevDevriRepository.findAktif(db);
    assert.ok(aktif, 'Aktif vekalet bulunmalıdır');
    assert.equal(aktif.tur, 'izin', 'İzin vekaleti öncelikli olmalıdır');
    assert.equal(Number(aktif.alan_personel_id), p2.id);
    assert.equal(gorevDevriRepository.isPersonelAktifYetkili(p2.id, db), true);
  });

  test('İzin süresi dolduğunda veya sonlandırıldığında yetki otomatik olarak asıl sorumluya (devir) geri dönmelidir', () => {
    const p1 = db.prepare('SELECT id, ad_soyad, birim_id FROM personel LIMIT 1 OFFSET 0').get();
    const p2 = db.prepare('SELECT id, ad_soyad, birim_id FROM personel LIMIT 1 OFFSET 1').get();
    // İzin kaydını sonlandır
    gorevDevriRepository.sonlandir(testIzinId, `${p1.ad_soyad} (İzinden Döndü)`, db);

    const aktif = gorevDevriRepository.findAktif(db);
    assert.ok(aktif, 'Asıl devir kaydı yeniden aktifleşmelidir');
    assert.equal(aktif.tur, 'devir');
    assert.equal(Number(aktif.alan_personel_id), p1.id);
    assert.equal(gorevDevriRepository.isPersonelAktifYetkili(p1.id, db), true);
    assert.equal(gorevDevriRepository.isPersonelAktifYetkili(p2.id, db), false);
  });
});

describe('Telemetri ve Sunum İzleme API Testleri', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/telemetri', telemetriRouter);

  test('Sunum izleme beaconu (POST /sunum-izleme) başarıyla kaydedilmelidir', async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/telemetri/sunum-izleme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'iPad; CPU OS 16_0 like Mac OS X' },
        body: JSON.stringify({
          slaytNo: 1,
          toplamSlayt: 10,
          tamamlandi: false,
          ekran: '1024x768'
        })
      });

      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(data.basarili, true);

      // Radar özetini sorgula
      const summaryRes = await fetch(`http://127.0.0.1:${port}/api/telemetri/radar-ozeti`);
      assert.equal(summaryRes.status, 200);
      const summaryData = await summaryRes.json();
      assert.equal(summaryData.basarili, true);
      assert.ok(summaryData.radar, 'Radar özeti nesnesi dönmelidir');
      assert.ok(summaryData.radar.bugunSunumSayisi >= 1);
    } finally {
      server.close();
    }
  });
});
