export function talepReddedildiTemplate({ talepNo, birimAdi, personelAdi, gerekce }) {
  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; padding: 24px; color: #0F172A;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E2E8F0; overflow: hidden;">
        <div style="background-color: #DC2626; padding: 20px; color: #FFFFFF;">
          <h2 style="margin: 0; font-size: 20px;">Kırtasiye Talebi Reddedildi</h2>
          <p style="margin: 4px 0 0 0; color: #FEE2E2; font-size: 14px;">Talep No: ${talepNo}</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 15px; line-height: 1.6;">
            Sayın <strong>${personelAdi}</strong>,<br>
            <strong>${birimAdi}</strong> adına yapmış olduğunuz kırtasiye talebi Satın Alma Müdürlüğü tarafından reddedilmiştir.
          </p>

          <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 12px; margin: 20px 0; border-radius: 4px;">
            <strong style="color: #991B1B;">Ret Gerekçesi:</strong><br>
            <p style="margin: 4px 0 0 0; color: #7F1D1D;">${gerekce || 'Gerekçe belirtilmedi.'}</p>
          </div>

          <p style="color: #64748B; font-size: 13px;">Sorularınız için Satın Alma Müdürlüğü ile iletişime geçebilirsiniz.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
