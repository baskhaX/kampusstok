<div align="center">

# 📦 KampüsStok / CampusStock
### Kırtasiye Talep, Depo ve Envanter Yönetim Portalı
### Stationery Requisition, Warehouse & Inventory Management Portal

---

🌐 **Dil Seçimi / Language Selection:**  
**[ 🇹🇷 Türkçe ](#-türkçe-dokümantasyon)** &nbsp;&nbsp;|&nbsp;&nbsp; **[ 🇬🇧 English ](#-english-documentation)**

---

[![Node.js Version](https://img.shields.io/badge/Node.js-20%2B-339933?logo=node.js)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Database: SQLite](https://img.shields.io/badge/Database-SQLite3%20(WAL)-003B57?logo=sqlite)](https://www.sqlite.org)
[![Tests Passing](https://img.shields.io/badge/Tests-46%2F46%20Passing-success)](#-testler)
[![Open Source](https://img.shields.io/badge/Open%20Source-KVKK%20Uyumlu-emerald)](https://github.com/baskhaX/kampusstok)
[![i18n Ready](https://img.shields.io/badge/i18n-TR%20%7C%20EN-purple)](#)

</div>

<br />

---

## 🇹🇷 Türkçe Dokümantasyon

> 🌐 English speaker? **[Jump to English Documentation 🇬🇧](#-english-documentation)**

**KampüsStok**, üniversiteler, kamu kurumları ve kurumsal şirketler için geliştirilmiş; intranet (LAN) veya bulut ortamında çalışan, modern e-ticaret deneyimini kurumsal satın alma ve envanter yönetimiyle birleştiren **açık kaynaklı** yeni nesil bir portaldır.

Kişisel veri (KVKK) izolasyonu sağlanmış, kurum logosu ve parametreleri `.env` üzerinden kolayca özelleştirilebilir mimaride tasarlanmıştır.

---

### ✨ Öne Çıkan Özellikler

#### 👥 1. Çok Rolü Kurumsal Yetkilendirme & Rol Tabanlı Erişim (RBAC)
- **Sistem Yöneticisi (Admin):** Kullanıcı, birim, yetki ve sistem konfigürasyonu yönetimi.
- **Satın Alma & Depo Amiri:** Talepleri inceleme, onaylama, miktar revize etme, stok kabulü, tedarikçi siparişleri ve dağıtım rotası.
- **Yetki Devri ve İzin Masası:** Satın Alma Müdürü izin veya görevlendirme sırasında vekaletini (tarih/saat bazlı veya kalıcı) bir personeline devreder; onay loglarında vekil kimliği açıkça denetlenir.
- **Depo Sorumlusu:** QR / Barkod destekli hızlı teslimat, teslim fişi üretimi ve mobil teyit.
- **Birim Yetkilisi:** Kendi birimi adına talep açma, sepet yönetimi ve birim bütçe/kotasını izleme.

#### 📥 2. Excel ile 1-Tıkla Personel ve Birim İçe Aktarma
- Yönetim panelinden tek tıkla kurumsal **Örnek Excel Şablonu (`.xlsx`)** indirme.
- Mevcut personel listesini (`Ad Soyad`, `E-Posta`, `Birim`, `Unvan`, `Dahili`, `Oda No`) Excel veya CSV formatında sürükleyip bırakarak sisteme topluca yükleme.
- Listede geçen yeni birimleri otomatik algılayıp sisteme tanımlama yeteneği.

#### 🛒 3. E-Ticaret Kolaylığında Talep Süreci
- Kategori, arama ve anlık filtreleme destekli görsel ürün kataloğu.
- Dinamik sepet, acil ihtiyaç işaretleme, otomatik dağıtım günü ve teslimat planlama.
- Çarşamba/belirlenen gün toplu dağıtım rotası ve resmi teslim fişi yazdırma.

#### 🌱 4. Yeşil Kampüs & Davranışsal İktisat (Nudge)
- **Yeşil Lig:** Birimler arası tasarruf, atıl malzeme iadesi ve çevre puanı podyumu.
- **Akıllı Nudge:** Sepet onayında birimin geçmiş tüketimini analiz eden zarif tasarruf önerileri.
- **Atıl Malzeme Havuzu:** Birimlerin odalarında kalan ihtiyaç fazlası kırtasiyeyi depoya geri kazandırma mekanizması (+20 Yeşil Puan).
- **Kırtasiye Kütüphanesi:** Laminasyon, ciltleme, giyotin gibi nadir kullanılan cihazların birimler arası randevulu ödünç kullanımı (+5 Yeşil Puan).

#### 🛡️ 5. Anomali Radarı ve Denetim İzi (Audit Log)
- Anormal tüketim tespiti (geçmiş ortalamanın 2.5x üstüne çıkan taleplerde gerekçe isteme).
- Bütünleşik denetim izi (audit log): Kim, ne zaman, hangi IP adresinden hangi işlemi yaptı?
- Zod ile sıkı şema doğrulaması, SQLite parametreli sorgularla SQL Injection koruması.

#### 🌍 6. Çift Dilli Küresel Deneyim (TR / EN)
- Sayfa yenilemeye gerek kalmadan sağ üst köşedeki *Apple Liquid Glass* dil kapsülü ile Türkçe ve İngilizce arasında kesintisiz anlık geçiş.
- Katalog, ürünler, kategoriler, onay akışı, bildirim çanı, denetim logları ve Excel şablonlarında tam iki dilli mimari.

---

### 🚀 Hızlı Başlangıç

#### Gereksinimler
- **Node.js 20+** (ES Modules desteği)
- **npm** veya uyumlu paket yöneticisi

#### 1. Projeyi Klonlayın ve Bağımlılıkları Yükleyin
```bash
git clone https://github.com/baskhaX/kampusstok.git
cd kampusstok
npm install
```

#### 2. Ortam Değişkenlerini Hazırlayın
`.env.example` dosyasını `.env` olarak kopyalayın:
```bash
# Windows PowerShell için:
Copy-Item .env.example .env

# Linux / macOS için:
cp .env.example .env
```

#### 3. Veritabanını Başlatın (Otomatik Migrasyon & Seed)
Aşağıdaki komut, 13 migrasyonu çalıştırır ve 10 örnek üniversite birimi, 20 anonim personel ve 21 kalem kırtasiye ürününü sisteme yükler:
```bash
npm run seed
```

#### 4. Sunucuyu Çalıştırın
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

### 🔑 Demo Hesaplar

Tohumlanan (seed) örnek veritabanında hemen deneyebileceğiniz hazır hesaplar:

| Rol | Kullanıcı Adı | Şifre | Yetki Kapsamı |
| :--- | :--- | :--- | :--- |
| **Sistem Yöneticisi** | `admin` | `admin123` | Tüm sisteme, ayarlara ve Excel aktarımına tam erişim |
| **Satın Alma Amiri** | `satinalma` | `satinalma123` | Talep onaylama, stok güncelleme, satın alma ve anomali radarı |
| **Depo Sorumlusu** | `depo` | `depo123` | Malzeme çıkışı, teslimat onayları ve atıl malzeme kabulü |
| **Birim Yetkilisi** | `birim` | `birim123` | Birim adına talep açma, sepet yönetimi ve iade bildirimi |

> 💡 **Not:** Üretim ortamına alırken bu şifreleri `Yönetim -> Personel & Birimler` ekranından değiştiriniz.

---

### ⚙️ Yapılandırma (`.env` Parametreleri)

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

### 🧪 Testler

Sistemde entegrasyon, Excel içe aktarımı, yetkilendirme, sepet doğrulama ve anomali tespiti kapsayan kapsamlı test paketi yer alır:

```bash
npm test
```
*(46 test paketi, 0 hata ile çalışır)*

---

### 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) kapsamında açık kaynak olarak sunulmuştur. Üniversitenizde veya kurumunuzda dilediğiniz gibi özelleştirip ücretsiz olarak kullanabilirsiniz.

<br />

---

## 🇬🇧 English Documentation

> 🌐 Türkçe kullanıcı mısınız? **[Türkçe Dokümantasyona Dönün 🇹🇷](#-türkçe-dokümantasyon)**

**CampusStock**, built for universities, public sector organizations, and corporate enterprises, is a modern **open-source** intranet and cloud portal that bridges an intuitive e-commerce user experience with rigorous institutional procurement and warehouse management workflows.

Engineered with personal data privacy (GDPR / KVKK compliance) and fully configurable corporate parameters via `.env`.

---

### ✨ Key Features

#### 👥 1. Multi-Role Institutional RBAC & Authority Delegation
- **System Administrator (Admin):** Complete control over users, departments, permissions, and system configurations.
- **Procurement & Warehouse Director:** Requisition evaluation, 1-click approvals, item quantity adjustments, batch receiving, vendor restocking, and logistics distribution routes.
- **Delegation of Authority & Leave Handover:** Procurement directors can assign full acting authority or date-restricted annual leave handover to designated staff with full audit traceability.
- **Warehouse Officer:** Barcode / QR-code driven fast delivery confirmations and material handover vouchers.
- **Department Requester:** Self-service stationery requisitions, shopping cart management, and department consumption budgets.

#### 📥 2. 1-Click Excel Personnel & Department Batch Import
- Download pre-configured **Sample Excel Templates (`.xlsx`)** with a single click.
- Drag-and-drop entire organizational rosters (`Full Name`, `Email`, `Department`, `Title`, `Extension`, `Room No`) via Excel or CSV.
- Automatic creation and hierarchical mapping of new departments found within spreadsheets.

#### 🛒 3. E-Commerce Simplicity in Institutional Requisitions
- Visual product catalog with live search, categorization, and stock availability pills.
- Dynamic shopping cart, urgent need flags, routine Wednesday batch distribution scheduling.
- Automated packing slips and official delivery receipts.

#### 🌱 4. Green Campus & Behavioral Economics (Nudge Engine)
- **Green League:** Inter-departmental rankings based on savings commitments, surplus recycling, and green credits.
- **Smart Nudges:** Requisition analysis at checkout suggesting optimized consumption (-30% quantity adjustments for +10 Green Points).
- **Surplus Material Return Pool:** Departmental submission desk for unused stationery to return supplies to main inventory (+20 Green Points).
- **Shared Equipment Library:** Appointment scheduling for shared heavy equipment (thermal binders, laminators, heavy-duty staplers) (+5 Green Points).

#### 🛡️ 5. Anomaly Radar & Comprehensive Audit Trail
- Real-time consumption anomaly alarms (requiring justification notes when requisitions exceed 2.5x historical department averages).
- Immutable audit ledger: Who performed what action, when, and from which IP address?
- Strict schema validation using Zod and SQL injection protection through parameterized SQLite queries.

#### 🌍 6. Seamless Dual-Language Experience (EN / TR)
- Instant client-side localization toggle with Apple Liquid Glass capsule in the top-right header without requiring page refreshes.
- 100% localized catalog, approvals, notifications popover, audit logs, and directory.

---

### 🚀 Quick Start

#### Prerequisites
- **Node.js 20+** (ES Modules support)
- **npm** or compatible package manager

#### 1. Clone the Repository & Install Dependencies
```bash
git clone https://github.com/baskhaX/kampusstok.git
cd kampusstok
npm install
```

#### 2. Set Up Environment Variables
Copy `.env.example` to `.env`:
```bash
# Windows PowerShell:
Copy-Item .env.example .env

# Linux / macOS:
cp .env.example .env
```

#### 3. Initialize Database (Automated Migrations & Seed)
Runs 13 schema migrations and seeds 10 sample university departments, 20 anonymous personnel, and 21 stationery catalog items:
```bash
npm run seed
```

#### 4. Start the Application Server
```bash
# Production start
npm start

# Development mode (with auto-reload)
npm run dev

# Windows desktop shortcut:
baslat.bat
```

Open your browser and navigate to **`http://localhost:3001`**.

---

### 🔑 Demo Accounts

Ready-to-use accounts seeded in the sample database:

| Role | Username | Password | Scope of Access |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin` | `admin123` | Full access to settings, users, database backups, and Excel imports |
| **Procurement Director** | `satinalma` | `satinalma123` | Requisition approval desk, stock adjustment, delegation, anomaly radar |
| **Warehouse Officer** | `depo` | `depo123` | QR delivery confirmations, material dispatch, surplus returns |
| **Department Requester** | `birim` | `birim123` | Department shopping cart, requisition tracking, surplus reporting |

> 💡 **Notice:** Change default demo passwords in production via `Management -> Directory & Permissions`.

---

### ⚙️ Configuration Parameters (`.env`)

| Parameter | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | HTTP port for the web server |
| `NODE_ENV` | `development` | `development` or `production` |
| `KURUM_ADI` | `Örnek Üniversitesi` | Full institution name shown in headers and notifications |
| `KURUM_KISA_AD`| `Kampüs` | Short name / institutional acronym |
| `SISTEM_ADI` | `CampusStock Portal` | Title banner and navbar branding |
| `EPOSTA_DOMAIN`| `kampus.edu.tr` | Corporate email domain |
| `SATIN_ALMA_EMAIL` | `satinalma@kampus.edu.tr` | Central recipient for procurement alerts |
| `TESLIMAT_GUNU`| `Wednesday` | Scheduled routine delivery day |
| `TESLIMAT_SAAT_SINIRI`| `12:00` | Same-day delivery approval cutoff hour |
| `SESSION_SECRET` | *(Random String)* | Session cookie cryptographic secret |
| `SMTP_HOST` | *(Empty)* | SMTP host (when empty, emails are safely simulated to console) |

---

### 🧪 Automated Tests

Comprehensive unit, integration, Excel import, and RBAC test suite:

```bash
npm test
```
*(46 test suites passing, 0 failures)*

---

### 📁 Project Architecture

```text
KampüsStok/
├── data/                  # SQLite database (WAL mode) and automated backups
├── public/                # Client-side presentation layer (HTML, CSS, ES Modules)
│   ├── assets/            # SVG vector assets, logos, and illustrations
│   ├── css/               # Apple Liquid Glass design tokens and responsive stylesheets
│   └── js/
│       ├── components/    # Navbar, Global Footer, Notification Bell, Modals
│       ├── pages/         # Catalog, Cart, Procurement Inbox, Directory, Green Campus
│       └── utils/         # Lightweight i18n engine, API client, text helpers
├── src/
│   ├── config/            # Environment settings and institution constants
│   ├── controllers/       # HTTP controllers (Requisitions, Inventory, Auth, etc.)
│   ├── db/                # SQLite connection, schema migrations, seeders
│   ├── middleware/        # Authentication, Zod validation, rate limiter
│   ├── routes/            # Express endpoint route maps
│   ├── services/          # Business logic, audit logging, and email queue services
│   └── server.js          # Express entrypoint
├── tests/                 # Node.js native test runner test suite
├── .env.example           # Environment template
└── package.json           # Application manifest
```

---

### 📄 License

This project is open-source under the [MIT License](LICENSE). Feel free to adapt and deploy it within your university or institution free of charge.
