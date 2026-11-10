// src/templates/mail/yeniHesapTanimi.js - Personel Yeni Hesap Bilgilendirme E-postası

export function generateYeniHesapMail({ adSoyad, eposta, geciciSifre, birimAdi = '', girisUrl = 'http://localhost:3001' }) {
  const konu = 'KampüsStok Kırtasiye Talep Portalı - Kullanıcı Hesabınız Oluşturuldu';

  const govde = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
      <div style="background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
        <h2 style="margin: 0; font-size: 21px; font-weight: 700; letter-spacing: -0.3px;">KampüsStok Kırtasiye Talep Portalı</h2>
        <p style="margin: 6px 0 0; opacity: 0.9; font-size: 13px;">Kurumsal Kırtasiye Malzeme Talep ve Yönetim Sistemi</p>
      </div>
      
      <div style="padding: 28px 24px; color: #1E293B; line-height: 1.6; font-size: 14px;">
        <p style="margin-top: 0;">Sayın <strong>${adSoyad}</strong>,</p>
        <p>
          Kurumsal KampüsStok Kırtasiye Talep Portalı üzerinde 
          <strong>${birimAdi}</strong> adına malzeme talebinde bulunabilmeniz amacıyla kurumsal kullanıcı hesabınız tanımlanmıştır.
        </p>
        
        <div style="background: #F8FAFC; border: 1.5px solid #E2E8F0; border-radius: 10px; padding: 18px; margin: 22px 0;">
          <div style="margin-bottom: 10px;">
            <span style="color: #64748B; font-size: 12px; display: block; margin-bottom: 2px;">Kullanıcı Adınız (Kurumsal E-posta):</span>
            <strong style="color: #0F172A; font-size: 14px; font-family: monospace;">${eposta}</strong>
          </div>
          <div style="margin-bottom: 10px;">
            <span style="color: #64748B; font-size: 12px; display: block; margin-bottom: 2px;">Geçici Giriş Şifreniz:</span>
            <span style="display: inline-block; background: #EFF6FF; border: 1px solid #BFDBFE; color: #1D4ED8; font-weight: 800; padding: 4px 10px; border-radius: 6px; font-size: 16px; font-family: monospace; letter-spacing: 1px;">${geciciSifre}</span>
          </div>
          <div>
            <span style="color: #64748B; font-size: 12px; display: block; margin-bottom: 2px;">Giriş Adresi:</span>
            <a href="${girisUrl}" style="color: #2563EB; font-weight: 600; text-decoration: none;">${girisUrl}</a>
          </div>
        </div>

        <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px;">
          <p style="margin: 0; color: #B45309; font-size: 13px; font-weight: 500;">
            <strong>İlk Giriş Zorunluluğu:</strong> Güvenliğiniz için ilk girişinizde geçici şifrenizi yenilemeniz; ayrıca malzemelerinizin odanıza eksiksiz ulaştırılabilmesi için <strong>Bina ve Oda Numaranızı</strong> teyit etmeniz gerekmektedir.
          </p>
        </div>

        <div style="text-align: center; margin: 28px 0 10px;">
          <a href="${girisUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 50px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
            Sisteme Giriş Yap →
          </a>
        </div>
      </div>

      <div style="background: #F1F5F9; border-top: 1px solid #E2E8F0; padding: 16px; text-align: center; font-size: 12px; color: #64748B;">
        Bu e-posta KampüsStok İdari ve Mali İşler / Satın Alma Müdürlüğü tarafından sistem üzerinden otomatik olarak gönderilmiştir.
      </div>
    </div>
  `;

  return { konu, govde };
}

export default generateYeniHesapMail;
