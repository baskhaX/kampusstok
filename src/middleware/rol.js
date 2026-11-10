import { ForbiddenError } from '../utils/errors.js';

export function rolKontrol(izinliRoller = []) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Oturum bilgisi bulunamadı.'));
    }

    if (!izinliRoller.includes(req.user.rol)) {
      return next(new ForbiddenError(`Bu işlem için yetkiniz bulunmamaktadır (Gereken rol: ${izinliRoller.join(', ')}).`));
    }

    next();
  };
}

export function istekSahibiZorunlu(req, res, next) {
  if (req.user?.rol === 'birim' && !req.user?.seciliPersonelId) {
    return next(new ForbiddenError('Katalog ve sepet işlemlerinden önce lütfen birim istek sahibini (personel) seçiniz.'));
  }
  next();
}

export default rolKontrol;
