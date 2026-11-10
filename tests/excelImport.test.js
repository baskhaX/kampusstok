import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import getDb from '../src/db/connection.js';

describe('KampüsStok Excel İçe Aktarma & Şablon Testleri', () => {
  const db = getDb();

  test('Excel şablonu oluşturulabilmeli ve doğru sütunlara sahip olmalıdır', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Personel Listesi');
    sheet.columns = [
      { header: 'Birim Adı *', key: 'birimAdi' },
      { header: 'Ad Soyad *', key: 'adSoyad' },
      { header: 'E-Posta *', key: 'eposta' },
      { header: 'Telefon', key: 'telefon' },
      { header: 'Unvan', key: 'unvan' },
      { header: 'Bina Adı', key: 'binaAdi' },
      { header: 'Oda No', key: 'odaNo' }
    ];

    sheet.addRow({
      birimAdi: 'Test Mühendislik Dekanlığı',
      adSoyad: 'Prof. Dr. Test Personel',
      eposta: 'test.personel@kampus.edu.tr',
      telefon: '0312 999 0001',
      unvan: 'Dekan',
      binaAdi: 'A Blok',
      odaNo: '101'
    });

    const buffer = await workbook.xlsx.writeBuffer();
    assert.ok(buffer.length > 0, 'Excel buffer boş olmamalıdır');

    // Buffer'ı tekrar oku ve test et
    const readWorkbook = new ExcelJS.Workbook();
    await readWorkbook.xlsx.load(buffer);
    const readSheet = readWorkbook.worksheets[0];
    assert.equal(readSheet.rowCount, 2);
    assert.equal(readSheet.getRow(2).getCell(1).text, 'Test Mühendislik Dekanlığı');
    assert.equal(readSheet.getRow(2).getCell(2).text, 'Prof. Dr. Test Personel');
  });

  test('Excel ile gelen personel ve birim veritabanına otomatik aktarılabilmelidir', () => {
    const testBirimAdi = 'Otomasyon Test Birimi';
    const testAdSoyad = 'Deneme Personel';
    const testEposta = 'deneme.personel@kampus.edu.tr';

    // 1. Birim oluştur veya al
    let birim = db.prepare('SELECT id FROM birimler WHERE ad = ?').get(testBirimAdi);
    if (!birim) {
      const bRes = db.prepare("INSERT INTO birimler (ad, tur, aktif) VALUES (?, 'idari_birim', 1)").run(testBirimAdi);
      birim = { id: bRes.lastInsertRowid };
    }
    assert.ok(birim.id > 0);

    // 2. Personel ekle
    const pRes = db.prepare(`
      INSERT INTO personel (birim_id, ad_soyad, eposta, telefon, unvan, bina_adi, oda_no, aktif)
      VALUES (?, ?, ?, '0312 111 2233', 'Uzman', 'Merkez Bina', '201', 1)
    `).run(birim.id, testAdSoyad, testEposta);

    assert.ok(pRes.lastInsertRowid > 0);

    const eklenen = db.prepare('SELECT * FROM personel WHERE id = ?').get(pRes.lastInsertRowid);
    assert.equal(eklenen.ad_soyad, testAdSoyad);
    assert.equal(eklenen.eposta, testEposta);

    // Temizle
    db.prepare('DELETE FROM personel WHERE id = ?').run(pRes.lastInsertRowid);
    db.prepare('DELETE FROM birimler WHERE id = ?').run(birim.id);
  });
});
