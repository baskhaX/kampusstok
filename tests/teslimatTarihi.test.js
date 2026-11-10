import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { hesaplaTeslimatTarihi } from '../src/services/teslimatTarihiService.js';

describe('Teslimat Tarihi Hesaplama Testleri', () => {
  test('Pazartesi günü gelen talep, aynı haftanın ilk Çarşamba gününe planlanmalıdır', () => {
    // 2026-11-02 bir Pazartesi günüdür. (Saat 10:00 Istanbul / 07:00 UTC)
    const pazartesi = new Date('2026-11-02T07:00:00.000Z');
    const sonuc = hesaplaTeslimatTarihi(pazartesi, '12:00');

    assert.equal(sonuc.targetWednesday.getUTCDay(), 3, 'Teslim günü Çarşamba olmalıdır');
    assert.equal(sonuc.isoDate, '2026-11-04', 'Hedef tarih 4 Kasım 2026 Çarşamba olmalıdır');
  });

  test('Çarşamba sabah saat 10:00 da onaylanan talep, AYNI GÜN Çarşamba teslim edilmelidir', () => {
    // 2026-11-04 Çarşamba saat 10:00 (07:00 UTC)
    const carsambaSabah = new Date('2026-11-04T07:00:00.000Z');
    const sonuc = hesaplaTeslimatTarihi(carsambaSabah, '12:00');

    assert.equal(sonuc.isoDate, '2026-11-04', 'Aynı gün teslim edilmelidir');
    assert.match(sonuc.displayDate, /4 Kasım 2026 Çarşamba/i);
  });

  test('Çarşamba öğleden sonra saat 14:00 te onaylanan talep, BİR SONRAKİ Çarşamba gününe ertelenmelidir', () => {
    // 2026-11-04 Çarşamba saat 14:00 (11:00 UTC)
    const carsambaOgledenSonra = new Date('2026-11-04T11:00:00.000Z');
    const sonuc = hesaplaTeslimatTarihi(carsambaOgledenSonra, '12:00');

    assert.equal(sonuc.isoDate, '2026-11-11', 'Bir sonraki hafta (11 Kasım) Çarşamba olmalıdır');
    assert.match(sonuc.displayDate, /11 Kasım 2026 Çarşamba/i);
  });

  test('Cuma günü onaylanan talep, sonraki haftanın Çarşamba gününe planlanmalıdır', () => {
    // 2026-11-06 Cuma
    const cuma = new Date('2026-11-06T10:00:00.000Z');
    const sonuc = hesaplaTeslimatTarihi(cuma, '12:00');

    assert.equal(sonuc.isoDate, '2026-11-11', 'Sonraki haftanın Çarşamba günü olmalıdır');
  });
});
