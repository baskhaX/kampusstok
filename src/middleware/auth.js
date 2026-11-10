import oturumRepository from '../repositories/oturumRepository.js';
import gorevDevriRepository from '../repositories/gorevDevriRepository.js';
import { hashToken } from '../utils/crypto.js';
import { UnauthorizedError } from '../utils/errors.js';

export function authMiddleware(req, res, next) {
  const token = req.cookies?.talep_oturum;

  if (!token) {
    return next(new UnauthorizedError('Oturum açmanız gerekmektedir.'));
  }

  const tokenHash = hashToken(token);
  const oturum = oturumRepository.findByTokenHash(tokenHash);

  if (!oturum || !oturum.hesap_aktif) {
    res.clearCookie('talep_oturum');
    return next(new UnauthorizedError('Oturum süresi dolmuş veya geçersiz. Lütfen tekrar giriş yapınız.'));
  }

  // Kullanıcı ve oturum bilgilerini istek nesnesine ekle
  const effectivePersonelId = oturum.personel_id || oturum.secili_personel_id;

  // Aktif Görev Devri / Vekalet Kontrolü
  const aktifVekalet = gorevDevriRepository.findAktif();
  let effectiveRol = oturum.rol;
  let isVekilYetkili = false;

  if (effectivePersonelId && aktifVekalet && Number(aktifVekalet.alan_personel_id) === Number(effectivePersonelId)) {
    // Personel Satın Alma Müdürü veya Sorumlu tarafından yetkilendirilmiş (Asıl Görevli veya İzin Vekili)
    effectiveRol = 'satin_alma';
    isVekilYetkili = true;
  }

  req.user = {
    hesapId: oturum.hesap_id,
    kullaniciAdi: oturum.kullanici_adi,
    rol: effectiveRol,
    asliRol: oturum.rol,
    birimId: oturum.birim_id,
    birimAdi: oturum.birim_adi,
    birimTuru: oturum.birim_turu,
    sifreDegistirmeli: Boolean(oturum.sifre_degistirmeli),
    hesapPersonelId: oturum.hesap_personel_id || null,
    seciliPersonelId: effectivePersonelId || null,
    seciliPersonelAdi: oturum.personel_adi || null,
    seciliPersonelEposta: oturum.personel_eposta || null,
    binaAdi: oturum.bina_adi || null,
    odaNo: oturum.oda_no || null,
    tokenHash,
    aktifVekalet: aktifVekalet || null,
    isVekilYetkili
  };

  next();
}

export default authMiddleware;
