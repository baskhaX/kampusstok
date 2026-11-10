import bildirimService from '../services/bildirimService.js';
import bildirimRepository from '../repositories/bildirimRepository.js';

export const bildirimController = {
  sseStream(req, res) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    res.write('event: baglandi\ndata: {"mesaj":"SSE baglantisi aktif"}\n\n');
    bildirimService.addSseClient(res, req.user);

    // Bağlantıyı canlı tutmak için her 25 saniyede bir ping yorumu at
    const interval = setInterval(() => {
      res.write(': ping\n\n');
    }, 25000);

    res.on('close', () => {
      clearInterval(interval);
    });
  },

  async getBildirimler(req, res, next) {
    try {
      const hedefRol = req.user.rol;
      const hedefBirimId = req.user.birimId || null;

      const bildirimler = bildirimRepository.findRecent(hedefRol, hedefBirimId, 30);
      const okunmamisSayisi = bildirimRepository.countUnread(hedefRol, hedefBirimId);

      res.json({
        basarili: true,
        okunmamisSayisi,
        bildirimler
      });
    } catch (err) {
      next(err);
    }
  },

  async markRead(req, res, next) {
    try {
      const { id } = req.params;
      bildirimRepository.markAsRead(id, req.user.rol, req.user.birimId);
      res.json({ basarili: true });
    } catch (err) {
      next(err);
    }
  },

  async markAllRead(req, res, next) {
    try {
      const hedefRol = req.user.rol;
      const hedefBirimId = req.user.birimId || null;

      bildirimRepository.markAllAsRead(hedefRol, hedefBirimId);
      res.json({ basarili: true });
    } catch (err) {
      next(err);
    }
  }
};

export default bildirimController;
