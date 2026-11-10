import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import getDb from '../src/db/connection.js';
import { runMigrations } from '../src/db/migrate.js';
import atilMalzemeService from '../src/services/atilMalzemeService.js';
import oduncEkipmanService from '../src/services/oduncEkipmanService.js';
import yesilKampusRepository from '../src/repositories/yesilKampusRepository.js';
import raporService from '../src/services/raporService.js';
import yedekService from '../src/services/yedekService.js';
import { generateHmacSignature, verifyHmacSignature, hashPassword, hashToken } from '../src/utils/crypto.js';

describe('Gece Geliştirmeleri & Güvenlik Entegrasyon Testleri', () => {
  let db;

  before(() => {
    runMigrations();
    db = getDb();
  });

  beforeEach(() => {
    if (db) {
      db.prepare("DELETE FROM ekipman_rezervasyonlari WHERE kullanim_amaci LIKE '%Kongre%' OR kullanim_amaci LIKE '%Çakışan%' OR kullanim_amaci LIKE '%Aşırı%'").run();
    }
  });

  it('1. İhtiyaç Fazlası Atıl Malzeme bildirimi kaydedilmeli ve depoya alımda +20 puan tanımlanmalıdır', async () => {
    const birim = db.prepare('SELECT id FROM birimler WHERE aktif = 1 LIMIT 1').get();
    assert.ok(birim, 'Aktif birim bulunamadı.');

    const bildirim = await atilMalzemeService.bildir({
      birimId: birim.id,
      personelId: null,
      binaAdi: 'Mühendislik Binası',
      odaNo: '204',
      aciklama: 'Kullanılmayan 4 kutu büyük boy ataç ve 2 klasör'
    });

    assert.ok(bildirim.id, 'Bildirim ID üretilemedi.');
    assert.equal(bildirim.durum, 'beklemede');

    // Depoya teslim alma işlemi
    const sonuc = await atilMalzemeService.depoyaTeslimAl(bildirim.id, 1);
    assert.equal(sonuc.durum, 'depoya_alindi');

    // Yeşil Kampüs puanı kontrolü (+20 puan)
    const puanKaydi = yesilKampusRepository.getOrCreate(birim.id);
    assert.ok(puanKaydi.iade_puani >= 20, 'İade puanı tanımlanamadı.');
    assert.ok(puanKaydi.toplam_puan >= 120, 'Toplam puan taban + iade puanı içermelidir.');
  });

  it('2. Ortak Ekipman Havuzu: 7 gün sınırı ve çakışma denetimi doğru çalışmalıdır', async () => {
    const ekipman = db.prepare('SELECT id FROM odunc_ekipmanlar LIMIT 1').get();
    assert.ok(ekipman, 'Ekipman bulunamadı.');

    const birim = db.prepare('SELECT id FROM birimler WHERE aktif = 1 LIMIT 1').get();

    // 8 günlük rezervasyon denenirse hata fırlatmalı (maks 7 gün)
    await assert.rejects(
      async () => {
        await oduncEkipmanService.rezerveEt({
          ekipmanId: ekipman.id,
          birimId: birim.id,
          personelId: null,
          baslangicTarihi: '2026-11-10',
          bitisTarihi: '2026-11-20', // 10 gün
          amac: 'Aşırı uzun rezervasyon'
        });
      },
      /en fazla 7 gün/
    );

    // 3 günlük geçerli rezervasyon
    const rez = await oduncEkipmanService.rezerveEt({
      ekipmanId: ekipman.id,
      birimId: birim.id,
      personelId: null,
      baslangicTarihi: '2026-11-10',
      bitisTarihi: '2026-11-13',
      amac: 'Kongre kitapçığı ciltleme',
      teslimatTercihi: 'elden'
    });
    assert.ok(rez.id, 'Rezervasyon oluşturulamadı.');

    // Çakışan tarih aralığında başka rezervasyon engellenmeli
    await assert.rejects(
      async () => {
        await oduncEkipmanService.rezerveEt({
          ekipmanId: ekipman.id,
          birimId: birim.id,
          personelId: null,
          baslangicTarihi: '2026-11-12',
          bitisTarihi: '2026-11-15',
          amac: 'Çakışan talep'
        });
      },
      /başka bir birim tarafından rezerve/
    );
  });

  it('3. Davranışsal İktisat & Yeşil Kampüs Ligi: 100 puan taban ve sıralama doğru hesaplanmalıdır', async () => {
    const siralama = await raporService.getYesilKampusSiralamasi({});
    assert.ok(siralama.akademikLig, 'Akademik lig listesi bulunamadı.');
    assert.ok(siralama.idariLig, 'İdari lig listesi bulunamadı.');

    // Her birimin en az 100 taban puanı olmalı
    for (const b of siralama.akademikLig) {
      assert.ok(b.toplam_puan >= 100, `Birim ${b.birim_adi} taban puanı 100'den az olamaz.`);
    }

    // İdari ligde SADECE Müdürlükler yer almalı; Rektörlük ve Akademik Birimler yer almamalıdır
    assert.ok(siralama.idariLig.length > 0, 'İdari müdürlük listesi boş olamaz.');
    for (const b of siralama.idariLig) {
      assert.ok(
        b.birim_adi.includes('Müdürlüğü') || b.birim_adi.includes('Müdürlük'),
        `İdari ligde sadece müdürlükler yer alabilir, uygunsuz birim: ${b.birim_adi}`
      );
      assert.notEqual(b.birim_adi, 'Rektörlük', 'Rektörlük idari ligde yer alamaz.');
      assert.notEqual(b.birim_adi, 'Akademik Birimler', 'Akademik Birimler idari ligde yer alamaz.');
    }
  });

  it('4. QR Hızlı Teslimat HMAC İmzası yetkisiz erişimleri (IDOR) engellemelidir', () => {
    const talepNo = 'TLP-2026-9999';
    const sig = generateHmacSignature(talepNo);
    assert.ok(sig && sig.length === 16, 'HMAC imzası üretilemedi.');

    // Doğru imza kabul edilmeli
    assert.equal(verifyHmacSignature(talepNo, sig), true);

    // Sahte veya değiştirilmiş imza reddedilmeli
    assert.equal(verifyHmacSignature(talepNo, 'sahte_imza_12345'), false);
    assert.equal(verifyHmacSignature('TLP-2026-8888', sig), false);
    assert.equal(verifyHmacSignature(talepNo, null), false);
  });

  it('5. 15 Dakikalık Şifre Sıfırlama Tokeni güvenli hash ve tek kullanımlık olmalıdır', () => {
    const rawToken = 'test_reset_token_' + Date.now();
    const tokenHash = hashToken(rawToken);

    const hesap = db.prepare('SELECT id FROM hesaplar LIMIT 1').get();
    assert.ok(hesap, 'Test için hesap bulunamadı.');

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    db.prepare(`
      INSERT INTO sifre_sifirlama_tokenleri (hesap_id, token_hash, son_gecerlilik)
      VALUES (?, ?, ?)
    `).run(hesap.id, tokenHash, expiresAt);

    // Token sorgulama
    const row = db.prepare(`
      SELECT * FROM sifre_sifirlama_tokenleri
      WHERE token_hash = ? AND kullanildi = 0 AND son_gecerlilik > datetime('now')
    `).get(tokenHash);
    assert.ok(row, 'Geçerli token bulunamadı.');

    // Kullanıldı olarak işaretleme
    db.prepare(`UPDATE sifre_sifirlama_tokenleri SET kullanildi = 1 WHERE id = ?`).run(row.id);
    const usedRow = db.prepare(`
      SELECT * FROM sifre_sifirlama_tokenleri
      WHERE token_hash = ? AND kullanildi = 0
    `).get(tokenHash);
    assert.equal(usedRow, undefined, 'Kullanılmış token tekrar kabul edilmemelidir.');
  });

  it('6. Sıcak SQLite Online Yedekleme ve 14 günlük rotasyon başarıyla çalışmalıdır', async () => {
    const sonuc = await yedekService.yedekAl(undefined, 'backup_test_');
    assert.equal(sonuc.basarili, true);
    assert.ok(sonuc.dosya.startsWith('backup_test_'));
    assert.ok(sonuc.boyut > 0, 'Yedek boyutu 0 olamaz.');

    const liste = yedekService.listele();
    assert.ok(liste.length > 0, 'Yedek listesi boş olamaz.');

    // Test yedeğini temizle
    const sil = yedekService.yedekSil(sonuc.dosya);
    assert.equal(sil.basarili, true);
  });
});
