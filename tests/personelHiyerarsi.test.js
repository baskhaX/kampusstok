import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { runMigrations } from '../src/db/migrate.js';
import personelRepository from '../src/repositories/personelRepository.js';
import birimRepository from '../src/repositories/birimRepository.js';

describe('Personel ve Kurumsal Hiyerarşi Testleri', () => {
  let db;

  before(() => {
    db = new Database(':memory:');
    runMigrations(db);
  });

  it('Üst birim ve alt birim ilişkisi doğru kurulmalıdır', () => {
    const fakulte = birimRepository.create({
      ad: 'Mühendislik Fakültesi',
      tur: 'dekanlik',
      ust_birim_id: null
    }, db);

    const bolum = birimRepository.create({
      ad: 'Makine Mühendisliği Bölümü',
      tur: 'bolum',
      ust_birim_id: fakulte.id
    }, db);

    assert.equal(bolum.ust_birim_id, fakulte.id);
    assert.equal(bolum.ust_birim_ad, 'Mühendislik Fakültesi');
  });

  it('Yeni personel unvan, görev ve dahili telefon bilgileriyle kaydedilmelidir', () => {
    const bolum = birimRepository.findAll(db).find(b => b.ad.includes('Makine'));

    const yeniPersonel = personelRepository.create({
      birim_id: bolum.id,
      unvan: '',
      ad_soyad: 'Örnek Sekreter',
      gorev: 'Sekreter',
      eposta: 'ornek.sekreter@kampus.edu.tr',
      telefon: '4067'
    }, db);

    assert.ok(yeniPersonel.id);
    assert.equal(yeniPersonel.ad_soyad, 'Örnek Sekreter');
    assert.equal(yeniPersonel.gorev, 'Sekreter');
    assert.equal(yeniPersonel.telefon, '4067');
    assert.equal(yeniPersonel.eposta, 'ornek.sekreter@kampus.edu.tr');
  });

  it('Personel bilgileri güncellenebilmelidir', () => {
    const personel = personelRepository.findAll({ q: 'Örnek' }, db)[0];
    assert.ok(personel);

    const guncel = personelRepository.update(personel.id, {
      telefon: '4068',
      gorev: 'Bölüm Sekreteri'
    }, db);

    assert.equal(guncel.telefon, '4068');
    assert.equal(guncel.gorev, 'Bölüm Sekreteri');
  });

  it('Arama filtresi ad, görev veya e-postaya göre doğru sonuç vermelidir', () => {
    const sonuclar = personelRepository.findAll({ q: 'Sekreter' }, db);
    assert.ok(sonuclar.length >= 1);
    assert.ok(sonuclar.some(p => p.ad_soyad === 'Örnek Sekreter'));
  });

  it('Talebi olmayan personel silindiğinde veritabanından tamamen silinmelidir', () => {
    const personel = personelRepository.findAll({ q: 'Örnek' }, db)[0];
    const sonuc = personelRepository.delete(personel.id, db);
    assert.equal(sonuc.silindi, true);

    const tekrar = personelRepository.findById(personel.id, db);
    assert.equal(tekrar, undefined);
  });
});
