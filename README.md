# Alp Sistem - Tekniksyen Takip Sistemi

Modern, hızlı ve güvenli tekniksyen takip ve yönetim sistemi.
<img width="1856" height="794" alt="image" src="https://github.com/user-attachments/assets/2389769f-76eb-48a6-a3ec-56987938312d" />

<img width="1885" height="825" alt="image" src="https://github.com/user-attachments/assets/1e7a63ae-a495-465a-a74e-3b8037acde87" />



## 🚀 Özellikler

### Admin Paneli
- ✅ Tekniksyen ekleme, çıkarma ve bilgi güncelleme
- ✅ Dosya yönetimi (yükleme, silme, indirme)
- ✅ Görev atama ve takip sistemi
- ✅ Envanter yönetimi
- ✅ Tekniksyen performans takibi

### Tekniksyen Paneli
- ✅ Profil bilgilerini güncelleme
- ✅ Dosya yükleme
- ✅ Görev görüntüleme ve durum güncelleme
- ✅ Kişisel envanter takibi

## 🛠️ Teknolojiler

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **UI Components**: Custom components with Lucide icons
- **Form Management**: React Hook Form + Zod validation

## 📦 Kurulum

### 1. Bağımlılıkları Yükle
```bash
npm install
```

### 2. Supabase Projesi Oluştur
1. [Supabase](https://supabase.com) hesabı oluşturun
2. Yeni proje oluşturun
3. Proje URL ve Anon Key'i kopyalayın

### 3. Environment Variables
`.env.local` dosyası oluşturun:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### 4. Veritabanı Şeması
`supabase-schema.sql` dosyasındaki SQL kodlarını Supabase SQL Editor'de çalıştırın.

### 5. İlk Admin Kullanıcı
Supabase Authentication'da manuel olarak bir kullanıcı oluşturun ve `profiles` tablosunda `role` değerini `admin` olarak ayarlayın.

### 6. Uygulamayı Başlat
```bash
npm run dev
```

Uygulama `http://localhost:3000` adresinde çalışacaktır.

## 📋 Veritabanı Yapısı

### Tablolar
- `profiles` - Kullanıcı profilleri ve rolleri
- `technician_files` - Tekniksyenlere ait dosyalar
- `tasks` - Görev yönetimi
- `inventory` - Envanter takibi

### Güvenlik
- Row Level Security (RLS) aktif
- Admin ve tekniksyen rolleri için ayrı yetkiler
- Dosya yükleme için güvenli storage

## 🔐 Roller ve Yetkiler

### Admin
- Tüm tekniksyenleri görüntüleme ve yönetme
- Dosya yükleme/silme (tüm tekniksyenler için)
- Görev oluşturma ve atama
- Envanter yönetimi

### Tekniksyen
- Kendi profil bilgilerini güncelleme
- Kendi dosyalarını görüntüleme ve yükleme
- Atanan görevleri görüntüleme ve durum güncelleme
- Kendi envanterini görüntüleme

## 🚀 Production Deployment

### Vercel (Önerilen)
```bash
npm run build
vercel deploy
```

### Diğer Platformlar
- Netlify
- Railway
- Heroku

## 📝 Geliştirme Notları

- TypeScript strict mode aktif
- ESLint ve Prettier yapılandırılmış
- Responsive design (mobil uyumlu)
- Real-time güncellemeler için Supabase subscriptions hazır

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.
