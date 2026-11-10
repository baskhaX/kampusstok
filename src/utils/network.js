import { networkInterfaces } from 'node:os';

/**
 * Makinenin yerel ağ (LAN) IPv4 adresini tespit eder (örn: 192.168.1.182)
 */
export function getLanIpAddress() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Sadece harici (internal olmayan) IPv4 adreslerini al
      if (net.family === 'IPv4' && !net.internal && net.address) {
        return net.address;
      }
    }
  }
  return null;
}

/**
 * QR Kod ve harici bağlantılar için erişilebilir temel URL'i döner.
 * Telefon kameraları "localhost"u bir web sitesi/link olarak algılamaz (düz metin sayar).
 * Ayrıca telefonun "localhost"u bilgisayar değil telefonun kendisidir.
 * Bu yüzden istek localhost veya 127.0.0.1 üzerinden geliyorsa daima gerçek LAN IP'si kullanılır.
 */
export function getQrBaseUrl(req) {
  if (process.env.APP_URL && process.env.APP_URL.trim() !== '') {
    return process.env.APP_URL.trim().replace(/\/+$/, '');
  }

  const rawHost = req?.headers?.host || '';
  const port = rawHost.includes(':') ? rawHost.split(':')[1] : (process.env.PORT || '3000');
  const hostname = (rawHost.includes(':') ? rawHost.split(':')[0] : rawHost).toLowerCase();

  // İstek localhost / 127.0.0.1 ise LAN IP adresini ata
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
    const lanIp = getLanIpAddress();
    if (lanIp) {
      return `http://${lanIp}:${port}`;
    }
  }

  // İstek zaten ağ IP'si veya kurumsal alan adı ile gelmişse
  const proto = req?.headers?.['x-forwarded-proto'] || (req?.secure ? 'https' : 'http');
  return `${proto}://${rawHost || `localhost:${port}`}`;
}

export default {
  getLanIpAddress,
  getQrBaseUrl
};
