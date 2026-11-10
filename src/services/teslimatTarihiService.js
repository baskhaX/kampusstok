import config from '../config/index.js';
import { formatTurkishDate } from '../utils/date.js';

/**
 * Teslimat Tarihi Hesaplama Servisi
 * Kural:
 * - Malzeme teslimatları yalnızca Çarşamba günleri yapılır.
 * - Onay anı Çarşamba günü teslimat saat sınırından (örn. 12:00) önceyse aynı gün Çarşamba teslim edilir.
 * - Çarşamba 12:00 veya sonrasında ise bir sonraki Çarşamba teslim edilir.
 * - Çarşamba dışındaki diğer günlerde (Pazartesi, Salı, Perşembe, Cuma, Cumartesi, Pazar)
 *   en yakın ilk Çarşamba teslim tarihidir.
 *
 * @param {Date|string} dateInput - Onay zamanı
 * @param {string} saatSiniri - "12:00" formatında eşik saat
 * @returns {{ isoDate: string, displayDate: string, targetWednesday: Date }}
 */
export function hesaplaTeslimatTarihi(dateInput = new Date(), saatSiniri = config.teslimatSaatSiniri) {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    throw new Error('Geçersiz tarih parametresi.');
  }

  // Istanbul saat dilimine göre parçalayalım
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const partMap = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const dayOfWeekStr = partMap.weekday; // 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'
  const hour = parseInt(partMap.hour, 10);
  const minute = parseInt(partMap.minute, 10);

  const [cutoffHour, cutoffMinute] = (saatSiniri || '12:00')
    .split(':')
    .map((v) => parseInt(v, 10));

  const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const currentDayIndex = dayMap[dayOfWeekStr] ?? date.getUTCDay();

  let daysToAdd = 0;

  if (currentDayIndex === 3) { // Çarşamba
    const isBeforeCutoff = hour < cutoffHour || (hour === cutoffHour && minute < cutoffMinute);
    if (isBeforeCutoff) {
      daysToAdd = 0; // Aynı gün Çarşamba
    } else {
      daysToAdd = 7; // Bir sonraki Çarşamba
    }
  } else if (currentDayIndex < 3) { // Pazar(0), Pazartesi(1), Salı(2)
    daysToAdd = 3 - currentDayIndex; // Bu haftaki Çarşamba
  } else { // Perşembe(4), Cuma(5), Cumartesi(6)
    daysToAdd = 7 - (currentDayIndex - 3); // Sonraki haftaki Çarşamba
  }

  // Istanbul yerel tarihi baz alınarak hedef Çarşamba'yı kuralım
  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10) - 1;
  const day = parseInt(partMap.day, 10);

  // UTC öğlen saatine sabitleyerek saat dilimi kaymalarını önleyelim
  const targetWednesday = new Date(Date.UTC(year, month, day + daysToAdd, 12, 0, 0));

  const displayDate = formatTurkishDate(targetWednesday);
  const isoDate = targetWednesday.toISOString().split('T')[0];

  return {
    isoDate,
    displayDate,
    targetWednesday
  };
}

export const teslimatTarihiService = {
  hesaplaTeslimatTarihi
};

export default teslimatTarihiService;
