import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import hesapRepository from '../repositories/hesapRepository.js';
import oturumRepository from '../repositories/oturumRepository.js';
import personelRepository from '../repositories/personelRepository.js';
import gorevDevriRepository from '../repositories/gorevDevriRepository.js';
import girisDenemeRepository from '../repositories/girisDenemeRepository.js';
import denetimService from '../services/denetimService.js';
import { verifyPassword, hashPassword, generateSessionToken, hashToken } from '../utils/crypto.js';
import { UnauthorizedError, ValidationError, NotFoundError } from '../utils/errors.js';
import config from '../config/index.js';

export const authController = {
  async devLogin(req, res, next) {
    try {
      if (config.nodeEnv === 'production') {
        throw new NotFoundError('Bu özellik üretim ortamında kullanılamaz.');
      }

      const { kullanici = 'satinalma' } = req.query;
      const hesap = hesapRepository.findByKullaniciAdi(kullanici);
      if (!hesap) throw new NotFoundError('Hesap bulunamadı.');

      const { token, hash } = generateSessionToken();
      const expiresAt = new Date(Date.now() + config.sessionExpireHours * 60 * 60 * 1000).toISOString();

      oturumRepository.create({
        token_hash: hash,
        hesap_id: hesap.id,
        secili_personel_id: hesap.personel_id || 1,
        son_gecerlilik: expiresAt
      });

      res.cookie('talep_oturum', token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: config.sessionExpireHours * 60 * 60 * 1000
      });

      if (req.query.hash) {
        return res.redirect('/' + req.query.hash);
      }

      const indexHtml = readFileSync(resolve(process.cwd(), 'public/index.html'), 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(indexHtml);
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { kullanici_adi, sifre } = req.body;
      const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';

      const hesap = hesapRepository.findByKullaniciAdi(kullanici_adi);
      if (!hesap || !hesap.aktif) {
        girisDenemeRepository.record({ kullanici_adi, ip, basarili: false });
        throw new UnauthorizedError('Kullanıcı adı veya şifre hatalı.');
      }

      const isValid = verifyPassword(sifre, hesap.sifre_hash);
      if (!isValid) {
        girisDenemeRepository.record({ kullanici_adi, ip, basarili: false });
        throw new UnauthorizedError('Kullanıcı adı veya şifre hatalı.');
      }

      // Başarılı giriş
      girisDenemeRepository.record({ kullanici_adi, ip, basarili: true });
      girisDenemeRepository.clearFailures(kullanici_adi, ip);

      denetimService.log({
        kullanici_id: hesap.id,
        kullanici_adi: hesap.kullanici_adi,
        rol: hesap.rol,
        islem_turu: 'GIRIS',
        aciklama: `Kullanıcı sisteme başarıyla giriş yaptı.`,
        ip_adresi: ip
      });

      // Yeni oturum token'ı oluştur
      const { token, hash } = generateSessionToken();
      const isBeniHatirla = Boolean(req.body.beni_hatirla);
      const sessionDurationHours = isBeniHatirla ? 24 * 30 : config.sessionExpireHours;
      const expiresAt = new Date(Date.now() + sessionDurationHours * 60 * 60 * 1000).toISOString();

      // Bireysel personel hesabı ise secili_personel otomatik atanır
      oturumRepository.create({
        token_hash: hash,
        hesap_id: hesap.id,
        secili_personel_id: hesap.personel_id || null,
        son_gecerlilik: expiresAt
      });

      res.cookie('talep_oturum', token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: sessionDurationHours * 60 * 60 * 1000
      });

      const aktifVekalet = gorevDevriRepository.findAktif();
      let effectiveRol = hesap.rol;
      let isVekilYetkili = false;
      if (hesap.personel_id && aktifVekalet && Number(aktifVekalet.alan_personel_id) === Number(hesap.personel_id)) {
        effectiveRol = 'satin_alma';
        isVekilYetkili = true;
      }

      res.json({
        basarili: true,
        kullanici: {
          id: hesap.id,
          kullaniciAdi: hesap.kullanici_adi,
          rol: effectiveRol,
          asliRol: hesap.rol,
          isVekilYetkili,
          aktifVekalet: (effectiveRol === 'satin_alma' || hesap.rol === 'admin') ? aktifVekalet : null,
          birimId: hesap.birim_id,
          birimAdi: hesap.birim_adi,
          birimTuru: hesap.birim_turu,
          hesapPersonelId: hesap.personel_id,
          binaAdi: hesap.bina_adi,
          odaNo: hesap.oda_no,
          sifreDegistirmeli: Boolean(hesap.sifre_degistirmeli),
          seciliPersonel: hesap.personel_id ? {
            id: hesap.personel_id,
            adSoyad: hesap.personel_adi,
            eposta: hesap.personel_eposta,
            binaAdi: hesap.bina_adi,
            odaNo: hesap.oda_no
          } : null
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      if (req.user?.tokenHash) {
        oturumRepository.deleteByTokenHash(req.user.tokenHash);
      }
      res.clearCookie('talep_oturum', {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax'
      });
      res.json({ basarili: true, mesaj: 'Oturum kapatıldı.' });
    } catch (err) {
      next(err);
    }
  },

  async me(req, res, next) {
    try {
      res.json({
        basarili: true,
        kullanici: {
          id: req.user.hesapId,
          kullaniciAdi: req.user.kullaniciAdi,
          rol: req.user.rol,
          asliRol: req.user.asliRol || req.user.rol,
          isVekilYetkili: Boolean(req.user.isVekilYetkili),
          aktifVekalet: req.user.aktifVekalet || null,
          birimId: req.user.birimId,
          birimAdi: req.user.birimAdi,
          birimTuru: req.user.birimTuru,
          hesapPersonelId: req.user.hesapPersonelId,
          binaAdi: req.user.binaAdi,
          odaNo: req.user.odaNo,
          sifreDegistirmeli: req.user.sifreDegistirmeli,
          seciliPersonel: req.user.seciliPersonelId ? {
            id: req.user.seciliPersonelId,
            adSoyad: req.user.seciliPersonelAdi,
            eposta: req.user.seciliPersonelEposta,
            binaAdi: req.user.binaAdi,
            odaNo: req.user.odaNo
          } : null
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async sifreDegistir(req, res, next) {
    try {
      const { mevcut_sifre, yeni_sifre, bina_adi, oda_no, telefon } = req.body;
      const hesap = hesapRepository.findById(req.user.hesapId);

      const isValid = verifyPassword(mevcut_sifre, hesap.sifre_hash);
      if (!isValid) {
        throw new ValidationError('Mevcut şifrenizi hatalı girdiniz.');
      }

      const yeniHash = hashPassword(yeni_sifre);
      hesapRepository.updatePassword(req.user.hesapId, yeniHash, 0);

      // Şifre değiştiğinde diğer tüm açık oturumları geçersiz kıl
      oturumRepository.deleteByHesapId(req.user.hesapId, req.user.tokenHash);

      // Personel bilgileri (Bina, Oda No, Telefon) güncellensin
      const personelId = hesap.personel_id || req.user.seciliPersonelId;
      if (personelId && (bina_adi || oda_no || telefon)) {
        personelRepository.update(personelId, {
          bina_adi: bina_adi ? bina_adi.trim() : undefined,
          oda_no: oda_no ? oda_no.trim() : undefined,
          telefon: telefon ? telefon.trim() : undefined
        });
      }

      denetimService.log({
        kullanici_id: req.user.hesapId,
        kullanici_adi: req.user.kullaniciAdi,
        rol: req.user.rol,
        islem_turu: 'SIFRE_VE_ADRES_GUNCELLEME',
        aciklama: `Kullanıcı şifresini ve teslimat adresini (Bina: ${bina_adi || '-'}, Oda: ${oda_no || '-'}) güncelledi.`,
        detay: { bina_adi, oda_no, telefon },
        ip_adresi: req.ip
      });

      res.json({ basarili: true, mesaj: 'Şifreniz ve teslimat adres bilgileriniz başarıyla kaydedildi.' });
    } catch (err) {
      next(err);
    }
  },

  async getBirimPersoneller(req, res, next) {
    try {
      if (req.user.rol !== 'birim' || !req.user.birimId) {
        return res.json({ basarili: true, personeller: [] });
      }
      const personeller = personelRepository.findByBirimId(req.user.birimId);
      res.json({ basarili: true, personeller });
    } catch (err) {
      next(err);
    }
  },

  async selectPersonel(req, res, next) {
    try {
      const { personel_id, eposta } = req.body;
      const personel = personelRepository.findById(personel_id);

      if (!personel || personel.birim_id !== req.user.birimId) {
        throw new NotFoundError('Seçilen personel bu birime ait değil veya bulunamadı.');
      }

      // E-posta güncellenmişse kaydet
      if (eposta && eposta.toLowerCase() !== personel.eposta.toLowerCase()) {
        personelRepository.updateEmail(personel_id, eposta);
      }

      oturumRepository.updateSeciliPersonel(req.user.tokenHash, personel_id);

      res.json({
        basarili: true,
        seciliPersonel: {
          id: personel.id,
          adSoyad: personel.ad_soyad,
          eposta: eposta || personel.eposta
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async addPersonel(req, res, next) {
    try {
      const { ad_soyad, eposta } = req.body;
      let personel = personelRepository.findByBirimAndName(req.user.birimId, ad_soyad);

      if (personel) {
        personelRepository.updateEmail(personel.id, eposta);
      } else {
        personel = personelRepository.create({
          birim_id: req.user.birimId,
          ad_soyad,
          eposta
        });
      }

      oturumRepository.updateSeciliPersonel(req.user.tokenHash, personel.id);

      res.json({
        basarili: true,
        seciliPersonel: {
          id: personel.id,
          adSoyad: personel.ad_soyad,
          eposta: eposta
        }
      });
    } catch (err) {
      next(err);
    }
  },

  async sifremiUnuttum(req, res, next) {
    try {
      const { eposta } = req.body;
      if (!eposta || typeof eposta !== 'string') {
        throw new ValidationError('Lütfen kurumsal e-posta adresinizi giriniz.');
      }
      const db = (await import('../db/connection.js')).default();
      const cleanInput = eposta.trim().toLowerCase();

      // Rehberdeki personelleri ara veya hesaplar tablosundan ara
      let personel = db.prepare('SELECT p.*, b.ad as birim_adi FROM personel p JOIN birimler b ON p.birim_id = b.id WHERE LOWER(p.eposta) = ?').get(cleanInput);
      let hesap = null;

      if (personel) {
        hesap = db.prepare('SELECT * FROM hesaplar WHERE personel_id = ?').get(personel.id);
      } else {
        // eposta kullanıcı adı ile eşleşiyor mu?
        hesap = db.prepare('SELECT * FROM hesaplar WHERE LOWER(kullanici_adi) = ?').get(cleanInput);
        if (hesap && hesap.personel_id) {
          personel = db.prepare('SELECT p.*, b.ad as birim_adi FROM personel p JOIN birimler b ON p.birim_id = b.id WHERE p.id = ?').get(hesap.personel_id);
        }
      }

      const genericMsg = 'Eğer bu kurumsal e-posta adresi veya kullanıcı adı sistemde kayıtlı ise, 15 dakika geçerli şifre sıfırlama bağlantısı e-posta adresinize iletilmiştir.';

      if (!personel && !hesap) {
        return res.json({ basarili: true, mesaj: genericMsg });
      }

      if (!hesap && personel) {
        const username = personel.eposta || personel.ad_soyad.toLowerCase().replace(/\s+/g, '.');
        const defaultHash = hashPassword('GeciciSifre' + Math.random());
        const insertRes = db.prepare(`
          INSERT INTO hesaplar (kullanici_adi, sifre_hash, rol, birim_id, personel_id, sifre_degistirmeli, aktif)
          VALUES (?, ?, 'birim', ?, ?, 1, 1)
        `).run(username, defaultHash, personel.birim_id, personel.id);
        hesap = { id: insertRes.lastInsertRowid, kullanici_adi: username };
      }

      const { randomBytes } = await import('node:crypto');
      const rawToken = randomBytes(24).toString('hex');
      const tokenHash = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

      db.prepare(`
        INSERT INTO sifre_sifirlama_tokenleri (hesap_id, token_hash, son_gecerlilik)
        VALUES (?, ?, ?)
      `).run(hesap.id, tokenHash, expiresAt);

      const adSoyad = personel ? personel.ad_soyad : hesap.kullanici_adi;
      const targetEmail = (personel && personel.eposta) ? personel.eposta : (cleanInput.includes('@') ? cleanInput : `${cleanInput}@${config.epostaDomain || 'kampus.edu.tr'}`);

      await denetimService.logla({
        hesap_id: hesap.id,
        islem_turu: 'SIFREMI_UNUTTUM_TOKEN',
        detay: `"${adSoyad}" (${targetEmail}) için 15 dakikalık şifre sıfırlama tokeni üretildi.`,
        ip_adresi: req.ip || req.connection?.remoteAddress
      });

      res.json({
        basarili: true,
        mesaj: `Şifre sıfırlama talebiniz başarıyla alındı. 15 dakika geçerli sıfırlama bağlantınız "${targetEmail}" adresinize iletilmiştir.`,
        ad_soyad: adSoyad,
        eposta: targetEmail
      });
    } catch (err) {
      next(err);
    }
  },

  async sifreSifirlaToken(req, res, next) {
    try {
      const { token, yeni_sifre } = req.body;
      if (!token || typeof token !== 'string') {
        throw new ValidationError('Geçersiz veya eksik sıfırlama tokeni.');
      }
      if (!yeni_sifre || yeni_sifre.length < 6) {
        throw new ValidationError('Yeni şifreniz en az 6 karakter olmalıdır.');
      }

      const tokenHash = hashToken(token.trim());
      const db = (await import('../db/connection.js')).default();

      const tokenRow = db.prepare(`
        SELECT * FROM sifre_sifirlama_tokenleri
        WHERE token_hash = ? AND kullanildi = 0 AND son_gecerlilik > datetime('now')
      `).get(tokenHash);

      if (!tokenRow) {
        throw new ValidationError('Şifre sıfırlama bağlantısı geçersiz veya 15 dakikalık süresi dolmuş. Lütfen yeniden talepte bulunun.');
      }

      const yeniHash = hashPassword(yeni_sifre);

      db.transaction(() => {
        hesapRepository.updatePassword(tokenRow.hesap_id, yeniHash, 0, db);
        db.prepare(`UPDATE sifre_sifirlama_tokenleri SET kullanildi = 1 WHERE id = ?`).run(tokenRow.id);
        oturumRepository.deleteByHesapId(tokenRow.hesap_id, null, db);
      })();

      await denetimService.logla({
        hesap_id: tokenRow.hesap_id,
        islem_turu: 'SIFRE_SIFIRLAMA_TAMAMLANDI',
        detay: `Kullanıcı güvenli token kullanarak şifresini başarıyla yeniledi.`,
        ip_adresi: req.ip
      });

      res.json({
        basarili: true,
        mesaj: 'Şifreniz başarıyla yenilendi. Yeni şifrenizle sisteme giriş yapabilirsiniz.'
      });
    } catch (err) {
      next(err);
    }
  }
};

export default authController;
