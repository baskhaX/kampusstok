export function talepOnaylandiTemplate({ talepNo, birimAdi, personelAdi, teslimatTarihiText, kalemler, revizeGerekcesi = null }) {
  const kalemSatirlari = kalemler.map(k => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0;">${k.urun_adi}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: center;">${k.istenen_adet} ${k.olcu_birimi}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: center; font-weight: bold; color: #10B981;">
        ${k.onaylanan_adet} ${k.olcu_birimi}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; padding: 24px; color: #0F172A;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E2E8F0; overflow: hidden;">
        <div style="background-color: #0F172A; padding: 20px; color: #FFFFFF;">
          <h2 style="margin: 0; font-size: 20px;">Kırtasiye Talebiniz Onaylandı</h2>
          <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 14px;">Talep No: ${talepNo}</p>
        </div>
        <div style="padding: 24px;">
          <p style="font-size: 15px; line-height: 1.6;">
            Sayın <strong>${personelAdi}</strong>,<br>
            <strong>${birimAdi}</strong> adına yapmış olduğunuz kırtasiye talebi incelenmiş ve onaylanmıştır.
          </p>

          ${revizeGerekcesi ? `
            <div style="background-color: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px; margin: 16px 0; border-radius: 4px;">
              <strong>Revize Gerekçesi:</strong> ${revizeGerekcesi}
            </div>
          ` : ''}

          <h4 style="margin: 20px 0 10px 0; color: #0F172A;">Onaylanan Malzeme Tablosu</h4>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background-color: #F1F5F9; text-align: left;">
                <th style="padding: 10px; font-size: 13px;">Ürün</th>
                <th style="padding: 10px; font-size: 13px; text-align: center;">İstenen</th>
                <th style="padding: 10px; font-size: 13px; text-align: center;">Onaylanan</th>
              </tr>
            </thead>
            <tbody>${kalemSatirlari}</tbody>
          </table>

          <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; padding: 16px; border-radius: 6px; text-align: center;">
            <p style="margin: 0; color: #065F46; font-size: 16px; font-weight: bold;">
              Malzemeleriniz <u>${teslimatTarihiText}</u> günü depodan teslim edilecektir.
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}
