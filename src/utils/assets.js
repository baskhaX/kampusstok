import fs from 'fs';
import { resolve } from 'path';

let cachedLogoDataUri = null;

/**
 * Kurum logosunu mobil SSR sayfaları ve yazdırılabilir A4 fişleri için 
 * Data URI olarak döndürür.
 */
export function getKurumLogoDataUri() {
  if (!cachedLogoDataUri) {
    try {
      const logoSvgPath = resolve(process.cwd(), 'public/assets/logo.svg');
      if (fs.existsSync(logoSvgPath)) {
        const buf = fs.readFileSync(logoSvgPath);
        cachedLogoDataUri = `data:image/svg+xml;base64,${buf.toString('base64')}`;
      } else {
        cachedLogoDataUri = '/assets/logo.svg';
      }
    } catch {
      cachedLogoDataUri = '/assets/logo.svg';
    }
  }
  return cachedLogoDataUri;
}

export default getKurumLogoDataUri;
