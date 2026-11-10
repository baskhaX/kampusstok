export function talepOlusturulduTemplate({ talepNo, birimAdi, personelAdi, personelEposta, notlar, kalemler, panelUrl }) {
  const kalemSatirlari = kalemler.map(k => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0;">${k.urun_adi}</td>
      <td style="padding: 10px; border-bottom: 1px solid #E2E8F0; text-align: center;">${k.istenen_adet} ${k.olcu_birimi}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="tr">
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; padding: 24px; color: #0F172A;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; border: 1px solid #E2E8F0; overflow: hidden;">
        <div style="background-color: #0F172A; padding: 20px; color: #FFFFFF;">
          <h2 style="margin: 0; font-size: 20px;">Yeni Kırtasiye Talebi Alındı</h2>
          <p style="margin: 4px 0 0 0; color: #94A3B8; font-size: 14px;">Talep No: ${talepNo}</p>
        </div>
        <div style="padding: 24px;">
          <p><strong>Birim:</strong> ${birimAdi}</p>
          <p><strong>İstek Sahibi:</strong> ${personelAdi} (${personelEposta})</p>
          ${notlar ? `<p><strong>Talep Notu:</strong> ${notlar}</p>` : ''}
          <h4 style="margin: 20px 0 10px 0; color: #0F172A;">Talep Edilen Malzemeler</h4>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background-color: #F1F5F9; text-align: left;">
                <th style="padding: 10px; font-size: 13px;">Ürün</th>
                <th style="padding: 10px; font-size: 13px; text-align: center;">Miktar</th>
              </tr>
            </thead>
            <tbody>${kalemSatirlari}</tbody>
          </table>
          <a href="${panelUrl}" style="display: inline-block; background-color: #10B981; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">Talebi Satın Alma Panelinde İncele</a>
        </div>
      </div>
    </body>
    </html>
  `;
}
