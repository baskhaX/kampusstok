import nodemailer from 'nodemailer';
import config from '../config/index.js';
import mailKuyrukRepository from '../repositories/mailKuyrukRepository.js';
import talepRepository from '../repositories/talepRepository.js';
import logger from '../utils/logger.js';

let transporter = null;

if (config.smtp.isConfigured) {
  try {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
      }
    });
    logger.info('SMTP posta istemcisi yapılandırıldı.');
  } catch (err) {
    logger.error(`SMTP yapılandırma hatası: ${err.message}`);
  }
} else {
  logger.info('SMTP bilgileri tanımlanmamış. E-postalar SIMULASYON modunda konsola yazılacaktır.');
}

export const mailService = {
  /**
   * Kuyruğa yeni e-posta ekler ve hemen göndermeyi dener.
   */
  async kuyrugaEkle({ talepId = null, alici, konu, govde }) {
    if (process.env.MAIL_AKTIF === 'false') {
      logger.info(`[MAIL SESSİZ MOD - DEVRE DIŞI] Otomatik e-posta gönderimi kapatıldı. Alıcı: ${alici} | Konu: ${konu}`);
      return { id: 0, durum: 'sessiz_mod' };
    }

    const isSimulasyon = !config.smtp.isConfigured || !transporter;
    const ilkDurum = isSimulasyon ? 'simulasyon' : 'bekliyor';

    const kuyrukId = mailKuyrukRepository.create({
      talep_id: talepId,
      alici,
      konu,
      govde,
      durum: ilkDurum
    });

    if (isSimulasyon) {
      logger.info(`[E-POSTA SİMÜLASYONU]
Alıcı: ${alici}
Konu: ${konu}
Talep ID: ${talepId}
Gövde Özeti: ${govde.slice(0, 150)}...`);

      if (talepId) {
        talepRepository.updateMailDurumu(talepId, 'simulasyon');
      }
      return { id: kuyrukId, durum: 'simulasyon' };
    }

    // Gerçek gönderim dene
    try {
      await this.gonderTek(kuyrukId, alici, konu, govde, talepId);
      return { id: kuyrukId, durum: 'gonderildi' };
    } catch (err) {
      logger.error(`E-posta gönderilemedi (Kuyruk #${kuyrukId}): ${err.message}`);
      if (talepId) {
        talepRepository.updateMailDurumu(talepId, 'basarisiz');
      }
      return { id: kuyrukId, durum: 'basarisiz', hata: err.message };
    }
  },

  async gonderTek(kuyrukId, alici, konu, govde, talepId = null) {
    if (!transporter) {
      mailKuyrukRepository.markSuccess(kuyrukId, 'simulasyon');
      if (talepId) talepRepository.updateMailDurumu(talepId, 'simulasyon');
      return;
    }

    try {
      await transporter.sendMail({
        from: config.smtp.from,
        to: alici,
        subject: konu,
        html: govde
      });

      mailKuyrukRepository.markSuccess(kuyrukId, 'gonderildi');
      if (talepId) {
        talepRepository.updateMailDurumu(talepId, 'gonderildi');
      }
      logger.info(`E-posta başarıyla gönderildi: ${alici} | ${konu}`);
    } catch (err) {
      mailKuyrukRepository.markFailed(kuyrukId, err.message);
      if (talepId) {
        talepRepository.updateMailDurumu(talepId, 'basarisiz');
      }
      throw err;
    }
  },

  /**
   * Başarısız veya bekleyen mailleri tekrar dener.
   */
  async kuyruguIsle() {
    if (!config.smtp.isConfigured || !transporter) return;

    const pending = mailKuyrukRepository.findPending(10, 3);
    for (const item of pending) {
      try {
        await this.gonderTek(item.id, item.alici, item.konu, item.govde, item.talep_id);
      } catch (err) {
        // Hata loglandı, bir sonraki sefere denenecek
      }
    }
  },

  /**
   * Satın alma panelinden tek bir mail için yeniden gönderim isteği
   */
  async yenidenGonder(kuyrukId) {
    mailKuyrukRepository.resetForRetry(kuyrukId);
    const db = (await import('../db/connection.js')).default();
    const item = db.prepare('SELECT * FROM mail_kuyrugu WHERE id = ?').get(kuyrukId);
    if (!item) throw new Error('E-posta kaydı bulunamadı.');

    return this.gonderTek(item.id, item.alici, item.konu, item.govde, item.talep_id);
  }
};

export default mailService;
