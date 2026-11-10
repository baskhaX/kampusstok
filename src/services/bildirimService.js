import bildirimRepository from '../repositories/bildirimRepository.js';
import logger from '../utils/logger.js';

// Aktif SSE istemcileri ({ res, user })
const sseClients = new Set();

export const bildirimService = {
  /**
   * SSE Bağlantısı ekle (Kullanıcı kimliği ile)
   */
  addSseClient(res, user = null) {
    const client = { res, user };
    sseClients.add(client);
    logger.debug(`Yeni SSE istemcisi bağlandı (${user?.rol || 'anonim'}). Toplam: ${sseClients.size}`);

    res.on('close', () => {
      sseClients.delete(client);
      logger.debug(`SSE istemcisi ayrıldı. Kalan: ${sseClients.size}`);
    });
  },

  /**
   * Hedefli SSE yayını yap
   */
  broadcast(eventType, data, target = null) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of sseClients) {
      try {
        if (target) {
          if (target.hedef_rol && client.user?.rol !== target.hedef_rol) continue;
          if (target.hedef_birim_id && client.user?.birimId !== target.hedef_birim_id) continue;
        }
        client.res.write(payload);
      } catch (err) {
        sseClients.delete(client);
      }
    }
  },

  /**
   * Veritabanına bildirim kaydet ve SSE ile bildir
   */
  gonder({ hedef_rol, hedef_birim_id = null, tur, baslik, mesaj, talep_id = null, extraData = {} }) {
    const bildirimId = bildirimRepository.create({
      hedef_rol,
      hedef_birim_id,
      tur,
      baslik,
      mesaj,
      talep_id,
      extra_data: extraData
    });

    this.broadcast('bildirim', {
      id: bildirimId,
      tur,
      baslik,
      mesaj,
      talep_id,
      tarih: new Date().toISOString(),
      ...extraData
    }, { hedef_rol, hedef_birim_id });

    return bildirimId;
  }
};

export default bildirimService;
