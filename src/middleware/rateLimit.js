import girisDenemeRepository from '../repositories/girisDenemeRepository.js';
import { LockedError } from '../utils/errors.js';

export function loginRateLimit(maxFailures = 5, lockMinutes = 15, maxIpFailures = 25) {
  return (req, res, next) => {
    const kullaniciAdi = req.body?.kullanici_adi || '';
    const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    // 1. IP bazlı kaba kuvvet / sprey saldırı koruması
    const ipFailures = girisDenemeRepository.countFailuresByIp(ip, lockMinutes);
    if (ipFailures >= maxIpFailures) {
      return next(
        new LockedError(
          `Bu IP adresinden çok fazla başarısız giriş denemesi yapıldı. Güvenliğiniz için erişim ${lockMinutes} dakika süreyle geçici olarak kilitlendi.`
        )
      );
    }

    // 2. Kullanıcı hesabı bazlı kilit koruması
    if (kullaniciAdi) {
      const userFailures = girisDenemeRepository.countFailuresByUser(kullaniciAdi, lockMinutes);
      if (userFailures >= maxFailures) {
        return next(
          new LockedError(
            `Bu hesap için çok fazla başarısız giriş denemesi yapıldı. Güvenliğiniz için hesap ${lockMinutes} dakika süreyle geçici olarak kilitlendi.`
          )
        );
      }
    }

    next();
  };
}

export default loginRateLimit;
