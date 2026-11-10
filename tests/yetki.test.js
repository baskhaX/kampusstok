import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { rolKontrol, istekSahibiZorunlu } from '../src/middleware/rol.js';
import { ForbiddenError } from '../src/utils/errors.js';

describe('Rol ve Birim Yetki Kontrolü Testleri', () => {
  test('Birim rolündeki kullanıcı Satın Alma rotasına erişememelidir', () => {
    const middleware = rolKontrol(['satin_alma']);
    const req = {
      user: {
        rol: 'birim',
        birimId: 1
      }
    };
    const res = {};
    let nextCalledWithError = null;

    middleware(req, res, (err) => {
      nextCalledWithError = err;
    });

    assert.ok(nextCalledWithError instanceof ForbiddenError, 'ForbiddenError dönmelidir');
    assert.match(nextCalledWithError.message, /yetkiniz bulunmamaktadır/);
  });

  test('Satın Alma rolündeki kullanıcı Satın Alma rotasına erişebilmelidir', () => {
    const middleware = rolKontrol(['satin_alma']);
    const req = {
      user: {
        rol: 'satin_alma'
      }
    };
    const res = {};
    let nextCalled = false;

    middleware(req, res, (err) => {
      assert.equal(err, undefined);
      nextCalled = true;
    });

    assert.equal(nextCalled, true, 'Yetkili kullanıcı bir sonraki adıma geçebilmelidir');
  });

  test('İstek sahibi seçilmemiş birim kullanıcısı sepet/talep rotalarına erişememelidir', () => {
    const req = {
      user: {
        rol: 'birim',
        birimId: 1,
        seciliPersonelId: null
      }
    };
    const res = {};
    let nextErr = null;

    istekSahibiZorunlu(req, res, (err) => {
      nextErr = err;
    });

    assert.ok(nextErr instanceof ForbiddenError, 'Personel seçimi zorunlu olmalıdır');
    assert.match(nextErr.message, /istek sahibini/);
  });
});
