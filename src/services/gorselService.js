import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, extname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import dns from 'node:dns/promises';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { ValidationError } from '../utils/errors.js';

const uploadDir = resolve(process.cwd(), 'uploads/urunler');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

// Özel/Yerel IP kontrolü (SSRF Koruması)
function isPrivateIp(hostname) {
  if (!hostname) return true;
  if (['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname)) return true;
  if (/^10\./.test(hostname)) return true;
  if (/^192\.168\./.test(hostname)) return true;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) return true;
  if (/^169\.254\./.test(hostname)) return true; // Link-local
  if (/^127\./.test(hostname)) return true; // Tüm 127.0.0.0/8 loopback
  return false;
}

async function validateHostIp(hostname) {
  if (isPrivateIp(hostname)) return false;
  try {
    const lookup = await dns.lookup(hostname);
    if (isPrivateIp(lookup.address)) return false;
  } catch {
    return false;
  }
  return true;
}

export const gorselService = {
  /**
   * Unsplash API üzerinden ürün için 6 adet aday görsel arar
   */
  async araResim(query) {
    if (!config.unsplash.isConfigured) {
      return { aktif: false, adaylar: [] };
    }

    try {
      const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=6&client_id=${config.unsplash.accessKey}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) {
        logger.warn(`Unsplash API yanıt hatası: ${res.status}`);
        return { aktif: true, adaylar: [] };
      }

      const data = await res.json();
      const adaylar = (data.results || []).map((item) => ({
        id: item.id,
        kucukResim: item.urls.thumb,
        buyukResim: item.urls.regular,
        aciklama: item.alt_description || query
      }));

      return { aktif: true, adaylar };
    } catch (err) {
      logger.error(`Resim arama hatası: ${err.message}`);
      return { aktif: true, adaylar: [] };
    }
  },

  /**
   * Verilen harici görsel URL'sini doğrular, indirir ve yerel uploads klasörüne kaydeder.
   */
  async indirVeKaydet(gorselUrl) {
    let parsedUrl;
    try {
      parsedUrl = new URL(gorselUrl);
    } catch {
      throw new ValidationError('Geçersiz görsel URL formatı.');
    }

    if (parsedUrl.protocol !== 'https:') {
      throw new ValidationError('Yalnızca güvenli HTTPS protokolü üzerinden görsel indirilebilir.');
    }

    const isSafe = await validateHostIp(parsedUrl.hostname);
    if (!isSafe) {
      throw new ValidationError('Özel veya yerel ağ adreslerine erişim engellendi.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let res;
    try {
      res = await fetch(gorselUrl, {
        signal: controller.signal,
        redirect: 'error',
        headers: { 'User-Agent': 'KampusStok-Bot/1.0' }
      });
    } catch (err) {
      clearTimeout(timeout);
      throw new ValidationError(`Görsel indirilemedi (Zaman aşımı veya ağ hatası): ${err.message}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      throw new ValidationError(`Görsel indirilemedi. Sunucu yanıtı: ${res.status}`);
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    if (!contentType.startsWith('image/') || contentType.includes('svg') || contentType.includes('xml')) {
      throw new ValidationError('Yalnızca güvenli raster görsel formatları (JPG, PNG, WebP) kabul edilir. SVG desteklenmez.');
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 2 * 1024 * 1024) {
      throw new ValidationError('Görsel boyutu en fazla 2 MB olabilir.');
    }

    let ext = '.jpg';
    if (contentType.includes('png')) ext = '.png';
    else if (contentType.includes('webp')) ext = '.webp';
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';
    else {
      throw new ValidationError('Yalnızca JPG, PNG ve WebP formatları desteklenmektedir.');
    }

    const dosyaAdi = `urun_${Date.now()}_${randomBytes(4).toString('hex')}${ext}`;
    const dosyaYolu = join(uploadDir, dosyaAdi);

    writeFileSync(dosyaYolu, buffer);
    logger.info(`Yeni ürün görseli kaydedildi: ${dosyaAdi} (${buffer.length} bytes)`);

    return `/uploads/urunler/${dosyaAdi}`;
  },

  /**
   * Doğrudan yüklenen Base64 formatındaki görsel verisini kaydeder
   */
  async kaydetBase64(base64Data, mimeType = 'image/jpeg') {
    if (!base64Data) {
      throw new ValidationError('Görsel verisi boş olamaz.');
    }

    const cleanMime = mimeType.toLowerCase();
    if (cleanMime.includes('svg') || cleanMime.includes('xml')) {
      throw new ValidationError('SVG formatı güvenlik gerekçesiyle desteklenmemektedir.');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > 2 * 1024 * 1024) {
      throw new ValidationError('Yüklenen görsel en fazla 2 MB olabilir.');
    }

    let ext = '.jpg';
    if (cleanMime.includes('png')) ext = '.png';
    else if (cleanMime.includes('webp')) ext = '.webp';
    else if (cleanMime.includes('jpeg') || cleanMime.includes('jpg')) ext = '.jpg';
    else {
      throw new ValidationError('Yalnızca JPG, PNG ve WebP formatları desteklenmektedir.');
    }

    const dosyaAdi = `urun_${Date.now()}_${randomBytes(4).toString('hex')}${ext}`;
    const dosyaYolu = join(uploadDir, dosyaAdi);

    writeFileSync(dosyaYolu, buffer);
    return `/uploads/urunler/${dosyaAdi}`;
  }
};

export default gorselService;
