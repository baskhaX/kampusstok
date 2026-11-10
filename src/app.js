import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { resolve } from 'node:path';

import authRoutes from './routes/auth.js';
import katalogRoutes from './routes/katalog.js';
import sepetRoutes from './routes/sepet.js';
import taleplerRoutes from './routes/talepler.js';
import satinalmaRoutes from './routes/satinalma.js';
import yonetimRoutes from './routes/yonetim.js';
import bildirimRoutes from './routes/bildirim.js';
import raporRoutes from './routes/rapor.js';
import atilMalzemeRoutes from './routes/atilMalzeme.js';
import oduncEkipmanRoutes from './routes/oduncEkipman.js';
import telemetriRoutes from './routes/telemetri.js';
import talepController from './controllers/talepController.js';

import errorHandler from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // Ters Vekil (Reverse Proxy) / TLS Arkasında Gerçek IP için
  app.set('trust proxy', 1);

  // Güvenlik Başlıkları (Helmet)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
        scriptSrcAttr: ["'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
        connectSrc: ["'self'", "http:", "ws:"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Statik Dosyalar (Ürün fotoğrafları önbelleğe alınır, JS/CSS anında güncellenir)
  app.use('/uploads', express.static(resolve(process.cwd(), 'uploads'), { maxAge: '1d' }));
  app.use(express.static(resolve(process.cwd(), 'public'), {
    maxAge: 0,
    setHeaders: (res, path) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }));

  // Hızlı QR Teslimat Sayfası (Mobil tarayıcılar için bağımsız, anında açılan hafif arayüz)
  app.get(['/teslim/:talepNo', '/t/:talepNo'], talepController.renderHizliTeslimSayfasi);
  app.post(['/teslim/:talepNo', '/t/:talepNo'], talepController.postHizliTeslimSayfasi);

  // API Rotaları
  app.use('/api/auth', authRoutes);
  app.use('/api/katalog', katalogRoutes);
  app.use('/api/sepet', sepetRoutes);
  app.use('/api/talepler', taleplerRoutes);
  app.use('/api/satinalma', satinalmaRoutes);
  app.use('/api/yonetim', yonetimRoutes);
  app.use('/api/bildirimler', bildirimRoutes);
  app.use('/api/raporlar', raporRoutes);
  app.use('/api/atil-malzeme', atilMalzemeRoutes);
  app.use('/api/odunc-ekipman', oduncEkipmanRoutes);
  app.use('/api/telemetri', telemetriRoutes);

  // Merkezi Hata Yakalayıcı
  app.use(errorHandler);

  return app;
}

export default createApp;
