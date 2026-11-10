/**
 * Tarih yardımcı fonksiyonları.
 * Veritabanında tarihler UTC ISO olarak saklanır, arayüz ve çıktılarda Europe/Istanbul saatine çevrilir.
 */

/**
 * UTC ISO dizesi döner.
 */
export function toUtcIsoString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString();
}

/**
 * Verilen tarihi Türkiye saatine göre "18 Kasım 2026 Çarşamba" biçiminde formatlar.
 */
export function formatTurkishDate(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  // Istanbul saat diliminde yerel bileşenleri alalım
  const formatter = new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    weekday: 'long'
  });

  return formatter.format(d);
}

/**
 * Verilen tarihi Türkiye saatine göre "18.11.2026 14:30" biçiminde formatlar.
 */
export function formatTurkishDateTime(dateInput) {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  const formatter = new Intl.DateTimeFormat('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return formatter.format(d);
}
