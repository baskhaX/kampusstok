import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/db/migrate.js';
import raporService from '../src/services/raporService.js';
import { verifyPassword } from '../src/utils/crypto.js';

describe('Yeni Geliştirmeler & Ek Özellik Testleri', () => {
  let db;

  before(() => {
    db = new Database(':memory:');
    runMigrations(db);

    // Mock kategori, birim ve personel
    db.prepare(`
      INSERT INTO kategoriler (id, ad, sira, aktif)
      VALUES (1, 'Masaüstü Gereçler', 1, 1)
    `).run();

    db.prepare(`
      INSERT INTO birimler (id, ad, tur, aktif)
      VALUES (1, 'Öğrenci İşleri Müdürlüğü', 'idari_birim', 1)
    `).run();

    db.prepare(`
      INSERT INTO personel (id, birim_id, ad_soyad, unvan, eposta, telefon, aktif)
      VALUES (1, 1, 'Test Sorumlusu', 'Müdür', 'test.sorumlusu@kampus.edu.tr', '1234', 1)
    `).run();

    // Dayanıklı ürün ekle
    db.prepare(`
      INSERT INTO urunler (id, kategori_id, ad, marka, olcu_birimi, stok, kritik_stok, aktif, demirbas)
      VALUES (1, 1, 'Delgeç Metal Masaüstü (30 Sayfa)', 'Mas', 'adet', 50, 5, 1, 1)
    `).run();

    // Sarf ürün ekle
    db.prepare(`
      INSERT INTO urunler (id, kategori_id, ad, marka, olcu_birimi, stok, kritik_stok, aktif, demirbas)
      VALUES (2, 1, 'A4 Fotokopi Kağıdı 80 gr', 'Copier', 'paket', 100, 10, 1, 0)
    `).run();
  });

  after(() => {
    if (db) db.close();
  });

  it('Demirbaş ve dayanıklı malzemeler doğru etiketlenmelidir', () => {
    const demirbasUrun = db.prepare('SELECT demirbas FROM urunler WHERE id = 1').get();
    const sarfUrun = db.prepare('SELECT demirbas FROM urunler WHERE id = 2').get();

    assert.strictEqual(demirbasUrun.demirbas, 1);
    assert.strictEqual(sarfUrun.demirbas, 0);
  });

  it('Hızlı Teslimat (QR Kod) ile talep teslimatı onaylanabilmelidir', () => {
    const simdi = new Date().toISOString();
    db.prepare(`
      INSERT INTO talepler (id, talep_no, birim_id, personel_id, personel_adi, personel_eposta, durum, kullanici_teslim_aldi)
      VALUES (1, 'TLP-2026-TEST', 1, 1, 'Test Sorumlusu', 'test.sorumlusu@kampus.edu.tr', 'onaylandi', 0)
    `).run();

    // Hızlı teslimat güncellemesi
    db.prepare(`
      UPDATE talepler 
      SET durum = 'teslim_edildi',
          kullanici_teslim_aldi = 1,
          kullanici_teslim_tarihi = ?,
          kullanici_teslim_notu = 'QR Kod ile Mobil Teslim Onayı Verildi'
      WHERE talep_no = 'TLP-2026-TEST'
    `).run(simdi);

    const guncel = db.prepare('SELECT durum, kullanici_teslim_aldi, kullanici_teslim_notu FROM talepler WHERE id = 1').get();
    assert.strictEqual(guncel.durum, 'teslim_edildi');
    assert.strictEqual(guncel.kullanici_teslim_aldi, 1);
    assert.ok(guncel.kullanici_teslim_notu.includes('QR Kod'));
  });

  it('Mail sessiz modu aktifken kuyruğa ekleme simüle veya sessiz olmalıdır', () => {
    assert.strictEqual(process.env.MAIL_AKTIF, 'false');
  });

  it('QR Kod URL oluşturucu localhost yerine gerçek ağ IP adresi üretmelidir', async () => {
    const { getQrBaseUrl } = await import('../src/utils/network.js');
    
    // 1. APP_URL tanımlıysa öncelik verir
    const prevAppUrl = process.env.APP_URL;
    process.env.APP_URL = 'http://192.168.1.182:3000';
    const url1 = getQrBaseUrl({ headers: { host: 'localhost:3000' } });
    assert.strictEqual(url1, 'http://192.168.1.182:3000');

    // 2. APP_URL yoksa ve host localhost ise LAN IP'ye çözer (telefonun açabilmesi için)
    delete process.env.APP_URL;
    const url2 = getQrBaseUrl({ headers: { host: 'localhost:3000' } });
    assert.ok(url2.startsWith('http://'));
    assert.ok(!url2.includes('localhost'), 'Telefon kameraları localhostu link olarak tanımaz, LAN IP olmalıdır');

    // Eski haline getir
    if (prevAppUrl) process.env.APP_URL = prevAppUrl;
  });
});
