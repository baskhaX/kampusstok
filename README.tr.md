<div align="center">

# 📦 KampüsStok — Kırtasiye Talep, Depo ve Envanter Yönetim Portalı

🌐 **[ 🇬🇧 Read in English / İngilizce Dokümantasyon ](README.en.md)** &nbsp;|&nbsp; **[ 📋 Ana Dokümantasyon (README.md) ](README.md)**

[![Node.js Version](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Database: SQLite](https://img.shields.io/badge/Database-SQLite3%20(WAL)-003B57?logo=sqlite)](https://www.sqlite.org)
[![Tests Passing](https://img.shields.io/badge/Tests-46%2F46%20Passing-success)](#-testler)
[![Open Source](https://img.shields.io/badge/Open%20Source-KVKK%20Uyumlu-emerald)](https://github.com/baskhaX/kampusstok)
[![i18n Ready](https://img.shields.io/badge/i18n-TR%20%7C%20EN-purple)](#)

</div>

<br />

**KampüsStok**, üniversiteler, kamu kurumları ve kurumsal şirketler için geliştirilmiş; intranet (LAN) veya bulut ortamında çalışan, modern e-ticaret deneyimini kurumsal satın alma ve envanter yönetimiyle birleştiren **açık kaynaklı** yeni nesil bir portaldır.

Kişisel veri (KVKK) izolasyonu sağlanmış, kurum logosu ve parametreleri `.env` üzerinden kolayca özelleştirilebilir mimaride tasarlanmıştır.

---

## ✨ Öne Çıkan Özellikler

### 👥 1. Çok Rolü Kurumsal Yetkilendirme & Rol Tabanlı Erişim (RBAC)
- **Sistem Yöneticisi (Admin):** Kullanıcı, birim, yetki ve sistem konfigürasyonu yönetimi.
- **Satın Alma & Depo Amiri:** Talepleri inceleme, onaylama, miktar revize etme, stok kabulü, tedarikçi siparişleri ve dağıtım rotası.
- **Yetki Devri ve İzin Masası:** Satın Alma Müdürü izin veya görevlendirme sırasında vekaletini (tarih/saat bazlı veya kalıcı) bir personeline devreder; onay loglarında vekil kimliği açıkça denetlenir.
- **Depo Sorumlusu:** QR / Barkod destekli hızlı teslimat, teslim fişi üretimi ve mobil teyit.
- **Birim Yetkilisi:** Kendi birimi adına talep açma, sepet yönetimi ve birim bütçe/kotasını izleme.

### 📥 2. Excel ile 1-Tıkla Personel ve Birim İçe Aktarma
- Yönetim panelinden tek tıkla kurumsal **Örnek Excel Şablonu (`.xlsx`)** indirme.
- Mevcut personel listesini (`Ad Soyad`, `E-Posta`, `Birim`, `Unvan`, `Dahili`, `Oda No`) Excel veya CSV formatında sürükleyip bırakarak sisteme topluca yükleme.
- Listede geçen yeni birimleri otomatik algılayıp sisteme tanımlama yeteneği.

### 🛒 3. E-Ticaret Kolaylığında Talep Süreci
- Kategori, arama ve anlık filtreleme destekli görsel ürün kataloğu.
- Dinamik sepet, acil ihtiyaç işaretleme, otomatik dağıtım günü ve teslimat planlama.
- Çarşamba/belirlenen gün toplu dağıtım rotası ve resmi teslim fişi yazdırma.

### 🌱 4. Yeşil Kampüs & Davranışsal İktisat (Nudge)
- **Yeşil Lig:** Birimler arası tasarruf, atıl malzeme iadesi ve çevre puanı podyumu.
- **Akıllı Nudge:** Sepet onayında birimin geçmiş tüketimini analiz eden zarif tasarruf önerileri.
- **Atıl Malzeme Havuzu:** Birimlerin odalarında kalan ihtiyaç fazlası kırtasiyeyi depoya geri kazandırma mekanizması (+20 Yeşil Puan).
- **Kırtasiye Kütüphanesi:** Laminasyon, ciltleme, giyotin gibi nadir kullanılan cihazların birimler arası randevulu ödünç kullanımı (+5 Yeşil Puan).

### 🛡️ 5. Anomali Radarı ve Denetim İzi (Audit Log)
- Anormal tüketim tespiti (geçmiş ortalamanın 2.5x üstüne çıkan taleplerde gerekçe isteme).
- Bütünleşik denetim izi (audit log): Kim, ne zaman, hangi IP adresinden hangi işlemi yaptı?
- Zod ile sıkı şema doğrulaması, SQLite parametreli sorgularla SQL Injection koruması.

### 🌍 6. Çift Dilli Küresel Deneyim (TR / EN)
- Sayfa yenilemeye gerek kalmadan sağ üst köşedeki *Apple Liquid Glass* dil kapsülü ile Türkçe ve İngilizce arasında kesintisiz anlık geçiş.
- Katalog, ürünler, kategoriler, onay akışı, bildirim çanı, denetim logları ve Excel şablonlarında tam iki dilli mimari.

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
- **Node.js 20+** (ES Modules desteği)
- **npm** veya uyumlu paket yöneticisi

### 1. Projeyi Klonlayın ve Bağımlılıkları Yükleyin
```bash
git clone https://github.com/baskhaX/kampusstok.git
cd kampusstok
npm install
```

### 2. Ortam Değişkenlerini Hazırlayın
`.env.example` dosyasını `.env` olarak kopyalayın:
```bash
# Windows PowerShell için:
Copy-Item .env.example .env

# Linux / macOS için:
cp .env.example .env
```

### 3. Veritabanını Başlatın (Otomatik Migrasyon & Seed)
Aşağıdaki komut, 13 migrasyonu çalıştırır ve 10 örnek üniversite birimi, 20 anonim personel ve 21 kalem kırtasiye ürününü sisteme yükler:
```bash
npm run seed
```

### 4. Sunucuyu Çalıştırın
```bash
# Standart çalıştırma
npm start

# Geliştirme modu (otomatik yeniden başlatma ile)
npm run dev

# Windows ortamında doğrudan çift tıklayarak:
baslat.bat
```

Sunucu başladığında tarayıcınızdan **`http://localhost:3001`** adresine gidin.

---

## 🔑 Demo Hesaplar

Tohumlanan (seed) örnek veritabanında hemen deneyebileceğiniz hazır hesaplar:

| Rol | Kullanıcı Adı | Şifre | Yetki Kapsamı |
| :--- | :--- | :--- | :--- |
| **Sistem Yöneticisi** | `admin` | `admin123` | Tüm sisteme, ayarlara ve Excel aktarımına tam erişim |
| **Satın Alma Amiri** | `satinalma` | `satinalma123` | Talep onaylama, stok güncelleme, satın alma ve anomali radarı |
| **Depo Sorumlusu** | `depo` | `depo123` | Malzeme çıkışı, teslimat onayları ve atıl malzeme kabulü |
| **Birim Yetkilisi** | `birim` | `birim123` | Birim adına talep açma, sepet yönetimi ve iade bildirimi |

> 💡 **Not:** Üretim ortamına alırken bu şifreleri `Yönetim -> Personel & Birimler` ekranından değiştiriniz.

---

## ⚙️ Yapılandırma (`.env` Parametreleri)

| Parametre | Varsayılan | Açıklama |
| :--- | :--- | :--- |
| `PORT` | `3001` | Web sunucusunun dinleyeceği port |
| `NODE_ENV` | `development` | `development` veya `production` |
| `KURUM_ADI` | `Örnek Üniversitesi` | E-postalarda ve başlıklarda görünen tam kurum adı |
| `KURUM_KISA_AD`| `Kampüs` | Kısa ad veya kısaltma |
| `SISTEM_ADI` | `KampüsStok Portalı` | Sayfa başlığı ve navbar marka adı |
| `EPOSTA_DOMAIN`| `kampus.edu.tr` | Personel e-posta uzantısı |
| `SATIN_ALMA_EMAIL` | `satinalma@kampus.edu.tr` | Talep bildirimlerinin düşeceği merkez e-posta |
| `TESLIMAT_GUNU`| `Wednesday` | Rutin malzeme dağıtım günü |
| `TESLIMAT_SAAT_SINIRI`| `12:00` | Dağıtım günü için aynı gün teslimat eşik saati |
| `SESSION_SECRET` | *(Rastgele dize)* | Oturum çerezi imzalama anahtarı |
| `SMTP_HOST` | *(Boş)* | SMTP sunucu adresi (Boş bırakılırsa e-postalar konsola simüle edilir) |

---

## 🧪 Testler

Sistemde entegrasyon, Excel içe aktarımı, yetkilendirme, sepet doğrulama ve anomali tespiti kapsayan kapsamlı test paketi yer alır:

```bash
npm test
```
*(46 test paketi, 0 hata ile çalışır)*

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) kapsamında açık kaynak olarak sunulmuştur. Üniversitenizde veya kurumunuzda dilediğiniz gibi özelleştirip ücretsiz olarak kullanabilirsiniz.
