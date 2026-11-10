/**
 * Türkçe karakterleri ve aksanları duyarsız arama için normalize eder.
 * Örn: "KÂĞIT" -> "kagit", "şemsiye" -> "semsiye", "Işık" -> "isik", "İnci" -> "inci"
 */
export function normalizeTurkishText(text) {
  if (!text || typeof text !== 'string') return '';

  return text
    // Önce Türkçe büyük I ve İ harflerini doğru küçük harfe çevirelim
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    // Türkçe özel harfleri ve şapkalı harfleri normalize edelim
    .replace(/[âäáà]/g, 'a')
    .replace(/[îïíì]/g, 'i')
    .replace(/[ûüúù]/g, 'u')
    .replace(/[ôöóò]/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .trim();
}

/**
 * Verilen metin içinde aranan terimin bulunup bulunmadığını kontrol eder.
 * Türkçe ünsüz yumuşaması (t->d, p->b, k->g) durumlarını da destekler.
 */
export function matchesTurkish(source, query) {
  if (!query) return true;
  if (!source) return false;

  const normSource = normalizeTurkishText(source);
  const normQuery = normalizeTurkishText(query);

  if (normSource.includes(normQuery)) return true;

  // Türkçe ünsüz yumuşaması: t -> d (kagit -> kagidi)
  if (normQuery.endsWith('t')) {
    const queryWithD = normQuery.slice(0, -1) + 'd';
    if (normSource.includes(queryWithD)) return true;
  }
  // p -> b (kitap -> kitabi)
  if (normQuery.endsWith('p')) {
    const queryWithB = normQuery.slice(0, -1) + 'b';
    if (normSource.includes(queryWithB)) return true;
  }
  // c -> ç veya k -> g
  if (normQuery.endsWith('k')) {
    const queryWithG = normQuery.slice(0, -1) + 'g';
    if (normSource.includes(queryWithG)) return true;
  }

  return false;
}

/**
 * XSS önleme amacıyla HTML özel karakterlerini encode eder.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

