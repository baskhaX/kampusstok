# 📦 KampüsStok — Kırtasiye Talep, Depo ve Envanter Yönetim Portalı

[![Node.js Version](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Database: SQLite](https://img.shields.io/badge/Database-SQLite3%20(WAL)-003B57?logo=sqlite)](https://www.sqlite.org)
[![Tests Passing](https://img.shields.io/badge/Tests-38%2F38%20Passing-success)](#-testler)
[![Open Source](https://img.shields.io/badge/Open%20Source-KVKK%20Uyumlu-emerald)](https://github.com)

**KampüsStok**, üniversiteler, kamu kurumları ve kurumsal şirketler için geliştirilmiş; intranet (LAN) veya bulut ortamında çalışan, modern e-ticaret deneyimini kurumsal satın alma ve envanter yönetimiyle birleştiren **açık kaynaklı** bir portaldır.

Kişisel veri (KVKK) izolasyonu sağlanmış, kurum logosu ve parametreleri `.env` üzerinden kolayca özelleştirilebilir mimaride tasarlanmıştır.

---

## ✨ Öne Çıkan Özellikler

### 👥 1. Çok Rolü Kurumsal Yetkilendirme
- **Sistem Yöneticisi (Admin):** Kullanıcı, birim, yetki ve sistem konfigürasyonu yönetimi.
- **Satın Alma & Depo Amiri:** Talepleri onaylama/reddetme/revize etme, stok kabulü, tedarikçi siparişleri ve dağıtım rotası.
- **Depo Sorumlusu:** QR/Barkod destekli hızlı teslimat ve fiş doğrulama.
- **Birim Yetkilisi:** Kendi birimi adına talep açma, vekalet bırakma ve birim bütçe/kotasını izleme.

### 📥 2. Excel ile 1-Tıkla Personel ve Birim İçe Aktarma
- Yönetim panelinden tek tıkla kurumsal **Örnek Excel Şablonu (`.xlsx`)** indirme.
- Mevcut personel listesini (`Ad Soyad`, `E-Posta`, `Birim`, `Unvan`, `Dahili`, `Oda No`) Excel veya CSV formatında sürükleyip bırakarak sisteme topluca yükleme.
- Listede geçen yeni birimleri otomatik algılayıp sisteme tanımlama yeteneği.

### 🛒 3. E-Ticaret Kolaylığında Talep Süreci
- Kategori, arama ve filtreleme destekli görsel ürün kataloğu.
- Dinamik sepet, acil ihtiyaç işaretleme, otomatik dağıtım günü ve teslimat planlama.
- Çarşamba/belirlenen gün toplu dağıtım rotası ve fiş yazdırma.

### 🌱 4. Yeşil Kampüs & Davranışsal İktisat (Nudge)
- **Yeşil Lig:** Birimler arası tasarruf, atıl malzeme iadesi ve çevre puanı podyumu.
- **Akıllı Nudge:** Sepet onayında birimin geçmiş tüketimini analiz eden zarif tasarruf önerileri.
- **Atıl Malzeme Havuzu:** Birimlerin odalarında kalan ihtiyaç fazlası kırtasiyeyi depoya geri kazandırma mekanizması.
- **Kırtasiye Kütüphanesi:** Laminasyon, ciltleme, giyotin gibi nadir kullanılan cihazların birimler arası randevulu ödünç kullanımı.

### 🛡️ 5. Anomali Radarı ve Güvenlik
- Anormal tüketim tespiti (geçmiş ortalamanın 2.5x üstüne çıkan taleplerde gerekçe isteme).
- Bütünleşik denetim izi (audit log): Kim, ne zaman, hangi işlemi yaptı?
- Zod ile sıkı şema doğrulaması, SQLite parametreli sorgularla SQL Injection koruması.

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
- **Node.js 20+** (ES Modules desteği)
- **npm** veya uyumlu paket yöneticisi

### 1. Projeyi Klonlayın ve Bağımlılıkları Yükleyin
```bash
git clone https://github.com/kullaniciadi/kampusstok.git
cd kampusstok
npm install
```

### 2. Ortam Değişkenlerini Hazırlayın
`.env.example` dosyasını `.env` olarak kopyalayın:
```bash
cp .env.example .env
# Windows için:
copy .env.example .env
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

Sunucu başladığında tarayıcınızdan **`http://localhost:3001`** (veya `.env` dosyasında belirlediğiniz port) adresine gidin.

---

## 🔑 Demo Hesaplar

Tohumlanan (seed) örnek veritabanında test yapabileceğiniz hazır hesaplar:

| Rol | Kullanıcı Adı | Şifre | Yetki Kapsamı |
| :--- | :--- | :--- | :--- |
| **Sistem Yöneticisi** | `admin` | `admin123` | Tüm sisteme, ayarlara ve Excel aktarımına tam erişim |
| **Satın Alma Amiri** | `satinalma` | `satinalma123` | Talep onaylama, stok güncelleme, satın alma ve anomali radarı |
| **Depo Sorumlusu** | `depo` | `depo123` | Malzeme çıkışı, teslimat onayları ve atıl malzeme kabulü |
| **Birim Yetkilisi** | `birim` | `birim123` | Birim adına talep açma, sepet yönetimi ve iade bildirimi |

> 💡 **Not:** Üretim ortamına alırken bu şifreleri `Yönetim -> Personel & Birimler` ekranından değiştiriniz.

---

## ⚙️ Yapılandırma (`.env` Parametreleri)

Kurumunuzun adına ve kimliğine göre sistemi kolayca özelleştirebilirsiniz:

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
*(38 test paketi, 0 hata ile çalışır)*

---

## 📁 Proje Dizin Yapısı

```text
KampüsStok/
├── data/                  # SQLite veritabanı ve otomatik yedekler
├── public/                # İstemci tarafı (HTML, CSS, JS modülleri)
│   ├── assets/            # SVG logolar ve genel ikonlar
│   ├── css/               # Tasarım sistemi ve responsive stiller
│   └── js/
│       ├── components/    # Navbar, Footer, Bildirim Çanı
│       ├── pages/         # Katalog, Sepet, Yönetim, Rehber, Yeşil Kampüs
│       └── utils/         # API istemcisi, tarih ve yetki yardımcıları
├── src/
│   ├── config/            # Çevre değişkenleri ve kurum konfigürasyonu
│   ├── controllers/       # HTTP iş mantığı (Talep, Yönetim, Stok, vb.)
│   ├── db/                # Şemalar, migrasyonlar ve seed verileri
│   ├── middleware/        # Kimlik doğrulama, Zod validasyon, rate limit
│   ├── routes/            # Express route haritaları
│   ├── services/          # Veritabanı ve iş kuralları servisleri
│   └── server.js          # Express sunucu giriş noktası
├── tests/                 # Otomatik testler (Jest/Node Test Runner)
├── .env.example           # Örnek çevre değişkenleri şablonu
└── package.json           # Proje manifestosu ve bağımlılıklar
```

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) kapsamında açık kaynak olarak sunulmuştur. Üniversitenizde veya kurumunuzda dilediğiniz gibi özelleştirip ücretsiz olarak kullanabilirsiniz.
